/*!
 * AHP Decision Engine — antarmuka
 * (c) 2026 Alfredo Garcia / NusaIT — MIT License
 */
(function () {
  'use strict';

  const AHP = window.AHPCore, M = window.AHPModel, C = window.AHPCharts, X = window.AHPExport;
  const ROOT = M.ROOT;

  const STEPS = [
    { id: 'model', label: 'Model' },
    { id: 'judge', label: 'Penilaian' },
    { id: 'results', label: 'Hasil' },
    { id: 'sens', label: 'Sensitivitas' },
    { id: 'report', label: 'Laporan & unduh' }
  ];

  const S = {
    p: null, rev: 0, cache: new Map(),
    ui: {
      step: 'model', setKey: null, view: 'scale', viewCombined: false, scope: 'combined',
      sensNode: ROOT, sensTab: 'dynamic', whatIf: null, gradIdx: 0, h2h: null, xy: [0, 1]
    },
    chartDefs: {}, charts: {}, respondent: null, focusKey: null, shareLink: ''
  };

  /* ================================================================== *
   * Utilitas
   * ================================================================== */

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = C.esc;

  const ICON = {
    plus: 'M12 5v14M5 12h14',
    sub: 'M6 4v10a3 3 0 0 0 3 3h9M14 13l4 4-4 4',
    up: 'M12 19V5M6 11l6-6 6 6',
    down: 'M12 5v14M6 13l6 6 6-6',
    indent: 'M4 5h16M11 12h9M11 19h9M4 9.5l3.5 2.5L4 14.5',
    outdent: 'M4 5h16M11 12h9M11 19h9M7.5 9.5 4 12l3.5 2.5',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
    image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5h.01',
    table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
    help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.6 9a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.6M12 17h.01',
    x: 'M6 6l12 12M18 6 6 18',
    check: 'M5 12.5l4.5 4.5L19 7',
    alert: 'M12 8v5M12 16.5h.01M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    copy: 'M8 8h11v11H8zM5 16V5h11',
    file: 'M6 3h8l4 4v14H6zM14 3v4h4',
    folder: 'M3 6h6l2 2h10v11H3z',
    spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
    arrowR: 'M5 12h14M13 6l6 6-6 6',
    arrowL: 'M19 12H5M11 6l-6 6 6 6',
    reset: 'M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6',
    users: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.9M15.5 3.2a3.5 3.5 0 0 1 0 6.6',
    print: 'M7 9V4h10v5M7 17H5v-6h14v6h-2M7 14h10v6H7z'
  };
  const icon = (name, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${ICON[name]}"/></svg>`;

  function num(x, d) { return C.num(x, d === undefined ? S.p.settings.decimals : d); }
  function pct(x, d) { return C.pct(x, d === undefined ? 2 : d); }
  function judgText(v) {
    if (v === null || v === undefined) return '';
    const s = AHP.formatJudgment(v, 2);
    return S.p.settings.decimalSep === ',' ? s.replace('.', ',') : s;
  }
  function parseNum(s) {
    if (s === null || s === undefined) return null;
    const t = String(s).trim().replace(/\s/g, '');
    if (t === '') return null;
    // 1.234,5 / 1,234.5 / 1234,5 / 1234.5
    let norm = t;
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) norm = t.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) norm = t.replace(/,/g, '');
    else norm = t.replace(',', '.');
    const v = Number(norm);
    return isFinite(v) ? v : NaN;
  }
  function theme() { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? C.THEMES.dark : C.THEMES.light; }
  function today() {
    try { return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return new Date().toISOString().slice(0, 10); }
  }

  /* ================================================================== *
   * State
   * ================================================================== */

  let saveTimer = null;
  function touch(rerender) {
    S.rev++;
    S.cache.clear();
    S.ui.whatIf = null;
    scheduleSave();
    if (rerender) render();
  }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 300); }
  function saveNow() {
    clearTimeout(saveTimer);
    if (S.respondent) {
      try { localStorage.setItem(respStoreKey(), JSON.stringify({ name: S.respondent.name, judgments: S.p.judgments[S.p.activeParticipant] || {} })); } catch (e) { /* abaikan */ }
      return;
    }
    S.p.meta.updatedAt = new Date().toISOString();
    const ok = M.saveLocal(S.p);
    const el = $('#save-state');
    if (el) el.textContent = ok ? 'Tersimpan di browser ini' : 'Penyimpanan browser penuh — unduh proyek (.json)';
  }

  function comp(scope) {
    scope = scope || 'combined';
    if (!S.cache.has(scope)) S.cache.set(scope, M.compute(S.p, scope));
    return S.cache.get(scope);
  }

  function resultScope() {
    const s = S.ui.scope;
    return s === 'combined' || S.p.participants.some((x) => x.id === s) ? s : 'combined';
  }
  function scopeLabel(scope) {
    if (scope === 'combined') return S.p.participants.length > 1 ? `Gabungan ${M.includedParticipants(S.p).length} peserta (rata-rata geometrik)` : S.p.participants[0].name;
    const part = S.p.participants.find((x) => x.id === scope);
    return part ? part.name : scope;
  }
  function judgeScope() { return S.ui.viewCombined ? 'combined' : S.p.activeParticipant; }

  function localOf(c, id) {
    const n = M.nodeById(S.p, id);
    if (!n || n.parentId === null) return 1;
    const sib = c.children[n.parentId];
    const w = c.local[n.parentId];
    return w ? w[sib.indexOf(id)] : 1 / sib.length;
  }
  function topIndexMap(c) {
    const out = {};
    const tops = c.children[ROOT];
    (function walk(id, t) { out[id] = t; (c.children[id] || []).forEach((k) => walk(k, t === -1 ? tops.indexOf(k) : t)); }(ROOT, -1));
    out[ROOT] = 0;
    return out;
  }
  function rankingOrder(c) { return c.synth.final.map((_, k) => k).sort((a, b) => c.synth.final[b] - c.synth.final[a]); }

  function sets() {
    const all = M.comparisonSets(S.p);
    return S.respondent ? all.filter((s) => s.mode === 'pairwise') : all;
  }

  /* ================================================================== *
   * Toast, modal, tooltip
   * ================================================================== */

  function toast(msg, kind, action) {
    const box = $('#toasts');
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || 'info');
    t.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    t.innerHTML = `${icon(kind === 'error' ? 'alert' : 'check')}<span>${esc(msg)}</span>`;
    if (action) {
      const b = document.createElement('button');
      b.className = 'toast-act';
      b.textContent = action.label;
      b.addEventListener('click', () => { action.run(); t.remove(); });
      t.appendChild(b);
    }
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), action ? 7000 : 4200);
    setTimeout(() => t.remove(), action ? 7400 : 4600);
  }

  let lastFocus = null;
  let pendingConfirm = null;
  function openModal(html, opts) {
    if (pendingConfirm) { const r = pendingConfirm; pendingConfirm = null; r(false); }
    const m = $('#modal');
    lastFocus = document.activeElement;
    $('#modal-body').innerHTML = html;
    $('#modal-card').className = 'modal-card' + (opts && opts.wide ? ' wide' : '');
    m.hidden = false;
    requestAnimationFrame(() => {
      m.classList.add('open');
      const first = $('#modal-body [autofocus]') || $('#modal-body button, #modal-body input, #modal-body select, #modal-body a') || $('#modal-close');
      if (first) first.focus();
    });
  }
  function closeModal(answer) {
    const m = $('#modal');
    m.classList.remove('open');
    m.hidden = true;
    $('#modal-body').innerHTML = '';
    if (pendingConfirm) { const r = pendingConfirm; pendingConfirm = null; r(answer === true); }
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
  }
  function confirmBox(message, okLabel, danger) {
    return new Promise((resolve) => {
      openModal(`<h2 class="modal-title">Konfirmasi</h2><p class="modal-text">${esc(message)}</p>
        <div class="modal-actions"><button class="btn" data-act="confirm-no">Batal</button><button class="btn ${danger ? 'danger' : 'primary'}" data-act="confirm-yes" autofocus>${esc(okLabel || 'Lanjutkan')}</button></div>`);
      pendingConfirm = resolve;
    });
  }

  function showTip(target, x, y) {
    const tip = $('#tip');
    tip.textContent = target.getAttribute('data-tip');
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
    tip.style.left = Math.max(8, left) + 'px';
    tip.style.top = Math.max(8, top) + 'px';
  }
  function hideTip() { $('#tip').hidden = true; }

  /* ================================================================== *
   * Render utama
   * ================================================================== */

  function render() {
    const active = document.activeElement;
    const fk = S.focusKey || (active && active.dataset ? active.dataset.fk : null);
    const sel = active && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
    S.focusKey = null;
    S.chartDefs = {};
    renderChrome();
    const main = $('#main');
    main.dataset.step = S.ui.step;
    main.innerHTML = renderStep();
    afterRender(main);
    if (fk) {
      const el = $(`[data-fk="${CSS.escape(fk)}"]`);
      if (el) {
        el.focus({ preventScroll: true });
        if (sel && typeof el.setSelectionRange === 'function' && el === document.activeElement) {
          try { el.setSelectionRange(Math.min(sel[0], el.value.length), Math.min(sel[1], el.value.length)); } catch (e) { /* tipe input tanpa seleksi */ }
        }
      }
    }
  }

  function renderChrome() {
    const title = $('#project-title');
    if (document.activeElement !== title) title.value = S.p.meta.title;
    title.readOnly = !!S.respondent;
    document.title = (S.p.meta.title ? S.p.meta.title + ' — ' : '') + 'AHP Decision Engine';
    $('#topbar-actions').hidden = !!S.respondent;
    const nav = $('#steps');
    if (S.respondent) {
      nav.innerHTML = `<div class="resp-badge">${icon('users')}<span>Mode responden kuesioner</span></div>`;
      return;
    }
    nav.innerHTML = '<ol>' + STEPS.map((s, i) => `<li><button class="step${S.ui.step === s.id ? ' on' : ''}" data-act="goto" data-step="${s.id}" ${S.ui.step === s.id ? 'aria-current="step"' : ''}><span class="step-no">${i + 1}</span><span class="step-label">${s.label}</span></button></li>`).join('') + '</ol>';
  }

  function renderStep() {
    if (S.respondent) return S.ui.step === 'submit' ? renderSubmit() : renderJudge();
    switch (S.ui.step) {
      case 'judge': return renderJudge();
      case 'results': return renderResults();
      case 'sens': return renderSens();
      case 'report': return renderReport();
      default: return renderModel();
    }
  }

  function afterRender(root) {
    mountCharts(root);
    $$('.cmp', root).forEach(paintRow);
  }

  /* ================================================================== *
   * Diagram (kartu)
   * ================================================================== */

  function chartCard(id, title, desc, build, opts) {
    opts = opts || {};
    S.chartDefs[id] = { build, title, file: opts.file || id, scroll: !!opts.scroll };
    return `<figure class="chart-card${opts.wide ? ' wide' : ''}" data-chart="${id}">
      <figcaption>
        <div class="chart-cap"><h3>${esc(title)}</h3>${desc ? `<p>${desc}</p>` : ''}</div>
        <div class="chart-tools">
          <button class="btn ghost sm" data-act="chart-png" data-id="${id}" title="Unduh gambar PNG">${icon('download')}PNG</button>
          <button class="btn ghost sm" data-act="chart-svg" data-id="${id}" title="Unduh gambar vektor SVG">SVG</button>
          <button class="btn ghost sm" data-act="chart-table" data-id="${id}" aria-expanded="false">${icon('table')}Tabel</button>
        </div>
      </figcaption>
      <div class="chart-svg${opts.scroll ? ' scroll' : ''}" data-svg="${id}"></div>
      <div class="chart-table" hidden></div>
    </figure>`;
  }

  function tableHTML(t) {
    if (!t) return '';
    return `<div class="table-wrap"><table class="data"><thead><tr>${t.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function mountCharts(root) {
    $$('[data-chart]', root).forEach((fig) => mountChart(fig));
  }

  function mountChart(fig) {
    const id = fig.dataset.chart;
    const def = S.chartDefs[id];
    if (!def) return;
    const box = fig.querySelector('.chart-svg');
    const width = Math.max(300, Math.floor(box.clientWidth || fig.clientWidth || 640));
    let ch = null;
    try { ch = def.build(width, theme()); } catch (e) { console.error(e); }
    if (!ch) { box.innerHTML = '<p class="empty">Belum ada data untuk diagram ini.</p>'; return; }
    S.charts[id] = ch;
    box.innerHTML = ch.svg;
    if (def.scroll && ch.width > width) {
      // Diagram lebar: skalakan bila masih terbaca, selain itu gulir ke tengah (akar hierarki)
      const svg = box.querySelector('svg');
      if (width / ch.width >= 0.6) { svg.style.maxWidth = '100%'; svg.style.width = '100%'; }
      else requestAnimationFrame(() => { box.scrollLeft = (box.scrollWidth - box.clientWidth) / 2; });
    }
    const tbl = fig.querySelector('.chart-table');
    if (!tbl.hidden) tbl.innerHTML = tableHTML(ch.table);
  }

  async function exportChart(id, kind) {
    const def = S.chartDefs[id];
    if (!def) return;
    const box = $(`[data-svg="${id}"]`);
    const width = Math.max(760, box ? box.clientWidth : 760);
    const ch = def.build(width, C.THEMES.light);
    const name = X.safeFileName(S.p.meta.title + '-' + def.file);
    if (kind === 'svg') { X.download(name + '.svg', ch.svg, 'image/svg+xml'); return; }
    try {
      const png = await X.svgToPng(ch.svg, ch.width, ch.height, 2);
      X.download(name + '.png', png.blob);
    } catch (e) { toast(e.message, 'error'); }
  }

  /* --- pembangun diagram (dipakai layar & laporan) --- */

  function hierarchyData(c) {
    const p = S.p;
    const nodes = M.preorder(p).map(({ id, depth }) => Object.assign({}, M.nodeById(p, id), { depth }));
    const local = {};
    nodes.forEach((n) => { if (n.id !== ROOT) local[n.id] = localOf(c, n.id); });
    const order = c.synth.final.length ? rankingOrder(c) : [];
    const alts = p.alternatives.map((a, k) => ({ name: a.name, priority: c.synth.final.length ? c.synth.final[k] : null, rank: order.indexOf(k) + 1 }));
    return { nodes, children: c.children, local, global: c.synth.global, topIndex: topIndexMap(c), alts, pathOf: (id) => M.pathNames(p, id).slice(1).join(' › ') };
  }

  const CH = {
    hierarchy: (c) => (w, t) => C.hierarchy(hierarchyData(c), t, { minWidth: w }),
    ranking: (c) => (w, t) => (c.synth.final.length >= 1 ? C.ranking(S.p.alternatives.map((a, k) => ({ name: a.name, value: c.synth.final[k] })), t, { width: w }) : null),
    contribution: (c) => (w, t) => {
      if (!c.synth.final.length) return null;
      const tops = c.children[ROOT].length ? c.children[ROOT] : [ROOT];
      return C.contribution({
        alts: S.p.alternatives, tops: tops.map((id) => ({ name: M.nodeById(S.p, id).name })),
        contrib: tops.map((id) => c.synth.contribTop[id]), final: c.synth.final
      }, t, { width: w });
    },
    sunburst: (c) => (w, t) => {
      if (!c.children[ROOT].length) return null;
      const nodes = M.preorder(S.p).map(({ id, depth }) => Object.assign({}, M.nodeById(S.p, id), { depth }));
      return C.sunburst({ nodes, children: c.children, global: c.synth.global, topIndex: topIndexMap(c), rootName: M.nodeById(S.p, ROOT).name }, t, { width: w });
    },
    globalWeights: (c) => (w, t) => {
      if (!c.children[ROOT].length) return null;
      const ti = topIndexMap(c);
      const items = c.synth.leaves.map((id) => {
        const n = M.nodeById(S.p, id);
        return { name: n.name, parent: n.parentId && n.parentId !== ROOT ? M.nodeById(S.p, n.parentId).name : '', value: c.synth.global[id], top: ti[id] };
      });
      return C.globalWeights(items, c.children[ROOT].map((id) => ({ name: M.nodeById(S.p, id).name })), t, { width: w });
    },
    consistency: (c) => (w, t) => {
      const items = c.sets.filter((s) => s.mode === 'pairwise' && s.items.length >= 3).map((s) => ({ label: M.setLabel(S.p, s, true), CR: c.results[s.key].analysis.CR }));
      return items.length ? C.consistency(items, S.p.settings.crThreshold, t, { width: w }) : null;
    },
    participants: (summ, c) => (w, t) => {
      const tops = c.children[ROOT];
      if (tops.length < 2 || summ.length < 2) return null;
      return C.participants({
        criteria: tops.map((id) => ({ name: M.nodeById(S.p, id).name })),
        people: summ.filter((s) => s.participant.include).map((s) => ({ name: s.participant.name, w: s.compute.local[ROOT] })),
        combined: c.local[ROOT]
      }, t, { width: w });
    }
  };

  function sensModel(c, nodeId) {
    return AHP.sensitivityModel(nodeId, c.children, c.local, c.synth);
  }
  function currentWhatIf(sm) {
    const wi = S.ui.whatIf;
    if (wi && wi.node === sm.nodeId && wi.rev === S.rev && wi.scope === resultScope()) return wi.w;
    return sm.w0.slice();
  }
  function kidNames(sm) { return sm.kids.map((id) => ({ name: M.nodeById(S.p, id).name })); }

  CH.performance = (sm, w0, draggable) => (w, t) => C.performance({ kids: kidNames(sm), w: w0, perf: AHP.sensPerformance(sm), final: AHP.sensFinal(sm, w0), alts: S.p.alternatives }, t, { width: w, draggable: !!draggable });
  CH.gradient = (sm, idx, wBase) => (w, t) => {
    const g = AHP.gradientCurves(sm, idx, wBase, 100);
    const st = AHP.stabilityInterval(sm, idx, wBase);
    const valueAt = (k, x) => AHP.sensFinal(sm, AHP.adjustWeights(wBase, idx, x))[k];
    return C.gradient({ critName: M.nodeById(S.p, sm.kids[idx]).name, xs: g.xs, series: g.series, x0: wBase[idx], alts: S.p.alternatives, stability: st, crossings: st.crossings, valueAt }, t, { width: w });
  };
  CH.headToHead = (sm, wv, a, b) => (w, t) => {
    const h = AHP.headToHead(sm, wv, a, b);
    return C.headToHead({ kids: kidNames(sm), rows: h.rows, overall: h.overall, outside: h.outside, altA: S.p.alternatives[a].name, altB: S.p.alternatives[b].name }, t, { width: w });
  };
  CH.scatter = (sm, ix, iy) => (w, t) => {
    const perf = AHP.sensPerformance(sm);
    return C.scatter2D({ xName: M.nodeById(S.p, sm.kids[ix]).name, yName: M.nodeById(S.p, sm.kids[iy]).name, points: S.p.alternatives.map((a, k) => ({ name: a.name, x: perf[ix][k], y: perf[iy][k] })) }, t, { width: w });
  };

  /* ================================================================== *
   * Langkah 1 — Model
   * ================================================================== */

  function renderModel() {
    const p = S.p;
    const ch = M.childrenMap(p);
    const rows = M.preorder(p).filter((x) => x.id !== ROOT).map(({ id, depth }) => {
      const n = M.nodeById(p, id);
      const kids = ch[id].length;
      const siblings = ch[n.parentId];
      const idx = siblings.indexOf(id);
      const tag = kids ? `${kids} sub` : (p.alternatives.length >= 2 ? (n.altMode === 'data' ? `data ${n.dataType}` : 'berpasangan') : '');
      return `<li class="tree-row" style="--depth:${depth}" data-id="${id}">
        <span class="tree-guide" aria-hidden="true"></span>
        <input class="tree-name" type="text" value="${esc(n.name)}" maxlength="160" data-bind="node-name" data-id="${id}" data-fk="node:${id}" aria-label="Nama kriteria level ${depth}">
        ${tag ? `<span class="tag">${esc(tag)}</span>` : ''}
        <span class="tree-actions">
          <button class="icon-btn" data-act="node-add-child" data-id="${id}" title="Tambah sub-kriteria" aria-label="Tambah sub-kriteria di bawah ${esc(n.name)}" ${depth >= 4 || kids >= AHP.MAX_N ? 'disabled' : ''}>${icon('sub')}</button>
          <button class="icon-btn" data-act="node-up" data-id="${id}" title="Naikkan" aria-label="Naikkan ${esc(n.name)}" ${idx === 0 ? 'disabled' : ''}>${icon('up')}</button>
          <button class="icon-btn" data-act="node-down" data-id="${id}" title="Turunkan" aria-label="Turunkan ${esc(n.name)}" ${idx === siblings.length - 1 ? 'disabled' : ''}>${icon('down')}</button>
          <button class="icon-btn" data-act="node-indent" data-id="${id}" title="Jadikan sub-kriteria dari kriteria di atasnya" aria-label="Jadikan ${esc(n.name)} sub-kriteria" ${idx === 0 || depth >= 4 ? 'disabled' : ''}>${icon('indent')}</button>
          <button class="icon-btn" data-act="node-outdent" data-id="${id}" title="Naikkan satu level" aria-label="Naikkan level ${esc(n.name)}" ${depth <= 1 ? 'disabled' : ''}>${icon('outdent')}</button>
          <button class="icon-btn danger" data-act="node-del" data-id="${id}" title="Hapus" aria-label="Hapus ${esc(n.name)}">${icon('trash')}</button>
        </span>
      </li>`;
    }).join('');

    const alts = p.alternatives.map((a, i) => `<li class="list-row">
      <span class="row-no">${i + 1}</span>
      <input type="text" value="${esc(a.name)}" maxlength="160" data-bind="alt-name" data-id="${a.id}" data-fk="alt:${a.id}" aria-label="Nama alternatif ${i + 1}">
      <span class="row-actions">
        <button class="icon-btn" data-act="alt-up" data-id="${a.id}" aria-label="Naikkan ${esc(a.name)}" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
        <button class="icon-btn danger" data-act="alt-del" data-id="${a.id}" aria-label="Hapus ${esc(a.name)}">${icon('trash')}</button>
      </span></li>`).join('');

    const summ = p.participants.length > 1 ? M.participantSummaries(p) : null;
    const parts = p.participants.map((x, i) => {
      const sm = summ ? summ[i] : null;
      const badge = sm ? (sm.total ? `<span class="tag ${sm.maxCR > p.settings.crThreshold ? 'bad' : ''}">${sm.total - sm.missing}/${sm.total}${sm.total - sm.missing ? `, CR maks ${num(sm.maxCR, 3)}` : ''}</span>` : '') : '';
      return `<li class="list-row part-row">
        <input type="text" value="${esc(x.name)}" maxlength="80" data-bind="part-name" data-id="${x.id}" data-fk="part:${x.id}" aria-label="Nama peserta ${i + 1}">
        <label class="mini-field" title="Bobot suara pada penggabungan">bobot<input type="text" inputmode="decimal" value="${esc(num(x.weight, 2).replace(/[,.]00$/, ''))}" data-bind="part-weight" data-id="${x.id}" data-fk="pw:${x.id}" aria-label="Bobot suara ${esc(x.name)}"></label>
        <label class="check" title="Sertakan dalam penilaian gabungan"><input type="checkbox" data-bind="part-include" data-id="${x.id}" ${x.include ? 'checked' : ''}><span>ikut</span></label>
        ${badge}
        <span class="row-actions">
          <button class="btn sm ${p.activeParticipant === x.id ? 'primary' : 'ghost'}" data-act="part-judge" data-id="${x.id}">${p.activeParticipant === x.id ? 'Sedang menilai' : 'Nilai'}</button>
          <button class="icon-btn danger" data-act="part-del" data-id="${x.id}" aria-label="Hapus ${esc(x.name)}" ${p.participants.length <= 1 ? 'disabled' : ''}>${icon('trash')}</button>
        </span></li>`;
    }).join('');

    const st = p.settings;
    const c = comp('combined');
    return `
    <div class="page-head">
      <div>
        <h1>Susun model keputusan</h1>
        <p>Tulis tujuan, pecah menjadi kriteria dan sub-kriteria, lalu daftarkan alternatif yang dipilih. Alternatif boleh dikosongkan bila Anda hanya perlu bobot kriteria.</p>
      </div>
    </div>
    <div class="model-grid">
      <section class="panel" aria-labelledby="h-tree">
        <div class="panel-head"><h2 id="h-tree">Tujuan dan kriteria</h2><span class="hint">Saaty menyarankan maksimal 7–9 anak per kriteria.</span></div>
        <label class="field goal-field"><span>Tujuan keputusan</span>
          <input type="text" value="${esc(M.nodeById(p, ROOT).name)}" maxlength="160" data-bind="node-name" data-id="${ROOT}" data-fk="node:${ROOT}"></label>
        <ol class="tree">${rows || '<li class="empty">Belum ada kriteria.</li>'}</ol>
        <button class="btn" data-act="node-add-child" data-id="${ROOT}" ${M.childrenMap(p)[ROOT].length >= AHP.MAX_N ? 'disabled' : ''}>${icon('plus')}Tambah kriteria utama</button>
      </section>
      <div class="side-col">
        <section class="panel" aria-labelledby="h-alt">
          <div class="panel-head"><h2 id="h-alt">Alternatif</h2><span class="hint">${p.alternatives.length} pilihan</span></div>
          <ol class="list">${alts || '<li class="empty">Belum ada alternatif. Hasil akan berupa bobot kriteria saja.</li>'}</ol>
          <button class="btn" data-act="alt-add" ${p.alternatives.length >= AHP.MAX_N ? 'disabled' : ''}>${icon('plus')}Tambah alternatif</button>
        </section>
        <section class="panel" aria-labelledby="h-part">
          <div class="panel-head"><h2 id="h-part">Peserta penilai</h2><span class="hint">${p.participants.length > 1 ? 'digabung rata-rata geometrik' : 'tambah untuk penilaian kelompok'}</span></div>
          <ol class="list">${parts}</ol>
          <div class="row-buttons">
            <button class="btn" data-act="part-add">${icon('plus')}Tambah peserta</button>
            <button class="btn ghost" data-act="goto" data-step="report" data-focus="share">${icon('link')}Kirim kuesioner ke responden</button>
          </div>
        </section>
        <section class="panel" aria-labelledby="h-set">
          <div class="panel-head"><h2 id="h-set">Pengaturan perhitungan</h2></div>
          <div class="settings">
            <label class="field"><span>Metode bobot prioritas</span>
              <select data-bind="set-method">
                <option value="eigen" ${st.method === 'eigen' ? 'selected' : ''}>Vektor eigen utama (Saaty, Expert Choice)</option>
                <option value="nca" ${st.method === 'nca' ? 'selected' : ''}>Normalisasi kolom + rata-rata baris (manual)</option>
                <option value="rgmm" ${st.method === 'rgmm' ? 'selected' : ''}>Rata-rata geometrik baris</option>
              </select></label>
            <label class="field"><span>Mode sintesis</span>
              <select data-bind="set-synthesis">
                <option value="distributive" ${st.synthesis === 'distributive' ? 'selected' : ''}>Distributive (bawaan)</option>
                <option value="ideal" ${st.synthesis === 'ideal' ? 'selected' : ''}>Ideal (cegah rank reversal)</option>
              </select></label>
            <label class="field"><span>Batas CR</span>
              <select data-bind="set-cr">${[0.05, 0.08, 0.1, 0.15, 0.2].map((v) => `<option value="${v}" ${Math.abs(st.crThreshold - v) < 1e-9 ? 'selected' : ''}>${num(v, 2)}${v === 0.1 ? ' (Saaty)' : ''}</option>`).join('')}</select></label>
            <label class="field"><span>Desimal ditampilkan</span>
              <select data-bind="set-decimals">${[2, 3, 4, 5, 6].map((v) => `<option value="${v}" ${st.decimals === v ? 'selected' : ''}>${v} angka</option>`).join('')}</select></label>
            <label class="field"><span>Pemisah desimal</span>
              <select data-bind="set-sep"><option value="," ${st.decimalSep === ',' ? 'selected' : ''}>Koma (0,25)</option><option value="." ${st.decimalSep === '.' ? 'selected' : ''}>Titik (0.25)</option></select></label>
            <label class="field"><span>Disusun oleh (untuk laporan)</span>
              <input type="text" value="${esc(p.meta.author)}" maxlength="120" data-bind="meta-author" data-fk="meta-author" placeholder="Nama, NIM / instansi"></label>
          </div>
        </section>
      </div>
    </div>
    ${chartCard('model-hierarchy', 'Pratinjau struktur hierarki', 'Diagram ini ikut masuk ke laporan PDF. Bobot terisi setelah penilaian.', CH.hierarchy(c), { wide: true, scroll: true, file: 'struktur-hierarki' })}
    <div class="step-foot"><span></span><button class="btn primary lg" data-act="goto" data-step="judge">Lanjut ke penilaian${icon('arrowR')}</button></div>`;
  }

  /* --- aksi model --- */

  function snapshot() { return JSON.stringify(S.p); }
  function restore(snap, msg) { S.p = M.normalizeProject(JSON.parse(snap)); touch(true); toast(msg || 'Dibatalkan.'); }

  function nodeAddChild(parentId) {
    const ch = M.childrenMap(S.p);
    const id = M.uid('c_');
    const depth = parentId === ROOT ? 1 : M.depthOf(S.p, parentId) + 1;
    const name = depth === 1 ? `Kriteria ${ch[ROOT].length + 1}` : `Sub-kriteria ${ch[parentId].length + 1}`;
    // sisipkan setelah keturunan terakhir induk agar urutan array mengikuti pre-order
    const desc = M.descendants(S.p, parentId);
    const lastId = desc.length ? desc[desc.length - 1] : parentId;
    const at = S.p.nodes.findIndex((n) => n.id === lastId);
    S.p.nodes.splice(at + 1, 0, { id, parentId, name, note: '', altMode: 'pairwise', dataType: 'benefit', unit: '' });
    if (parentId !== ROOT && !ch[parentId].length) {
      toast(`"${M.nodeById(S.p, parentId).name}" sekarang punya sub-kriteria; penilaian alternatifnya pindah ke sub-kriteria.`);
    }
    S.focusKey = 'node:' + id;
    touch(true);
    const el = $(`[data-fk="node:${id}"]`);
    if (el) el.select();
  }

  function moveSibling(arr, id, dir, sameGroup) {
    const i = arr.findIndex((x) => x.id === id);
    let j = i + dir;
    while (j >= 0 && j < arr.length && sameGroup && !sameGroup(arr[j])) j += dir;
    if (j < 0 || j >= arr.length) return false;
    const [item] = arr.splice(i, 1);
    arr.splice(j, 0, item);
    return true;
  }

  function nodeMove(id, dir) {
    const n = M.nodeById(S.p, id);
    const siblings = M.childrenMap(S.p)[n.parentId];
    const k = siblings.indexOf(id) + dir;
    if (k < 0 || k >= siblings.length) return;
    const other = siblings[k];
    // tukar posisi dua subtree dalam array node
    const block = (x) => [x].concat(M.descendants(S.p, x));
    const a = dir < 0 ? other : id, b = dir < 0 ? id : other;
    const ids = S.p.nodes.map((x) => x.id);
    const aB = block(a), bB = block(b);
    const start = ids.indexOf(a);
    const nodesById = {};
    S.p.nodes.forEach((x) => { nodesById[x.id] = x; });
    const rest = S.p.nodes.filter((x) => !aB.includes(x.id) && !bB.includes(x.id));
    const merged = bB.concat(aB).map((x) => nodesById[x]);
    rest.splice(start, 0, ...merged);
    S.p.nodes = rest;
    S.focusKey = 'node:' + id;
    touch(true);
  }

  function nodeIndent(id) {
    const n = M.nodeById(S.p, id);
    const siblings = M.childrenMap(S.p)[n.parentId];
    const idx = siblings.indexOf(id);
    if (idx <= 0) return;
    const newParent = siblings[idx - 1];
    if (M.childrenMap(S.p)[newParent].length >= AHP.MAX_N) return toast('Kriteria tujuan sudah memiliki 15 anak.', 'error');
    n.parentId = newParent;
    reorderPreorder();
    S.focusKey = 'node:' + id;
    touch(true);
  }

  function nodeOutdent(id) {
    const n = M.nodeById(S.p, id);
    if (n.parentId === ROOT) return;
    const parent = M.nodeById(S.p, n.parentId);
    n.parentId = parent.parentId;
    // letakkan tepat setelah bekas induknya
    reorderPreorder({ after: parent.id, id });
    S.focusKey = 'node:' + id;
    touch(true);
  }

  /** Susun ulang array node agar mengikuti pre-order (opsional: pindahkan id tepat setelah subtree `after`). */
  function reorderPreorder(place) {
    const byParent = {};
    S.p.nodes.forEach((x) => { (byParent[x.parentId] = byParent[x.parentId] || []).push(x); });
    if (place) {
      const list = byParent[M.nodeById(S.p, place.id).parentId];
      const item = list.splice(list.findIndex((x) => x.id === place.id), 1)[0];
      list.splice(list.findIndex((x) => x.id === place.after) + 1, 0, item);
    }
    const out = [];
    (function walk(x) { out.push(x); (byParent[x.id] || []).forEach(walk); }(S.p.nodes.find((x) => x.id === ROOT)));
    S.p.nodes = out;
  }

  async function nodeDelete(id) {
    const n = M.nodeById(S.p, id);
    const desc = M.descendants(S.p, id);
    if (desc.length && !(await confirmBox(`Hapus "${n.name}" beserta ${desc.length} sub-kriteria di bawahnya? Penilaian terkait ikut terhapus.`, 'Hapus', true))) return;
    const snap = snapshot();
    const gone = new Set([id].concat(desc));
    S.p.nodes = S.p.nodes.filter((x) => !gone.has(x.id));
    M.prune(S.p);
    touch(true);
    toast(`"${n.name}" dihapus.`, 'info', { label: 'Urungkan', run: () => restore(snap, 'Kriteria dikembalikan.') });
  }

  /* ================================================================== *
   * Langkah 2 — Penilaian
   * ================================================================== */

  function verbFor(set) { return set.kind === 'alts' ? 'lebih baik' : 'lebih penting'; }

  function questionFor(set) {
    const n = M.nodeById(S.p, set.nodeId);
    if (set.kind === 'criteria') {
      return set.nodeId === ROOT
        ? `Untuk mencapai <b>${esc(n.name)}</b>, kriteria mana yang lebih penting, dan seberapa?`
        : `Dalam kriteria <b>${esc(n.name)}</b>, sub-kriteria mana yang lebih penting, dan seberapa?`;
    }
    return `Dilihat dari kriteria <b>${esc(n.name)}</b>, alternatif mana yang lebih baik, dan seberapa?`;
  }

  const DEGREE = {
    2: 'antara sama dan sedikit', 3: 'sedikit', 4: 'antara sedikit dan jelas', 5: 'jelas',
    6: 'antara jelas dan sangat', 7: 'sangat', 8: 'antara sangat dan mutlak', 9: 'mutlak'
  };

  function readText(set, a, b, v) {
    if (v === null) return '<span class="muted">Belum dinilai — pilih angka di skala.</span>';
    const pos = AHP.valueToPosition(v);
    const exact = Math.abs(AHP.positionToValue(pos) - v) < 1e-9;
    const tail = exact ? '' : ` <span class="muted">(nilai tersimpan ${esc(judgText(v))})</span>`;
    if (pos === 0) return `<b>${esc(a.name)}</b> dan <b>${esc(b.name)}</b> ${set.kind === 'alts' ? 'sama baiknya' : 'sama pentingnya'} <span class="num">(1)</span>${tail}`;
    const [win, lose, k] = pos < 0 ? [a, b, 1 - pos] : [b, a, 1 + pos];
    return `<b>${esc(win.name)}</b> ${DEGREE[k]} ${verbFor(set)} daripada <b>${esc(lose.name)}</b> <span class="num">(${k})</span>${tail}`;
  }

  function setStatus(set, scope) {
    if (set.mode === 'data') {
      const pr = M.setProgress(S.p, set, scope);
      const res = comp(scope).results[set.key];
      if (pr.filled === 0) return { cls: 'empty', label: 'Data belum diisi' };
      if (res.error) return { cls: 'part', label: res.error === 'missing' ? `Data ${pr.filled}/${pr.total}` : 'Data tidak valid' };
      return { cls: 'ok', label: `Data ${S.p.nodes.find((n) => n.id === set.nodeId).dataType}` };
    }
    const a = comp(scope).results[set.key].analysis;
    const filled = a.total - a.missing;
    if (filled === 0) return { cls: 'empty', label: `0/${a.total} pasang` };
    if (a.missing) return { cls: 'part', label: `${filled}/${a.total} pasang` };
    if (a.n >= 3 && a.CR > S.p.settings.crThreshold) return { cls: 'bad', label: `CR ${num(a.CR, 3)}` };
    return { cls: 'ok', label: a.n >= 3 ? `CR ${num(a.CR, 3)}` : 'lengkap' };
  }

  const STATUS_ICON = { ok: 'check', bad: 'alert', part: 'spark', empty: 'plus' };

  function renderJudge() {
    const p = S.p;
    const all = sets();
    if (!all.length) {
      return `<div class="page-head"><div><h1>Penilaian</h1></div></div>
      <div class="panel empty-state"><p>Belum ada yang perlu dinilai. Tambahkan minimal dua kriteria, atau satu kriteria dengan dua alternatif.</p>
      <button class="btn primary" data-act="goto" data-step="model">Kembali ke model</button></div>`;
    }
    if (!all.some((s) => s.key === S.ui.setKey)) S.ui.setKey = all[0].key;
    const set = all.find((s) => s.key === S.ui.setKey);
    const scope = judgeScope();
    const readOnly = S.ui.viewCombined && !S.respondent;
    let filled = 0, total = 0;
    for (const s of all) { const pr = M.setProgress(p, s, scope); filled += pr.filled; total += pr.total; }

    const asSelect = !S.respondent && p.participants.length > 1 ? `<label class="field inline"><span>Menilai sebagai</span>
      <select data-bind="judge-as">${p.participants.map((x) => `<option value="${x.id}" ${!S.ui.viewCombined && p.activeParticipant === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
      <option value="__combined" ${S.ui.viewCombined ? 'selected' : ''}>Gabungan (hanya lihat)</option></select></label>` : '';

    const respHead = S.respondent ? `<section class="panel resp-intro">
      <h1>${esc(p.meta.title)}</h1>
      ${p.meta.description ? `<p>${esc(p.meta.description)}</p>` : ''}
      <p>Tujuan: <b>${esc(M.nodeById(p, ROOT).name)}</b>. Isi nama Anda, lalu nilai setiap perbandingan. Jawaban tersimpan otomatis di perangkat ini sampai Anda mengirimkannya.</p>
      <label class="field"><span>Nama responden</span><input type="text" data-bind="resp-name" data-fk="resp-name" value="${esc(S.respondent.name)}" maxlength="80" placeholder="Nama lengkap / jabatan"></label>
    </section>` : '';

    const list = all.map((s) => {
      const stt = setStatus(s, scope);
      const depth = M.depthOf(p, s.nodeId);
      return `<li><button class="set-item${s.key === set.key ? ' on' : ''}" data-act="pick-set" data-key="${s.key}" style="--d:${depth}" ${s.key === set.key ? 'aria-current="true"' : ''}>
        <span class="st st-${stt.cls}" aria-hidden="true">${icon(STATUS_ICON[stt.cls])}</span>
        <span class="set-text"><span class="set-title">${esc(M.setLabel(p, s))}</span><span class="set-meta">${esc(stt.label)}</span></span></button></li>`;
    }).join('');
    const idx = all.indexOf(set);
    const crumb = M.pathNames(p, set.nodeId).map(esc).join(' <span aria-hidden="true">›</span> ');

    const modeSwitch = set.kind === 'alts' && !S.respondent ? `<div class="seg" role="group" aria-label="Cara menilai alternatif">
        <button class="${set.mode === 'pairwise' ? 'on' : ''}" data-act="alt-mode" data-mode="pairwise" aria-pressed="${set.mode === 'pairwise'}">Perbandingan berpasangan</button>
        <button class="${set.mode === 'data' ? 'on' : ''}" data-act="alt-mode" data-mode="data" aria-pressed="${set.mode === 'data'}">Data nyata (benefit/cost)</button></div>` : '';
    const viewSwitch = set.mode === 'pairwise' ? `<div class="seg" role="group" aria-label="Tampilan">
        <button class="${S.ui.view === 'scale' ? 'on' : ''}" data-act="view" data-view="scale" aria-pressed="${S.ui.view === 'scale'}">Skala</button>
        <button class="${S.ui.view === 'matrix' ? 'on' : ''}" data-act="view" data-view="matrix" aria-pressed="${S.ui.view === 'matrix'}">Matriks</button></div>` : '';

    let body;
    if (set.mode === 'data') body = renderDataBody(set);
    else if (S.ui.view === 'matrix' || readOnly) body = renderMatrixBody(set, scope, readOnly);
    else body = renderScaleBody(set, scope);

    const last = idx === all.length - 1;
    const nextBtn = last
      ? (S.respondent ? `<button class="btn primary" data-act="resp-finish">Selesai, kirim jawaban${icon('arrowR')}</button>` : `<button class="btn primary" data-act="goto" data-step="results">Lihat hasil${icon('arrowR')}</button>`)
      : `<button class="btn primary" data-act="set-step" data-dir="1">Berikutnya${icon('arrowR')}</button>`;

    return `${respHead}
    <div class="page-head">
      <div><h1>${S.respondent ? 'Penilaian' : 'Penilaian berpasangan'}</h1>
      <p class="progress-line"><span class="num">${filled}/${total}</span> penilaian terisi
        <span class="meter" role="progressbar" aria-label="Kemajuan penilaian" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${filled}"><span style="width:${total ? (100 * filled / total).toFixed(1) : 0}%"></span></span></p></div>
      ${asSelect}${S.respondent ? `<button class="btn" data-act="resp-finish">${icon('check')}Selesai &amp; kirim</button>` : ''}
    </div>
    <div class="judge-grid">
      <nav class="set-nav" aria-label="Daftar matriks penilaian">
        <label class="field set-select"><span>Matriks</span><select data-bind="pick-set">${all.map((s, i) => `<option value="${s.key}" ${s.key === set.key ? 'selected' : ''}>${i + 1}. ${esc(M.setLabel(p, s))}</option>`).join('')}</select></label>
        <ol class="set-list">${list}</ol>
      </nav>
      <section class="panel workspace" aria-labelledby="ws-title">
        <div class="ws-head">
          <p class="crumb">${crumb}</p>
          <h2 id="ws-title">${esc(M.setLabel(p, set))}</h2>
          <p class="question">${questionFor(set)}</p>
          <div class="ws-switches">${modeSwitch}${viewSwitch}</div>
          ${readOnly ? '<p class="note">Tampilan gabungan hanya untuk dilihat: setiap sel adalah rata-rata geometrik penilaian peserta yang disertakan.</p>' : ''}
        </div>
        <div class="ws-body" id="ws-body">${body}</div>
        <div class="ws-foot">
          <button class="btn" data-act="set-step" data-dir="-1" ${idx === 0 ? 'disabled' : ''}>${icon('arrowL')}Sebelumnya</button>
          <span class="muted">${idx + 1} dari ${all.length}</span>
          ${nextBtn}
        </div>
      </section>
      <aside class="panel live" id="live" aria-live="polite">${renderLive(set, scope)}</aside>
    </div>`;
  }

  function renderScaleBody(set, scope) {
    const items = set.items;
    const get = M.judgmentGetter(S.p, scope);
    const rows = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        const v = get(set.key, a.id, b.id);
        const pos = v === null ? null : AHP.valueToPosition(v);
        const name = `cmp-${i}-${j}`;
        let ticks = '';
        for (let t = -8; t <= 8; t++) {
          const label = Math.abs(t) + 1;
          const side = t < 0 ? 'a' : t > 0 ? 'b' : 'c';
          const aria = t === 0 ? 'sama' : `${t < 0 ? a.name : b.name} ${label}`;
          ticks += `<label class="tick side-${side}${label % 2 === 0 ? ' even' : ''}" data-p="${t}"><input type="radio" name="${name}" value="${t}" ${pos === t ? 'checked' : ''} data-act-change="judge-scale" data-a="${a.id}" data-b="${b.id}" aria-label="${esc(aria)}"><span>${label}</span></label>`;
        }
        rows.push(`<div class="cmp${v === null ? ' unset' : ''}" data-a="${a.id}" data-b="${b.id}" data-v="${v === null ? '' : v}" role="radiogroup" aria-label="${esc(a.name)} dibanding ${esc(b.name)}">
          <div class="cmp-name a" title="${esc(a.name)}">${esc(a.name)}</div>
          <div class="cmp-scale">${ticks}</div>
          <div class="cmp-name b" title="${esc(b.name)}">${esc(b.name)}</div>
          <p class="cmp-read">${readText(set, a, b, v)}${v !== null ? ` <button class="link-btn" data-act="judge-clear" data-a="${a.id}" data-b="${b.id}">kosongkan</button>` : ''}</p>
        </div>`);
      }
    }
    return `<div class="scale-legend" aria-hidden="true"><span>← ${set.kind === 'alts' ? 'kiri lebih baik' : 'kiri lebih penting'}</span><span>sama</span><span>${set.kind === 'alts' ? 'kanan lebih baik' : 'kanan lebih penting'} →</span></div>
      <div class="cmp-list">${rows.join('')}</div>`;
  }

  /** Warnai isian skala (condong ke kiri/kanan). */
  function paintRow(row) {
    const checked = row.querySelector('input:checked');
    const scale = row.querySelector('.cmp-scale');
    if (!scale) return;
    if (!checked) { scale.style.setProperty('--fl', '50%'); scale.style.setProperty('--fw', '0%'); row.classList.add('unset'); return; }
    row.classList.remove('unset');
    const p = Number(checked.value);
    // Posisi diambil dari tata letak nyata (lebar kolom skala berbeda di layar sempit)
    const box = scale.getBoundingClientRect();
    const mid = (el) => { const r = el.getBoundingClientRect(); return box.width ? ((r.left + r.width / 2 - box.left) / box.width) * 100 : 50; };
    const center = mid(scale.querySelector('.tick[data-p="0"]'));
    const pos = mid(checked.parentElement);
    scale.style.setProperty('--fl', Math.min(center, pos) + '%');
    scale.style.setProperty('--fw', Math.abs(pos - center) + '%');
    scale.dataset.side = p < 0 ? 'a' : p > 0 ? 'b' : 'c';
    scale.querySelectorAll('.tick').forEach((t) => {
      const tp = Number(t.dataset.p);
      t.classList.toggle('in', p !== 0 && tp !== 0 && Math.sign(tp) === Math.sign(p) && Math.abs(tp) < Math.abs(p));
    });
  }

  function renderMatrixBody(set, scope, readOnly) {
    const items = set.items;
    const get = M.judgmentGetter(S.p, scope);
    const res = comp(scope).results[set.key];
    const hot = new Set();
    if (res.analysis && res.analysis.n >= 3 && res.analysis.CR > S.p.settings.crThreshold) {
      AHP.inconsistencyReport(res.A, res.analysis, S.p.settings.method, 0).slice(0, 3).forEach((x) => hot.add(x.i + ',' + x.j));
    }
    let html = `<div class="table-wrap"><table class="matrix"><thead><tr><th scope="col"><span class="sr">Baris dibanding kolom</span></th>${items.map((x) => `<th scope="col" title="${esc(x.name)}">${esc(x.name)}</th>`).join('')}</tr></thead><tbody>`;
    items.forEach((a, i) => {
      html += `<tr><th scope="row">${esc(a.name)}</th>`;
      items.forEach((b, j) => {
        if (i === j) { html += '<td class="diag">1</td>'; return; }
        const v = get(set.key, a.id, b.id);
        if (i < j && !readOnly) {
          html += `<td class="${hot.has(i + ',' + j) ? 'hot' : ''}"><input type="text" inputmode="decimal" value="${esc(judgText(v))}" placeholder="–" data-bind="judge-cell" data-a="${a.id}" data-b="${b.id}" data-fk="cell:${set.key}:${i}:${j}" aria-label="${esc(a.name)} dibanding ${esc(b.name)}"></td>`;
        } else {
          html += `<td class="recip${i < j && hot.has(i + ',' + j) ? ' hot' : ''}" data-recip="${a.id}>${b.id}">${v === null ? '–' : esc(judgText(v))}</td>`;
        }
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    if (!readOnly) html += `<p class="note">Isi segitiga atas: berapa kali <b>baris</b> lebih ${set.kind === 'alts' ? 'baik' : 'penting'} dari <b>kolom</b>. Boleh <span class="num">3</span>, <span class="num">1/3</span>, atau desimal seperti <span class="num">2,47</span> (misalnya hasil rata-rata geometrik dari kuesioner). Rentang 1/9–9.</p>`;
    return html;
  }

  function renderDataBody(set) {
    const n = M.nodeById(S.p, set.nodeId);
    const row = S.p.data[set.nodeId] || {};
    const res = comp('combined').results[set.key];
    return `<div class="data-head">
      <div class="seg" role="group" aria-label="Jenis kriteria">
        <button class="${n.dataType === 'benefit' ? 'on' : ''}" data-act="data-type" data-type="benefit" aria-pressed="${n.dataType === 'benefit'}">Benefit: makin besar makin baik</button>
        <button class="${n.dataType === 'cost' ? 'on' : ''}" data-act="data-type" data-type="cost" aria-pressed="${n.dataType === 'cost'}">Cost: makin kecil makin baik</button>
      </div>
      <label class="field inline"><span>Satuan</span><input type="text" value="${esc(n.unit)}" maxlength="24" data-bind="data-unit" data-fk="unit:${n.id}" placeholder="mis. juta Rp, GB, kg"></label>
    </div>
    <div class="table-wrap"><table class="data data-entry"><thead><tr><th scope="col">Alternatif</th><th scope="col">Nilai${n.unit ? ' (' + esc(n.unit) + ')' : ''}</th><th scope="col">Prioritas</th></tr></thead><tbody>
    ${set.items.map((a, i) => `<tr><th scope="row">${esc(a.name)}</th>
      <td><input type="text" inputmode="decimal" value="${row[a.id] === undefined ? '' : esc(C.num(row[a.id], 10).replace(/[,.]?0+$/, ''))}" data-bind="data-val" data-alt="${a.id}" data-fk="data:${set.nodeId}:${a.id}" aria-label="Nilai ${esc(a.name)}"></td>
      <td class="num" data-prio="${i}">${res.priority ? pct(res.priority[i]) : '–'}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="note">${n.dataType === 'cost' ? 'Cost: prioritas = (1/nilai) ÷ Σ(1/nilai). Nilai harus lebih dari 0.' : 'Benefit: prioritas = nilai ÷ Σ nilai. Nilai tidak boleh negatif.'} Dalam mode sintesis ideal, rumus ini setara dengan normalisasi SAW (nilai ÷ maks, atau min ÷ nilai).</p>`;
  }

  function renderLive(set, scope) {
    const c = comp(set.mode === 'data' ? 'combined' : scope);
    const res = c.results[set.key];
    const names = set.items.map((x) => x.name);
    let w, extra = '';
    if (set.mode === 'data') {
      if (res.error) {
        const msg = { missing: 'Isi nilai untuk semua alternatif.', 'cost-nonpositive': 'Kriteria cost membutuhkan nilai lebih dari 0.', 'benefit-negative': 'Kriteria benefit tidak boleh bernilai negatif.', 'zero-sum': 'Jumlah nilai tidak boleh nol.' }[res.error];
        return `<h3>Prioritas</h3><p class="note warn">${icon('alert')}${esc(msg)}</p>`;
      }
      w = res.priority;
    } else {
      const a = res.analysis;
      w = a.w;
      const bad = a.n >= 3 && a.CR > S.p.settings.crThreshold;
      const crBox = a.n >= 3
        ? `<div class="cr-box ${bad ? 'bad' : 'ok'}">
            <div class="cr-main"><span class="cr-label">Rasio konsistensi</span><span class="cr-val num">${num(a.CR, 3)}</span></div>
            <p class="cr-status">${icon(bad ? 'alert' : 'check')}${bad ? `Tidak konsisten (di atas ${num(S.p.settings.crThreshold, 2)}). Tinjau penilaian di bawah.` : `Konsisten (≤ ${num(S.p.settings.crThreshold, 2)}).`}</p>
            <dl class="cr-detail"><div><dt>λ maks</dt><dd class="num">${num(a.lambdaMax)}</dd></div><div><dt>CI</dt><dd class="num">${num(a.CI)}</dd></div><div><dt>RI</dt><dd class="num">${num(a.RI, 2)}</dd></div></dl>
          </div>`
        : `<p class="note">Matriks 2×2 selalu konsisten (CR = 0).</p>`;
      extra += crBox;
      if (a.missing) extra += `<p class="note">${icon('spark')}${a.missing} dari ${a.total} pasang belum dinilai. ${a.connected ? 'Bobot sementara dihitung dengan metode Harker.' : 'Isi lebih banyak pasangan agar semua item terhubung.'}</p>`;
      if (a.n >= 3 && a.missing < a.total) {
        const rep = AHP.inconsistencyReport(res.A, a, S.p.settings.method, 3).filter((x) => x.deviation > 0.05).slice(0, 3);
        if (rep.length && (bad || S.ui.showSuggest)) {
          extra += `<div class="suggest"><h4>Penilaian paling tidak konsisten</h4><ol>${rep.map((x) => {
            const A = set.items[x.i], B = set.items[x.j];
            const canApply = !S.ui.viewCombined && Math.abs(x.suggestion - x.value) > 1e-9;
            return `<li><span><b>${esc(A.name)}</b> vs <b>${esc(B.name)}</b>: <span class="num">${esc(judgText(x.value))}</span> → saran <span class="num">${esc(judgText(x.suggestion))}</span>${x.newCR !== undefined ? ` <span class="muted">(CR menjadi ${num(x.newCR, 3)})</span>` : ''}</span>
              ${canApply ? `<button class="btn sm" data-act="apply-suggest" data-a="${A.id}" data-b="${B.id}" data-v="${x.suggestion}">Terapkan</button>` : ''}</li>`;
          }).join('')}</ol><p class="note">Saran = rasio bobot saat ini (w<sub>i</sub>/w<sub>j</sub>) yang dibulatkan ke skala Saaty. Ubah hanya bila sesuai pendapat Anda.</p></div>`;
        } else if (rep.length) {
          extra += `<button class="link-btn" data-act="show-suggest">Lihat penilaian paling tidak konsisten</button>`;
        }
      }
    }
    const max = Math.max(...w);
    const bars = names.map((nm, i) => ({ nm, v: w[i], i })).sort((x, y) => y.v - x.v).map((it) => `<li><span class="pb-name" title="${esc(it.nm)}">${esc(it.nm)}</span><span class="pb-bar"><i style="width:${(100 * it.v / max).toFixed(2)}%"></i></span><span class="pb-val num">${pct(it.v, 1)}</span></li>`).join('');
    return `<h3>Prioritas ${set.kind === 'alts' ? 'alternatif' : 'kriteria'}</h3><ol class="prio-bars">${bars}</ol>${extra}`;
  }

  function refreshJudgeSide(set) {
    const live = $('#live');
    if (live) live.innerHTML = renderLive(set, judgeScope());
    // perbarui status di daftar set & progres tanpa merender ulang isian
    const scope = judgeScope();
    const btn = $(`.set-item[data-key="${CSS.escape(set.key)}"]`);
    if (btn) {
      const stt = setStatus(set, scope);
      btn.querySelector('.st').className = 'st st-' + stt.cls;
      btn.querySelector('.st').innerHTML = icon(STATUS_ICON[stt.cls]);
      btn.querySelector('.set-meta').textContent = stt.label;
    }
    let filled = 0, total = 0;
    for (const s of sets()) { const pr = M.setProgress(S.p, s, scope); filled += pr.filled; total += pr.total; }
    const pl = $('.progress-line');
    if (pl) {
      pl.querySelector('.num').textContent = `${filled}/${total}`;
      const m = pl.querySelector('.meter');
      m.setAttribute('aria-valuenow', filled);
      m.querySelector('span').style.width = (total ? 100 * filled / total : 0).toFixed(1) + '%';
    }
  }

  function currentSet() { return sets().find((s) => s.key === S.ui.setKey); }

  function setJudgmentUI(a, b, v) {
    const set = currentSet();
    if (!set || S.ui.viewCombined) return;
    M.setJudgment(S.p, S.p.activeParticipant, set.key, a, b, v);
    touch(false);
    // perbarui baris skala bila ada
    const row = $(`.cmp[data-a="${CSS.escape(a)}"][data-b="${CSS.escape(b)}"]`);
    if (row) {
      const A = set.items.find((x) => x.id === a), B = set.items.find((x) => x.id === b);
      const val = M.getJudgment(S.p, S.p.activeParticipant, set.key, a, b);
      if (val === null) row.querySelectorAll('input').forEach((r) => { r.checked = false; });
      row.querySelector('.cmp-read').innerHTML = readText(set, A, B, val) + (val !== null ? ` <button class="link-btn" data-act="judge-clear" data-a="${esc(a)}" data-b="${esc(b)}">kosongkan</button>` : '');
      paintRow(row);
    }
    refreshJudgeSide(set);
  }

  /* ================================================================== *
   * Langkah 3 — Hasil
   * ================================================================== */

  function issuesBanner(c) {
    const items = c.issues.map((x) => {
      const set = c.sets.find((s) => s.key === x.key);
      const label = esc(M.setLabel(S.p, set));
      const go = `<button class="link-btn" data-act="goto-set" data-key="${set.key}">perbaiki</button>`;
      if (x.type === 'missing') return `<li>${label}: ${x.missing} dari ${x.total} pasang belum dinilai ${go}</li>`;
      if (x.type === 'inconsistent') return `<li>${label}: CR ${num(x.CR, 3)} di atas batas ${go}</li>`;
      return `<li>${label}: data alternatif belum lengkap atau tidak valid ${go}</li>`;
    });
    if (!items.length) return '';
    return `<div class="banner warn" role="status">${icon('alert')}<div><b>Hasil dapat dihitung, tetapi perlu ditinjau:</b><ul>${items.join('')}</ul></div></div>`;
  }

  function scopeSelect() {
    if (S.p.participants.length < 2) return '';
    const s = resultScope();
    return `<label class="field inline"><span>Hasil untuk</span><select data-bind="result-scope">
      <option value="combined" ${s === 'combined' ? 'selected' : ''}>Gabungan semua peserta</option>
      ${S.p.participants.map((x) => `<option value="${x.id}" ${s === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>`;
  }

  function renderResults() {
    const p = S.p;
    const scope = resultScope();
    const c = comp(scope);
    const hasAlts = c.synth.final.length >= 2;
    let headline = '';
    if (hasAlts) {
      const order = rankingOrder(c);
      const best = order[0], second = order[1];
      const gap = c.synth.final[best] - c.synth.final[second];
      headline = `<div class="verdict">
        <p class="verdict-kicker">Alternatif terbaik</p>
        <p class="verdict-main"><span class="verdict-name">${esc(p.alternatives[best].name)}</span> <span class="verdict-val num">${pct(c.synth.final[best], 1)}</span></p>
        <p class="verdict-sub">Unggul ${num(gap * 100, 1)} poin persentase dari ${esc(p.alternatives[second].name)}. Mode ${p.settings.synthesis === 'ideal' ? 'ideal' : 'distributive'}, ${AHP.METHOD_LABELS[p.settings.method].toLowerCase()}.</p>
      </div>`;
    } else if (p.alternatives.length < 2) {
      const tops = c.children[ROOT];
      const best = tops.slice().sort((a, b) => c.synth.global[b] - c.synth.global[a])[0];
      headline = best ? `<div class="verdict"><p class="verdict-kicker">Kriteria terpenting</p><p class="verdict-main"><span class="verdict-name">${esc(M.nodeById(p, best).name)}</span> <span class="verdict-val num">${pct(c.synth.global[best], 1)}</span></p><p class="verdict-sub">Model tanpa alternatif: hasilnya bobot kriteria, siap dipakai di metode lain (SAW, TOPSIS, dll.).</p></div>` : '';
    }

    // Tabel bobot kriteria
    const wRows = M.preorder(p).filter((x) => x.id !== ROOT).map(({ id, depth }) => {
      const isLeaf = !c.children[id].length;
      return `<tr><th scope="row" style="padding-left:${0.6 + (depth - 1) * 1.1}rem">${esc(M.nodeById(p, id).name)}</th><td class="num">${num(localOf(c, id))}</td><td class="num">${num(c.synth.global[id])}</td><td class="num">${pct(c.synth.global[id])}</td><td>${isLeaf ? 'daun' : ''}</td></tr>`;
    }).join('');
    const altTable = hasAlts ? `<section class="panel"><div class="panel-head"><h2>Prioritas alternatif per kriteria penilai</h2><span class="hint">nilai lokal ${p.settings.synthesis === 'ideal' ? 'ideal (dibagi maksimum)' : 'distributive'}</span></div>
      <div class="table-wrap"><table class="data"><thead><tr><th scope="col">Alternatif</th>${c.synth.leaves.map((l) => `<th scope="col">${esc(M.nodeById(p, l).name)}<br><span class="muted num">${pct(c.synth.global[l], 1)}</span></th>`).join('')}<th scope="col">Akhir</th></tr></thead>
      <tbody>${rankingOrder(c).map((k) => `<tr><th scope="row">${esc(p.alternatives[k].name)}</th>${c.synth.leaves.map((l) => `<td class="num">${num(c.synth.q[l][k])}</td>`).join('')}<td class="num strong">${num(c.synth.final[k])}</td></tr>`).join('')}</tbody></table></div></section>` : '';

    const summ = p.participants.length > 1 ? M.participantSummaries(p) : null;
    const group = summ ? chartCard('res-participants', 'Sebaran bobot antar peserta', 'Kriteria utama. Titik abu-abu = tiap peserta, titik biru = gabungan.', CH.participants(summ, comp('combined')), { file: 'sebaran-peserta' }) : '';

    return `<div class="page-head"><div><h1>Hasil sintesis</h1><p>Cakupan: ${esc(scopeLabel(scope))}.</p></div>${scopeSelect()}</div>
      ${issuesBanner(c)}
      ${headline}
      <div class="chart-grid">
        ${hasAlts ? chartCard('res-ranking', 'Prioritas akhir alternatif', 'Jumlah semua alternatif = 100%.', CH.ranking(c), { file: 'prioritas-alternatif' }) : ''}
        ${hasAlts ? chartCard('res-contrib', 'Kontribusi kriteria', 'Bagian prioritas tiap alternatif yang datang dari tiap kriteria utama.', CH.contribution(c), { file: 'kontribusi-kriteria' }) : ''}
        ${chartCard('res-sunburst', 'Bobot kriteria', 'Lingkar dalam = kriteria utama, lingkar luar = sub-kriteria (bobot global).', CH.sunburst(c), { file: 'sunburst-kriteria' })}
        ${chartCard('res-global', 'Bobot global kriteria penilai', 'Kriteria paling bawah yang dipakai menilai alternatif.', CH.globalWeights(c), { file: 'bobot-global' })}
        ${chartCard('res-consistency', 'Rasio konsistensi', `Batas ${num(p.settings.crThreshold, 2)}. Matriks 2×2 tidak ditampilkan karena selalu konsisten.`, CH.consistency(c), { file: 'konsistensi' })}
        ${group}
      </div>
      ${chartCard('res-hierarchy', 'Struktur hierarki dengan bobot', 'L = bobot lokal, G = bobot global.', CH.hierarchy(c), { wide: true, scroll: true, file: 'struktur-hierarki' })}
      <section class="panel"><div class="panel-head"><h2>Bobot kriteria</h2></div>
        <div class="table-wrap"><table class="data"><thead><tr><th scope="col">Kriteria</th><th scope="col">Lokal</th><th scope="col">Global</th><th scope="col">%</th><th scope="col"></th></tr></thead><tbody>${wRows}</tbody></table></div></section>
      ${altTable}
      <div class="step-foot"><button class="btn" data-act="goto" data-step="judge">${icon('arrowL')}Penilaian</button><button class="btn primary lg" data-act="goto" data-step="sens">Uji sensitivitas${icon('arrowR')}</button></div>`;
  }

  /* ================================================================== *
   * Langkah 4 — Sensitivitas
   * ================================================================== */

  function sensNodes(c) { return M.preorder(S.p).filter(({ id }) => (c.children[id] || []).length >= 2).map((x) => x.id); }

  function renderSens() {
    const p = S.p;
    const scope = resultScope();
    const c = comp(scope);
    if (p.alternatives.length < 2) {
      return `<div class="page-head"><div><h1>Analisis sensitivitas</h1></div></div><div class="panel empty-state"><p>Analisis sensitivitas membutuhkan minimal dua alternatif.</p><button class="btn primary" data-act="goto" data-step="model">Tambah alternatif</button></div>`;
    }
    const nodes = sensNodes(c);
    if (!nodes.length) return `<div class="page-head"><div><h1>Analisis sensitivitas</h1></div></div><div class="panel empty-state"><p>Butuh minimal dua kriteria di satu level.</p></div>`;
    if (!nodes.includes(S.ui.sensNode)) S.ui.sensNode = nodes[0];
    const sm = sensModel(c, S.ui.sensNode);
    const w = currentWhatIf(sm);
    const changed = w.some((x, i) => Math.abs(x - sm.w0[i]) > 1e-9);
    const final = AHP.sensFinal(sm, w);
    const m = sm.kids.length;
    if (S.ui.gradIdx >= m) S.ui.gradIdx = 0;
    const order = rankingOrder(c);
    if (!S.ui.h2h || S.ui.h2h.some((k) => k >= p.alternatives.length) || S.ui.h2h[0] === S.ui.h2h[1]) S.ui.h2h = [order[0], order[1]];
    if (S.ui.xy.some((k) => k >= m) || S.ui.xy[0] === S.ui.xy[1]) S.ui.xy = [0, Math.min(1, m - 1)];

    const tabs = [['dynamic', 'Dinamis'], ['performance', 'Performa'], ['gradient', 'Gradien'], ['h2h', 'Head-to-head'], ['2d', '2D']];
    const tabHtml = `<div class="tabs" role="tablist">${tabs.map(([id, label]) => `<button role="tab" class="${S.ui.sensTab === id ? 'on' : ''}" aria-selected="${S.ui.sensTab === id}" data-act="sens-tab" data-tab="${id}">${label}</button>`).join('')}</div>`;
    const nodeSel = `<label class="field inline"><span>Bobot di bawah</span><select data-bind="sens-node">${nodes.map((id) => `<option value="${id}" ${id === S.ui.sensNode ? 'selected' : ''}>${esc(id === ROOT ? 'Tujuan (kriteria utama)' : M.nodeById(p, id).name)}</option>`).join('')}</select></label>`;
    const kidName = (i) => M.nodeById(p, sm.kids[i]).name;

    let body = '';
    const tab = S.ui.sensTab;
    if (tab === 'dynamic') {
      body = `<div class="dyn">
        <div class="dyn-col"><h3>Bobot ${S.ui.sensNode === ROOT ? 'kriteria utama' : 'sub-kriteria ' + esc(M.nodeById(p, S.ui.sensNode).name)}</h3>
          ${sm.kids.map((id, i) => `<div class="dyn-row"><label for="dyn-${i}">${esc(kidName(i))}</label>
            <input type="range" id="dyn-${i}" min="0" max="1000" step="1" value="${Math.round(w[i] * 1000)}" data-bind="dyn-w" data-i="${i}" style="--v:${(w[i] * 100).toFixed(2)}%">
            <span class="num" data-dyn-val="${i}">${pct(w[i], 1)}</span></div>`).join('')}
        </div>
        <div class="dyn-col"><h3>Prioritas alternatif</h3><ol class="prio-bars big" id="dyn-alts">${dynAltBars(final)}</ol></div>
      </div>
      <p class="note">Geser bobot satu kriteria; kriteria lain menyesuaikan secara proporsional sehingga total tetap 100%. Model asli tidak berubah.</p>`;
    } else if (tab === 'performance') {
      body = chartCard('sens-perf', 'Sensitivitas performa', 'Batang = bobot kriteria (seret batang ke atas/bawah untuk mengubah). Titik = prioritas alternatif terhadap tiap kriteria; kolom kanan = keseluruhan.', CH.performance(sm, w, true), { file: 'sensitivitas-performa' });
    } else if (tab === 'gradient') {
      const st = AHP.stabilityInterval(sm, S.ui.gradIdx, w);
      const top = p.alternatives[st.top].name;
      const parts = [];
      if (st.loBy !== null) parts.push(`turun di bawah <b class="num">${pct(st.lo, 1)}</b> (${esc(p.alternatives[st.loBy].name)} menjadi teratas)`);
      if (st.hiBy !== null) parts.push(`naik di atas <b class="num">${pct(st.hi, 1)}</b> (${esc(p.alternatives[st.hiBy].name)} menjadi teratas)`);
      body = `<div class="ctrl-row"><label class="field inline"><span>Kriteria</span><select data-bind="grad-idx">${sm.kids.map((id, i) => `<option value="${i}" ${i === S.ui.gradIdx ? 'selected' : ''}>${esc(kidName(i))}</option>`).join('')}</select></label></div>
        <p class="lead">${esc(top)} tetap teratas selama bobot ${esc(kidName(S.ui.gradIdx))} berada di antara <b class="num">${pct(st.lo, 1)}</b> dan <b class="num">${pct(st.hi, 1)}</b>${parts.length ? '; berubah bila bobot ' + parts.join(' atau ') : ' — tidak berubah di seluruh rentang 0–100%'}.</p>
        ${chartCard('sens-grad', 'Sensitivitas gradien', 'Garis tegak = bobot saat ini. Area biru muda = rentang ketika alternatif teratas tidak berubah. Lingkaran = titik potong.', CH.gradient(sm, S.ui.gradIdx, w), { file: 'sensitivitas-gradien' })}`;
    } else if (tab === 'h2h') {
      const [a, b] = S.ui.h2h;
      const opt = (sel) => p.alternatives.map((x, k) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
      body = `<div class="ctrl-row"><label class="field inline"><span>Alternatif kiri</span><select data-bind="h2h-a">${opt(a)}</select></label><label class="field inline"><span>Alternatif kanan</span><select data-bind="h2h-b">${opt(b)}</select></label></div>
        ${a === b ? '<p class="note">Pilih dua alternatif yang berbeda.</p>' : chartCard('sens-h2h', 'Head-to-head', 'Panjang batang = selisih kontribusi pada prioritas akhir.', CH.headToHead(sm, w, a, b), { file: 'head-to-head' })}`;
    } else {
      const [ix, iy] = S.ui.xy;
      const opt = (sel) => sm.kids.map((id, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(kidName(i))}</option>`).join('');
      body = `<div class="ctrl-row"><label class="field inline"><span>Sumbu X</span><select data-bind="xy-x">${opt(ix)}</select></label><label class="field inline"><span>Sumbu Y</span><select data-bind="xy-y">${opt(iy)}</select></label></div>
        ${ix === iy ? '<p class="note">Pilih dua kriteria yang berbeda.</p>' : chartCard('sens-2d', 'Plot dua dimensi', 'Posisi = prioritas alternatif terhadap dua kriteria. Garis abu = rata-rata (1/n).', CH.scatter(sm, ix, iy), { file: 'plot-2d' })}`;
    }

    const stabRows = sm.kids.map((id, i) => {
      const st = AHP.stabilityInterval(sm, i, w);
      return `<tr><th scope="row">${esc(kidName(i))}</th><td class="num">${pct(w[i], 1)}</td><td>${esc(p.alternatives[st.top].name)}</td><td class="num">${pct(st.lo, 1)} – ${pct(st.hi, 1)}</td><td>${st.loBy !== null ? esc(p.alternatives[st.loBy].name) : '—'}</td><td>${st.hiBy !== null ? esc(p.alternatives[st.hiBy].name) : '—'}</td></tr>`;
    }).join('');

    return `<div class="page-head"><div><h1>Analisis sensitivitas</h1><p>Uji seberapa kuat keputusan bila bobot kriteria berubah. Cakupan: ${esc(scopeLabel(scope))}.</p></div>
        <div class="head-ctrls">${scopeSelect()}${nodeSel}<button class="btn" data-act="sens-reset" ${changed ? '' : 'disabled'}>${icon('reset')}Kembalikan bobot asli</button></div></div>
      ${changed ? '<div class="banner info" role="status">' + icon('spark') + '<div>Anda sedang melihat skenario “bagaimana jika”. Bobot asli model tidak berubah.</div></div>' : ''}
      ${tabHtml}
      <section class="panel sens-body">${body}</section>
      <section class="panel"><div class="panel-head"><h2>Interval stabilitas</h2><span class="hint">rentang bobot tiap kriteria ketika alternatif teratas tidak berubah</span></div>
        <div class="table-wrap"><table class="data"><thead><tr><th scope="col">Kriteria</th><th scope="col">Bobot</th><th scope="col">Teratas</th><th scope="col">Rentang stabil</th><th scope="col">Pengganti bila turun</th><th scope="col">Pengganti bila naik</th></tr></thead><tbody>${stabRows}</tbody></table></div></section>
      <div class="step-foot"><button class="btn" data-act="goto" data-step="results">${icon('arrowL')}Hasil</button><button class="btn primary lg" data-act="goto" data-step="report">Unduh laporan${icon('arrowR')}</button></div>`;
  }

  function dynAltBars(final) {
    const max = Math.max(...final);
    const t = theme();
    return S.p.alternatives.map((a, k) => ({ a, k, v: final[k] })).sort((x, y) => y.v - x.v)
      .map((it) => `<li><span class="pb-name" title="${esc(it.a.name)}"><i class="sw" style="background:${C.colorAt(t, it.k)}"></i>${esc(it.a.name)}</span><span class="pb-bar"><i style="width:${(100 * it.v / max).toFixed(2)}%;background:${C.colorAt(t, it.k)}"></i></span><span class="pb-val num">${pct(it.v, 1)}</span></li>`).join('');
  }

  function setWhatIf(sm, w) {
    S.ui.whatIf = { node: sm.nodeId, rev: S.rev, scope: resultScope(), w };
  }

  /* ================================================================== *
   * Langkah 5 — Laporan & unduh
   * ================================================================== */

  function renderReport() {
    const p = S.p;
    const dataLeaves = M.comparisonSets(p).filter((s) => s.mode === 'data').length;
    return `<div class="page-head"><div><h1>Laporan & unduh</h1><p>Semua berkas dibuat di browser Anda. Tidak ada data yang dikirim ke server.</p></div>${scopeSelect()}</div>
    <div class="dl-grid">
      <button class="dl-card primary" data-act="dl-pdf"><span class="dl-ic">${icon('file')}</span><span class="dl-text"><b>Laporan PDF lengkap</b><span>Struktur hierarki, hasil, semua diagram, uji konsistensi, sensitivitas, dan langkah perhitungan tiap matriks.</span></span></button>
      <button class="dl-card" data-act="dl-xlsx"><span class="dl-ic">${icon('table')}</span><span class="dl-text"><b>Excel (.xlsx)</b><span>Satu sheet per matriks dengan rumus jumlah kolom, normalisasi, λ maks, CI, CR yang bisa diperiksa ulang.</span></span></button>
      <button class="dl-card" data-act="dl-csv"><span class="dl-ic">${icon('download')}</span><span class="dl-text"><b>CSV penilaian</b><span>Semua penilaian semua peserta dalam format panjang, bisa diedit lalu diimpor kembali.</span></span></button>
      <button class="dl-card" data-act="dl-json"><span class="dl-ic">${icon('folder')}</span><span class="dl-text"><b>Simpan proyek (.json)</b><span>Simpan untuk dibuka lagi di perangkat lain atau dikirim ke rekan.</span></span></button>
    </div>
    <p class="note" id="dl-status" aria-live="polite"></p>

    <section class="panel" id="share">
      <div class="panel-head"><h2>Kuesioner untuk responden</h2><span class="hint">tanpa server, tanpa akun</span></div>
      <ol class="howto">
        <li>Buat tautan, lalu kirim ke responden (WhatsApp, email, LMS).</li>
        <li>Responden mengisi penilaian di browser masing-masing, lalu mengirim balik berkas atau kode jawaban.</li>
        <li>Tempel kode atau pilih berkas jawaban di bawah. Setiap jawaban menjadi peserta baru dan digabung dengan rata-rata geometrik.</li>
      </ol>
      ${dataLeaves ? `<p class="note">${icon('alert')}${dataLeaves} kriteria dinilai dengan data nyata; bagian itu tidak ditanyakan ke responden.</p>` : ''}
      <div class="share-row">
        <button class="btn primary" data-act="make-link">${icon('link')}Buat tautan kuesioner</button>
        <input type="text" readonly id="share-link" value="${esc(S.shareLink)}" placeholder="Tautan muncul di sini" aria-label="Tautan kuesioner">
        <button class="btn" data-act="copy-link" ${S.shareLink ? '' : 'disabled'}>${icon('copy')}Salin</button>
        ${navigator.share ? `<button class="btn" data-act="share-link" ${S.shareLink ? '' : 'disabled'}>Bagikan</button>` : ''}
      </div>
      <div class="import-box">
        <label class="field"><span>Tempel kode jawaban responden (satu per baris)</span><textarea id="resp-code" rows="3" placeholder="kode jawaban dimulai dengan z…"></textarea></label>
        <div class="row-buttons"><button class="btn" data-act="import-code">${icon('users')}Tambahkan sebagai peserta</button>
          <button class="btn ghost" data-act="open-file">${icon('upload')}Pilih berkas jawaban / CSV / proyek</button></div>
      </div>
    </section>

    <section class="panel cite">
      <div class="panel-head"><h2>Cara mengutip</h2></div>
      <p>Bila Anda memakai alat ini untuk skripsi, tesis, atau publikasi, cantumkan:</p>
      <blockquote id="cite-text">Tarigan, A. G. E. (2026). <i>AHP Decision Engine</i> (Versi 2.0) [Perangkat lunak]. NusaIT. ${esc(X.TOOL_URL)}</blockquote>
      <button class="btn sm" data-act="copy-cite">${icon('copy')}Salin kutipan</button>
      <p class="note">Rujukan metode: Saaty, T. L. (1980). <i>The Analytic Hierarchy Process</i>. McGraw-Hill. Harker, P. T. (1987). Incomplete pairwise comparisons in the analytic hierarchy process. <i>Mathematical Modelling, 9</i>(11), 837–848. Forman, E., &amp; Peniwati, K. (1998). Aggregating individual judgments and priorities with the AHP. <i>EJOR, 108</i>(1), 165–169.</p>
    </section>

    <section class="panel cta">
      <div><h2>Butuh pendampingan?</h2>
      <p>Untuk penyusunan kuesioner AHP, olah data kelompok, atau sistem pendukung keputusan untuk instansi, konsultasikan dengan tim NusaIT.</p></div>
      <a class="btn" href="https://nusait.com/contact" target="_blank" rel="noopener">Hubungi NusaIT</a>
    </section>`;
  }

  /* --- laporan untuk ekspor --- */

  function buildReport() {
    const p = S.p;
    const scope = resultScope();
    const c = comp(scope);
    const t = C.THEMES.light;
    const W = 760;
    const make = (builder) => { try { return builder(W, t); } catch (e) { console.error(e); return null; } };
    const charts = {
      hierarchy: make(CH.hierarchy(c)),
      ranking: c.synth.final.length >= 2 ? make(CH.ranking(c)) : null,
      contribution: c.synth.final.length >= 2 ? make(CH.contribution(c)) : null,
      sunburst: make(CH.sunburst(c)),
      globalWeights: c.synth.leaves.length > c.children[ROOT].length ? make(CH.globalWeights(c)) : null,
      consistency: make(CH.consistency(c))
    };
    const summaries = p.participants.length > 1 ? M.participantSummaries(p) : null;
    if (summaries) charts.participants = make(CH.participants(summaries, comp('combined')));
    let sensitivity = [];
    if (c.synth.final.length >= 2 && c.children[ROOT].length >= 2) {
      const sm = sensModel(c, ROOT);
      sensitivity = sm.kids.map((id, i) => ({ name: M.nodeById(p, id).name, idx: i, stability: AHP.stabilityInterval(sm, i), chart: make(CH.gradient(sm, i, sm.w0)) }));
      charts.performance = make(CH.performance(sm, sm.w0));
      const order = rankingOrder(c);
      charts.headToHead = make(CH.headToHead(sm, sm.w0, order[0], order[1]));
    }
    return {
      project: p, comp: c, scopeLabel: scopeLabel(scope), dateLabel: today(), rankingOrder: c.synth.final.length ? rankingOrder(c) : [],
      localOf: (id) => localOf(c, id), sensitivity, summaries, charts,
      fmt: { num: (x, d) => C.num(x, d), pct: (x, d) => C.pct(x, d), judg: judgText }
    };
  }

  // jsPDF (± 450 KB) dimuat hanya saat PDF diminta, agar halaman pertama tetap ringan di ponsel.
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Gagal memuat ' + src + '. Periksa koneksi lalu coba lagi.'));
      document.head.appendChild(s);
    });
  }
  async function loadPdfLib() {
    if (!(window.jspdf && window.jspdf.jsPDF)) await loadScript('assets/vendor/jspdf.umd.min.js');
    if (!window.autoTable && !(window.jspdf_autotable && window.jspdf_autotable.autoTable)) await loadScript('assets/vendor/jspdf.plugin.autotable.min.js');
  }

  async function downloadPdf(btn) {
    const status = $('#dl-status');
    btn.disabled = true;
    const label = btn.querySelector('b');
    const orig = label.textContent;
    try {
      label.textContent = 'Menyusun PDF…';
      await loadPdfLib();
      const blob = await X.buildPdf(buildReport(), (msg) => { if (status) status.textContent = 'Menyusun bagian: ' + msg; });
      X.download(X.safeFileName(S.p.meta.title, 'pdf'), blob);
      if (status) status.textContent = 'PDF selesai dibuat.';
      toast('Laporan PDF diunduh.');
    } catch (e) {
      console.error(e);
      toast('Gagal membuat PDF: ' + e.message, 'error');
      if (status) status.textContent = '';
    } finally {
      label.textContent = orig;
      btn.disabled = false;
    }
  }

  function downloadXlsx() {
    try {
      const bytes = X.buildXlsx(X.workbookFromReport(buildReport()));
      X.download(X.safeFileName(S.p.meta.title, 'xlsx'), new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      toast('Berkas Excel diunduh.');
    } catch (e) { console.error(e); toast('Gagal membuat Excel: ' + e.message, 'error'); }
  }

  /* ================================================================== *
   * Kuesioner responden
   * ================================================================== */

  function respStoreKey() { return 'ahp-engine:v2:resp:' + (S.respondent ? S.respondent.hash : ''); }

  async function enterRespondentMode(code) {
    const model = await M.decodePayload(code);
    if (!model || model.kind !== 'questionnaire') throw new Error('Tautan kuesioner tidak valid.');
    const p = M.normalizeProject(Object.assign({}, model, { participants: [{ id: 'resp', name: 'Responden', weight: 1, include: true }], activeParticipant: 'resp', judgments: {}, data: {} }));
    S.p = p;
    S.respondent = { hash: model.hash || M.structureHash(p), name: '' };
    try {
      const saved = JSON.parse(localStorage.getItem(respStoreKey()) || 'null');
      if (saved) { S.respondent.name = saved.name || ''; p.judgments.resp = saved.judgments || {}; M.prune(p); }
    } catch (e) { /* abaikan */ }
    S.ui.step = 'judge';
    S.ui.view = 'scale';
  }

  function renderSubmit() {
    const p = S.p;
    let filled = 0, total = 0;
    for (const s of sets()) { const pr = M.setProgress(p, s, 'resp'); filled += pr.filled; total += pr.total; }
    const c = comp('resp');
    const bad = c.sets.filter((s) => s.mode === 'pairwise' && c.results[s.key].analysis.CR > p.settings.crThreshold);
    return `<section class="panel submit">
      <h1>Kirim jawaban</h1>
      <p>Terisi <b class="num">${filled}/${total}</b> penilaian.${filled < total ? ' Anda masih bisa kembali untuk melengkapi.' : ''}</p>
      ${bad.length ? `<div class="banner warn">${icon('alert')}<div>${bad.length} matriks belum konsisten (CR di atas ${num(p.settings.crThreshold, 2)}). Peneliti mungkin meminta Anda meninjau ulang. <button class="link-btn" data-act="goto-set" data-key="${bad[0].key}">Tinjau sekarang</button></div></div>` : ''}
      <label class="field"><span>Nama responden</span><input type="text" data-bind="resp-name" data-fk="resp-name2" value="${esc(S.respondent.name)}" maxlength="80"></label>
      <div class="row-buttons">
        <button class="btn primary" data-act="resp-download">${icon('download')}Unduh berkas jawaban</button>
        <button class="btn" data-act="resp-copy">${icon('copy')}Salin kode jawaban</button>
        <button class="btn ghost" data-act="goto" data-step="judge">${icon('arrowL')}Kembali ke penilaian</button>
      </div>
      <p class="note">Kirim berkas atau kode ini ke peneliti/fasilitator. Jawaban Anda hanya tersimpan di perangkat ini sampai Anda mengirimkannya.</p>
    </section>`;
  }

  function respName() { return (S.respondent.name || '').trim(); }

  /* ================================================================== *
   * Berkas masuk
   * ================================================================== */

  async function handleFiles(files) {
    for (const file of files) {
      try {
        const text = await file.text();
        if (/\.csv$/i.test(file.name) || /^﻿?peserta[,;]/i.test(text)) {
          const r = X.importJudgmentsCSV(S.p, text);
          touch(true);
          toast(`${r.ok} penilaian diimpor${r.created.length ? `, ${r.created.length} peserta baru` : ''}${r.bad ? `, ${r.bad} baris dilewati` : ''}.`);
          continue;
        }
        const obj = JSON.parse(text);
        if (obj.kind === 'response') {
          const r = M.importResponse(S.p, obj);
          touch(true);
          toast(`Jawaban ${r.participant.name} ditambahkan (${r.matched} penilaian)${r.hashMatch ? '' : '; struktur proyek telah berubah, sebagian mungkin dilewati'}.`);
          continue;
        }
        if (!(await confirmBox(`Buka proyek "${(obj.meta && obj.meta.title) || file.name}"? Proyek yang sedang terbuka akan diganti. Unduh dulu bila perlu disimpan.`, 'Buka proyek'))) continue;
        S.p = M.normalizeProject(obj);
        S.ui.step = 'model';
        S.ui.setKey = null;
        S.ui.scope = 'combined';
        touch(true);
        toast('Proyek dibuka.');
      } catch (e) {
        toast(`${file.name}: ${e.message || 'berkas tidak dapat dibaca'}`, 'error');
      }
    }
  }

  async function importCodes(text) {
    const codes = String(text || '').split(/\s+/).map((s) => s.trim()).filter(Boolean);
    if (!codes.length) return toast('Tempel kode jawaban terlebih dahulu.', 'error');
    let added = 0;
    for (const code of codes) {
      try {
        const obj = await M.decodePayload(code);
        const r = M.importResponse(S.p, obj);
        added++;
        toast(`Jawaban ${r.participant.name} ditambahkan (${r.matched} penilaian).`);
      } catch (e) { toast('Kode tidak dapat dibaca: ' + e.message, 'error'); }
    }
    if (added) { touch(true); }
  }

  /* ================================================================== *
   * Bantuan & contoh
   * ================================================================== */

  function openHelp() {
    const scale = [[1, 'Sama penting', 'Kedua elemen berkontribusi sama terhadap tujuan.'], [3, 'Sedikit lebih penting', 'Pengalaman/penilaian sedikit memihak satu elemen.'], [5, 'Jelas lebih penting', 'Pengalaman/penilaian kuat memihak satu elemen.'], [7, 'Sangat lebih penting', 'Dominasi satu elemen terlihat nyata dalam praktik.'], [9, 'Mutlak lebih penting', 'Bukti memihak satu elemen pada tingkat tertinggi.'], ['2, 4, 6, 8', 'Nilai antara', 'Kompromi di antara dua tingkat di atas.'], ['1/3, 1/5, …', 'Kebalikan', 'Bila elemen kanan yang lebih penting.']];
    openModal(`<h2 class="modal-title">Panduan singkat AHP</h2>
      <div class="help">
        <h3>Alur kerja</h3>
        <ol><li><b>Model</b>: tulis tujuan, susun kriteria bertingkat, daftarkan alternatif dan peserta.</li>
          <li><b>Penilaian</b>: bandingkan setiap pasangan dengan skala 1–9. Untuk alternatif, Anda juga bisa memasukkan data nyata (harga, jarak, kapasitas) sebagai benefit atau cost.</li>
          <li><b>Hasil</b>: bobot lokal/global, prioritas akhir, dan rasio konsistensi.</li>
          <li><b>Sensitivitas</b>: uji ketahanan keputusan bila bobot berubah.</li>
          <li><b>Laporan</b>: unduh PDF, Excel, CSV, atau simpan proyek.</li></ol>
        <h3>Skala perbandingan Saaty</h3>
        <div class="table-wrap"><table class="data"><thead><tr><th scope="col">Nilai</th><th scope="col">Arti</th><th scope="col">Penjelasan</th></tr></thead><tbody>${scale.map((r) => `<tr><th scope="row" class="num">${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div>
        <h3>Konsistensi</h3>
        <p>λ maks = rata-rata dari (A·w)<sub>i</sub>/w<sub>i</sub>; CI = (λ maks − n)/(n − 1); CR = CI/RI dengan RI dari tabel Saaty (n=3: 0,58; 4: 0,90; 5: 1,12; 6: 1,24; 7: 1,32; 8: 1,41; 9: 1,45; 10: 1,49). Penilaian dianggap konsisten bila CR ≤ 0,10. Bila tidak, gunakan saran perbaikan di panel kanan halaman penilaian.</p>
        <h3>Metode bobot</h3>
        <p><b>Vektor eigen utama</b> adalah metode asli Saaty dan dipakai Expert Choice. <b>Normalisasi kolom + rata-rata baris</b> adalah pendekatan yang biasa dihitung manual di buku teks; hasilnya sedikit berbeda bila matriks tidak konsisten sempurna. Laporan PDF dan Excel menampilkan keduanya agar perhitungan manual Anda bisa dicocokkan.</p>
        <h3>Penilaian kelompok</h3>
        <p>Setiap peserta menilai sendiri. Penilaian gabungan memakai rata-rata geometrik berbobot per sel matriks (AIJ), sesuai rekomendasi Forman &amp; Peniwati (1998). Peserta yang CR-nya terlalu tinggi bisa dikeluarkan dari gabungan dengan menghapus centang “ikut”.</p>
        <h3>Distributive atau ideal?</h3>
        <p><b>Distributive</b> membagi prioritas lokal alternatif agar berjumlah 1 (cocok bila alternatif saling bersaing memperebutkan sumber daya). <b>Ideal</b> membagi dengan nilai terbesar sehingga menambah alternatif yang buruk tidak mengubah urutan alternatif lain (mencegah rank reversal).</p>
        <h3>Data Anda</h3>
        <p>Semua perhitungan berjalan di browser. Proyek tersimpan otomatis di penyimpanan lokal browser ini; unduh berkas .json untuk cadangan atau pindah perangkat.</p>
      </div>
      <div class="modal-actions"><button class="btn primary" data-act="close-modal" autofocus>Mengerti</button></div>`, { wide: true });
  }

  function openSamples() {
    openModal(`<h2 class="modal-title">Mulai dari contoh atau proyek kosong</h2>
      <p class="modal-text">Proyek yang sedang terbuka akan diganti. Unduh dulu (.json) bila masih diperlukan.</p>
      <ul class="sample-list">${M.SAMPLE_INFO.map((s) => `<li><button class="sample" data-act="load-sample" data-id="${s.id}"><b>${esc(s.title)}</b><span>${esc(s.text)}</span></button></li>`).join('')}
        <li><button class="sample" data-act="load-sample" data-id="__empty"><b>Proyek kosong</b><span>Tiga kriteria dan dua alternatif kosong untuk diisi sendiri.</span></button></li></ul>
      <div class="modal-actions"><button class="btn" data-act="close-modal">Batal</button></div>`);
  }

  /* ================================================================== *
   * Event: klik
   * ================================================================== */

  async function onClick(e) {
    const t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    const act = t.dataset.act;
    const id = t.dataset.id;
    const p = S.p;
    switch (act) {
      case 'goto':
        S.ui.step = t.dataset.step;
        if (t.dataset.step === 'judge' && S.respondent) S.ui.step = 'judge';
        render();
        window.scrollTo({ top: 0, behavior: 'auto' });
        if (t.dataset.focus) { const el = $('#' + t.dataset.focus); if (el) el.scrollIntoView({ block: 'start' }); }
        break;
      case 'goto-set':
        S.ui.step = 'judge';
        S.ui.setKey = t.dataset.key;
        S.ui.viewCombined = false;
        render();
        window.scrollTo({ top: 0 });
        break;
      case 'help': openHelp(); break;
      case 'samples': openSamples(); break;
      case 'close-modal': closeModal(); break;
      case 'confirm-yes': closeModal(true); break;
      case 'confirm-no': closeModal(false); break;
      case 'load-sample':
        S.p = t.dataset.id === '__empty' ? M.newProject() : M.sampleProject(t.dataset.id);
        S.ui = Object.assign(S.ui, { step: 'model', setKey: null, scope: 'combined', viewCombined: false, whatIf: null, h2h: null, sensNode: ROOT });
        S.shareLink = '';
        closeModal();
        touch(true);
        toast(t.dataset.id === '__empty' ? 'Proyek kosong dibuat.' : 'Contoh dimuat.');
        break;
      case 'open-file': $('#file-input').click(); break;
      case 'save-json': case 'dl-json':
        X.download(X.safeFileName(p.meta.title, 'json'), M.serialize(p), 'application/json');
        toast('Proyek diunduh.');
        break;

      // --- model
      case 'node-add-child': nodeAddChild(id); break;
      case 'node-up': nodeMove(id, -1); break;
      case 'node-down': nodeMove(id, 1); break;
      case 'node-indent': nodeIndent(id); break;
      case 'node-outdent': nodeOutdent(id); break;
      case 'node-del': nodeDelete(id); break;
      case 'alt-add': {
        const aid = M.uid('a_');
        p.alternatives.push({ id: aid, name: 'Alternatif ' + String.fromCharCode(65 + (p.alternatives.length % 26)), note: '' });
        S.focusKey = 'alt:' + aid;
        touch(true);
        const el = $(`[data-fk="alt:${aid}"]`); if (el) el.select();
        break;
      }
      case 'alt-up': moveSibling(p.alternatives, id, -1); S.focusKey = 'alt:' + id; touch(true); break;
      case 'alt-del': {
        const snap = snapshot();
        const a = p.alternatives.find((x) => x.id === id);
        p.alternatives = p.alternatives.filter((x) => x.id !== id);
        M.prune(p);
        touch(true);
        toast(`"${a.name}" dihapus.`, 'info', { label: 'Urungkan', run: () => restore(snap, 'Alternatif dikembalikan.') });
        break;
      }
      case 'part-add': {
        const pid = M.uid('p_');
        p.participants.push({ id: pid, name: 'Peserta ' + (p.participants.length + 1), weight: 1, include: true });
        S.focusKey = 'part:' + pid;
        touch(true);
        const el = $(`[data-fk="part:${pid}"]`); if (el) el.select();
        break;
      }
      case 'part-del': {
        const part = p.participants.find((x) => x.id === id);
        const n = Object.values(p.judgments[id] || {}).reduce((s, x) => s + Object.keys(x).length, 0);
        if (n && !(await confirmBox(`Hapus peserta "${part.name}" beserta ${n} penilaiannya?`, 'Hapus', true))) return;
        const snap = snapshot();
        p.participants = p.participants.filter((x) => x.id !== id);
        delete p.judgments[id];
        if (p.activeParticipant === id) p.activeParticipant = p.participants[0].id;
        if (S.ui.scope === id) S.ui.scope = 'combined';
        touch(true);
        toast(`Peserta "${part.name}" dihapus.`, 'info', { label: 'Urungkan', run: () => restore(snap, 'Peserta dikembalikan.') });
        break;
      }
      case 'part-judge':
        p.activeParticipant = id;
        S.ui.viewCombined = false;
        S.ui.step = 'judge';
        touch(true);
        window.scrollTo({ top: 0 });
        break;

      // --- penilaian
      case 'pick-set': S.ui.setKey = t.dataset.key; render(); break;
      case 'set-step': {
        const all = sets();
        const i = all.findIndex((s) => s.key === S.ui.setKey) + Number(t.dataset.dir);
        if (all[i]) { S.ui.setKey = all[i].key; render(); const ws = $('.workspace'); if (ws && ws.getBoundingClientRect().top < 0) ws.scrollIntoView({ block: 'start' }); }
        break;
      }
      case 'view': S.ui.view = t.dataset.view; render(); break;
      case 'alt-mode': {
        const set = currentSet();
        M.nodeById(p, set.nodeId).altMode = t.dataset.mode;
        S.ui.setKey = set.key;
        touch(true);
        break;
      }
      case 'data-type': {
        const set = currentSet();
        M.nodeById(p, set.nodeId).dataType = t.dataset.type;
        touch(true);
        break;
      }
      case 'judge-clear': setJudgmentUI(t.dataset.a, t.dataset.b, null); break;
      case 'apply-suggest': {
        const set = currentSet();
        const before = M.getJudgment(p, p.activeParticipant, set.key, t.dataset.a, t.dataset.b);
        M.setJudgment(p, p.activeParticipant, set.key, t.dataset.a, t.dataset.b, Number(t.dataset.v));
        touch(true);
        toast('Saran diterapkan.', 'info', { label: 'Urungkan', run: () => { M.setJudgment(S.p, S.p.activeParticipant, set.key, t.dataset.a, t.dataset.b, before); touch(true); } });
        break;
      }
      case 'show-suggest': S.ui.showSuggest = true; refreshJudgeSide(currentSet()); break;

      // --- sensitivitas
      case 'sens-tab': S.ui.sensTab = t.dataset.tab; render(); break;
      case 'sens-reset': S.ui.whatIf = null; render(); break;

      // --- diagram
      case 'chart-png': exportChart(t.dataset.id, 'png'); break;
      case 'chart-svg': exportChart(t.dataset.id, 'svg'); break;
      case 'chart-table': {
        const fig = t.closest('[data-chart]');
        const tbl = fig.querySelector('.chart-table');
        tbl.hidden = !tbl.hidden;
        t.setAttribute('aria-expanded', String(!tbl.hidden));
        if (!tbl.hidden) tbl.innerHTML = tableHTML((S.charts[t.dataset.id] || {}).table);
        break;
      }

      // --- unduhan
      case 'dl-pdf': downloadPdf(t); break;
      case 'dl-xlsx': downloadXlsx(); break;
      case 'dl-csv': X.download(X.safeFileName(p.meta.title + '-penilaian', 'csv'), X.csvString(X.judgmentRows(p)), 'text/csv;charset=utf-8'); toast('CSV penilaian diunduh.'); break;
      case 'make-link': {
        const code = await M.encodePayload(M.questionnaireModel(p));
        const base = location.href.split('#')[0].split('?')[0];
        S.shareLink = base + '#kuesioner=' + code;
        render();
        const el = $('#share-link'); if (el) { el.focus(); el.select(); }
        break;
      }
      case 'copy-link': copyText(S.shareLink, 'Tautan disalin.'); break;
      case 'share-link':
        try { await navigator.share({ title: p.meta.title, text: 'Mohon isi kuesioner AHP berikut:', url: S.shareLink }); } catch (err) { /* dibatalkan */ }
        break;
      case 'import-code': importCodes($('#resp-code').value); break;
      case 'copy-cite': copyText($('#cite-text').textContent.trim(), 'Kutipan disalin.'); break;

      // --- responden
      case 'resp-finish':
        S.ui.step = 'submit'; render(); window.scrollTo({ top: 0 }); break;
      case 'resp-download': {
        if (!respName()) { toast('Isi nama responden terlebih dahulu.', 'error'); const el = $('[data-bind="resp-name"]'); if (el) el.focus(); return; }
        const resp = M.makeResponse(p, respName());
        X.download(X.safeFileName('jawaban-' + respName(), 'json'), JSON.stringify(resp, null, 2), 'application/json');
        toast('Berkas jawaban diunduh. Kirim ke peneliti.');
        break;
      }
      case 'resp-copy': {
        if (!respName()) { toast('Isi nama responden terlebih dahulu.', 'error'); const el = $('[data-bind="resp-name"]'); if (el) el.focus(); return; }
        const code = await M.encodePayload(M.makeResponse(p, respName()));
        copyText(code, 'Kode jawaban disalin. Tempel di pesan ke peneliti.');
        break;
      }
      default: break;
    }
  }

  async function copyText(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(okMsg);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast(okMsg); } catch (err) { toast('Salin manual: tekan Ctrl+C.', 'error'); }
      ta.remove();
    }
  }

  /* ================================================================== *
   * Event: input / change
   * ================================================================== */

  let diagramTimer = null;
  function refreshModelDiagram() {
    clearTimeout(diagramTimer);
    diagramTimer = setTimeout(() => { const fig = $('[data-chart="model-hierarchy"]'); if (fig) mountChart(fig); }, 250);
  }

  function onInput(e) {
    const t = e.target;
    const bind = t.dataset ? t.dataset.bind : null;
    const p = S.p;
    if (t.id === 'project-title') { p.meta.title = t.value.slice(0, 160) || 'Proyek AHP'; touch(false); document.title = p.meta.title + ' — AHP Decision Engine'; return; }
    if (!bind) return;
    switch (bind) {
      case 'node-name': { const n = M.nodeById(p, t.dataset.id); if (n) { n.name = t.value.slice(0, 160); touch(false); refreshModelDiagram(); } break; }
      case 'alt-name': { const a = p.alternatives.find((x) => x.id === t.dataset.id); if (a) { a.name = t.value.slice(0, 160); touch(false); refreshModelDiagram(); } break; }
      case 'part-name': { const x = p.participants.find((y) => y.id === t.dataset.id); if (x) { x.name = t.value.slice(0, 80); touch(false); } break; }
      case 'meta-author': p.meta.author = t.value.slice(0, 120); touch(false); break;
      case 'resp-name': S.respondent.name = t.value.slice(0, 80); scheduleSave(); break;
      case 'data-unit': { const set = currentSet(); M.nodeById(p, set.nodeId).unit = t.value.slice(0, 24); touch(false); break; }
      case 'data-val': {
        const set = currentSet();
        const v = parseNum(t.value);
        t.classList.toggle('invalid', Number.isNaN(v));
        if (Number.isNaN(v)) return;
        const row = (p.data[set.nodeId] = p.data[set.nodeId] || {});
        if (v === null) delete row[t.dataset.alt]; else row[t.dataset.alt] = v;
        touch(false);
        const res = comp('combined').results[set.key];
        $$('[data-prio]').forEach((td) => { td.textContent = res.priority ? pct(res.priority[Number(td.dataset.prio)]) : '–'; });
        refreshJudgeSide(set);
        break;
      }
      case 'dyn-w': {
        const c = comp(resultScope());
        const sm = sensModel(c, S.ui.sensNode);
        const i = Number(t.dataset.i);
        const w = AHP.adjustWeights(currentWhatIf(sm), i, Number(t.value) / 1000);
        setWhatIf(sm, w);
        $$('[data-bind="dyn-w"]').forEach((r) => {
          const k = Number(r.dataset.i);
          if (r !== t) r.value = Math.round(w[k] * 1000);
          r.style.setProperty('--v', (w[k] * 100).toFixed(2) + '%');
        });
        $$('[data-dyn-val]').forEach((s) => { s.textContent = pct(w[Number(s.dataset.dynVal)], 1); });
        $('#dyn-alts').innerHTML = dynAltBars(AHP.sensFinal(sm, w));
        const reset = $('[data-act="sens-reset"]'); if (reset) reset.disabled = false;
        break;
      }
      default: break;
    }
  }

  function onChange(e) {
    const t = e.target;
    const p = S.p;
    if (t.id === 'file-input') { handleFiles(Array.from(t.files || [])); t.value = ''; return; }
    if (t.dataset && t.dataset.actChange === 'judge-scale') {
      setJudgmentUI(t.dataset.a, t.dataset.b, AHP.positionToValue(Number(t.value)));
      return;
    }
    const bind = t.dataset ? t.dataset.bind : null;
    if (!bind) return;
    switch (bind) {
      case 'node-name': case 'alt-name': case 'part-name':
        // Tidak merender ulang: 'change' terjadi saat blur, dan render di sini akan menelan klik tombol berikutnya.
        if (!t.value.trim()) {
          const fallback = bind === 'alt-name' ? 'Alternatif' : bind === 'part-name' ? 'Peserta' : (t.dataset.id === ROOT ? 'Tujuan keputusan' : 'Kriteria');
          t.value = fallback;
          onInput({ target: t });
        }
        break;
      case 'part-weight': {
        const x = p.participants.find((y) => y.id === t.dataset.id);
        const v = parseNum(t.value);
        if (!(v > 0)) { toast('Bobot suara harus angka lebih dari 0.', 'error'); t.value = num(x.weight, 2); return; }
        x.weight = v; touch(false); refreshModelDiagram(); break;
      }
      case 'part-include': { const x = p.participants.find((y) => y.id === t.dataset.id); x.include = t.checked; touch(true); break; }
      case 'set-method': p.settings.method = t.value; touch(true); break;
      case 'set-synthesis': p.settings.synthesis = t.value; touch(true); break;
      case 'set-cr': p.settings.crThreshold = Number(t.value); touch(true); break;
      case 'set-decimals': p.settings.decimals = Number(t.value); touch(true); break;
      case 'set-sep': p.settings.decimalSep = t.value; C.setLocale({ decimalSep: t.value }); touch(true); break;
      case 'judge-as':
        if (t.value === '__combined') S.ui.viewCombined = true;
        else { S.ui.viewCombined = false; p.activeParticipant = t.value; scheduleSave(); }
        render();
        break;
      case 'pick-set': S.ui.setKey = t.value; render(); break;
      case 'judge-cell': {
        const raw = t.value;
        const v = AHP.parseJudgment(raw);
        if (Number.isNaN(v) || (v !== null && (v < 1 / 9 - 1e-9 || v > 9 + 1e-9))) {
          t.classList.add('invalid');
          toast('Isi angka 1/9 sampai 9, misalnya 3, 1/3, atau 2,5.', 'error');
          return;
        }
        t.classList.remove('invalid');
        const set = currentSet();
        M.setJudgment(p, p.activeParticipant, set.key, t.dataset.a, t.dataset.b, v);
        touch(false);
        t.value = v === null ? '' : judgText(v);
        const rc = $(`[data-recip="${CSS.escape(t.dataset.b + '>' + t.dataset.a)}"]`);
        if (rc) rc.textContent = v === null ? '–' : judgText(1 / v);
        refreshJudgeSide(set);
        break;
      }
      case 'result-scope': S.ui.scope = t.value; render(); break;
      case 'sens-node': S.ui.sensNode = t.value; S.ui.whatIf = null; render(); break;
      case 'grad-idx': S.ui.gradIdx = Number(t.value); render(); break;
      case 'h2h-a': S.ui.h2h = [Number(t.value), S.ui.h2h[1]]; render(); break;
      case 'h2h-b': S.ui.h2h = [S.ui.h2h[0], Number(t.value)]; render(); break;
      case 'xy-x': S.ui.xy = [Number(t.value), S.ui.xy[1]]; render(); break;
      case 'xy-y': S.ui.xy = [S.ui.xy[0], Number(t.value)]; render(); break;
      default: break;
    }
  }

  /* --- seret batang di diagram performa --- */
  let drag = null;
  function onPointerDown(e) {
    // Kolom ditentukan dari posisi X, karena titik/garis alternatif digambar di atas batang.
    const box = e.target.closest && e.target.closest('[data-svg="sens-perf"]');
    const ch = S.charts['sens-perf'];
    if (!box || !ch || e.button > 0) return;
    const svg = box.querySelector('svg');
    const r = svg.getBoundingClientRect();
    const sc = ch.width / r.width;
    const x = (e.clientX - r.left) * sc, y = (e.clientY - r.top) * sc;
    const col = Math.floor((x - ch.meta.left) / ch.meta.colW);
    if (col < 0 || col >= ch.meta.bars.length || y < ch.meta.top - 12 || y > ch.meta.top + ch.meta.plotH + 6) return;
    drag = { idx: col, box };
    box.setPointerCapture(e.pointerId);
    e.preventDefault();
    onPointerMove(e);
  }
  function onPointerMove(e) {
    if (drag) {
      const ch = S.charts['sens-perf'];
      const svg = drag.box.querySelector('svg');
      if (!ch || !svg) return;
      const r = svg.getBoundingClientRect();
      const scale = ch.height / r.height;
      const y = (e.clientY - r.top) * scale;
      const v = Math.max(0, Math.min(1, (ch.meta.top + ch.meta.plotH - y) / ch.meta.plotH * ch.meta.max));
      const c = comp(resultScope());
      const sm = sensModel(c, S.ui.sensNode);
      setWhatIf(sm, AHP.adjustWeights(currentWhatIf(sm), drag.idx, v));
      const fig = $('[data-chart="sens-perf"]');
      S.chartDefs['sens-perf'].build = CH.performance(sm, S.ui.whatIf.w, true);
      mountChart(fig);
      return;
    }
    const tipT = e.target.closest && e.target.closest('[data-tip]');
    if (tipT && tipT.closest('.chart-svg')) showTip(tipT, e.clientX, e.clientY);
    else if (e.target.closest && e.target.closest('[data-svg="sens-grad"]')) gradientHover(e);
    else hideTip();
  }
  function onPointerUp(e) {
    if (!drag) return;
    try { drag.box.releasePointerCapture(e.pointerId); } catch (err) { /* sudah dilepas */ }
    drag = null;
    render();
  }

  function gradientHover(e) {
    const ch = S.charts['sens-grad'];
    const box = $('[data-svg="sens-grad"]');
    if (!ch || !box) return;
    const svg = box.querySelector('svg');
    const r = svg.getBoundingClientRect();
    const sx = ch.width / r.width;
    const x = ((e.clientX - r.left) * sx - ch.meta.left) / ch.meta.plotW;
    let line = svg.querySelector('.hover-line');
    if (x < 0 || x > 1) { hideTip(); if (line) line.remove(); return; }
    const c = comp(resultScope());
    const sm = sensModel(c, S.ui.sensNode);
    const w = currentWhatIf(sm);
    const f = AHP.sensFinal(sm, AHP.adjustWeights(w, S.ui.gradIdx, x));
    const order = f.map((_, k) => k).sort((a, b) => f[b] - f[a]);
    const tip = $('#tip');
    tip.textContent = `Bobot ${M.nodeById(S.p, sm.kids[S.ui.gradIdx]).name} ${pct(x, 1)}\n` + order.map((k) => `${S.p.alternatives[k].name}: ${pct(f[k], 1)}`).join('\n');
    tip.hidden = false;
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8) + 'px';
    tip.style.top = Math.min(e.clientY + 14, window.innerHeight - tip.offsetHeight - 8) + 'px';
    const px = ch.meta.left + x * ch.meta.plotW;
    if (!line) {
      line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'hover-line');
      line.setAttribute('stroke', theme().ink2);
      line.setAttribute('stroke-width', '1');
      line.setAttribute('pointer-events', 'none');
      svg.appendChild(line);
    }
    line.setAttribute('x1', px); line.setAttribute('x2', px);
    line.setAttribute('y1', ch.meta.top); line.setAttribute('y2', ch.meta.top + ch.meta.plotH);
  }

  /* ================================================================== *
   * Inisialisasi
   * ================================================================== */

  async function init() {
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.documentElement.addEventListener('mouseleave', hideTip);
    window.addEventListener('scroll', hideTip, { passive: true, capture: true });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !S.respondent) {
        e.preventDefault();
        X.download(X.safeFileName(S.p.meta.title, 'json'), M.serialize(S.p), 'application/json');
        toast('Proyek diunduh.');
      }
    });
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' || e.target.closest('#modal-close')) closeModal(); });
    window.addEventListener('beforeunload', saveNow);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });

    // seret & lepas berkas ke halaman
    document.addEventListener('dragover', (e) => { if (S.respondent) return; e.preventDefault(); document.body.classList.add('dropping'); });
    document.addEventListener('dragleave', (e) => { if (e.target === document.documentElement || e.clientX <= 0) document.body.classList.remove('dropping'); });
    document.addEventListener('drop', (e) => {
      if (S.respondent) return;
      e.preventDefault();
      document.body.classList.remove('dropping');
      if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(Array.from(e.dataTransfer.files));
    });

    let resizeTimer = null;
    let lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      if (Math.abs(window.innerWidth - lastW) < 8) return;
      lastW = window.innerWidth;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { mountCharts(document); $$('.cmp').forEach(paintRow); }, 180);
    });
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => mountCharts(document));

    const hash = location.hash || '';
    const params = new URLSearchParams(location.search);
    try {
      if (/^#kuesioner=/.test(hash)) {
        await enterRespondentMode(hash);
      } else if (params.get('contoh')) {
        // Jangan menimpa proyek tersimpan: tawarkan contoh lewat notifikasi bila sudah ada proyek.
        const sampleId = params.get('contoh');
        const saved = M.loadLocal();
        history.replaceState(null, '', location.pathname);
        if (saved) {
          S.p = saved;
          setTimeout(() => toast('Proyek terakhir Anda tetap dibuka.', 'info', { label: 'Buka contoh', run: () => { S.p = M.sampleProject(sampleId); S.ui.step = 'model'; touch(true); } }), 50);
        } else {
          S.p = M.sampleProject(sampleId);
        }
      } else {
        S.p = M.loadLocal() || M.sampleProject('laptop');
      }
    } catch (e) {
      console.error(e);
      S.p = M.loadLocal() || M.sampleProject('laptop');
      setTimeout(() => toast('Tautan tidak dapat dibuka: ' + e.message, 'error'), 50);
    }
    C.setLocale({ decimalSep: S.p.settings.decimalSep });
    document.body.classList.toggle('respondent', !!S.respondent);
    render();
    if (!S.respondent) saveNow();
  }

  // Ekspos untuk debugging & uji otomatis
  window.AHPApp = { state: S, render, comp, buildReport };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
