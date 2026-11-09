(() => {
  'use strict';
  const button = document.querySelector('#generate');
  function updateLabel() {
    const saved = globalThis.KangarooEngine.load(globalThis.KANGAROO_BANK);
    button.querySelector('span').textContent = saved ? saved.submitted ? 'Открыть вариант' : 'Продолжить вариант' : 'Сгенерировать вариант';
  }
  button.addEventListener('click', () => location.assign('tasks.html'));
  window.addEventListener('pageshow', updateLabel);
  updateLabel();
})();
