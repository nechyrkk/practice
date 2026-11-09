(function (root) {
  'use strict';
  function validateBank(bank) {
    if (!bank || !bank.id || !Number.isInteger(bank.version) || !Array.isArray(bank.pools) || !bank.pools.length) throw new Error('База заданий пока не готова.');
    const ids = new Set();
    bank.pools.forEach((pool, index) => {
      if (pool.number !== index + 1 || !Array.isArray(pool.tasks) || !pool.tasks.length) throw new Error(`Нет набора для задания ${index + 1}.`);
      pool.tasks.forEach(task => {
        if (!task.id || ids.has(task.id) || task.number !== pool.number || !task.text || !Array.isArray(task.options) || task.options.length < 2 || task.options.some(option => typeof option !== 'string')) throw new Error(`Проверьте набор для задания ${pool.number}.`);
        if (task.correct !== undefined && (!Number.isInteger(task.correct) || task.correct < 0 || task.correct >= task.options.length)) throw new Error(`Некорректный ответ для задания ${pool.number}.`);
        ids.add(task.id);
      });
    });
    return true;
  }
  function randomIndex(length) {
    const bytes = new Uint32Array(1), limit = Math.floor(4294967296 / length) * length;
    do { root.crypto.getRandomValues(bytes); } while (bytes[0] >= limit);
    return bytes[0] % length;
  }
  function generate(bank, choose = randomIndex) {
    validateBank(bank);
    return {
      schema: 1, bankId: bank.id, bankVersion: bank.version,
      id: root.crypto.randomUUID ? root.crypto.randomUUID() : Array.from(root.crypto.getRandomValues(new Uint8Array(12)), n => n.toString(16).padStart(2, '0')).join(''),
      createdAt: Date.now(), current: 0, answers: {}, submitted: false,
      tasks: bank.pools.map(pool => {
        const index = choose(pool.tasks.length);
        if (!Number.isInteger(index) || index < 0 || index >= pool.tasks.length) throw new Error('Не удалось выбрать задание.');
        return { number: pool.number, id: pool.tasks[index].id };
      })
    };
  }
  function restore(bank, value) {
    try {
      validateBank(bank);
      if (!value || value.schema !== 1 || value.bankId !== bank.id || value.bankVersion !== bank.version || typeof value.id !== 'string' || !Number.isFinite(value.createdAt) || !Array.isArray(value.tasks) || value.tasks.length !== bank.pools.length || !Number.isInteger(value.current) || value.current < 0 || value.current >= bank.pools.length || typeof value.submitted !== 'boolean' || !value.answers || typeof value.answers !== 'object' || Array.isArray(value.answers)) return null;
      const answerKeys = new Set(bank.pools.map(pool => String(pool.number)));
      if (Object.keys(value.answers).some(key => !answerKeys.has(key))) return null;
      for (let i = 0; i < bank.pools.length; i++) {
        const selected = value.tasks[i], pool = bank.pools[i];
        if (!selected || selected.number !== pool.number) return null;
        const task = pool.tasks.find(item => item.id === selected.id);
        if (!task) return null;
        const answer = value.answers[pool.number];
        if (answer !== undefined && (!Number.isInteger(answer) || answer < 0 || answer >= task.options.length)) return null;
      }
      return JSON.parse(JSON.stringify(value));
    } catch { return null; }
  }
  function tasksFor(bank, variant) {
    return variant.tasks.map((selected, index) => bank.pools[index].tasks.find(task => task.id === selected.id));
  }
  function grade(bank, variant) {
    let answered = 0, correct = 0, gradable = true;
    const details = tasksFor(bank, variant).map(task => {
      const selected = variant.answers[task.number];
      if (selected !== undefined) answered++;
      if (task.correct === undefined) gradable = false;
      const ok = selected !== undefined && selected === task.correct;
      if (ok) correct++;
      return { number: task.number, selected, correct: task.correct, status: selected === undefined ? 'empty' : task.correct === undefined ? 'answered' : ok ? 'correct' : 'incorrect' };
    });
    return { total: variant.tasks.length, answered, correct, incorrect: answered - correct, empty: variant.tasks.length - answered, gradable, details };
  }
  const key = bank => `kangaroo.variant.v1.${bank.id}`;
  function load(bank) {
    try { return restore(bank, JSON.parse(root.localStorage.getItem(key(bank)))); } catch { return null; }
  }
  function save(bank, variant) {
    try { root.localStorage.setItem(key(bank), JSON.stringify(variant)); return true; } catch { return false; }
  }
  root.KangarooEngine = Object.freeze({ validateBank, randomIndex, generate, restore, tasksFor, grade, load, save });
})(globalThis);
