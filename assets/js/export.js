/*!
 * AHP Decision Engine — ekspor: XLSX (tanpa pustaka), CSV, JSON, PNG/SVG, PDF (jsPDF)
 * (c) 2026 Alfredo Garcia / NusaIT — MIT License
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./ahp-core.js'), require('./model.js'));
  else root.AHPExport = factory(root.AHPCore, root.AHPModel);
}(typeof self !== 'undefined' ? self : this, function (AHP, M) {
  'use strict';

  const TOOL_URL = 'https://edgarcia-id.github.io/ahp-decision-engine/';
  const TOOL_NAME = 'AHP Decision Engine';

  /* ------------------------------------------------------------------ *
   * Unduh berkas
   * ------------------------------------------------------------------ */

  function download(filename, data, mime) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function safeFileName(s, ext) {
    const base = String(s || 'ahp').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60) || 'ahp';
    return base + (ext ? '.' + ext : '');
  }

  /* ------------------------------------------------------------------ *
   * CSV
   * ------------------------------------------------------------------ */

  function csvString(rows) {
    const q = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
  }

  function parseCSV(text) {
    text = String(text).replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/)[0] || '';
    const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
    const rows = [];
    let row = [], cur = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') inQ = false; else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === sep) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = '';
        if (row.some((x) => x !== '')) rows.push(row);
        row = [];
      } else cur += c;
    }
    row.push(cur);
    if (row.some((x) => x !== '')) rows.push(row);
    return rows;
  }

  const CSV_HEAD = ['peserta', 'set', 'nama_set', 'id_a', 'item_a', 'id_b', 'item_b', 'nilai'];

  /** Semua penilaian dalam format panjang (satu baris per pasangan per peserta). */
  function judgmentRows(p) {
    const rows = [CSV_HEAD];
    const sets = M.comparisonSets(p).filter((s) => s.mode === 'pairwise');
    for (const part of p.participants) {
      for (const set of sets) {
        for (let i = 0; i < set.items.length; i++) {
          for (let j = i + 1; j < set.items.length; j++) {
            const a = set.items[i], b = set.items[j];
            const v = M.getJudgment(p, part.id, set.key, a.id, b.id);
            if (v === null) continue;
            rows.push([part.name, set.key, M.setLabel(p, set), a.id, a.name, b.id, b.name, +v.toPrecision(12)]);
          }
        }
      }
    }
    return rows;
  }

  /**
   * Impor penilaian dari CSV berformat judgmentRows. Peserta dibuat bila namanya belum ada.
   * Nilai boleh "3", "1/3", "0,333".
   */
  function importJudgmentsCSV(p, text) {
    const rows = parseCSV(text);
    if (!rows.length) throw new Error('CSV kosong.');
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const col = (name) => head.indexOf(name);
    const need = ['peserta', 'set', 'id_a', 'id_b', 'nilai'];
    const missing = need.filter((n) => col(n) < 0);
    if (missing.length) throw new Error('Kolom wajib tidak ada: ' + missing.join(', ') + '. Gunakan format dari tombol "Unduh CSV penilaian".');
    const sets = {};
    for (const s of M.comparisonSets(p)) if (s.mode === 'pairwise') sets[s.key] = new Set(s.items.map((x) => x.id));
    let ok = 0, bad = 0;
    const created = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const name = (row[col('peserta')] || '').trim();
      const key = (row[col('set')] || '').trim();
      const a = (row[col('id_a')] || '').trim();
      const b = (row[col('id_b')] || '').trim();
      const v = AHP.parseJudgment(row[col('nilai')]);
      if (!name || !sets[key] || !sets[key].has(a) || !sets[key].has(b) || a === b || !(v > 0)) { bad++; continue; }
      let part = p.participants.find((x) => x.name === name);
      if (!part) {
        part = { id: M.uid('p_'), name, weight: 1, include: true };
        p.participants.push(part);
        created.push(name);
      }
      M.setJudgment(p, part.id, key, a, b, v);
      ok++;
    }
    if (!ok) throw new Error('Tidak ada baris yang cocok dengan struktur proyek ini.');
    return { ok, bad, created };
  }

  /* ------------------------------------------------------------------ *
   * ZIP (store) + XLSX minimal
   * ------------------------------------------------------------------ */

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function zip(files) {
    const enc = new TextEncoder();
    const d = new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const locals = [], centrals = [];
    let offset = 0;
    for (const file of files) {
      const name = enc.encode(file.name);
      const data = typeof file.data === 'string' ? enc.encode(file.data) : file.data;
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      locals.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
      ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true);
      ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
      centrals.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const cdSize = centrals.reduce((s, b) => s + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    const parts = locals.concat(centrals, [new Uint8Array(end.buffer)]);
    const total = parts.reduce((s, b) => s + b.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const b of parts) { out.set(b, o); o += b.length; }
    return out;
  }

  const S = { normal: 0, bold: 1, title: 2, note: 3, th: 4, n4: 5, pct: 6, td: 7, n4b: 8, pctb: 9, n3: 10, int: 11, tdb: 12 };

  const STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="3"><numFmt numFmtId="164" formatCode="0.0000"/><numFmt numFmtId="165" formatCode="0.00%"/><numFmt numFmtId="166" formatCode="0.000"/></numFmts>' +
    '<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="14"/><color rgb="FF14213D"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FF5A6578"/><name val="Calibri"/></font></fonts>' +
    '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFDCE8F5"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE6F4EA"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left style="thin"><color rgb="FFC3CAD5"/></left><right style="thin"><color rgb="FFC3CAD5"/></right><top style="thin"><color rgb="FFC3CAD5"/></top><bottom style="thin"><color rgb="FFC3CAD5"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="13">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>' +
    '<xf numFmtId="164" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
    '<xf numFmtId="165" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
    '<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +
    '<xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +
    '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  function xmlEsc(s) {
    return String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function colName(i) {
    let s = '';
    i += 1;
    while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }

  function ref(r, c, absCol, absRow) { return (absCol ? '$' : '') + colName(c) + (absRow ? '$' : '') + (r + 1); }

  function sheetXml(sheet) {
    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews>';
    if (sheet.cols && sheet.cols.length) {
      xml += '<cols>' + sheet.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols>';
    }
    xml += '<sheetData>';
    sheet.rows.forEach((row, r) => {
      if (!row || !row.length) return;
      let cells = '';
      row.forEach((cell, c) => {
        if (cell === null || cell === undefined || cell === '') return;
        const o = typeof cell === 'object' ? cell : { v: cell };
        const at = ref(r, c);
        const st = o.s !== undefined ? ` s="${o.s}"` : (typeof o.v === 'number' ? ' s="0"' : '');
        if (o.f) {
          const v = typeof o.v === 'number' && isFinite(o.v) ? `<v>${o.v}</v>` : '';
          cells += `<c r="${at}"${st}><f>${xmlEsc(o.f)}</f>${v}</c>`;
        } else if (typeof o.v === 'number') {
          if (isFinite(o.v)) cells += `<c r="${at}"${st}><v>${o.v}</v></c>`;
        } else {
          cells += `<c r="${at}"${st} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(o.v)}</t></is></c>`;
        }
      });
      if (cells) xml += `<row r="${r + 1}">${cells}</row>`;
    });
    xml += '</sheetData></worksheet>';
    return xml;
  }

  function uniqueSheetName(name, used) {
    let base = String(name).replace(/[\[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Sheet';
    let n = base, k = 2;
    while (used.has(n.toLowerCase())) { const suf = ' (' + k++ + ')'; n = base.slice(0, 31 - suf.length) + suf; }
    used.add(n.toLowerCase());
    return n;
  }

  /** sheets: [{name, rows, cols}] → Uint8Array .xlsx */
  function buildXlsx(sheets) {
    const used = new Set();
    const named = sheets.map((s) => Object.assign({}, s, { name: uniqueSheetName(s.name, used) }));
    const files = [];
    files.push({
      name: '[Content_Types].xml',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
        named.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
        '</Types>'
    });
    files.push({
      name: '_rels/.rels',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'
    });
    files.push({
      name: 'docProps/core.xml',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        `<dc:title>${xmlEsc(sheets.title || 'Hasil AHP')}</dc:title><dc:creator>${TOOL_NAME}</dc:creator>` +
        `<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created></cp:coreProperties>`
    });
    files.push({
      name: 'xl/workbook.xml',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<bookViews><workbookView/></bookViews><sheets>' +
        named.map((s, i) => `<sheet name="${xmlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
        '</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>'
    });
    files.push({
      name: 'xl/_rels/workbook.xml.rels',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        named.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
        `<Relationship Id="rId${named.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
    });
    files.push({ name: 'xl/styles.xml', data: STYLES_XML });
    named.forEach((s, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) }));
    return zip(files);
  }

  /* ------------------------------------------------------------------ *
   * Isi workbook dari laporan
   * ------------------------------------------------------------------ */

  const th = (v) => ({ v, s: S.th });
  const td = (v) => ({ v, s: S.td });
  const n4 = (v) => ({ v, s: S.n4 });
  const pc = (v) => ({ v, s: S.pct });

  function workbookFromReport(R) {
    const p = R.project, comp = R.comp, synth = comp.synth;
    const sheets = [];
    const hasAlts = p.alternatives.length >= 1 && synth.final.length;
    const methodLabel = AHP.METHOD_LABELS[p.settings.method];

    // --- Ringkasan
    const rs = [];
    rs.push([{ v: p.meta.title, s: S.title }]);
    rs.push([{ v: 'Tujuan: ' + M.nodeById(p, M.ROOT).name, s: S.bold }]);
    rs.push([{ v: `Dihitung ${R.dateLabel} dengan ${TOOL_NAME} (${TOOL_URL})`, s: S.note }]);
    rs.push([]);
    rs.push([th('Pengaturan'), th('Nilai')]);
    rs.push([td('Metode bobot prioritas'), td(methodLabel)]);
    rs.push([td('Mode sintesis'), td(p.settings.synthesis === 'ideal' ? 'Ideal' : 'Distributive')]);
    rs.push([td('Batas CR'), n4(p.settings.crThreshold)]);
    rs.push([td('Cakupan penilaian'), td(R.scopeLabel)]);
    rs.push([td('Peserta disertakan'), td(M.includedParticipants(p).map((x) => x.name).join(', '))]);
    rs.push([]);
    if (hasAlts) {
      rs.push([{ v: 'Peringkat alternatif', s: S.bold }]);
      rs.push([th('Peringkat'), th('Alternatif'), th('Prioritas'), th('Persentase')]);
      R.rankingOrder.forEach((k, r) => {
        const strong = r === 0;
        rs.push([{ v: r + 1, s: S.int }, { v: p.alternatives[k].name, s: strong ? S.tdb : S.td }, { v: synth.final[k], s: strong ? S.n4b : S.n4 }, { v: synth.final[k], s: strong ? S.pctb : S.pct }]);
      });
      rs.push([]);
    }
    rs.push([{ v: 'Bobot kriteria', s: S.bold }]);
    rs.push([th('Kriteria'), th('Level'), th('Bobot lokal'), th('Bobot global'), th('Kriteria penilai (daun)')]);
    for (const { id, depth } of M.preorder(p)) {
      if (id === M.ROOT) continue;
      const isLeaf = !(comp.children[id] || []).length;
      rs.push([td('  '.repeat(depth - 1) + M.nodeById(p, id).name), { v: depth, s: S.int }, n4(R.localOf(id)), n4(synth.global[id]), td(isLeaf ? 'Ya' : '')]);
    }
    sheets.push({ name: 'Ringkasan', rows: rs, cols: [42, 30, 16, 16, 20] });

    // --- Konsistensi
    const kc = [[th('Matriks'), th('n'), th('Terisi'), th('λ maks'), th('CI'), th('RI'), th('CR'), th('Status')]];
    for (const set of comp.sets) {
      if (set.mode !== 'pairwise') continue;
      const a = comp.results[set.key].analysis;
      kc.push([td(M.setLabel(p, set)), { v: a.n, s: S.int }, td(`${a.total - a.missing}/${a.total}`), n4(a.lambdaMax), n4(a.CI), { v: a.RI, s: S.n3 }, n4(a.CR),
        a.CR > p.settings.crThreshold ? { v: 'Tidak konsisten', s: S.td } : { v: 'Konsisten', s: S.td }]);
    }
    sheets.push({ name: 'Konsistensi', rows: kc, cols: [44, 6, 9, 12, 12, 8, 12, 18] });

    // --- Prioritas alternatif per kriteria penilai
    if (hasAlts) {
      const leaves = synth.leaves;
      const pr = [[{ v: `Prioritas lokal alternatif per kriteria penilai (mode ${p.settings.synthesis === 'ideal' ? 'ideal: dibagi nilai maksimum' : 'distributive'})`, s: S.bold }], []];
      pr.push([th('Alternatif')].concat(leaves.map((l) => th(M.pathNames(p, l).slice(1).join(' › ') || M.nodeById(p, l).name)), [th('Prioritas akhir')]));
      pr.push([th('Bobot global kriteria')].concat(leaves.map((l) => n4(synth.global[l])), [td('')]));
      p.alternatives.forEach((a, k) => {
        pr.push([td(a.name)].concat(leaves.map((l) => n4(synth.q[l][k])), [{ v: synth.final[k], s: S.n4b }]));
      });
      pr.push([]);
      pr.push([{ v: 'Skor akhir = Σ (bobot global kriteria × prioritas lokal), lalu dinormalisasi agar jumlah = 1.', s: S.note }]);
      sheets.push({ name: 'Prioritas per kriteria', rows: pr, cols: [26].concat(leaves.map(() => 18), [16]) });
    }

    // --- Detail tiap matriks (dengan rumus Excel)
    let mi = 0, di = 0;
    for (const set of comp.sets) {
      const res = comp.results[set.key];
      if (set.mode === 'data') {
        di++;
        const node = M.nodeById(p, set.nodeId);
        const rows = [[{ v: 'Data langsung: ' + M.setLabel(p, set), s: S.title }],
          [{ v: `Jenis: ${node.dataType === 'cost' ? 'Cost (makin kecil makin baik): prioritas = (1/x) / Σ(1/x)' : 'Benefit (makin besar makin baik): prioritas = x / Σx'}${node.unit ? ' — satuan ' + node.unit : ''}`, s: S.note }], [],
          [th('Alternatif'), th('Nilai'), th(node.dataType === 'cost' ? '1 / nilai' : 'Nilai'), th('Prioritas')]];
        const r0 = rows.length, n = set.items.length;
        set.items.forEach((a, i) => {
          const r = r0 + i;
          const v = res.values[i];
          const t = v === null ? null : (node.dataType === 'cost' ? 1 / v : v);
          rows.push([td(a.name), { v: v === null ? '' : v, s: S.n4 },
            { v: t === null ? '' : t, f: v === null ? null : (node.dataType === 'cost' ? `1/${ref(r, 1)}` : `${ref(r, 1)}`), s: S.n4 },
            { v: res.priority ? res.priority[i] : '', f: v === null ? null : `${ref(r, 2)}/SUM(${ref(r0, 2, true, true)}:${ref(r0 + n - 1, 2, true, true)})`, s: S.n4b }]);
        });
        sheets.push({ name: `D${String(di).padStart(2, '0')} ${M.nodeById(p, set.nodeId).name}`, rows, cols: [28, 14, 14, 14] });
        continue;
      }
      mi++;
      const a = res.analysis, n = set.items.length, names = set.items.map((x) => x.name);
      const rows = [];
      rows.push([{ v: 'Perbandingan berpasangan: ' + M.setLabel(p, set), s: S.title }]);
      rows.push([{ v: `Cakupan: ${R.scopeLabel}. Metode: ${AHP.METHOD_LABELS[a.methodUsed] || methodLabel}.${a.missing ? ` ${a.missing} penilaian kosong dilengkapi dari rasio bobot (w_i/w_j).` : ''}`, s: S.note }]);
      rows.push([]);
      rows.push([{ v: 'Matriks perbandingan', s: S.bold }]);
      const hRow = rows.length;
      rows.push([th('')].concat(names.map(th)));
      const m0 = rows.length;
      for (let i = 0; i < n; i++) rows.push([th(names[i])].concat(a.full[i].map((v) => ({ v, s: S.n4 }))));
      const sumRow = rows.length;
      rows.push([th('Jumlah kolom')].concat(names.map((_, j) => ({ v: a.colSums[j], f: `SUM(${ref(m0, j + 1)}:${ref(m0 + n - 1, j + 1)})`, s: S.n4b }))));
      rows.push([]);
      rows.push([{ v: 'Matriks normalisasi (tiap sel ÷ jumlah kolom)', s: S.bold }]);
      rows.push([th('')].concat(names.map(th), [th('Rata-rata baris')]));
      const nm0 = rows.length;
      for (let i = 0; i < n; i++) {
        const r = nm0 + i;
        rows.push([th(names[i])].concat(names.map((_, j) => ({ v: a.normalized[i][j], f: `${ref(m0 + i, j + 1)}/${ref(sumRow, j + 1, false, true)}`, s: S.n4 })),
          [{ v: a.ncaWeights[i], f: `AVERAGE(${ref(r, 1)}:${ref(r, n)})`, s: S.n4b }]));
      }
      rows.push([]);
      rows.push([{ v: 'Bobot prioritas & uji konsistensi', s: S.bold }]);
      rows.push([th(''), th('Bobot (w)'), th('A·w'), th('(A·w)/w')]);
      const c0 = rows.length;
      for (let i = 0; i < n; i++) {
        const r = c0 + i;
        rows.push([th(names[i]), n4(a.w[i]), n4(a.Aw[i]), { v: a.cv[i], f: `${ref(r, 2)}/${ref(r, 1)}`, s: S.n4 }]);
      }
      const cEnd = c0 + n - 1;
      const lamR = rows.length;
      rows.push([td('λ maks = rata-rata (A·w)/w'), { v: a.lambdaMax, f: `AVERAGE(${ref(c0, 3)}:${ref(cEnd, 3)})`, s: S.n4b }]);
      rows.push([td('CI = (λ maks − n) / (n − 1)'), { v: a.CI, f: n > 1 ? `(${ref(lamR, 1)}-${n})/(${n}-1)` : null, s: S.n4 }]);
      rows.push([td(`RI (Saaty, n = ${n})`), { v: a.RI, s: S.n3 }]);
      rows.push([td('CR = CI / RI'), { v: a.CR, f: a.RI > 0 ? `${ref(lamR + 1, 1)}/${ref(lamR + 2, 1)}` : null, s: S.n4b }]);
      rows.push([td('Status'), td(a.CR > p.settings.crThreshold ? `Tidak konsisten (CR > ${p.settings.crThreshold})` : `Konsisten (CR ≤ ${p.settings.crThreshold})`)]);
      if (p.settings.method === 'eigen') rows.push([{ v: 'Catatan: bobot (w) memakai vektor eigen utama; kolom "Rata-rata baris" adalah pendekatan manual (NCA) sebagai pembanding.', s: S.note }]);
      void hRow;
      sheets.push({ name: `M${String(mi).padStart(2, '0')} ${M.setLabel(p, set, true)}`, rows, cols: [30].concat(names.map(() => 14), [16]) });
    }

    // --- Stabilitas sensitivitas
    if (R.sensitivity && R.sensitivity.length) {
      const st = [[{ v: 'Interval stabilitas alternatif teratas (bobot satu kriteria diubah, kriteria lain diskalakan proporsional)', s: S.bold }], [],
        [th('Kriteria'), th('Bobot saat ini'), th('Teratas'), th('Batas bawah'), th('Batas atas'), th('Bila di bawah batas, teratas menjadi'), th('Bila di atas batas, teratas menjadi')]];
      for (const s of R.sensitivity) {
        const t = s.stability;
        st.push([td(s.name), pc(t.x0), td(p.alternatives[t.top].name), pc(t.lo), pc(t.hi),
          td(t.loBy === null ? '—' : p.alternatives[t.loBy].name), td(t.hiBy === null ? '—' : p.alternatives[t.hiBy].name)]);
      }
      sheets.push({ name: 'Stabilitas', rows: st, cols: [30, 14, 22, 12, 12, 30, 30] });
    }

    // --- Peserta
    if (p.participants.length > 1 && R.summaries) {
      const pe = [[th('Peserta'), th('Bobot suara'), th('Disertakan'), th('Penilaian terisi'), th('CR maksimum'), th('Status')]];
      for (const s of R.summaries) {
        pe.push([td(s.participant.name), n4(s.participant.weight), td(s.participant.include ? 'Ya' : 'Tidak'), td(`${s.total - s.missing}/${s.total}`), n4(s.maxCR),
          td(s.maxCR > p.settings.crThreshold ? 'Ada matriks tidak konsisten' : 'Konsisten')]);
      }
      pe.push([]);
      pe.push([{ v: 'Penilaian gabungan = rata-rata geometrik berbobot dari penilaian peserta yang disertakan (aggregation of individual judgments, AIJ).', s: S.note }]);
      sheets.push({ name: 'Peserta', rows: pe, cols: [30, 12, 12, 16, 14, 28] });
    }

    // --- Penilaian mentah
    const jr = judgmentRows(p);
    sheets.push({ name: 'Penilaian mentah', rows: jr.map((r, i) => r.map((v) => (i === 0 ? th(v) : (typeof v === 'number' ? n4(v) : td(v))))), cols: [22, 16, 34, 12, 24, 12, 24, 12] });

    sheets.title = p.meta.title;
    return sheets;
  }

  /* ------------------------------------------------------------------ *
   * SVG → PNG
   * ------------------------------------------------------------------ */

  function svgToPng(svg, width, height, scale) {
    scale = scale || 2;
    return new Promise((resolve, reject) => {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          const dataUrl = canvas.toDataURL('image/png');
          canvas.toBlob((b) => resolve({ blob: b, dataUrl, width: canvas.width, height: canvas.height }), 'image/png');
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gagal merender diagram ke PNG.')); };
      img.src = url;
    });
  }

  /* ------------------------------------------------------------------ *
   * PDF
   * ------------------------------------------------------------------ */

  // Helvetica bawaan PDF hanya mendukung WinAnsi; ganti simbol di luar itu.
  function pdfText(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/λ/g, 'lambda').replace(/Σ/g, 'jumlah ').replace(/≤/g, '<=').replace(/≥/g, '>=')
      .replace(/›/g, '>').replace(/→/g, '->').replace(/←/g, '<-').replace(/−/g, '-').replace(/×/g, 'x')
      .replace(/✓/g, 'OK').replace(/✕/g, 'X').replace(/·/g, '-')
      .replace(/[^\u0009\u000a\u000d -~ -ÿ–—‘’“”•…]/g, '?');
  }

  const NAVY = [20, 33, 61], INK = [20, 33, 61], MUTED = [90, 101, 120], LINE = [200, 206, 215], BRAND = [0, 99, 176];

  async function buildPdf(R, onProgress) {
    if (!(typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF)) throw new Error('Pustaka PDF belum termuat. Muat ulang halaman lalu coba lagi.');
    const { jsPDF } = window.jspdf;
    const autoTable = window.autoTable || (window.jspdf_autotable && window.jspdf_autotable.autoTable) || null;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const p = R.project, comp = R.comp, synth = comp.synth;
    const fmt = R.fmt;
    const PW = 210, PH = 297, MG = 16, CW = PW - 2 * MG, BOTTOM = PH - 16;
    let y = MG;
    const tick = (msg) => { if (onProgress) onProgress(msg); };

    doc.setProperties({ title: p.meta.title, subject: 'Laporan Analytic Hierarchy Process', creator: TOOL_NAME + ' — ' + TOOL_URL });

    const ensure = (h) => { if (y + h > BOTTOM) { doc.addPage(); y = MG; } };
    const setFont = (size, style, color) => { doc.setFont('helvetica', style || 'normal'); doc.setFontSize(size); doc.setTextColor.apply(doc, color || INK); };
    let secNo = 0;
    const heading = (t) => {
      ensure(18);
      secNo++;
      y += 2;
      setFont(13, 'bold', NAVY);
      doc.text(pdfText(`${secNo}. ${t}`), MG, y + 4);
      doc.setDrawColor.apply(doc, BRAND);
      doc.setLineWidth(0.6);
      doc.line(MG, y + 6.5, MG + 14, y + 6.5);
      y += 11;
    };
    const sub = (t) => { ensure(10); setFont(10.5, 'bold', INK); doc.text(pdfText(t), MG, y + 3.5); y += 7; };
    const para = (t, size, color, style) => {
      setFont(size || 9.5, style || 'normal', color || INK);
      const lines = doc.splitTextToSize(pdfText(t), CW);
      const lh = (size || 9.5) * 0.42;
      for (const l of lines) { ensure(lh + 1); doc.text(l, MG, y + lh * 0.8); y += lh; }
      y += 2;
    };
    const table = (head, body, opts) => {
      opts = opts || {};
      // jaga agar kepala tabel tidak tertinggal sendirian di dasar halaman
      ensure(Math.min(42, 10 + Math.min(body.length, 3) * 6.5));
      const conf = Object.assign({
        startY: y, head: [head.map(pdfText)], body: body.map((r) => r.map((c) => (typeof c === 'object' && c !== null ? Object.assign({}, c, { content: pdfText(c.content) }) : pdfText(c)))),
        margin: { left: MG, right: MG, bottom: 18 }, theme: 'grid',
        styles: { font: 'helvetica', fontSize: opts.fontSize || 8.5, cellPadding: 1.5, lineColor: LINE, lineWidth: 0.15, textColor: INK, overflow: 'linebreak' },
        headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 249, 252] },
        rowPageBreak: 'avoid'
      }, opts.extra || {});
      if (autoTable) autoTable(doc, conf);
      else doc.autoTable(conf);
      y = doc.lastAutoTable.finalY + 5;
    };
    const image = async (chart, caption, maxH) => {
      if (!chart) return;
      const png = await svgToPng(chart.svg, chart.width, chart.height, 2);
      let w = CW, h = CW * chart.height / chart.width;
      const limit = maxH || (BOTTOM - MG - 14);
      if (h > limit) { w = w * limit / h; h = limit; }
      ensure(h + (caption ? 8 : 3));
      doc.addImage(png.dataUrl, 'PNG', MG + (CW - w) / 2, y, w, h, undefined, 'FAST');
      y += h + 2;
      if (caption) { setFont(8, 'italic', MUTED); const lines = doc.splitTextToSize(pdfText(caption), CW); doc.text(lines, PW / 2, y + 2.5, { align: 'center' }); y += lines.length * 3.4 + 3; }
    };

    // --- Sampul ringkas
    doc.setFillColor.apply(doc, NAVY);
    doc.rect(0, 0, PW, 40, 'F');
    setFont(9, 'normal', [190, 205, 225]);
    doc.text('LAPORAN ANALYTIC HIERARCHY PROCESS', MG, 13);
    setFont(17, 'bold', [255, 255, 255]);
    const titleLines = doc.splitTextToSize(pdfText(p.meta.title), CW);
    doc.text(titleLines.slice(0, 2), MG, 22);
    setFont(9.5, 'normal', [220, 230, 242]);
    doc.text(pdfText('Tujuan: ' + M.nodeById(p, M.ROOT).name).slice(0, 120), MG, 34);
    y = 48;
    const metaRows = [
      ['Tanggal', R.dateLabel],
      ['Metode bobot', AHP.METHOD_LABELS[p.settings.method]],
      ['Mode sintesis', p.settings.synthesis === 'ideal' ? 'Ideal (prioritas lokal dibagi nilai maksimum)' : 'Distributive (prioritas lokal berjumlah 1)'],
      ['Batas konsistensi', 'CR <= ' + fmt.num(p.settings.crThreshold, 2)],
      ['Cakupan penilaian', R.scopeLabel],
      ['Jumlah kriteria / alternatif', `${p.nodes.length - 1} kriteria (${synth.leaves.length} kriteria penilai) / ${p.alternatives.length} alternatif`]
    ];
    if (p.meta.author) metaRows.unshift(['Disusun oleh', p.meta.author]);
    table(['Keterangan', 'Nilai'], metaRows, { extra: { columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold' } } } });
    if (p.meta.description) para(p.meta.description, 9.5, MUTED);

    // --- Kesimpulan
    const hasAlts = synth.final.length >= 2;
    if (hasAlts) {
      const best = R.rankingOrder[0];
      const second = R.rankingOrder[1];
      para(`Kesimpulan: alternatif terbaik adalah ${p.alternatives[best].name} dengan prioritas ${fmt.pct(synth.final[best], 2)}, unggul ${fmt.num((synth.final[best] - synth.final[second]) * 100, 2)} poin persentase atas ${p.alternatives[second].name}.`, 10.5, NAVY, 'bold');
    }
    const bad = comp.sets.filter((s) => s.mode === 'pairwise' && comp.results[s.key].analysis.CR > p.settings.crThreshold);
    if (bad.length) para(`Perhatian: ${bad.length} matriks memiliki CR di atas ${fmt.num(p.settings.crThreshold, 2)} sehingga penilaiannya perlu ditinjau ulang: ${bad.map((s) => M.setLabel(p, s)).join('; ')}.`, 9.5, [176, 40, 40]);
    const incomplete = comp.issues.filter((x) => x.type === 'missing' || x.type === 'data');
    if (incomplete.length) para(`Catatan: ${incomplete.length} set penilaian belum lengkap. Penilaian kosong dilengkapi metode Harker; data kosong dianggap sama rata.`, 9.5, MUTED);

    tick('Struktur hierarki');
    heading('Struktur hierarki');
    await image(R.charts.hierarchy, 'Gambar: struktur hierarki keputusan. L = bobot lokal, G = bobot global.', 150);

    if (hasAlts) {
      tick('Hasil akhir');
      heading('Hasil akhir: prioritas alternatif');
      table(['Peringkat', 'Alternatif', 'Prioritas', 'Persentase'], R.rankingOrder.map((k, r) => [r + 1, p.alternatives[k].name, fmt.num(synth.final[k], 4), fmt.pct(synth.final[k], 2)]),
        { extra: { columnStyles: { 0: { halign: 'center', cellWidth: 22 }, 2: { halign: 'right' }, 3: { halign: 'right' } } } });
      await image(R.charts.ranking, 'Gambar: prioritas akhir alternatif.', 90);
      await image(R.charts.contribution, 'Gambar: kontribusi tiap kriteria utama terhadap prioritas alternatif.', 110);
    }

    tick('Bobot kriteria');
    heading('Bobot kriteria');
    const wRows = [];
    for (const { id, depth } of M.preorder(p)) {
      if (id === M.ROOT) continue;
      wRows.push([' '.repeat((depth - 1) * 4) + M.nodeById(p, id).name, depth, fmt.num(R.localOf(id), 4), fmt.num(synth.global[id], 4), fmt.pct(synth.global[id], 2)]);
    }
    table(['Kriteria', 'Level', 'Bobot lokal', 'Bobot global', 'Persentase'], wRows, { extra: { columnStyles: { 1: { halign: 'center', cellWidth: 14 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } } } });
    await image(R.charts.sunburst, 'Gambar: bobot global kriteria (diagram sunburst).', 110);
    if (R.charts.globalWeights) await image(R.charts.globalWeights, 'Gambar: bobot global kriteria penilai.', 120);

    if (hasAlts && synth.leaves.length > 1) {
      heading('Prioritas lokal alternatif per kriteria');
      const leaves = synth.leaves;
      const chunk = 5;
      for (let s0 = 0; s0 < leaves.length; s0 += chunk) {
        const part = leaves.slice(s0, s0 + chunk);
        table(['Alternatif'].concat(part.map((l) => `${M.nodeById(p, l).name} (${fmt.pct(synth.global[l], 1)})`)),
          p.alternatives.map((a, k) => [a.name].concat(part.map((l) => fmt.num(comp.altLocal[l][k], 4)))),
          { fontSize: 8, extra: { columnStyles: Object.fromEntries(part.map((_, i) => [i + 1, { halign: 'right' }])) } });
      }
    }

    tick('Konsistensi');
    heading('Uji konsistensi');
    const kc = comp.sets.filter((s) => s.mode === 'pairwise').map((s) => {
      const a = comp.results[s.key].analysis;
      return [M.setLabel(p, s), a.n, `${a.total - a.missing}/${a.total}`, fmt.num(a.lambdaMax, 4), fmt.num(a.CI, 4), fmt.num(a.RI, 2), fmt.num(a.CR, 4),
        { content: a.CR > p.settings.crThreshold ? 'Tidak konsisten' : 'Konsisten', styles: { textColor: a.CR > p.settings.crThreshold ? [176, 40, 40] : [17, 112, 58], fontStyle: 'bold' } }];
    });
    if (kc.length) {
      table(['Matriks', 'n', 'Terisi', 'lambda maks', 'CI', 'RI', 'CR', 'Status'], kc, { fontSize: 8, extra: { columnStyles: { 1: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } } } });
      await image(R.charts.consistency, null, 100);
    } else para('Tidak ada matriks perbandingan berpasangan.', 9.5, MUTED);

    if (R.charts.participants && p.participants.length > 1) {
      heading('Analisis kelompok');
      para('Penilaian gabungan dihitung dengan rata-rata geometrik berbobot dari penilaian peserta yang disertakan (aggregation of individual judgments). Titik abu-abu = peserta, titik biru = gabungan.', 9.5, MUTED);
      table(['Peserta', 'Bobot suara', 'Disertakan', 'Terisi', 'CR maks'], R.summaries.map((s) => [s.participant.name, fmt.num(s.participant.weight, 2), s.participant.include ? 'Ya' : 'Tidak', `${s.total - s.missing}/${s.total}`,
        { content: fmt.num(s.maxCR, 4), styles: { textColor: s.maxCR > p.settings.crThreshold ? [176, 40, 40] : INK } }]));
      await image(R.charts.participants, 'Gambar: sebaran bobot kriteria utama antar peserta.', 110);
    }

    if (hasAlts && R.sensitivity && R.sensitivity.length) {
      tick('Sensitivitas');
      heading('Analisis sensitivitas');
      para('Setiap grafik gradien menunjukkan perubahan prioritas akhir bila bobot satu kriteria utama diubah dari 0% hingga 100%, sementara kriteria lain diskalakan proporsional. Garis tegak = bobot saat ini; area biru muda = rentang ketika alternatif teratas tidak berubah.', 9.5, MUTED);
      table(['Kriteria', 'Bobot saat ini', 'Teratas', 'Rentang stabil', 'Pengganti di batas'], R.sensitivity.map((s) => {
        const t = s.stability;
        const repl = [t.loBy !== null ? `< ${fmt.pct(t.lo, 1)}: ${p.alternatives[t.loBy].name}` : null, t.hiBy !== null ? `> ${fmt.pct(t.hi, 1)}: ${p.alternatives[t.hiBy].name}` : null].filter(Boolean).join('; ') || 'Tidak berubah pada 0–100%';
        return [s.name, fmt.pct(t.x0, 1), p.alternatives[t.top].name, `${fmt.pct(t.lo, 1)} – ${fmt.pct(t.hi, 1)}`, repl];
      }), { fontSize: 8 });
      await image(R.charts.performance, 'Gambar: sensitivitas performa (batang = bobot kriteria, titik = prioritas alternatif).', 105);
      for (const s of R.sensitivity) await image(s.chart, `Gambar: sensitivitas gradien terhadap ${s.name}.`, 92);
      if (R.charts.headToHead) await image(R.charts.headToHead, 'Gambar: perbandingan head-to-head dua alternatif teratas.', 90);
    }

    tick('Detail matriks');
    heading('Lampiran: langkah perhitungan tiap matriks');
    para('Langkah: (1) isi matriks perbandingan A dengan skala Saaty 1–9 dan kebalikannya; (2) jumlahkan tiap kolom; (3) bagi tiap sel dengan jumlah kolomnya (normalisasi) dan rata-ratakan per baris; (4) hitung bobot prioritas w; (5) hitung A·w dan (A·w)/w; (6) lambda maks = rata-rata (A·w)/w, CI = (lambda maks - n)/(n - 1), CR = CI/RI.', 9, MUTED);
    for (const set of comp.sets) {
      const res = comp.results[set.key];
      if (set.mode === 'data') {
        const node = M.nodeById(p, set.nodeId);
        ensure(Math.min(120, (set.items.length + 1) * 6.5 + 20));
        sub(M.setLabel(p, set) + ` — data ${node.dataType === 'cost' ? 'cost' : 'benefit'}${node.unit ? ' (' + node.unit + ')' : ''}`);
        table(['Alternatif', 'Nilai', node.dataType === 'cost' ? '1 / nilai' : 'Nilai', 'Prioritas'], set.items.map((a, i) => {
          const v = res.values[i];
          const raw = v === null ? '–' : fmt.num(v, 6).replace(/([.,]\d*?)0+$/, '$1').replace(/[.,]$/, '');
          return [a.name, raw, v === null ? '–' : fmt.num(node.dataType === 'cost' ? 1 / v : v, 4), res.priority ? fmt.num(res.priority[i], 4) : '–'];
        }), { fontSize: 8 });
        continue;
      }
      const a = res.analysis, n = set.items.length, names = set.items.map((x) => x.name);
      const fs = n <= 5 ? 8 : n <= 8 ? 7 : 6;
      // satu blok matriks (judul + dua tabel + ringkasan) diusahakan berada di satu halaman
      ensure(Math.min(170, 2 * (n + 2) * 6 + 34));
      sub(M.setLabel(p, set));
      const numCols = Object.fromEntries(names.map((_, j) => [j + 1, { halign: 'right' }]));
      table([''].concat(names), a.full.map((row, i) => [names[i]].concat(row.map((v) => (fmt.judg ? fmt.judg(v) : AHP.formatJudgment(v, 3))))).concat([[{ content: 'Jumlah', styles: { fontStyle: 'bold' } }].concat(a.colSums.map((v) => ({ content: fmt.num(v, 4), styles: { fontStyle: 'bold' } })))]),
        { fontSize: fs, extra: { columnStyles: Object.assign({ 0: { fontStyle: 'bold' } }, numCols) } });
      table(['Normalisasi'].concat(names, ['Rata-rata baris', 'Bobot w', 'A·w', '(A·w)/w']), a.normalized.map((row, i) => [names[i]].concat(row.map((v) => fmt.num(v, 4)), [fmt.num(a.ncaWeights[i], 4), { content: fmt.num(a.w[i], 4), styles: { fontStyle: 'bold' } }, fmt.num(a.Aw[i], 4), fmt.num(a.cv[i], 4)])),
        { fontSize: fs, extra: { columnStyles: Object.assign({ 0: { fontStyle: 'bold' } }, Object.fromEntries(names.concat([1, 2, 3, 4]).map((_, j) => [j + 1, { halign: 'right' }]))) } });
      const status = a.CR > p.settings.crThreshold ? 'TIDAK KONSISTEN' : 'konsisten';
      para(`lambda maks = ${fmt.num(a.lambdaMax, 4)};  CI = ${fmt.num(a.CI, 4)};  RI = ${fmt.num(a.RI, 2)};  CR = ${fmt.num(a.CR, 4)} -> ${status}.${a.missing ? ` ${a.missing} penilaian kosong dilengkapi dengan rasio bobot (metode Harker).` : ''}${p.settings.method === 'eigen' ? ' Bobot w = vektor eigen utama; rata-rata baris ditampilkan sebagai pembanding manual.' : ''}`, 8.5, a.CR > p.settings.crThreshold ? [176, 40, 40] : INK);
    }

    // --- Footer & nomor halaman
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setDrawColor.apply(doc, LINE);
      doc.setLineWidth(0.2);
      doc.line(MG, PH - 12, PW - MG, PH - 12);
      setFont(7.5, 'normal', MUTED);
      doc.text(pdfText(`Dihitung dengan ${TOOL_NAME} — ${TOOL_URL}`), MG, PH - 8);
      doc.text(`${i} / ${pages}`, PW - MG, PH - 8, { align: 'right' });
    }
    return doc.output('blob');
  }

  return {
    TOOL_URL, TOOL_NAME, download, safeFileName, csvString, parseCSV, judgmentRows, importJudgmentsCSV,
    crc32, zip, buildXlsx, workbookFromReport, svgToPng, buildPdf, pdfText
  };
}));
