(function () {
  var HalfProf = [0, 1, 1, 1, 1, 1.5, 1.5, 1.5, 1.5, 2, 2, 2, 2, 2.5, 2.5, 2.5, 2.5, 3, 3, 3, 3];
  var DMod = [0.5, 0.75, 1];
  var GPMod = [0, 0.1, 0.1, 0.1, 0.1, 0.25, 0.25, 0.25, 0.25, 0.55, 0.55, 0.55, 0.55, 0.8, 0.8, 0.8, 0.8, 1.05, 1.05, 1.05, 1.05];

  var MAX_IDX = HalfProf.length - 1;

  function clampLevel(n) {
    var x = Math.max(1, Math.floor(Number(n)) || 0);
    return Math.min(x, MAX_IDX);
  }

  function tierIcon(level) {
    var L = clampLevel(level);
    if (L === 1) return { emoji: "🪺", title: "Nestling" };
    if (L >= 2 && L <= 4) return { emoji: "🐣", title: "Hatchling" };
    if (L >= 5 && L <= 8) return { emoji: "🐤", title: "Chickling" };
    if (L >= 9 && L <= 12) return { emoji: "🐦‍⬛", title: "Fledgling" };
    if (L >= 13 && L <= 16) return { emoji: "🪽", title: "Flier" };
    if (L >= 17 && L <= 19) return { emoji: "🦅", title: "Soarer" };
    return { emoji: "🪶", title: "Elder" };
  }

  var form = document.getElementById("boopsum-form");
  var rowsEl = document.getElementById("player-rows");
  var addBtn = document.getElementById("add-player");
  var calcBtn = document.getElementById("calc-boopsum");
  var errEl = document.getElementById("boopsum-error");
  var resEl = document.getElementById("boopsum-result");
  var partySummaryEl = document.getElementById("out-party-summary");
  var boopsumCommandEl = document.getElementById("out-boopsum-command");
  var partySummaryTextEl = document.getElementById("out-party-summary-text");

  function showError(msg) {
    errEl.textContent = msg;
    errEl.hidden = false;
    resEl.hidden = true;
  }

  function clearError() {
    errEl.hidden = true;
    errEl.textContent = "";
  }

  function syncRowIcon(row) {
    var levelInput = row.querySelector(".player-level");
    var iconEl = row.querySelector(".player-tier-icon");
    if (!levelInput || !iconEl) return;
    if (levelInput.value.trim() === "") {
      iconEl.textContent = "";
      iconEl.title = "";
      iconEl.setAttribute("aria-label", "Raven mark tier (enter a level)");
      return;
    }
    var L = clampLevel(levelInput.value);
    var t = tierIcon(L);
    iconEl.textContent = t.emoji;
    iconEl.title = t.title ? t.title + " (level " + L + ")" : "";
    iconEl.setAttribute("aria-label", iconEl.title || "Raven mark tier");
  }

  function addRow(character, player, level) {
    var row = document.createElement("div");
    row.className = "player-row";

    var icon = document.createElement("span");
    icon.className = "player-tier-icon";
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-hidden", "true");

    function mkField(placeholder, className, name, val) {
      var wrap = document.createElement("label");
      wrap.className = "player-field " + className;
      var span = document.createElement("span");
      span.className = "sr-only";
      span.textContent = placeholder;
      var input = document.createElement("input");
      input.type = "text";
      input.className = "player-text";
      input.placeholder = placeholder;
      input.autocomplete = "off";
      if (name) input.name = name;
      input.value = val != null ? String(val) : "";
      wrap.appendChild(span);
      wrap.appendChild(input);
      return wrap;
    }

    var charWrap = mkField("Character", "player-field-char", "partyCharacter", character);
    var playWrap = mkField("Player", "player-field-player", "partyPlayer", player);

    var levelWrap = document.createElement("label");
    levelWrap.className = "player-field player-field-level";
    var levelSpan = document.createElement("span");
    levelSpan.className = "sr-only";
    levelSpan.textContent = "Level";
    var levelInput = document.createElement("input");
    levelInput.type = "number";
    levelInput.className = "player-level";
    levelInput.min = "1";
    levelInput.max = String(MAX_IDX);
    levelInput.step = "1";
    levelInput.placeholder = "Level";
    levelInput.value = level != null && level !== "" ? String(level) : "";
    levelWrap.appendChild(levelSpan);
    levelWrap.appendChild(levelInput);

    levelInput.addEventListener("input", function () {
      syncRowIcon(row);
    });

    var rm = document.createElement("button");
    rm.type = "button";
    rm.className = "btn danger";
    rm.textContent = "Remove";
    rm.addEventListener("click", function () {
      row.remove();
      if (!rowsEl.querySelector(".player-row")) addRow("", "", 3);
    });

    row.appendChild(icon);
    row.appendChild(charWrap);
    row.appendChild(playWrap);
    row.appendChild(levelWrap);
    row.appendChild(rm);
    rowsEl.appendChild(row);
    syncRowIcon(row);
  }

  addBtn.addEventListener("click", function () {
    addRow("", "", "");
  });

  if (rowsEl && !rowsEl.querySelector(".player-row")) {
    addRow("", "", 3);
    addRow("", "", 3);
    addRow("", "", 3);
    addRow("", "", 3);
  }

  function collectParty() {
    var rows = rowsEl.querySelectorAll(".player-row");
    var party = [];
    rows.forEach(function (row) {
      var charEl = row.querySelector(".player-field-char .player-text");
      var playEl = row.querySelector(".player-field-player .player-text");
      var lvlEl = row.querySelector(".player-level");
      var lv = lvlEl && lvlEl.value.trim() !== "" ? clampLevel(lvlEl.value) : null;
      if (lv === null) return;
      party.push({
        character: charEl ? charEl.value.trim() : "",
        player: playEl ? playEl.value.trim() : "",
        level: lv
      });
    });
    return party;
  }

  function fmtList(nums) {
    return nums.map(function (n) {
      return String(n);
    }).join(", ");
  }

  function partySummaryLine(party) {
    return party
      .map(function (p) {
        var c = p.character || "—";
        var pl = p.player || "—";
        return c + "/" + pl;
      })
      .join(", ");
  }

  function boopsumCommand(totalXp, party) {
    var levels = party.map(function (p) {
      return String(p.level);
    });
    return ["!boopsum", String(totalXp)].concat(levels).join(" ");
  }

  calcBtn.addEventListener("click", function () {
    clearError();
    var totalXp = Math.floor(Number(form.totalXp.value));
    if (!Number.isFinite(totalXp) || totalXp < 0) {
      showError("Enter a valid total adjusted XP (0 or greater).");
      return;
    }
    var party = collectParty();
    var NParty = party.length;
    if (NParty === 0) {
      showError("Add at least one party member with a level.");
      return;
    }

    var PArr = party.map(function (p) {
      return p.level;
    });
    var PlayerXP = Math.floor(totalXp / Math.floor(NParty));
    var XPArr = PArr.map(function () {
      return PlayerXP;
    });
    var LSum = PArr.reduce(function (a, b) {
      return a + b;
    }, 0);
    var LText = PArr.slice();
    var APL = Math.round((LSum / NParty) * 100) / 100;

    var NewGP_A = PArr.map(function (x, i) {
      return Math.floor((XPArr[i] / HalfProf[x]) * DMod[0] * GPMod[x]);
    });
    var NewGP_B = PArr.map(function (x, i) {
      return Math.floor((XPArr[i] / HalfProf[x]) * DMod[1] * GPMod[x]);
    });
    var NewGP_C = PArr.map(function (x, i) {
      return Math.floor((XPArr[i] / HalfProf[x]) * DMod[2] * GPMod[x]);
    });

    var ItemLoot = NewGP_C.reduce(function (a, b) {
      return a + b;
    }, 0);

    document.getElementById("out-nparty").textContent = String(NParty);
    document.getElementById("out-levels").textContent = fmtList(LText);
    document.getElementById("out-apl").textContent = String(APL);
    document.getElementById("out-totalxp").textContent = String(totalXp);
    document.getElementById("out-xp-each").textContent = String(PlayerXP);
    document.getElementById("out-gp-a").textContent = fmtList(NewGP_A);
    document.getElementById("out-gp-b").textContent = fmtList(NewGP_B);
    document.getElementById("out-gp-c").textContent = fmtList(NewGP_C);
    document.getElementById("out-itemloot").textContent = String(ItemLoot);

    boopsumCommandEl.textContent = boopsumCommand(totalXp, party);
    partySummaryTextEl.textContent = partySummaryLine(party);
    partySummaryEl.hidden = false;

    resEl.hidden = false;
  });
})();
