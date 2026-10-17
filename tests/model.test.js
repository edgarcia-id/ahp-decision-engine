'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const AHP = require('../assets/js/ahp-core.js');
const M = require('../assets/js/model.js');

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `expected ${b}, got ${a}`);

test('semua contoh dapat dihitung, bobot dan prioritas berjumlah 1', () => {
  for (const { id } of M.SAMPLE_INFO) {
    const p = M.sampleProject(id);
    const c = M.compute(p, 'combined');
    const leafSum = c.synth.leaves.reduce((s, l) => s + c.synth.global[l], 0);
    close(leafSum, 1, 1e-12);
    if (p.alternatives.length) close(AHP.sum(c.synth.final), 1, 1e-12);
    assert.equal(c.issues.filter((x) => x.type === 'missing' || x.type === 'data').length, 0, `${id}: tidak boleh ada set kosong`);
  }
});

test('contoh laptop & supplier konsisten; contoh lokasi sengaja tidak konsisten', () => {
  assert.equal(M.compute(M.sampleProject('laptop'), 'combined').issues.length, 0);
  for (const part of M.sampleProject('supplier').participants) {
    const c = M.compute(M.sampleProject('supplier'), part.id);
    assert.equal(c.issues.length, 0, `${part.name}: ${JSON.stringify(c.issues)}`);
  }
  const lok = M.compute(M.sampleProject('lokasi'), 'combined');
  assert.equal(lok.results['c:goal'].analysis.CR.toFixed(2), '0.29');
});

test('penilaian gabungan = rata-rata geometrik penilaian peserta', () => {
  const p = M.sampleProject('supplier');
  const v = M.combinedJudgment(p, 'c:goal', 'c_q', 'c_h');
  close(v, Math.cbrt(2 * 3 * 0.5));
  // arah sebaliknya = kebalikan
  close(M.combinedJudgment(p, 'c:goal', 'c_h', 'c_q'), 1 / v);
  // peserta dikecualikan tidak ikut
  p.participants[2].include = false;
  close(M.combinedJudgment(p, 'c:goal', 'c_q', 'c_h'), Math.sqrt(6));
});

test('setJudgment menyimpan satu arah saja dan bisa dikosongkan', () => {
  const p = M.newProject();
  M.setJudgment(p, p.activeParticipant, 'c:goal', 'c_1', 'c_2', 3);
  M.setJudgment(p, p.activeParticipant, 'c:goal', 'c_2', 'c_1', 1 / 5);
  assert.deepEqual(p.judgments[p.activeParticipant]['c:goal'], { 'c_2>c_1': 0.2 });
  close(M.getJudgment(p, p.activeParticipant, 'c:goal', 'c_1', 'c_2'), 5);
  M.setJudgment(p, p.activeParticipant, 'c:goal', 'c_1', 'c_2', null);
  assert.equal(p.judgments[p.activeParticipant]['c:goal'], undefined);
});

test('normalizeProject memangkas penilaian yatim dan node tanpa induk', () => {
  const raw = M.sampleProject('laptop');
  raw.nodes = raw.nodes.filter((n) => n.id !== 'c_perf'); // anak s_cpu dkk. jadi yatim
  const p = M.normalizeProject(raw);
  assert.ok(!p.nodes.some((n) => n.id === 's_cpu'));
  assert.equal(p.judgments.p1['c:c_perf'], undefined);
  assert.equal(p.judgments.p1['a:s_cpu'], undefined);
  assert.ok(p.judgments.p1['c:goal']); // set root tetap, pasangan yang merujuk c_perf dibuang
  assert.ok(!Object.keys(p.judgments.p1['c:goal']).some((k) => k.includes('c_perf')));
});

test('alur kuesioner: kode tautan → jawaban → impor sebagai peserta', async () => {
  const facil = M.sampleProject('supplier');
  const code = await M.encodePayload(M.questionnaireModel(facil));
  const qm = await M.decodePayload('https://x.test/#kuesioner=' + code);
  assert.equal(qm.kind, 'questionnaire');
  assert.equal(qm.hash, M.structureHash(facil));
  // Responden membuka model, mengisi
  const resp = M.normalizeProject(Object.assign({}, qm, { participants: [{ id: 'r', name: 'Responden' }], judgments: {} }));
  M.setJudgment(resp, 'r', 'c:goal', 'c_q', 'c_h', 4);
  M.setJudgment(resp, 'r', 'a:c_q', 'sa', 'sb', 2);
  const answer = M.makeResponse(resp, 'Bu Rina');
  const answerCode = await M.encodePayload(answer);
  const back = await M.decodePayload(answerCode);
  const res = M.importResponse(facil, back);
  assert.equal(res.matched, 2);
  assert.equal(res.hashMatch, true);
  assert.equal(facil.participants.length, 4);
  assert.equal(M.getJudgment(facil, res.participant.id, 'c:goal', 'c_q', 'c_h'), 4);
  assert.throws(() => M.importResponse(facil, { kind: 'response', judgments: { 'c:x': { 'a>b': 2 } } }));
});
