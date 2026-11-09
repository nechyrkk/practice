const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');
const root = path.resolve(__dirname, '..');
function setup(storage) {
  const items = new Map();
  const context = vm.createContext({ crypto: webcrypto, localStorage: storage || { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) } });
  context.KANGAROO_BANK = {
    id: 'test-bank', version: 1,
    pools: Array.from({ length: 12 }, (_, index) => ({ number: index + 1, tasks: [0, 1].map(choice => ({
      id: `test-${index + 1}-${choice}`, number: index + 1, text: 'Тест генератора',
      options: ['0', '1', '2', '3', '4'], correct: 2
    })) }))
  };
  vm.runInContext(fs.readFileSync(path.join(root, 'variant-engine.js'), 'utf8'), context);
  return { bank: context.KANGAROO_BANK, engine: context.KangarooEngine };
}
const copy = value => JSON.parse(JSON.stringify(value));

test('each generated position draws only from its matching number pool', () => {
  const { bank, engine } = setup();
  const seen = bank.pools.map(() => new Set());
  for (let attempt = 0; attempt < 150; attempt++) {
    const variant = engine.generate(bank);
    assert.equal(variant.tasks.length, bank.pools.length);
    variant.tasks.forEach((selected, index) => {
      assert.equal(selected.number, index + 1);
      assert.ok(bank.pools[index].tasks.some(task => task.id === selected.id && task.number === selected.number));
      seen[index].add(selected.id);
    });
  }
  seen.forEach((ids, index) => assert.equal(ids.size, bank.pools[index].tasks.length));
});
test('refresh restores the same tasks, selected answer zero, and current position', () => {
  const { bank, engine } = setup();
  const variant = engine.generate(bank); variant.answers[1] = 0; variant.answers[5] = 3; variant.current = 4;
  assert.equal(engine.save(bank, variant), true);
  assert.deepEqual(copy(engine.load(bank)), copy(variant));
});
test('swapping tasks between numbers is rejected on restore', () => {
  const { bank, engine } = setup(); const value = engine.generate(bank);
  [value.tasks[0].id, value.tasks[1].id] = [value.tasks[1].id, value.tasks[0].id];
  assert.equal(engine.restore(bank, value), null);
});
test('changed banks and malformed answers do not restore incompatible progress', () => {
  const { bank, engine } = setup(); const value = engine.generate(bank);
  const changed = copy(value); changed.bankVersion++;
  assert.equal(engine.restore(bank, changed), null);
  const invalid = copy(value); invalid.answers[1] = 99;
  assert.equal(engine.restore(bank, invalid), null);
  const unknown = copy(value); unknown.answers[400] = 1;
  assert.equal(engine.restore(bank, unknown), null);
});
test('grading distinguishes wrong answers, missing answers, and correct answers', () => {
  const { bank, engine } = setup(); const value = engine.generate(bank, () => 0);
  const tasks = engine.tasksFor(bank, value);
  tasks.slice(0, 10).forEach(task => { value.answers[task.number] = task.correct; });
  value.answers[11] = (tasks[10].correct + 1) % tasks[10].options.length;
  const report = engine.grade(bank, value);
  assert.equal(report.correct, 10); assert.equal(report.incorrect, 1); assert.equal(report.empty, 1); assert.equal(report.answered, 11);
  assert.equal(report.details[10].status, 'incorrect'); assert.equal(report.details[11].status, 'empty');
});
test('a missing pool fails explicitly instead of moving later tasks into its number', () => {
  const { bank, engine } = setup(); const missing = copy(bank); missing.pools.splice(3, 1);
  assert.throws(() => engine.generate(missing), /задания 4/);
});
test('blocked browser storage does not break generation or answering', () => {
  const { bank, engine } = setup({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });
  assert.equal(engine.load(bank), null); const value = engine.generate(bank);
  assert.equal(engine.save(bank, value), false); assert.equal(value.tasks.length, 12);
});
