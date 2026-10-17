// Jalankan: node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const AHP = require('../assets/js/ahp-core.js');

const close = (a, b, tol = 1e-6, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b}, got ${a}`);
const closeArr = (a, b, tol = 1e-6) => { assert.equal(a.length, b.length); a.forEach((x, i) => close(x, b[i], tol, `[${i}]`)); };
const fromUpper = (n, upper) => AHP.buildMatrix(n, (i, j) => upper[`${i},${j}`] ?? null);

test('parseJudgment menerima pecahan, desimal, dan koma desimal', () => {
  assert.equal(AHP.parseJudgment('3'), 3);
  close(AHP.parseJudgment('1/3'), 1 / 3);
  assert.equal(AHP.parseJudgment('2,5'), 2.5);
  assert.equal(AHP.parseJudgment(' 0.25 '), 0.25);
  close(AHP.parseJudgment('1/2,5'), 0.4);
  assert.equal(AHP.parseJudgment(''), null);
  assert.equal(AHP.parseJudgment('-'), null);
  assert.ok(Number.isNaN(AHP.parseJudgment('abc')));
  assert.ok(Number.isNaN(AHP.parseJudgment('0')));
  assert.ok(Number.isNaN(AHP.parseJudgment('-3')));
  assert.ok(Number.isNaN(AHP.parseJudgment('1/0')));
});

test('posisi slider ↔ nilai skala bolak-balik', () => {
  for (let p = -8; p <= 8; p++) assert.equal(AHP.valueToPosition(AHP.positionToValue(p)), p);
  assert.equal(AHP.positionToValue(-2), 3);
  close(AHP.positionToValue(4), 1 / 5);
  assert.equal(AHP.formatJudgment(1 / 7), '1/7');
  assert.equal(AHP.formatJudgment(2.4662), '2.47');
  assert.equal(AHP.snapToScale(2.6), 3);
  close(AHP.snapToScale(0.3), 1 / 3);
});

test('matriks konsisten sempurna → bobot eksak, CR = 0', () => {
  const w = [0.5, 0.3, 0.2];
  const A = AHP.buildMatrix(3, (i, j) => w[i] / w[j]);
  for (const method of ['eigen', 'nca', 'rgmm']) {
    const r = AHP.analyzeMatrix(A, method);
    closeArr(r.w, w, 1e-10);
    close(r.lambdaMax, 3, 1e-10);
    close(r.CR, 0, 1e-10);
  }
});

test('contoh klasik 3×3 cocok dengan numpy.linalg.eig', () => {
  const A = fromUpper(3, { '0,1': 3, '0,2': 5, '1,2': 3 });
  const r = AHP.analyzeMatrix(A, 'eigen');
  // Referensi dihitung independen dengan numpy.linalg.eig
  closeArr(r.w, [0.63698557, 0.25828499, 0.10472943], 1e-7);
  close(r.lambdaMax, 3.0385110905581745, 1e-9);
  close(r.CI, 0.01925554527908724, 1e-9);
  close(r.CR, 0.033199215998426276, 1e-9);
  assert.equal(r.RI, 0.58);
  closeArr(r.colSums, [1 + 1 / 3 + 1 / 5, 3 + 1 + 1 / 3, 5 + 3 + 1], 1e-12);
});

test('paritas Expert Choice 11: matriks lokasi perumahan, EC melaporkan Incon 0.29', () => {
  const U = { '0,1': 7, '0,2': 7, '0,3': 7, '0,4': 7, '0,5': 7, '1,2': 5, '1,3': 5, '1,4': 5, '1,5': 5,
    '2,3': 5, '2,4': 5, '2,5': 5, '3,4': 7, '3,5': 7, '4,5': 5 };
  const r = AHP.analyzeMatrix(fromUpper(6, U), 'eigen');
  assert.equal(r.CR.toFixed(2), '0.29');
  closeArr(r.w, [0.5074, 0.2149, 0.1275, 0.0864, 0.0400, 0.0237], 1e-4);
});

test('NCA dan RGMM berbeda tipis dari eigen pada matriks tidak konsisten', () => {
  const A = fromUpper(4, { '0,1': 3, '0,2': 7, '0,3': 2, '1,2': 4, '1,3': 1 / 2, '2,3': 1 / 5 });
  const e = AHP.analyzeMatrix(A, 'eigen');
  const n = AHP.analyzeMatrix(A, 'nca');
  const g = AHP.analyzeMatrix(A, 'rgmm');
  close(AHP.sum(n.w), 1, 1e-12);
  close(AHP.sum(g.w), 1, 1e-12);
  e.w.forEach((x, i) => close(n.w[i], x, 0.03));
  e.w.forEach((x, i) => close(g.w[i], x, 0.03));
  // λmax dari vektor konsistensi = nilai eigen untuk metode eigen
  close(e.lambdaMax, AHP.sum(e.cv) / 4, 1e-12);
});

test('Harker: satu penilaian kosong pada matriks konsisten → bobot tetap eksak', () => {
  const w = [0.4, 0.3, 0.2, 0.1];
  const A = AHP.buildMatrix(4, (i, j) => (i === 0 && j === 3 ? null : w[i] / w[j]));
  const r = AHP.analyzeMatrix(A, 'eigen');
  assert.equal(r.missing, 1);
  assert.equal(r.methodUsed, 'harker');
  closeArr(r.w, w, 1e-9);
  close(r.CR, 0, 1e-9);
  close(r.full[0][3], 4, 1e-9);
});

test('graf terputus → kosong diisi 1 dan ditandai', () => {
  const A = fromUpper(4, { '0,1': 3, '2,3': 2 });
  const r = AHP.analyzeMatrix(A, 'eigen');
  assert.equal(r.connected, false);
  assert.equal(r.missing, 4);
  close(AHP.sum(r.w), 1, 1e-12);
});

test('laporan inkonsistensi menemukan penilaian yang salah', () => {
  // Konsisten kecuali (0,3) yang dibalik
  const w = [0.45, 0.25, 0.2, 0.1];
  const A = AHP.buildMatrix(4, (i, j) => (i === 0 && j === 3 ? 1 / 4 : AHP.snapToScale(w[i] / w[j])));
  const r = AHP.analyzeMatrix(A, 'eigen');
  assert.ok(r.CR > 0.1, `CR seharusnya > 0.1, dapat ${r.CR}`);
  const rep = AHP.inconsistencyReport(A, r, 'eigen', 3);
  assert.equal(rep[0].i, 0);
  assert.equal(rep[0].j, 3);
  // Saran best-fit bergerak ke arah konsisten (dari 1/4 naik), dan CR turun
  assert.ok(rep[0].suggestion > rep[0].value);
  assert.ok(rep[0].newCR < r.CR);
});

test('rata-rata geometrik berbobot', () => {
  close(AHP.weightedGeometricMean([2, 8]), 4, 1e-12);
  close(AHP.weightedGeometricMean([3, 1 / 3]), 1, 1e-12);
  close(AHP.weightedGeometricMean([2, null, 8]), 4, 1e-12);
  close(AHP.weightedGeometricMean([2, 8], [3, 1]), Math.exp((3 * Math.log(2) + Math.log(8)) / 4), 1e-12);
  assert.equal(AHP.weightedGeometricMean([null, null]), null);
});

test('data langsung benefit/cost', () => {
  closeArr(AHP.dataPriorities([2, 3, 5], 'benefit').w, [0.2, 0.3, 0.5], 1e-12);
  const c = AHP.dataPriorities([10, 20], 'cost').w;
  closeArr(c, [2 / 3, 1 / 3], 1e-12);
  assert.equal(AHP.dataPriorities([1, null], 'benefit').error, 'missing');
  assert.equal(AHP.dataPriorities([1, 0], 'cost').error, 'cost-nonpositive');
  assert.equal(AHP.dataPriorities([0, 0], 'benefit').error, 'zero-sum');
});

// Hierarki kecil: goal → {C1 (0.6), C2 (0.4)}, C2 → {S1 (0.75), S2 (0.25)}; 2 alternatif
const tree = {
  rootId: 'g',
  children: { g: ['c1', 'c2'], c2: ['s1', 's2'] },
  local: { g: [0.6, 0.4], c2: [0.75, 0.25] },
  altLocal: { c1: [0.7, 0.3], s1: [0.2, 0.8], s2: [0.5, 0.5] },
  nAlt: 2
};

test('sintesis distributive dihitung tangan', () => {
  const s = AHP.synthesize(Object.assign({ mode: 'distributive' }, tree));
  close(s.global.s1, 0.3, 1e-12);
  close(s.global.s2, 0.1, 1e-12);
  // A1 = .6*.7 + .3*.2 + .1*.5 = .53 ; A2 = .47
  closeArr(s.final, [0.53, 0.47], 1e-12);
  closeArr(s.contribTop.c1, [0.42, 0.18], 1e-12);
  closeArr(s.contribTop.c2, [0.11, 0.29], 1e-12);
});

test('sintesis ideal dihitung tangan', () => {
  const s = AHP.synthesize(Object.assign({ mode: 'ideal' }, tree));
  // q: c1 [1, 3/7], s1 [.25, 1], s2 [1, 1]
  const a1 = 0.6 * 1 + 0.3 * 0.25 + 0.1 * 1;
  const a2 = 0.6 * 3 / 7 + 0.3 * 1 + 0.1 * 1;
  closeArr(s.final, [a1 / (a1 + a2), a2 / (a1 + a2)], 1e-12);
  close(AHP.sum(s.contribTop.c1) + AHP.sum(s.contribTop.c2), 1, 1e-12);
});

for (const mode of ['distributive', 'ideal']) {
  test(`sensitivitas konsisten dengan sintesis (${mode})`, () => {
    const s = AHP.synthesize(Object.assign({ mode }, tree));
    for (const node of ['g', 'c2']) {
      const sm = AHP.sensitivityModel(node, tree.children, tree.local, s);
      closeArr(AHP.sensFinal(sm, sm.w0), s.final, 1e-12);
      // Head-to-head: jumlah baris + bagian luar = selisih keseluruhan
      const h = AHP.headToHead(sm, sm.w0, 0, 1);
      close(AHP.sum(h.rows) + h.outside, h.overall, 1e-12);
      close(h.overall, s.final[0] - s.final[1], 1e-12);
    }
  });

  test(`interval stabilitas cocok dengan pencarian brute-force (${mode})`, () => {
    const t = {
      rootId: 'g', children: { g: ['a', 'b', 'c'] }, local: { g: [0.5, 0.3, 0.2] },
      altLocal: { a: [0.6, 0.3, 0.1], b: [0.1, 0.5, 0.4], c: [0.2, 0.2, 0.6] }, nAlt: 3
    };
    const s = AHP.synthesize(Object.assign({ mode }, t));
    const sm = AHP.sensitivityModel('g', t.children, t.local, s);
    for (let idx = 0; idx < 3; idx++) {
      const st = AHP.stabilityInterval(sm, idx);
      const argmax = (x) => { const f = AHP.sensFinal(sm, AHP.adjustWeights(sm.w0, idx, x)); return f.indexOf(Math.max(...f)); };
      assert.equal(argmax(st.x0), st.top);
      for (let t2 = 0; t2 <= 2000; t2++) {
        const x = t2 / 2000;
        if (x > st.lo + 1e-6 && x < st.hi - 1e-6) assert.equal(argmax(x), st.top, `idx ${idx} x ${x}`);
      }
      if (st.lo > 0) assert.notEqual(argmax(Math.max(0, st.lo - 1e-4)), st.top);
      if (st.hi < 1) assert.notEqual(argmax(Math.min(1, st.hi + 1e-4)), st.top);
    }
  });
}

test('adjustWeights menjaga total = 1', () => {
  const w = AHP.adjustWeights([0.5, 0.3, 0.2], 1, 0.6);
  close(AHP.sum(w), 1, 1e-12);
  close(w[1], 0.6, 1e-12);
  close(w[0] / w[2], 2.5, 1e-12);
  const w2 = AHP.adjustWeights([1, 0, 0], 0, 0.4);
  closeArr(w2, [0.4, 0.3, 0.3], 1e-12);
});

test('cross-check acak: eigen 5×5 tetap jumlah 1 dan CR ≥ 0', () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let t = 0; t < 50; t++) {
    const A = AHP.buildMatrix(5, () => AHP.SCALE[Math.floor(rnd() * 17)]);
    const r = AHP.analyzeMatrix(A, 'eigen');
    close(AHP.sum(r.w), 1, 1e-12);
    assert.ok(r.lambdaMax >= 5 - 1e-9);
    assert.ok(r.CR >= -1e-12);
    // Aw = λw untuk vektor eigen
    r.Aw.forEach((x, i) => close(x, r.lambdaMax * r.w[i], 1e-8));
  }
});
