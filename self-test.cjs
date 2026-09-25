// Extended self-tests for the updated Lernzettel
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({ console, localStorage: { getItem: () => null }, CSS: { escape: s => s }, document: { querySelector: () => null, addEventListener: () => {} } });
vm.runInContext(script.split('/* ---------- Events ---------- */')[0], context);

function check(name, code) {
  vm.runInContext(`{ ${code} }`, Object.assign(context, { assert }));
  console.log(`OK ${name}`);
}

// Basic structure
check('9 lessons exist', `assert.equal(LESSONS.length, 9)`);
check('First lesson is pruefung', `assert.equal(LESSONS[0].id, 'pruefung')`);
check('Second lesson is grund', `assert.equal(LESSONS[1].id, 'grund')`);
check('Prozesse lesson exists', `assert.ok(LESSONS.find(l => l.id === 'prozesse'), 'prozesse missing')`);

// Each lesson has required fields
check('All lessons have id, title, kap, idea, formal, quiz', `
  LESSONS.forEach(L => {
    assert.ok(L.id, 'missing id');
    assert.ok(L.title, 'missing title for ' + L.id);
    assert.ok(L.kap, 'missing kap for ' + L.id);
    assert.ok(L.idea, 'missing idea for ' + L.id);
    assert.ok(L.formal, 'missing formal for ' + L.id);
    assert.ok(Array.isArray(L.quiz), 'quiz not array for ' + L.id);
  });
`);

// Quiz correctness
check('All quiz questions have valid correct answer index', `
  LESSONS.forEach(L => {
    L.quiz.forEach((q, i) => {
      assert.ok(q.c >= 0 && q.c < q.o.length, L.id + ' quiz ' + i + ' invalid c=' + q.c);
      assert.ok(q.q.length > 0, L.id + ' quiz ' + i + ' empty question');
      assert.ok(q.e.length > 0, L.id + ' quiz ' + i + ' empty explanation');
    });
  });
`);

// Text-only lessons (pruefung, prozesse) don't crash
check('Text-only lessons have empty examples', `
  ['pruefung', 'prozesse'].forEach(id => {
    const L = LESSONS.find(l => l.id === id);
    assert.ok(L, id + ' not found');
    assert.deepEqual(L.examples, [], id + ' should have empty examples');
    assert.deepEqual(L.modes, [], id + ' should have empty modes');
    assert.deepEqual(L.panels, [], id + ' should have empty panels');
  });
`);

// Netze still parse correctly
check('All NETS parse and have places/transitions/arcs/m0', `
  Object.keys(NETS).forEach(k => {
    const n = NETS[k];
    assert.ok(Array.isArray(n.places), k + ' missing places');
    assert.ok(Array.isArray(n.transitions), k + ' missing transitions');
    assert.ok(Array.isArray(n.arcs), k + ' missing arcs');
    assert.ok(n.m0, k + ' missing m0');
  });
`);

// Simulator still works for interactive lessons
check('prepNet and fire work on ev', `
  const net = prepNet(NETS['ev']);
  assert.ok(enabled(net, net.m0, 'produce'));
  assert.ok(enabled(net, net.m0, 'take'));
  assert.ok(!enabled(net, net.m0, 'put'));
  const M1 = fire(net, net.m0, 'produce');
  assert.equal(M1['p1'], 0);
  assert.equal(M1['p2'], 1);
`);

// Reach graph computation
check('Reach graph for ev has 8 nodes', `
  const net = prepNet(NETS['ev']);
  const g = reach(net);
  assert.equal(g.nodes.length, 8);
`);

// Coverability for unbounded
check('Coverability for unb detects omega', `
  const net = prepNet(NETS['unb']);
  const cg = coverability(net);
  const hasOmega = cg.nodes.some(M => net.pIds.some(p => M[p] === Infinity));
  assert.ok(hasOmega, 'unb should have omega');
`);

// Trap/siphon detection
check('trap1 has co-falle/falle property', `
  const net = prepNet(NETS['trap1']);
  const sets = allSets(net);
  assert.ok(sets.traps.length > 0);
  assert.ok(sets.siphons.length > 0);
`);

// loadExample doesn't crash for text-only
check('loadExample for text-only lessons sets net=null', `
  LESSONS.push({ id:'_test_text', examples:[], modes:[], panels:[], quiz:[] });
  st.li = LESSONS.length - 1;
  loadExample();
  assert.equal(st.net, null);
  LESSONS.pop();
`);

// Lesson order matches exam structure
check('Lesson order follows Skript chapters', `
  const ids = LESSONS.map(l => l.id);
  assert.deepEqual(ids, ['pruefung', 'grund', 'neben', 'prozesse', 'leben', 'sts', 'beschr', 'linalg', 'fallen']);
`);

console.log('\nAll tests passed!');
