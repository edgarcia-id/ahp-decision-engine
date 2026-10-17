/*!
 * AHP Decision Engine — diagram SVG (tanpa pustaka)
 * (c) 2026 Alfredo Garcia / NusaIT — MIT License
 *
 * Setiap fungsi mengembalikan { svg, width, height, table, meta }:
 *  - svg   : string SVG mandiri (warna eksplisit, siap diekspor PNG/SVG/PDF)
 *  - table : { head: [...], rows: [[...]] } untuk tampilan tabel aksesibel
 *  - meta  : geometri untuk interaksi (crosshair, drag)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AHPCharts = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FONT = "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

  // Palet kategorikal tervalidasi (CVD-safe, urutan tetap). Lihat README > Aksesibilitas.
  const THEMES = {
    light: {
      name: 'light', surface: '#ffffff', ink: '#14213d', ink2: '#47546b', muted: '#7a8597',
      grid: '#e6eaf0', axis: '#c3cad5', band: '#eef4fb', brand: '#0063b0', navy: '#14213d',
      good: '#11803b', critical: '#d03b3b',
      series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
      overflow: '#9aa3b2'
    },
    dark: {
      name: 'dark', surface: '#182230', ink: '#eef2f7', ink2: '#c2cad6', muted: '#8e9aab',
      grid: '#273345', axis: '#3a4859', band: '#1f3047', brand: '#5aa2e8', navy: '#0e1622',
      good: '#2fbf5f', critical: '#ef6a6a',
      series: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
      overflow: '#6d7a8c'
    }
  };

  let locale = { decimalSep: ',' };
  function setLocale(l) { locale = Object.assign({}, locale, l || {}); }
  function num(x, d) {
    if (x === null || x === undefined || !isFinite(x)) return '–';
    let s = Number(x).toFixed(d === undefined ? 2 : d);
    if (s === '-0' || /^-0[.,]0+$/.test(s)) s = s.slice(1);
    return locale.decimalSep === ',' ? s.replace('.', ',') : s;
  }
  function pct(x, d) { return num(x * 100, d === undefined ? 1 : d) + '%'; }
  function signedPct(x, d) { return (x > 0 ? '+' : x < 0 ? '−' : '') + num(Math.abs(x) * 100, d === undefined ? 1 : d) + '%'; }

  function colorAt(theme, i) { return i < theme.series.length ? theme.series[i] : theme.overflow; }

  /* ------------------------------------------------------------------ *
   * Primitif
   * ------------------------------------------------------------------ */

  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function f(n) { return Math.round(n * 100) / 100; }

  function attrs(o) {
    let s = '';
    for (const k of Object.keys(o)) if (o[k] !== undefined && o[k] !== null && o[k] !== false) s += ' ' + k + '="' + esc(o[k]) + '"';
    return s;
  }

  function text(x, y, s, o) {
    o = o || {};
    return '<text' + attrs({
      x: f(x), y: f(y), 'font-size': o.size || 12, 'font-weight': o.weight || null,
      fill: o.fill, 'text-anchor': o.anchor || null, 'dominant-baseline': o.baseline || 'middle',
      'font-variant-numeric': o.tabular ? 'tabular-nums' : null, opacity: o.opacity
    }) + '>' + esc(s) + '</text>';
  }

  function line(x1, y1, x2, y2, stroke, w, extra) {
    return '<line' + attrs(Object.assign({ x1: f(x1), y1: f(y1), x2: f(x2), y2: f(y2), stroke, 'stroke-width': w || 1 }, extra || {})) + '/>';
  }

  /** Batang horizontal: ujung data membulat 4px, sisi baseline persegi. dir = 1 (kanan) / -1 (kiri). */
  function hbar(x0, y, len, h, fill, dir, extra) {
    dir = dir || 1;
    len = Math.max(0, len);
    const r = Math.min(4, len, h / 2);
    const x1 = x0 + dir * len;
    let d;
    if (len < 0.5) return '';
    if (dir > 0) {
      d = `M${f(x0)},${f(y)}H${f(x1 - r)}Q${f(x1)},${f(y)} ${f(x1)},${f(y + r)}V${f(y + h - r)}Q${f(x1)},${f(y + h)} ${f(x1 - r)},${f(y + h)}H${f(x0)}Z`;
    } else {
      d = `M${f(x0)},${f(y)}H${f(x1 + r)}Q${f(x1)},${f(y)} ${f(x1)},${f(y + r)}V${f(y + h - r)}Q${f(x1)},${f(y + h)} ${f(x1 + r)},${f(y + h)}H${f(x0)}Z`;
    }
    return '<path' + attrs(Object.assign({ d, fill }, extra || {})) + '/>';
  }

  /** Batang vertikal dari baseline ke atas, ujung atas membulat. */
  function vbar(x, yBase, len, w, fill, extra) {
    if (len < 0.5) return '';
    const r = Math.min(4, len, w / 2);
    const y1 = yBase - len;
    const d = `M${f(x)},${f(yBase)}V${f(y1 + r)}Q${f(x)},${f(y1)} ${f(x + r)},${f(y1)}H${f(x + w - r)}Q${f(x + w)},${f(y1)} ${f(x + w)},${f(y1 + r)}V${f(yBase)}Z`;
    return '<path' + attrs(Object.assign({ d, fill }, extra || {})) + '/>';
  }

  let measureCtx = null;
  function measure(s, size, weight) {
    s = String(s);
    if (typeof document !== 'undefined') {
      try {
        if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
        measureCtx.font = (weight || 400) + ' ' + size + 'px ' + FONT;
        return measureCtx.measureText(s).width;
      } catch (e) { /* fallback */ }
    }
    return s.length * size * 0.56;
  }

  function ellipsize(s, maxW, size, weight) {
    s = String(s);
    if (measure(s, size, weight) <= maxW) return s;
    let lo = 0, hi = s.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (measure(s.slice(0, mid) + '…', size, weight) <= maxW) lo = mid; else hi = mid - 1;
    }
    return s.slice(0, Math.max(1, lo)).trimEnd() + '…';
  }

  /** Bungkus teks ke maksimal `lines` baris selebar maxW. */
  function wrap(s, maxW, size, lines, weight) {
    const words = String(s).split(/\s+/).filter(Boolean);
    const out = [];
    let cur = '';
    for (let i = 0; i < words.length; i++) {
      const tryS = cur ? cur + ' ' + words[i] : words[i];
      if (measure(tryS, size, weight) <= maxW || !cur) { cur = tryS; continue; }
      out.push(cur);
      cur = words[i];
      if (out.length === lines - 1) { cur = words.slice(i).join(' '); break; }
    }
    if (cur) out.push(cur);
    return out.slice(0, lines).map((l, i) => (i === lines - 1 || measure(l, size, weight) > maxW ? ellipsize(l, maxW, size, weight) : l));
  }

  function niceMax(v) {
    if (!(v > 0)) return 1;
    const exp = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / exp;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * exp;
  }

  function ticks(max, count) {
    const step = niceMax(max / (count || 4));
    const out = [];
    for (let v = 0; v <= max + step * 1e-6; v += step) out.push(+v.toFixed(10));
    return out;
  }

  function mix(hex, toHex, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const a = p(hex), b = p(toHex);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  function luminance(hex) {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function onColor(hex, theme) { return luminance(hex) > 0.36 ? '#14213d' : '#ffffff'; }

  function open(w, h, theme, label) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(w)} ${f(h)}" width="${f(w)}" height="${f(h)}" font-family="${esc(FONT)}" role="img" aria-label="${esc(label || '')}">` +
      `<rect width="${f(w)}" height="${f(h)}" fill="${theme.surface}"/>`;
  }

  function legend(items, x, y, maxW, theme, opts) {
    // items: [{label, color, shape}] → mengalir ke kanan, pindah baris bila penuh
    opts = opts || {};
    let cx = x, cy = y, out = '';
    const size = 12, gap = 18, rowH = 20;
    for (const it of items) {
      const label = ellipsize(it.label, Math.min(200, maxW - 24), size);
      const w = 16 + measure(label, size) + gap;
      if (cx + w > x + maxW && cx > x) { cx = x; cy += rowH; }
      if (it.shape === 'line') out += line(cx, cy, cx + 12, cy, it.color, 2, { 'stroke-linecap': 'round' });
      else if (it.shape === 'dot') out += `<circle cx="${f(cx + 6)}" cy="${f(cy)}" r="${it.r || 5}" fill="${it.color}" stroke="${theme.surface}" stroke-width="2"/>`;
      else out += `<rect x="${f(cx)}" y="${f(cy - 6)}" width="12" height="12" rx="3" fill="${it.color}"/>`;
      out += text(cx + 17, cy + 0.5, label, { fill: theme.ink2, size });
      cx += w;
    }
    return { svg: out, height: cy - y + rowH };
  }

  function legendHeight(items, maxW) {
    let cx = 0, rows = 1;
    for (const it of items) {
      const w = 16 + Math.min(measure(it.label, 12), 200) + 18;
      if (cx + w > maxW && cx > 0) { cx = 0; rows++; }
      cx += w;
    }
    return rows * 20;
  }

  function finish(svg, w, h, table, meta) { return { svg: svg + '</svg>', width: w, height: h, table, meta: meta || {} }; }

  /* ------------------------------------------------------------------ *
   * 1. Struktur hierarki
   * ------------------------------------------------------------------ */

  /**
   * @param {object} d
   *   nodes: [{id, parentId, name}] (pre-order), children: map, local: map id→w, global: map id→G,
   *   topIndex: map id→indeks kriteria level-1, alts: [{name, priority|null, rank|null}]
   */
  function hierarchy(d, theme, opts) {
    opts = opts || {};
    const BOX_W = 138, BOX_H = 56, SLOT = 154, LEVEL = 104, PAD = 20;
    const ch = d.children;
    const rootId = d.nodes[0].id;
    const pos = {};
    let leafSlot = 0, maxDepth = 0;
    (function walk(id, depth) {
      maxDepth = Math.max(maxDepth, depth);
      const kids = ch[id] || [];
      if (!kids.length) { pos[id] = { slot: leafSlot++, depth }; return; }
      kids.forEach((k) => walk(k, depth + 1));
      const a = pos[kids[0]].slot, b = pos[kids[kids.length - 1]].slot;
      pos[id] = { slot: (a + b) / 2, depth };
    }(rootId, 0));
    const nLeaves = leafSlot;
    const alts = d.alts || [];
    const altSlots = Math.max(alts.length, 0);
    const slots = Math.max(nLeaves, altSlots, 2);
    const W = Math.max(slots * SLOT + PAD * 2, opts.minWidth || 0);
    const offLeaf = (W - nLeaves * SLOT) / 2;
    const offAlt = (W - altSlots * SLOT) / 2;
    const cxOf = (id) => offLeaf + pos[id].slot * SLOT + SLOT / 2;
    const yOf = (depth) => PAD + depth * LEVEL;
    const altY = yOf(maxDepth + 1) + (alts.length ? 8 : 0);
    const H = (alts.length ? altY + BOX_H : yOf(maxDepth) + BOX_H) + PAD;
    const byId = {};
    d.nodes.forEach((n) => { byId[n.id] = n; });

    let s = open(W, H, theme, 'Struktur hierarki AHP');
    // Konektor induk → anak (siku)
    for (const n of d.nodes) {
      const kids = ch[n.id] || [];
      if (!kids.length) continue;
      const px = cxOf(n.id), py = yOf(pos[n.id].depth) + BOX_H;
      const midY = py + (LEVEL - BOX_H) / 2;
      s += line(px, py, px, midY, theme.axis, 1.5);
      const xs = kids.map(cxOf);
      s += line(Math.min(...xs), midY, Math.max(...xs), midY, theme.axis, 1.5);
      for (const x of xs) s += line(x, midY, x, midY + (LEVEL - BOX_H) / 2, theme.axis, 1.5);
    }
    // Bus daun → alternatif
    if (alts.length) {
      const leafIds = d.nodes.filter((n) => !(ch[n.id] || []).length).map((n) => n.id);
      const busY = altY - 22;
      const leafXs = leafIds.map(cxOf);
      const altXs = alts.map((_, i) => offAlt + i * SLOT + SLOT / 2);
      for (const id of leafIds) s += line(cxOf(id), yOf(pos[id].depth) + BOX_H, cxOf(id), busY, theme.axis, 1, { 'stroke-dasharray': pos[id].depth < maxDepth ? '3 3' : null });
      s += line(Math.min(...leafXs, ...altXs), busY, Math.max(...leafXs, ...altXs), busY, theme.axis, 1.5);
      for (const x of altXs) s += line(x, busY, x, altY, theme.axis, 1.5);
    }
    // Kotak node
    const rows = [];
    for (const n of d.nodes) {
      const x = cxOf(n.id) - BOX_W / 2, y = yOf(pos[n.id].depth);
      const isRoot = n.id === rootId;
      const top = d.topIndex[n.id];
      const color = isRoot ? theme.navy : colorAt(theme, top);
      const tip = isRoot ? n.name : `${n.name} — lokal ${pct(d.local[n.id], 2)}, global ${pct(d.global[n.id], 2)}`;
      s += `<g data-tip="${esc(tip)}">`;
      if (isRoot) {
        s += `<rect x="${f(x)}" y="${f(y)}" width="${BOX_W}" height="${BOX_H}" rx="8" fill="${theme.navy}"/>`;
        const lines = wrap(n.name, BOX_W - 16, 12, 3, 600);
        const startY = y + BOX_H / 2 - (lines.length - 1) * 7.5;
        lines.forEach((l, i) => { s += text(x + BOX_W / 2, startY + i * 15, l, { anchor: 'middle', fill: '#ffffff', weight: 600, size: 12 }); });
      } else {
        s += `<rect x="${f(x)}" y="${f(y)}" width="${BOX_W}" height="${BOX_H}" rx="8" fill="${theme.surface}" stroke="${theme.axis}"/>`;
        s += `<rect x="${f(x)}" y="${f(y)}" width="5" height="${BOX_H}" rx="2" fill="${color}"/>`;
        const lines = wrap(n.name, BOX_W - 20, 11.5, 2, 600);
        lines.forEach((l, i) => { s += text(x + 12, y + 14 + i * 14, l, { fill: theme.ink, weight: 600, size: 11.5 }); });
        s += text(x + 12, y + BOX_H - 11, `L ${num(d.local[n.id], 3)}   G ${num(d.global[n.id], 3)}`, { fill: theme.muted, size: 10.5, tabular: true });
        rows.push([d.pathOf ? d.pathOf(n.id) : n.name, num(d.local[n.id], 4), num(d.global[n.id], 4)]);
      }
      s += '</g>';
    }
    alts.forEach((a, i) => {
      const x = offAlt + i * SLOT + (SLOT - BOX_W) / 2, y = altY;
      const best = a.rank === 1;
      s += `<g data-tip="${esc(a.priority === null || a.priority === undefined ? a.name : `${a.name} — prioritas ${pct(a.priority, 2)}, peringkat ${a.rank}`)}">`;
      s += `<rect x="${f(x)}" y="${f(y)}" width="${BOX_W}" height="${BOX_H}" rx="8" fill="${best ? theme.band : theme.surface}" stroke="${best ? theme.brand : theme.axis}" stroke-width="${best ? 1.5 : 1}"/>`;
      const lines = wrap(a.name, BOX_W - 16, 11.5, 2, 600);
      lines.forEach((l, j) => { s += text(x + 10, y + 14 + j * 14, l, { fill: theme.ink, weight: 600, size: 11.5 }); });
      if (a.priority !== null && a.priority !== undefined) {
        s += text(x + 10, y + BOX_H - 11, `${pct(a.priority, 1)}   #${a.rank}`, { fill: best ? theme.brand : theme.muted, size: 10.5, weight: best ? 700 : 400, tabular: true });
      }
      s += '</g>';
    });
    return finish(s, W, H, { head: ['Node', 'Bobot lokal', 'Bobot global'], rows });
  }

  /* ------------------------------------------------------------------ *
   * 2. Peringkat alternatif (satu seri)
   * ------------------------------------------------------------------ */

  function ranking(items, theme, opts) {
    // items: [{name, value}] (tidak perlu urut)
    opts = opts || {};
    const W = Math.max(320, opts.width || 640);
    const sorted = items.map((x, i) => Object.assign({ i }, x)).sort((a, b) => b.value - a.value);
    const labelW = Math.min(Math.max(...sorted.map((x) => measure(x.name, 13, 500)), 60) + 16, W * 0.38);
    const valueW = 64, ROW = 34, BAR = 20, TOP = 8;
    const plotW = W - labelW - valueW - 8;
    const max = Math.max(...sorted.map((x) => x.value), 1e-9);
    const H = TOP * 2 + sorted.length * ROW;
    let s = open(W, H, theme, 'Peringkat alternatif');
    s += line(labelW, TOP, labelW, H - TOP, theme.axis, 1);
    sorted.forEach((it, r) => {
      const y = TOP + r * ROW + (ROW - BAR) / 2;
      const len = plotW * it.value / max;
      s += `<g data-tip="${esc(`#${r + 1} ${it.name}: ${pct(it.value, 2)}`)}">`;
      s += `<rect x="0" y="${f(TOP + r * ROW)}" width="${f(W)}" height="${ROW}" fill="transparent"/>`;
      s += text(labelW - 10, y + BAR / 2, ellipsize(it.name, labelW - 14, 13, r === 0 ? 700 : 500), { anchor: 'end', fill: theme.ink, size: 13, weight: r === 0 ? 700 : 500 });
      s += hbar(labelW, y, len, BAR, r === 0 ? theme.brand : mix(theme.brand, theme.surface, 0.35));
      s += text(labelW + len + 8, y + BAR / 2, pct(it.value, 2), { fill: theme.ink, size: 12.5, weight: r === 0 ? 700 : 500, tabular: true });
      s += '</g>';
    });
    return finish(s, W, H, { head: ['Peringkat', 'Alternatif', 'Prioritas'], rows: sorted.map((x, r) => [r + 1, x.name, pct(x.value, 2)]) });
  }

  /* ------------------------------------------------------------------ *
   * 3. Kontribusi bertumpuk per kriteria level-1 (Alternatives Chart EC)
   * ------------------------------------------------------------------ */

  function contribution(d, theme, opts) {
    // d: alts [{name}], tops [{name}], contrib[t][k], final[k]
    opts = opts || {};
    const W = Math.max(340, opts.width || 680);
    const items = d.tops.map((t, i) => ({ label: t.name, color: colorAt(theme, i) }));
    const legH = legendHeight(items, W - 8) + 8;
    const order = d.alts.map((a, k) => k).sort((a, b) => d.final[b] - d.final[a]);
    const labelW = Math.min(Math.max(...d.alts.map((a) => measure(a.name, 13, 500)), 60) + 16, W * 0.32);
    const valueW = 60, ROW = 38, BAR = 22;
    const plotW = W - labelW - valueW - 8;
    const max = Math.max(...d.final, 1e-9);
    const top = legH + 6;
    const H = top + order.length * ROW + 8;
    let s = open(W, H, theme, 'Kontribusi kriteria terhadap prioritas alternatif');
    s += legend(items, 4, 12, W - 8, theme).svg;
    s += line(labelW, top, labelW, H - 6, theme.axis, 1);
    const rows = [];
    order.forEach((k, r) => {
      const y = top + r * ROW + (ROW - BAR) / 2;
      s += text(labelW - 10, y + BAR / 2, ellipsize(d.alts[k].name, labelW - 14, 13, r === 0 ? 700 : 500), { anchor: 'end', fill: theme.ink, size: 13, weight: r === 0 ? 700 : 500 });
      let x = labelW;
      const segs = d.tops.map((t, i) => ({ i, v: d.contrib[i][k] })).filter((g) => g.v > 0);
      segs.forEach((g, gi) => {
        const full = plotW * g.v / max;
        const isLast = gi === segs.length - 1;
        const len = isLast ? full : Math.max(0, full - 2);
        const color = colorAt(theme, g.i);
        const tip = `${d.alts[k].name} — ${d.tops[g.i].name}: ${pct(g.v, 2)} dari ${pct(d.final[k], 2)}`;
        if (isLast) s += hbar(x, y, len, BAR, color, 1, { 'data-tip': tip });
        else s += `<rect x="${f(x)}" y="${f(y)}" width="${f(len)}" height="${BAR}" fill="${color}" data-tip="${esc(tip)}"/>`;
        const lbl = pct(g.v, 1);
        if (measure(lbl, 10.5, 600) + 10 < len) s += text(x + len / 2, y + BAR / 2 + 0.5, lbl, { anchor: 'middle', fill: onColor(color, theme), size: 10.5, weight: 600, tabular: true });
        x += full;
      });
      s += text(x + 8, y + BAR / 2, pct(d.final[k], 1), { fill: theme.ink, size: 12.5, weight: r === 0 ? 700 : 500, tabular: true });
      rows.push([d.alts[k].name].concat(d.tops.map((t, i) => pct(d.contrib[i][k], 2)), [pct(d.final[k], 2)]));
    });
    return finish(s, W, H, { head: ['Alternatif'].concat(d.tops.map((t) => t.name), ['Total']), rows });
  }

  /* ------------------------------------------------------------------ *
   * 4. Sunburst objektif (Objectives Chart EC)
   * ------------------------------------------------------------------ */

  function sunburst(d, theme, opts) {
    // d: nodes pre-order [{id, parentId, name, depth}], children, global, topIndex, rootName
    opts = opts || {};
    const W = Math.max(320, opts.width || 720);
    const narrow = W < 600;
    const R = narrow ? Math.min(W / 2 - 16, 150) : 150;
    const r0 = 52;
    const maxDepth = Math.max(...d.nodes.map((n) => n.depth));
    const ringW = maxDepth ? (R - r0) / maxDepth : 0;
    const cx = narrow ? W / 2 : R + 20, cy = R + 16;
    const listRows = d.nodes.filter((n) => n.depth > 0);
    const LROW = 19;
    const listX = narrow ? 12 : cx + R + 34;
    const listY = narrow ? cy + R + 26 : 24;
    const listW = W - listX - 12;
    const H = Math.max(cy + R + 16, listY + listRows.length * LROW + 12) + (narrow ? 0 : 0);
    let s = open(W, H, theme, 'Diagram sunburst bobot kriteria');

    // Warna: level 1 = palet; turunan = tint dari warna induk level-1
    const colorOf = {};
    const tintIndex = {};
    d.nodes.forEach((n) => {
      if (n.depth === 0) return;
      const base = colorAt(theme, d.topIndex[n.id]);
      if (n.depth === 1) { colorOf[n.id] = base; return; }
      const sib = (d.children[n.parentId] || []).indexOf(n.id);
      const t = Math.min(0.62, 0.18 + 0.14 * (n.depth - 1) + 0.09 * sib);
      colorOf[n.id] = mix(base, theme.name === 'dark' ? '#000000' : '#ffffff', theme.name === 'dark' ? Math.min(0.5, t * 0.7) : t);
      tintIndex[n.id] = sib;
    });

    const arc = (a0, a1, rIn, rOut) => {
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
      if (a1 - a0 >= Math.PI * 2 - 1e-9) {
        // lingkaran penuh: dua setengah
        return arc(a0, a0 + Math.PI, rIn, rOut) + ' ' + arc(a0 + Math.PI, a1, rIn, rOut);
      }
      const [x0, y0] = p(rOut, a0), [x1, y1] = p(rOut, a1), [x2, y2] = p(rIn, a1), [x3, y3] = p(rIn, a0);
      return `M${f(x0)},${f(y0)}A${f(rOut)},${f(rOut)} 0 ${large} 1 ${f(x1)},${f(y1)}L${f(x2)},${f(y2)}A${f(rIn)},${f(rIn)} 0 ${large} 0 ${f(x3)},${f(y3)}Z`;
    };

    const rootId = d.nodes[0].id;
    (function walk(id, a0, a1) {
      const kids = d.children[id] || [];
      let a = a0;
      kids.forEach((k) => {
        const n = d.nodes.find((x) => x.id === k);
        const span = (a1 - a0) * (d.global[k] / Math.max(d.global[id], 1e-12));
        const rIn = r0 + (n.depth - 1) * ringW, rOut = rIn + ringW - 2;
        if (span > 0.002) {
          s += `<path d="${arc(a, a + span, rIn, rOut)}" fill="${colorOf[k]}" stroke="${theme.surface}" stroke-width="2" data-tip="${esc(`${n.name}: ${pct(d.global[k], 2)} (global)`)}"/>`;
          const mid = a + span / 2, rm = (rIn + rOut) / 2;
          const lbl = pct(d.global[k], 0);
          const arcLen = span * rm;
          if (arcLen > measure(lbl, 11, 600) + 8 && ringW > 18) {
            s += text(cx + rm * Math.sin(mid), cy - rm * Math.cos(mid) + 0.5, lbl, { anchor: 'middle', fill: onColor(colorOf[k], theme), size: 11, weight: 600, tabular: true });
          }
        }
        walk(k, a, a + span);
        a += span;
      });
    }(rootId, 0, Math.PI * 2));

    s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r0 - 4}" fill="${theme.navy}"/>`;
    wrap(d.rootName, (r0 - 8) * 1.7, 10.5, 3, 600).forEach((l, i, arr) => {
      s += text(cx, cy + (i - (arr.length - 1) / 2) * 13, l, { anchor: 'middle', fill: '#ffffff', size: 10.5, weight: 600 });
    });

    // Daftar bobot (legend + nilai)
    const rows = [];
    listRows.forEach((n, i) => {
      const y = listY + i * LROW;
      const indent = (n.depth - 1) * 14;
      s += `<rect x="${f(listX + indent)}" y="${f(y - 6)}" width="12" height="12" rx="3" fill="${colorOf[n.id]}"/>`;
      const valW = 58;
      s += text(listX + indent + 18, y, ellipsize(n.name, listW - indent - 18 - valW, 12, n.depth === 1 ? 600 : 400), { fill: theme.ink, size: 12, weight: n.depth === 1 ? 600 : 400 });
      s += text(listX + listW, y, pct(d.global[n.id], 2), { anchor: 'end', fill: theme.ink2, size: 12, tabular: true });
      rows.push([' '.repeat((n.depth - 1) * 2) + n.name, num(d.global[n.id], 4), pct(d.global[n.id], 2)]);
    });
    return finish(s, W, H, { head: ['Kriteria', 'Bobot global', 'Persentase'], rows });
  }

  /* ------------------------------------------------------------------ *
   * 5. Bobot global kriteria penilai (daun)
   * ------------------------------------------------------------------ */

  function globalWeights(items, tops, theme, opts) {
    // items: [{name, parent, value, top}] ; tops: [{name}]
    opts = opts || {};
    const W = Math.max(320, opts.width || 640);
    const leg = tops.map((t, i) => ({ label: t.name, color: colorAt(theme, i) }));
    const showLeg = items.some((x) => x.parent);
    const legH = showLeg ? legendHeight(leg, W - 8) + 8 : 0;
    const sorted = items.slice().sort((a, b) => b.value - a.value);
    const label = (x) => (x.parent ? x.parent + ' › ' + x.name : x.name);
    const labelW = Math.min(Math.max(...sorted.map((x) => measure(label(x), 12.5)), 60) + 16, W * 0.42);
    const ROW = 30, BAR = 18, top = legH + (showLeg ? 6 : 6);
    const plotW = W - labelW - 70;
    const max = Math.max(...sorted.map((x) => x.value), 1e-9);
    const H = top + sorted.length * ROW + 6;
    let s = open(W, H, theme, 'Bobot global kriteria');
    if (showLeg) s += legend(leg, 4, 12, W - 8, theme).svg;
    s += line(labelW, top, labelW, H - 4, theme.axis, 1);
    sorted.forEach((it, r) => {
      const y = top + r * ROW + (ROW - BAR) / 2;
      const len = plotW * it.value / max;
      s += `<g data-tip="${esc(`${label(it)}: ${pct(it.value, 2)}`)}">`;
      s += text(labelW - 10, y + BAR / 2, ellipsize(label(it), labelW - 14, 12.5), { anchor: 'end', fill: theme.ink, size: 12.5 });
      s += hbar(labelW, y, len, BAR, colorAt(theme, it.top));
      s += text(labelW + len + 8, y + BAR / 2, pct(it.value, 2), { fill: theme.ink, size: 12, tabular: true });
      s += '</g>';
    });
    return finish(s, W, H, { head: ['Kriteria', 'Bobot global'], rows: sorted.map((x) => [label(x), pct(x.value, 2)]) });
  }

  /* ------------------------------------------------------------------ *
   * 6. Rasio konsistensi per matriks
   * ------------------------------------------------------------------ */

  function consistency(items, threshold, theme, opts) {
    // items: [{label, CR, missing}]
    opts = opts || {};
    const W = Math.max(320, opts.width || 640);
    const labelW = Math.min(Math.max(...items.map((x) => measure(x.label, 12.5)), 60) + 16, W * 0.42);
    const ROW = 30, BAR = 16, TOP = 26;
    const narrow = W < 520;
    const max = Math.max(niceMax(Math.max(...items.map((x) => x.CR), threshold * 1.5)), threshold * 2);
    const plotW = W - labelW - (narrow ? 64 : 130);
    const xOf = (v) => labelW + plotW * Math.min(v, max) / max;
    const H = TOP + items.length * ROW + 24;
    let s = open(W, H, theme, 'Rasio konsistensi');
    for (const t of ticks(max, narrow ? 2 : 4)) {
      s += line(xOf(t), TOP - 4, xOf(t), H - 22, theme.grid, 1);
      s += text(xOf(t), H - 10, num(t, 2), { anchor: 'middle', fill: theme.muted, size: 10.5, tabular: true });
    }
    s += line(labelW, TOP - 4, labelW, H - 22, theme.axis, 1);
    items.forEach((it, r) => {
      const y = TOP + r * ROW + (ROW - BAR) / 2;
      const bad = it.CR > threshold + 1e-12;
      const len = xOf(it.CR) - labelW;
      s += `<g data-tip="${esc(`${it.label}: CR ${num(it.CR, 4)} — ${bad ? 'tidak konsisten' : 'konsisten'}`)}">`;
      s += text(labelW - 10, y + BAR / 2, ellipsize(it.label, labelW - 14, 12.5), { anchor: 'end', fill: theme.ink, size: 12.5 });
      s += hbar(labelW, y, len, BAR, bad ? theme.critical : mix(theme.brand, theme.surface, 0.25));
      s += text(labelW + len + 8, y + BAR / 2, `${num(it.CR, 3)}  ${bad ? (narrow ? '✕' : '✕ tidak konsisten') : '✓'}`, { fill: bad ? theme.critical : theme.ink2, size: 12, weight: bad ? 600 : 400, tabular: true });
      s += '</g>';
    });
    const tx = xOf(threshold);
    s += line(tx, TOP - 10, tx, H - 22, theme.ink2, 1.5);
    s += text(tx, TOP - 16, `batas ${num(threshold, 2)}`, { anchor: 'middle', fill: theme.ink2, size: 11, weight: 600 });
    return finish(s, W, H, { head: ['Matriks', 'CR', 'Status'], rows: items.map((x) => [x.label, num(x.CR, 4), x.CR > threshold + 1e-12 ? 'Tidak konsisten' : 'Konsisten']) });
  }

  /* ------------------------------------------------------------------ *
   * 7. Sebaran bobot antar peserta (dot plot)
   * ------------------------------------------------------------------ */

  function participants(d, theme, opts) {
    // d: criteria [{name}], people [{name, w:[...]}], combined [...]
    opts = opts || {};
    const W = Math.max(340, opts.width || 680);
    const leg = [{ label: `Peserta (${d.people.length})`, color: theme.overflow, shape: 'dot', r: 4 }, { label: 'Gabungan', color: theme.brand, shape: 'dot', r: 6 }];
    const legH = legendHeight(leg, W) + 6;
    const labelW = Math.min(Math.max(...d.criteria.map((c) => measure(c.name, 12.5)), 60) + 16, W * 0.36);
    const ROW = 34, top = legH + 14;
    const all = d.people.flatMap((p) => p.w).concat(d.combined);
    const max = niceMax(Math.max(...all) * 1.05);
    const plotW = W - labelW - 64;
    const xOf = (v) => labelW + plotW * v / max;
    const H = top + d.criteria.length * ROW + 26;
    let s = open(W, H, theme, 'Sebaran bobot antar peserta');
    s += legend(leg, 4, 12, W, theme).svg;
    for (const t of ticks(max, 4)) {
      s += line(xOf(t), top - 4, xOf(t), H - 22, theme.grid, 1);
      s += text(xOf(t), H - 10, pct(t, 0), { anchor: 'middle', fill: theme.muted, size: 10.5, tabular: true });
    }
    const rows = [];
    d.criteria.forEach((c, i) => {
      const y = top + i * ROW + ROW / 2;
      const vals = d.people.map((p) => p.w[i]);
      s += text(labelW - 10, y, ellipsize(c.name, labelW - 14, 12.5), { anchor: 'end', fill: theme.ink, size: 12.5 });
      s += line(xOf(Math.min(...vals)), y, xOf(Math.max(...vals)), y, theme.axis, 2, { 'stroke-linecap': 'round' });
      d.people.forEach((p) => {
        s += `<circle cx="${f(xOf(p.w[i]))}" cy="${f(y)}" r="4.5" fill="${theme.overflow}" stroke="${theme.surface}" stroke-width="2" data-tip="${esc(`${p.name} — ${c.name}: ${pct(p.w[i], 2)}`)}"/>`;
      });
      s += `<circle cx="${f(xOf(d.combined[i]))}" cy="${f(y)}" r="6.5" fill="${theme.brand}" stroke="${theme.surface}" stroke-width="2" data-tip="${esc(`Gabungan — ${c.name}: ${pct(d.combined[i], 2)}`)}"/>`;
      s += text(W - 6, y, pct(d.combined[i], 1), { anchor: 'end', fill: theme.ink, size: 12, weight: 600, tabular: true });
      rows.push([c.name].concat(vals.map((v) => pct(v, 2)), [pct(d.combined[i], 2)]));
    });
    return finish(s, W, H, { head: ['Kriteria'].concat(d.people.map((p) => p.name), ['Gabungan']), rows });
  }

  /* ------------------------------------------------------------------ *
   * 8. Sensitivitas performa
   * ------------------------------------------------------------------ */

  function performance(d, theme, opts) {
    // d: kids [{name}], w[], perf[c][k], final[k], alts [{name}]
    opts = opts || {};
    const W = Math.max(340, opts.width || 720);
    const leg = [{ label: 'Bobot kriteria', color: mix(theme.brand, theme.surface, 0.72) }].concat(d.alts.map((a, k) => ({ label: a.name, color: colorAt(theme, k), shape: 'line' })));
    const legH = legendHeight(leg, W - 8) + 6;
    const left = 46, right = 16, top = legH + 18, bottom = 54;
    const H = top + 250 + bottom;
    const plotH = H - top - bottom;
    const cols = d.kids.length + 1;
    const plotW = W - left - right;
    const colW = plotW / cols;
    const allVals = d.w.concat(d.final).concat(d.perf.flat());
    const max = niceMax(Math.max(...allVals) * 1.08);
    const yOf = (v) => top + plotH - plotH * v / max;
    const xOf = (c) => left + colW * c + colW / 2;
    let s = open(W, H, theme, 'Sensitivitas performa');
    s += legend(leg, 4, 12, W - 8, theme).svg;
    for (const t of ticks(max, 4)) {
      s += line(left, yOf(t), W - right, yOf(t), theme.grid, 1);
      s += text(left - 8, yOf(t), pct(t, 0), { anchor: 'end', fill: theme.muted, size: 10.5, tabular: true });
    }
    s += line(left, yOf(0), W - right, yOf(0), theme.axis, 1);
    const barW = Math.min(24, colW * 0.42);
    const bars = [];
    d.kids.forEach((c, i) => {
      const x = xOf(i) - barW / 2;
      s += vbar(x, yOf(0), plotH * d.w[i] / max, barW, mix(theme.brand, theme.surface, 0.72), { 'data-tip': `Bobot ${c.name}: ${pct(d.w[i], 2)}`, 'data-drag': i, style: opts.draggable ? 'cursor:ns-resize' : null });
      if (opts.draggable) s += `<rect x="${f(xOf(i) - colW / 2 + 4)}" y="${f(top)}" width="${f(colW - 8)}" height="${f(plotH)}" fill="transparent" data-drag="${i}" style="cursor:ns-resize"/>`;
      s += text(xOf(i), yOf(d.w[i]) - 9, pct(d.w[i], 1), { anchor: 'middle', fill: theme.ink2, size: 10.5, tabular: true });
      wrap(c.name, colW - 6, 11, 2).forEach((l, j) => { s += text(xOf(i), yOf(0) + 16 + j * 13, l, { anchor: 'middle', fill: theme.ink, size: 11 }); });
      bars.push({ i, x: xOf(i) });
    });
    const oc = d.kids.length;
    s += line(left + colW * oc, top, left + colW * oc, yOf(0), theme.grid, 1);
    s += text(xOf(oc), yOf(0) + 16, 'Keseluruhan', { anchor: 'middle', fill: theme.ink, size: 11, weight: 700 });
    d.alts.forEach((a, k) => {
      const color = colorAt(theme, k);
      const pts = d.kids.map((c, i) => [xOf(i), yOf(d.perf[i][k])]);
      s += `<polyline points="${pts.map((p) => f(p[0]) + ',' + f(p[1])).join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      pts.forEach((p, i) => { s += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="4.5" fill="${color}" stroke="${theme.surface}" stroke-width="2" data-tip="${esc(`${a.name} — ${d.kids[i].name}: ${pct(d.perf[i][k], 2)}`)}"/>`; });
      s += `<circle cx="${f(xOf(oc))}" cy="${f(yOf(d.final[k]))}" r="5.5" fill="${color}" stroke="${theme.surface}" stroke-width="2" data-tip="${esc(`${a.name} — keseluruhan: ${pct(d.final[k], 2)}`)}"/>`;
    });
    // Label nilai keseluruhan di kanan titik (hindari tumpang tindih sederhana)
    const order = d.alts.map((a, k) => k).sort((p, q) => d.final[q] - d.final[p]);
    let lastY = -Infinity;
    order.forEach((k) => {
      let y = yOf(d.final[k]);
      if (y - lastY < 13) y = lastY + 13;
      lastY = y;
      if (d.alts.length <= 6) s += text(xOf(oc) + 10, y, pct(d.final[k], 1), { fill: theme.ink, size: 11, tabular: true, weight: 600 });
    });
    const table = { head: ['Kriteria', 'Bobot'].concat(d.alts.map((a) => a.name)), rows: d.kids.map((c, i) => [c.name, pct(d.w[i], 2)].concat(d.alts.map((a, k) => pct(d.perf[i][k], 2)))) };
    table.rows.push(['Keseluruhan', ''].concat(d.alts.map((a, k) => pct(d.final[k], 2))));
    return finish(s, W, H, table, { top, plotH, max, bars, left, colW });
  }

  /* ------------------------------------------------------------------ *
   * 9. Sensitivitas gradien
   * ------------------------------------------------------------------ */

  function gradient(d, theme, opts) {
    // d: critName, xs[], series[k][], x0, alts [{name}], stability {lo, hi, top}, crossings [{x,k,j}]
    opts = opts || {};
    const W = Math.max(340, opts.width || 720);
    const leg = d.alts.map((a, k) => ({ label: a.name, color: colorAt(theme, k), shape: 'line' }));
    const legH = legendHeight(leg, W - 8) + 6;
    const endLabels = d.alts.length <= 4;
    const endW = endLabels ? Math.min(120, Math.max(...d.alts.map((a) => measure(a.name, 11.5))) + 14) : 0;
    const left = 46, right = 16 + endW, top = legH + 24, bottom = 44;
    const H = top + 240 + bottom;
    const plotH = H - top - bottom, plotW = W - left - right;
    const max = niceMax(Math.max(...d.series.flat()) * 1.05);
    const xOf = (x) => left + plotW * x;
    const yOf = (v) => top + plotH - plotH * v / max;
    let s = open(W, H, theme, `Sensitivitas gradien terhadap ${d.critName}`);
    s += legend(leg, 4, 12, W - 8, theme).svg;
    if (d.stability && d.alts.length > 1) {
      s += `<rect x="${f(xOf(d.stability.lo))}" y="${f(top)}" width="${f(xOf(d.stability.hi) - xOf(d.stability.lo))}" height="${f(plotH)}" fill="${theme.band}"/>`;
    }
    for (const t of ticks(max, 4)) {
      s += line(left, yOf(t), left + plotW, yOf(t), theme.grid, 1);
      s += text(left - 8, yOf(t), pct(t, 0), { anchor: 'end', fill: theme.muted, size: 10.5, tabular: true });
    }
    for (let t = 0; t <= 10; t += 2) {
      s += text(xOf(t / 10), yOf(0) + 15, pct(t / 10, 0), { anchor: 'middle', fill: theme.muted, size: 10.5, tabular: true });
    }
    s += line(left, yOf(0), left + plotW, yOf(0), theme.axis, 1);
    s += text(left + plotW / 2, H - 10, `Bobot ${d.critName}`, { anchor: 'middle', fill: theme.ink2, size: 11.5, weight: 600 });
    d.series.forEach((vals, k) => {
      const pts = d.xs.map((x, i) => f(xOf(x)) + ',' + f(yOf(vals[i]))).join(' ');
      s += `<polyline points="${pts}" fill="none" stroke="${colorAt(theme, k)}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    });
    for (const c of (d.crossings || [])) {
      const yv = d.valueAt ? d.valueAt(c.k, c.x) : null;
      if (yv === null) continue;
      s += `<circle cx="${f(xOf(c.x))}" cy="${f(yOf(yv))}" r="4" fill="${theme.surface}" stroke="${theme.ink2}" stroke-width="1.5" data-tip="${esc(`${d.alts[c.k].name} dan ${d.alts[c.j].name} berpotongan pada bobot ${pct(c.x, 1)}`)}"/>`;
    }
    const x0 = xOf(d.x0);
    s += line(x0, top - 6, x0, yOf(0), theme.ink, 1.5);
    s += text(Math.min(Math.max(x0, left + 60), left + plotW - 60), top - 14, `bobot saat ini ${pct(d.x0, 1)}`, { anchor: 'middle', fill: theme.ink, size: 11, weight: 600 });
    if (endLabels) {
      const ends = d.series.map((vals, k) => ({ k, y: yOf(vals[vals.length - 1]) })).sort((a, b) => a.y - b.y);
      let lastY = -Infinity;
      ends.forEach((e) => {
        const y = Math.max(e.y, lastY + 13);
        lastY = y;
        s += text(left + plotW + 8, y, ellipsize(d.alts[e.k].name, endW - 10, 11.5), { fill: theme.ink, size: 11.5 });
      });
    }
    const rows = [];
    for (let i = 0; i < d.xs.length; i += Math.max(1, Math.round((d.xs.length - 1) / 10))) rows.push([pct(d.xs[i], 0)].concat(d.series.map((v) => pct(v[i], 2))));
    return finish(s, W, H, { head: [`Bobot ${d.critName}`].concat(d.alts.map((a) => a.name)), rows }, { left, top, plotW, plotH, max });
  }

  /* ------------------------------------------------------------------ *
   * 10. Head-to-head
   * ------------------------------------------------------------------ */

  function headToHead(d, theme, opts) {
    // d: kids [{name}], rows[], overall, outside, altA, altB
    opts = opts || {};
    const W = Math.max(340, opts.width || 720);
    const cA = colorAt(theme, 0), cB = colorAt(theme, 1);
    const labelW = Math.min(Math.max(...d.kids.map((c) => measure(c.name, 12.5)), measure('Keseluruhan', 12.5, 700)) + 16, W * 0.32);
    const ROW = 32, BAR = 18, top = 48;
    const entries = d.kids.map((c, i) => ({ name: c.name, v: d.rows[i] }));
    if (Math.abs(d.outside) > 1e-9) entries.push({ name: 'Kriteria lain (tetap)', v: d.outside });
    entries.push({ name: 'Keseluruhan', v: d.overall, bold: true });
    const plotW = W - labelW - 12;
    const mid = labelW + plotW / 2;
    const max = Math.max(...entries.map((e) => Math.abs(e.v)), 1e-6) * 1.25;
    const scale = (plotW / 2 - 56) / max;
    const H = top + entries.length * ROW + 10;
    let s = open(W, H, theme, `Head-to-head ${d.altA} dan ${d.altB}`);
    s += `<circle cx="${f(labelW + 10)}" cy="16" r="5" fill="${cA}"/>`;
    s += text(labelW + 20, 16, ellipsize(`${d.altA} lebih baik`, plotW / 2 - 30, 12, 600), { fill: theme.ink, size: 12, weight: 600 });
    s += `<circle cx="${f(W - 10)}" cy="16" r="5" fill="${cB}"/>`;
    s += text(W - 20, 16, ellipsize(`${d.altB} lebih baik`, plotW / 2 - 30, 12, 600), { anchor: 'end', fill: theme.ink, size: 12, weight: 600 });
    s += line(mid, top - 8, mid, H - 6, theme.axis, 1.5);
    entries.forEach((e, r) => {
      const y = top + r * ROW + (ROW - BAR) / 2;
      if (e.bold) s += line(labelW, y - 7, W - 6, y - 7, theme.grid, 1);
      const len = Math.abs(e.v) * scale;
      const dir = e.v >= 0 ? -1 : 1;
      const color = e.v >= 0 ? cA : cB;
      const tip = e.v >= 0 ? `${e.name}: ${d.altA} unggul ${pct(e.v, 2)}` : `${e.name}: ${d.altB} unggul ${pct(-e.v, 2)}`;
      s += `<g data-tip="${esc(tip)}">`;
      s += text(labelW - 10, y + BAR / 2, ellipsize(e.name, labelW - 14, 12.5, e.bold ? 700 : 400), { anchor: 'end', fill: theme.ink, size: 12.5, weight: e.bold ? 700 : 400 });
      s += hbar(mid, y, len, BAR, color, dir);
      const lx = mid + dir * (len + 8);
      s += text(lx, y + BAR / 2, pct(Math.abs(e.v), 1), { anchor: dir < 0 ? 'end' : 'start', fill: theme.ink, size: 11.5, weight: e.bold ? 700 : 400, tabular: true });
      s += '</g>';
    });
    return finish(s, W, H, { head: ['Kriteria', 'Unggul', 'Selisih'], rows: entries.map((e) => [e.name, Math.abs(e.v) < 1e-12 ? 'Seimbang' : (e.v > 0 ? d.altA : d.altB), pct(Math.abs(e.v), 2)]) });
  }

  /* ------------------------------------------------------------------ *
   * 11. Plot 2D dua kriteria
   * ------------------------------------------------------------------ */

  function scatter2D(d, theme, opts) {
    // d: xName, yName, points [{name, x, y}]
    opts = opts || {};
    const W = Math.max(320, Math.min(opts.width || 560, 640));
    const left = 52, right = 20, top = 16, bottom = 46;
    const H = Math.round(W * 0.78);
    const plotW = W - left - right, plotH = H - top - bottom;
    const maxX = niceMax(Math.max(...d.points.map((p) => p.x)) * 1.1);
    const maxY = niceMax(Math.max(...d.points.map((p) => p.y)) * 1.1);
    const xOf = (v) => left + plotW * v / maxX;
    const yOf = (v) => top + plotH - plotH * v / maxY;
    let s = open(W, H, theme, `Plot dua dimensi ${d.xName} dan ${d.yName}`);
    for (const t of ticks(maxX, 4)) { s += line(xOf(t), top, xOf(t), top + plotH, theme.grid, 1); s += text(xOf(t), top + plotH + 14, pct(t, 0), { anchor: 'middle', fill: theme.muted, size: 10.5, tabular: true }); }
    for (const t of ticks(maxY, 4)) { s += line(left, yOf(t), left + plotW, yOf(t), theme.grid, 1); s += text(left - 8, yOf(t), pct(t, 0), { anchor: 'end', fill: theme.muted, size: 10.5, tabular: true }); }
    const avg = 1 / Math.max(d.points.length, 1);
    s += line(xOf(avg), top, xOf(avg), top + plotH, theme.axis, 1.5);
    s += line(left, yOf(avg), left + plotW, yOf(avg), theme.axis, 1.5);
    s += text(left + plotW - 4, top + 10, 'unggul di keduanya', { anchor: 'end', fill: theme.muted, size: 10.5 });
    s += text(left + plotW / 2, H - 8, d.xName, { anchor: 'middle', fill: theme.ink2, size: 11.5, weight: 600 });
    s += `<text x="12" y="${f(top + plotH / 2)}" font-size="11.5" font-weight="600" fill="${theme.ink2}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 12 ${f(top + plotH / 2)})">${esc(d.yName)}</text>`;
    const placed = [];
    d.points.forEach((p, k) => {
      const x = xOf(p.x), y = yOf(p.y);
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="6.5" fill="${colorAt(theme, k)}" stroke="${theme.surface}" stroke-width="2" data-tip="${esc(`${p.name} — ${d.xName}: ${pct(p.x, 2)}, ${d.yName}: ${pct(p.y, 2)}`)}"/>`;
      let ly = y;
      for (const q of placed) if (Math.abs(q.y - ly) < 13 && Math.abs(q.x - x) < 120) ly = q.y + 13;
      placed.push({ x, y: ly });
      const anchorRight = x > left + plotW * 0.72;
      s += text(x + (anchorRight ? -11 : 11), ly, ellipsize(p.name, 130, 11.5), { anchor: anchorRight ? 'end' : 'start', fill: theme.ink, size: 11.5, weight: 600 });
    });
    return finish(s, W, H, { head: ['Alternatif', d.xName, d.yName], rows: d.points.map((p) => [p.name, pct(p.x, 2), pct(p.y, 2)]) });
  }

  /* ------------------------------------------------------------------ *
   * 12. Snapshot sensitivitas dinamis (untuk ekspor)
   * ------------------------------------------------------------------ */

  function dynamicSnapshot(d, theme, opts) {
    // d: kids [{name}], w[], alts [{name}], final[]
    opts = opts || {};
    const W = Math.max(520, opts.width || 760);
    const half = W / 2;
    const ROW = 28, BAR = 16, top = 30;
    const rowsN = Math.max(d.kids.length, d.alts.length);
    const H = top + rowsN * ROW + 12;
    let s = open(W, H, theme, 'Sensitivitas dinamis');
    s += text(8, 14, 'Bobot kriteria', { fill: theme.ink2, size: 12, weight: 700 });
    s += text(half + 8, 14, 'Prioritas alternatif', { fill: theme.ink2, size: 12, weight: 700 });
    const panel = (x0, width, items, values, colorFn) => {
      const lw = Math.min(Math.max(...items.map((it) => measure(it.name, 12)), 40) + 12, width * 0.45);
      const pw = width - lw - 64;
      items.forEach((it, i) => {
        const y = top + i * ROW + (ROW - BAR) / 2;
        s += text(x0 + lw - 8, y + BAR / 2, ellipsize(it.name, lw - 12, 12), { anchor: 'end', fill: theme.ink, size: 12 });
        const len = pw * values[i];
        s += hbar(x0 + lw, y, len, BAR, colorFn(i));
        s += text(x0 + lw + len + 6, y + BAR / 2, pct(values[i], 1), { fill: theme.ink, size: 11.5, tabular: true });
      });
    };
    panel(0, half - 8, d.kids, d.w, () => mix(theme.brand, theme.surface, 0.3));
    panel(half, half, d.alts, d.final, (k) => colorAt(theme, k));
    s += line(half - 4, 6, half - 4, H - 6, theme.grid, 1);
    return finish(s, W, H, { head: ['Item', 'Nilai'], rows: d.kids.map((c, i) => [c.name, pct(d.w[i], 2)]).concat(d.alts.map((a, k) => [a.name, pct(d.final[k], 2)])) });
  }

  return {
    THEMES, FONT, setLocale, num, pct, signedPct, colorAt, esc, mix, measure, ellipsize, wrap, niceMax,
    hierarchy, ranking, contribution, sunburst, globalWeights, consistency, participants,
    performance, gradient, headToHead, scatter2D, dynamicSnapshot
  };
}));
