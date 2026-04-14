(function () {
  var CSV_URL = "data/content-warnings.csv";

  var RANKS = [
    { id: "hatchling", label: "Hatchling" },
    { id: "chickling", label: "Chickling" },
    { id: "fledgeling", label: "Fledgeling" },
    { id: "flier", label: "Flier" },
    { id: "soarer", label: "Soarer" },
    { id: "elder", label: "Elder" },
  ];

  var TYPES = [
    { id: "rp", label: "RP" },
    { id: "combat", label: "Combat" },
    { id: "puzzle", label: "Puzzle" },
  ];

  var LENGTHS = [
    { id: "short", label: "Short" },
    { id: "medium", label: "Medium" },
    { id: "long", label: "Long" },
  ];

  var DIFFICULTIES = [
    { id: "easy", label: "Easy" },
    { id: "average", label: "Average" },
    { id: "hard", label: "Hard" },
    { id: "deadly", label: "Deadly" },
  ];

  var rankEl = document.getElementById("qi-rank");
  var typeEl = document.getElementById("qi-type");
  var lengthEl = document.getElementById("qi-length");
  var difficultyEl = document.getElementById("qi-difficulty");
  var cwListEl = document.getElementById("qi-cw-list");
  var cwFilterEl = document.getElementById("qi-cw-filter");
  var cwStatusEl = document.getElementById("qi-cw-status");
  var cwSelectVisibleBtn = document.getElementById("qi-cw-select-visible");
  var cwClearBtn = document.getElementById("qi-cw-clear");
  var mdOutEl = document.getElementById("qi-md-output");

  if (!rankEl || !mdOutEl) return;

  var state = {
    rank: "",
    types: {},
    length: "",
    difficulty: "",
    warnings: [],
    selectedCw: {},
    cwFilter: "",
  };

  TYPES.forEach(function (t) {
    state.types[t.id] = false;
  });

  function mdEscapeInline(s) {
    return String(s)
      .replace(/\\/g, "\\\\")
      .replace(/\*/g, "\\*")
      .replace(/_/g, "\\_")
      .replace(/`/g, "\\`");
  }

  function parseWarningCsv(text) {
    var lines = String(text).split(/\r?\n/);
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      if (!raw) continue;
      var line = raw.trim();
      if (!line) continue;
      if (i === 0 && /^label$/i.test(line)) continue;
      if (line.charAt(0) === '"' && line.charAt(line.length - 1) === '"') {
        line = line.slice(1, -1).replace(/""/g, '"');
      }
      if (line) out.push(line);
    }
    return out;
  }

  function labelById(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i].label;
    }
    return "";
  }

  function buildExclusiveGroup(container, items, current, onPick) {
    container.textContent = "";
    items.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn toggle";
      btn.textContent = item.label;
      btn.setAttribute("aria-pressed", current === item.id ? "true" : "false");
      btn.dataset.value = item.id;
      btn.addEventListener("click", function () {
        onPick(current === item.id ? "" : item.id);
      });
      container.appendChild(btn);
    });
  }

  function syncExclusiveButtons(container, current) {
    var btns = container.querySelectorAll("button[data-value]");
    btns.forEach(function (btn) {
      var on = btn.dataset.value === current;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function buildMultiGroup(container, typesState, onToggle) {
    container.textContent = "";
    TYPES.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn toggle";
      btn.textContent = item.label;
      var on = !!typesState[item.id];
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.dataset.value = item.id;
      btn.addEventListener("click", function () {
        onToggle(item.id);
      });
      container.appendChild(btn);
    });
  }

  function syncMultiGroup(container, typesState) {
    var btns = container.querySelectorAll("button[data-value]");
    btns.forEach(function (btn) {
      var on = !!typesState[btn.dataset.value];
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function selectedTypeLabels() {
    var labels = [];
    TYPES.forEach(function (t) {
      if (state.types[t.id]) labels.push(t.label);
    });
    return labels;
  }

  function selectedWarningsSorted() {
    return state.warnings.filter(function (w) {
      return state.selectedCw[w];
    });
  }

  function renderMarkdown() {
    var lines = [];
    lines.push("## Quest Info");
    lines.push("");
    lines.push("**Rank:** " + (state.rank ? labelById(RANKS, state.rank) : "—"));
    var t = selectedTypeLabels();
    lines.push("**Type:** " + (t.length ? t.join(", ") : "—"));
    lines.push("**Length:** " + (state.length ? labelById(LENGTHS, state.length) : "—"));
    lines.push("**Difficulty:** " + (state.difficulty ? labelById(DIFFICULTIES, state.difficulty) : "—"));
    lines.push("");
    lines.push("### Content warnings");
    var cw = selectedWarningsSorted();
    if (!cw.length) {
      lines.push("_None selected._");
    } else {
      cw.forEach(function (w) {
        lines.push("- " + mdEscapeInline(w));
      });
    }
    lines.push("");
    lines.push(
      "_Warning labels drawn from the [Trigger Warning Database](https://triggerwarningdatabase.com/masterlist-tw/) master list._"
    );
    mdOutEl.value = lines.join("\n");
  }

  function cwMatchesFilter(label) {
    var q = state.cwFilter.trim().toLowerCase();
    if (!q) return true;
    return label.toLowerCase().indexOf(q) !== -1;
  }

  function renderCwList() {
    if (!cwListEl) return;
    cwListEl.textContent = "";
    var frag = document.createDocumentFragment();
    var visible = 0;
    state.warnings.forEach(function (label) {
      if (!cwMatchesFilter(label)) return;
      visible++;
      var wrap = document.createElement("label");
      wrap.className = "questinfo-cw-item";
      var input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!state.selectedCw[label];
      input.addEventListener("change", function () {
        if (input.checked) state.selectedCw[label] = true;
        else delete state.selectedCw[label];
        renderMarkdown();
      });
      var span = document.createElement("span");
      span.className = "questinfo-cw-text";
      span.textContent = label;
      wrap.appendChild(input);
      wrap.appendChild(span);
      frag.appendChild(wrap);
    });
    cwListEl.appendChild(frag);
    if (cwStatusEl && state.warnings.length) {
      cwStatusEl.textContent =
        visible === state.warnings.length
          ? "Showing all " + state.warnings.length + " warnings."
          : "Showing " + visible + " of " + state.warnings.length + " warnings.";
    }
  }

  function setCwFilter(val) {
    state.cwFilter = val;
    renderCwList();
  }

  buildExclusiveGroup(rankEl, RANKS, state.rank, function (next) {
    state.rank = next;
    syncExclusiveButtons(rankEl, state.rank);
    renderMarkdown();
  });

  buildExclusiveGroup(lengthEl, LENGTHS, state.length, function (next) {
    state.length = next;
    syncExclusiveButtons(lengthEl, state.length);
    renderMarkdown();
  });

  buildExclusiveGroup(difficultyEl, DIFFICULTIES, state.difficulty, function (next) {
    state.difficulty = next;
    syncExclusiveButtons(difficultyEl, state.difficulty);
    renderMarkdown();
  });

  buildMultiGroup(typeEl, state.types, function (id) {
    state.types[id] = !state.types[id];
    syncMultiGroup(typeEl, state.types);
    renderMarkdown();
  });

  if (cwFilterEl) {
    cwFilterEl.addEventListener("input", function () {
      setCwFilter(cwFilterEl.value);
    });
  }

  if (cwSelectVisibleBtn) {
    cwSelectVisibleBtn.addEventListener("click", function () {
      state.warnings.forEach(function (label) {
        if (cwMatchesFilter(label)) state.selectedCw[label] = true;
      });
      renderCwList();
      renderMarkdown();
    });
  }

  if (cwClearBtn) {
    cwClearBtn.addEventListener("click", function () {
      state.selectedCw = {};
      renderCwList();
      renderMarkdown();
    });
  }

  function loadWarnings() {
    if (!cwStatusEl) return;
    cwStatusEl.textContent = "Loading content warnings…";
    fetch(CSV_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        state.warnings = parseWarningCsv(text);
        if (!state.warnings.length) {
          cwStatusEl.textContent = "No rows found in " + CSV_URL + ".";
        } else {
          cwStatusEl.textContent = "Loaded " + state.warnings.length + " warnings.";
        }
        renderCwList();
        renderMarkdown();
      })
      .catch(function () {
        cwStatusEl.textContent =
          "Could not load " +
          CSV_URL +
          ". Serve the site over HTTP (not file://) so fetch works, or check the file path.";
        state.warnings = [];
        renderCwList();
        renderMarkdown();
      });
  }

  loadWarnings();
  renderMarkdown();
})();
