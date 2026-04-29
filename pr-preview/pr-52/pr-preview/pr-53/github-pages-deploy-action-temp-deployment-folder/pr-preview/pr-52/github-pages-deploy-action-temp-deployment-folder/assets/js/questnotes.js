(function () {
  var STORAGE_KEY = 'rm-quest-notes-v1';

  var questTabsEl = document.getElementById('qn-quest-tabs');
  var headingTabsEl = document.getElementById('qn-heading-tabs');
  var emptyEl = document.getElementById('qn-empty');
  var editorEl = document.getElementById('qn-editor');
  var questTitleEl = document.getElementById('qn-active-quest-title');
  var headingTitleEl = document.getElementById('qn-active-heading-title');
  var noteTextEl = document.getElementById('qn-note-text');

  var newQuestNameEl = document.getElementById('qn-new-quest-name');
  var addQuestBtn = document.getElementById('qn-add-quest');
  var deleteQuestBtn = document.getElementById('qn-delete-quest');

  var newHeadingNameEl = document.getElementById('qn-new-heading-name');
  var addHeadingBtn = document.getElementById('qn-add-heading');
  var renameHeadingBtn = document.getElementById('qn-rename-heading');
  var deleteHeadingBtn = document.getElementById('qn-delete-heading');

  if (!questTabsEl || !headingTabsEl || !noteTextEl) return;

  var state = loadState();

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return initialState();
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.quests)) return initialState();
      if (typeof parsed.activeQuestId !== 'string') parsed.activeQuestId = '';
      if (typeof parsed.activeHeadingId !== 'string') parsed.activeHeadingId = '';
      return parsed;
    } catch (_err) {
      return initialState();
    }
  }

  function initialState() {
    return { quests: [], activeQuestId: '', activeHeadingId: '' };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function makeId(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8);
  }

  function getActiveQuest() {
    return state.quests.find(function (q) { return q.id === state.activeQuestId; }) || null;
  }

  function getActiveHeading() {
    var quest = getActiveQuest();
    if (!quest || !Array.isArray(quest.headings)) return null;
    return quest.headings.find(function (h) { return h.id === state.activeHeadingId; }) || null;
  }

  function ensureValidSelection() {
    if (!state.quests.length) {
      state.activeQuestId = '';
      state.activeHeadingId = '';
      return;
    }

    var quest = getActiveQuest();
    if (!quest) {
      state.activeQuestId = state.quests[0].id;
      quest = state.quests[0];
    }

    if (!quest.headings || !quest.headings.length) {
      quest.headings = [{ id: makeId('heading'), title: 'General', notes: '' }];
    }

    var heading = getActiveHeading();
    if (!heading) {
      state.activeHeadingId = quest.headings[0].id;
    }
  }

  function render() {
    ensureValidSelection();
    renderQuestTabs();

    var quest = getActiveQuest();
    if (!quest) {
      emptyEl.hidden = false;
      editorEl.hidden = true;
      return;
    }

    emptyEl.hidden = true;
    editorEl.hidden = false;
    questTitleEl.textContent = quest.title;

    renderHeadingTabs();
    var heading = getActiveHeading();
    headingTitleEl.textContent = heading ? heading.title : 'Notes';
    noteTextEl.value = heading ? (heading.notes || '') : '';
  }

  function renderQuestTabs() {
    questTabsEl.innerHTML = '';
    state.quests.forEach(function (quest) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'questnotes-tab' + (quest.id === state.activeQuestId ? ' is-active' : '');
      btn.textContent = quest.title;
      btn.addEventListener('click', function () {
        state.activeQuestId = quest.id;
        state.activeHeadingId = '';
        saveState();
        render();
      });
      questTabsEl.appendChild(btn);
    });
  }

  function renderHeadingTabs() {
    headingTabsEl.innerHTML = '';
    var quest = getActiveQuest();
    if (!quest) return;

    quest.headings.forEach(function (heading) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'questnotes-subtab' + (heading.id === state.activeHeadingId ? ' is-active' : '');
      btn.textContent = heading.title;
      btn.addEventListener('click', function () {
        state.activeHeadingId = heading.id;
        saveState();
        render();
      });
      headingTabsEl.appendChild(btn);
    });
  }

  addQuestBtn.addEventListener('click', function () {
    var name = (newQuestNameEl.value || '').trim();
    if (!name) return;
    var heading = { id: makeId('heading'), title: 'General', notes: '' };
    var quest = { id: makeId('quest'), title: name, headings: [heading] };
    state.quests.push(quest);
    state.activeQuestId = quest.id;
    state.activeHeadingId = heading.id;
    newQuestNameEl.value = '';
    saveState();
    render();
  });

  addHeadingBtn.addEventListener('click', function () {
    var quest = getActiveQuest();
    if (!quest) return;
    var name = (newHeadingNameEl.value || '').trim();
    if (!name) return;
    var heading = { id: makeId('heading'), title: name, notes: '' };
    quest.headings.push(heading);
    state.activeHeadingId = heading.id;
    newHeadingNameEl.value = '';
    saveState();
    render();
  });

  noteTextEl.addEventListener('input', function () {
    var heading = getActiveHeading();
    if (!heading) return;
    heading.notes = noteTextEl.value;
    saveState();
  });

  deleteQuestBtn.addEventListener('click', function () {
    var quest = getActiveQuest();
    if (!quest) return;
    var ok = window.confirm('Delete quest "' + quest.title + '" and all of its notes?');
    if (!ok) return;
    state.quests = state.quests.filter(function (q) { return q.id !== quest.id; });
    state.activeQuestId = '';
    state.activeHeadingId = '';
    saveState();
    render();
  });

  renameHeadingBtn.addEventListener('click', function () {
    var heading = getActiveHeading();
    if (!heading) return;
    var next = window.prompt('Rename heading:', heading.title);
    if (next == null) return;
    var trimmed = next.trim();
    if (!trimmed) return;
    heading.title = trimmed;
    saveState();
    render();
  });

  deleteHeadingBtn.addEventListener('click', function () {
    var quest = getActiveQuest();
    var heading = getActiveHeading();
    if (!quest || !heading) return;
    if (quest.headings.length <= 1) {
      window.alert('A quest must have at least one heading.');
      return;
    }
    var ok = window.confirm('Delete heading "' + heading.title + '"?');
    if (!ok) return;
    quest.headings = quest.headings.filter(function (h) { return h.id !== heading.id; });
    state.activeHeadingId = '';
    saveState();
    render();
  });

  render();
})();
