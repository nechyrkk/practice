(() => {
  'use strict';
  const bank = globalThis.KANGAROO_BANK, engine = globalThis.KangarooEngine;
  const $ = id => document.getElementById(id);
  const letters = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж'];
  const dialog = $('confirm-dialog');
  let state, tasks, pendingAction = null;
  let switchVersion = 0, switchAnimation = null;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function stopSwitch() {
    switchVersion++;
    switchAnimation?.cancel(); switchAnimation = null;
    $('question-card').classList.remove('is-switching');
  }

  function persist() {
    const saved = engine.save(bank, state);
    const dot = document.createElement('span'); dot.setAttribute('aria-hidden', 'true');
    $('save-status').replaceChildren(dot, document.createTextNode(saved ? 'Ответы сохранены в браузере' : 'Сохранение недоступно. Не закрывай вкладку.'));
    $('save-status').classList.toggle('is-unavailable', !saved);
    return saved;
  }
  function answeredCount() { return Object.keys(state.answers).length; }
  function updateNavigation() {
    const report = engine.grade(bank, state);
    $('task-count').textContent = tasks.length;
    $('number-grid').replaceChildren();
    tasks.forEach((task, index) => {
      const button = document.createElement('button');
      const answered = state.answers[task.number] !== undefined;
      button.type = 'button'; button.className = 'number-button'; button.textContent = task.number;
      button.dataset.index = index; button.classList.toggle('has-answer', answered);
      let status = answered ? 'есть ответ' : 'без ответа';
      if (state.submitted) {
        const detail = report.details[index];
        button.classList.add(`is-${detail.status}`);
        status = { correct: 'верно', incorrect: 'с ошибкой', empty: 'без ответа', answered: 'есть ответ' }[detail.status];
      }
      if (!$('question-card').hidden && index === state.current) button.setAttribute('aria-current', 'step');
      button.setAttribute('aria-label', `Задание ${task.number}, ${status}`);
      $('number-grid').append(button);
    });
    $('progress-caption').textContent = `Отвечено ${report.answered} из ${tasks.length}`;
    $('progress-percent').textContent = `${Math.round(report.answered / tasks.length * 100)}%`;
    $('progress').max = tasks.length; $('progress').value = report.answered;
    $('finish').hidden = state.submitted; $('show-results').hidden = !state.submitted;
    const legend = document.querySelector('.legend');
    legend.replaceChildren();
    const legendItems = state.submitted ? [['correct', 'Верно'], ['incorrect', 'С ошибкой']] : [['answered', 'Есть ответ'], ['current', 'Текущее']];
    legendItems.forEach(([kind, label]) => {
      const item = document.createElement('span'), dot = document.createElement('i');
      dot.className = `legend-dot ${kind}`; dot.setAttribute('aria-hidden', 'true');
      item.append(dot, document.createTextNode(label)); legend.append(item);
    });
    $('variant-code').textContent = `Вариант ${state.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
    $('set-label').textContent = bank.title;
    $('study-note').hidden = false;
    $('study-note').textContent = bank.demo ? 'Демонстрационные задания для знакомства с сайтом.' : 'Выбирай задания в любом порядке. Ответы сохраняются автоматически.';
  }

  function setNextLabel(text) {
    const arrow = document.createElement('span'); arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '→';
    $('next').replaceChildren(document.createTextNode(text), arrow);
  }
  function renderQuestion(focus = false) {
    const task = tasks[state.current];
    $('question-card').hidden = false; $('results-card').hidden = true;
    $('question-position').textContent = `Вопрос ${String(state.current + 1).padStart(2, '0')} из ${tasks.length}`;
    $('question-title').textContent = `Задание ${task.number}`;
    $('question-topic').textContent = task.topic || 'Математика'; $('question-topic').hidden = false;
    $('question-text').textContent = task.text;
    const sourceQuestion = task.image?.kind === 'question';
    $('question-text').hidden = sourceQuestion;
    $('question-source').hidden = !task.source;
    if (task.source) {
      const origin = task.source.kind === 'original' ? 'Кенгуру ' + task.source.year : 'Авторское задание';
      $('question-source').textContent = origin + ' · 3–4 классы · ' + task.points + (task.points === 5 ? ' баллов' : ' балла');
    }
    $('question-figure').hidden = !task.image;
    $('question-figure').classList.toggle('is-source-question', sourceQuestion);
    if (task.image) {
      $('question-image-link').href = task.image.src;
      $('question-image').src = task.image.src; $('question-image').alt = task.image.alt || `Рисунок к заданию ${task.number}`;
    } else { $('question-image').removeAttribute('src'); $('question-image').alt = ''; }
    $('answer-options').replaceChildren();
    task.options.forEach((option, index) => {
      const label = document.createElement('label'); label.className = 'answer-option';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'answer'; input.value = index;
      input.checked = state.answers[task.number] === index; input.disabled = state.submitted;
      const letter = document.createElement('span'); letter.className = 'answer-letter'; letter.setAttribute('aria-hidden', 'true'); letter.textContent = letters[index] || index + 1;
      const text = document.createElement('span'); text.className = 'answer-text'; text.textContent = option;
      label.append(input, letter, text);
      if (state.submitted && task.correct !== undefined) {
        label.classList.toggle('is-correct', index === task.correct);
        label.classList.toggle('is-incorrect', input.checked && index !== task.correct);
        if (index === task.correct) input.setAttribute('aria-label', `${option}, правильный ответ`);
      }
      $('answer-options').append(label);
    });
    $('clear-answer').classList.toggle('is-invisible', state.submitted || state.answers[task.number] === undefined);
    $('answer-hint').textContent = state.submitted ? 'Вариант завершён. Здесь можно разобрать ответы.' : 'Ответ можно изменить до завершения варианта.';
    $('review-feedback').hidden = !state.submitted;
    if (state.submitted) {
      const selected = state.answers[task.number];
      const correct = task.correct;
      let message = correct === undefined ? 'Ответ сохранён. Проверка для этого задания пока недоступна.'
        : selected === correct ? 'Верно. Хорошая работа!'
        : `${selected === undefined ? 'Это задание осталось без ответа.' : 'В этом задании есть ошибка.'} Правильный ответ: ${letters[correct] || correct + 1} — ${task.options[correct]}.`;
      if (task.explanation) message += ` ${task.explanation}`;
      $('review-feedback').textContent = message;
    }
    $('previous').disabled = state.current === 0;
    $('skip').hidden = state.submitted;
    setNextLabel(state.current < tasks.length - 1 ? 'Далее' : state.submitted ? 'К результатам' : 'Завершить');
    updateNavigation();
    if (focus) {
      $('question-title').focus({ preventScroll: true });
      $('question-card').scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }
  async function navigate(index) {
    const target = Math.max(0, Math.min(tasks.length - 1, index));
    const card = $('question-card'), opacity = getComputedStyle(card).opacity;
    stopSwitch();
    if (target === state.current && !card.hidden) return;
    const version = switchVersion;
    const animate = !motion.matches && !card.hidden && typeof card.animate === 'function';
    if (animate) {
      card.classList.add('is-switching');
      switchAnimation = card.animate([{ opacity }, { opacity: 0 }], { duration: 80, easing: 'ease-out', fill: 'forwards' });
      await switchAnimation.finished.catch(() => {});
      if (version !== switchVersion) return;
      switchAnimation.cancel();
    }
    state.current = target; persist(); renderQuestion(true);
    if (animate) {
      switchAnimation = card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'ease-out' });
      await switchAnimation.finished.catch(() => {});
      if (version !== switchVersion) return;
    }
    switchAnimation = null; card.classList.remove('is-switching');
  }
  function renderResults(focus = true) {
    stopSwitch();
    const report = engine.grade(bank, state);
    $('question-card').hidden = true; $('results-card').hidden = false;
    $('results-title').textContent = 'Вариант завершён';
    $('results-intro').textContent = report.gradable ? 'Теперь можно посмотреть ответы и спокойно разобраться в каждом задании.' : 'Твои ответы сохранены. Автоматическая проверка появится, когда будут добавлены ключи ответов.';
    $('score-value').textContent = report.gradable ? report.correct : report.answered;
    $('score-total').textContent = `из ${report.total} ${report.gradable ? 'верно' : 'ответов'}`;
    $('stat-correct').textContent = report.correct; $('stat-incorrect').textContent = report.incorrect; $('stat-empty').textContent = report.empty;
    $('stat-correct').parentElement.hidden = !report.gradable;
    $('stat-incorrect').parentElement.hidden = !report.gradable;
    updateNavigation();
    if (focus) {
      $('results-title').focus({ preventScroll: true });
      $('results-card').scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }
  function freshVariant() {
    stopSwitch();
    state = engine.generate(bank); tasks = engine.tasksFor(bank, state); persist(); renderQuestion(true);
  }
  function confirm(kind) {
    stopSwitch();
    pendingAction = kind;
    if (kind === 'finish') {
      const missing = tasks.length - answeredCount();
      $('confirm-eyebrow').textContent = 'Можно ещё подумать';
      $('confirm-title').textContent = 'Завершить вариант?';
      $('confirm-description').textContent = missing
        ? `Ты выбрал ответы на ${answeredCount()} из ${tasks.length} заданий. Заданий без ответа: ${missing}. Можно вернуться к ним или завершить вариант сейчас.`
        : 'Ты ответил на все задания. После завершения можно будет посмотреть результат и правильные ответы.';
      $('confirm-cancel').textContent = 'Продолжить решать'; $('confirm-action').textContent = 'Завершить';
    } else {
      $('confirm-eyebrow').textContent = 'Новая попытка'; $('confirm-title').textContent = 'Собрать новый вариант?';
      $('confirm-description').textContent = 'Текущий вариант и его ответы будут заменены. Для каждого номера мы случайно выберем задачу из соответствующего набора.';
      $('confirm-cancel').textContent = 'Оставить текущий'; $('confirm-action').textContent = 'Новый вариант';
    }
    dialog.showModal(); $('confirm-cancel').focus();
  }
  function requestNew() { if (answeredCount() || state.submitted) confirm('new'); else freshVariant(); }

  function showEmptyBank() {
    $('set-label').textContent = 'Задания готовятся'; $('variant-code').textContent = '';
    $('task-count').textContent = '—';
    $('number-grid').replaceChildren(); $('number-grid').setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 12; i++) {
      const placeholder = document.createElement('span');
      placeholder.className = 'number-button number-placeholder';
      $('number-grid').append(placeholder);
    }
    $('progress-caption').textContent = 'Вариант ещё не создан'; $('progress-percent').textContent = '—';
    $('progress').max = 1; $('progress').value = 0;
    document.querySelector('.legend').hidden = true;
    $('save-status').textContent = 'В своём темпе, по одному заданию.';
    $('question-position').textContent = 'Твой вариант';
    $('question-title').textContent = 'Задания скоро появятся';
    $('question-topic').hidden = true;
    $('question-text').textContent = 'Набор заданий олимпиады «Кенгуру» готовится.';
    $('question-figure').hidden = true;
    $('answer-options').replaceChildren();
    $('answer-options').setAttribute('aria-hidden', 'true');
    document.querySelector('.answer-group legend').textContent = 'Варианты ответов';
    letters.slice(0, 5).forEach(letter => {
      const row = document.createElement('div'); row.className = 'answer-option answer-placeholder';
      const badge = document.createElement('span'); badge.className = 'answer-letter'; badge.textContent = letter;
      const line = document.createElement('span'); line.className = 'placeholder-line';
      row.append(badge, line); $('answer-options').append(row);
    });
    $('answer-hint').textContent = 'Скоро здесь можно будет собрать свой вариант.';
    $('study-note').hidden = true;
    ['finish', 'new-variant', 'previous', 'next', 'skip', 'clear-answer'].forEach(id => { $(id).disabled = true; });
    $('clear-answer').classList.add('is-invisible');
  }

  $('number-grid').addEventListener('click', event => {
    const button = event.target.closest('button[data-index]');
    if (button) navigate(Number(button.dataset.index));
  });
  $('answer-options').addEventListener('change', event => {
    if (state.submitted || event.target.name !== 'answer') return;
    const task = tasks[state.current];
    state.answers[task.number] = Number(event.target.value); persist();
    $('clear-answer').classList.remove('is-invisible'); updateNavigation();
  });
  $('clear-answer').addEventListener('click', () => {
    if (state.submitted) return;
    delete state.answers[tasks[state.current].number]; persist(); renderQuestion();
    $('answer-options').querySelector('input')?.focus({ preventScroll: true });
  });
  $('previous').addEventListener('click', () => navigate(state.current - 1));
  $('next').addEventListener('click', () => {
    if (state.current < tasks.length - 1) navigate(state.current + 1);
    else if (state.submitted) renderResults(); else confirm('finish');
  });
  $('skip').addEventListener('click', () => {
    for (let step = 1; step < tasks.length; step++) {
      const next = (state.current + step) % tasks.length;
      if (state.answers[tasks[next].number] === undefined) { navigate(next); return; }
    }
    navigate((state.current + 1) % tasks.length);
  });
  $('finish').addEventListener('click', () => confirm('finish'));
  $('show-results').addEventListener('click', () => renderResults());
  $('new-variant').addEventListener('click', requestNew);
  $('results-new').addEventListener('click', requestNew);
  $('review-answers').addEventListener('click', () => {
    const report = engine.grade(bank, state);
    const first = report.details.findIndex(detail => detail.status !== 'correct');
    navigate(first < 0 ? 0 : first);
  });
  $('confirm-cancel').addEventListener('click', () => dialog.close());
  $('confirm-action').addEventListener('click', () => {
    const action = pendingAction; dialog.close();
    if (action === 'new') freshVariant();
    else if (action === 'finish') { state.submitted = true; persist(); renderResults(); }
  });
  dialog.addEventListener('close', () => { pendingAction = null; });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted || !state) return;
    const latest = engine.load(bank);
    if (latest) { state = latest; tasks = engine.tasksFor(bank, state); state.submitted ? renderResults(false) : renderQuestion(); }
  });
  try {
    if (bank && Array.isArray(bank.pools) && bank.pools.length === 0) { showEmptyBank(); return; }
    engine.validateBank(bank);
    state = engine.load(bank) || engine.generate(bank);
    tasks = engine.tasksFor(bank, state); persist();
    if (state.submitted) renderResults(false); else renderQuestion();
  } catch (error) {
    $('study-layout').hidden = true; $('page-notice').hidden = false;
    $('page-notice').textContent = `Не удалось открыть вариант. ${error.message || 'Попробуй обновить страницу.'}`;
  }
})();
