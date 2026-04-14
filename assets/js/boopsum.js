(function () {
  var DMLimits = [0, 75, 150, 450, 950, 1875, 2250, 3500, 4000, 5250, 3750, 5000, 5000, 6250, 7500, 7500, 10000, 10000, 12500, 12500, 12500];
  var HalfProf = [0, 1, 1, 1, 1, 1.5, 1.5, 1.5, 1.5, 2, 2, 2, 2, 2.5, 2.5, 2.5, 2.5, 3, 3, 3, 3];
  var DMod = [0.5, 0.75, 1];
  var GPMod = [0, 0.1, 0.1, 0.1, 0.1, 0.25, 0.25, 0.25, 0.25, 0.55, 0.55, 0.55, 0.55, 0.8, 0.8, 0.8, 0.8, 1.05, 1.05, 1.05, 1.05];

  var MAX_IDX = DMLimits.length - 1;

  function clampLevel(n) {
    var x = Math.max(0, Math.floor(Number(n)) || 0);
    return Math.min(x, MAX_IDX);
  }

  var form = document.getElementById("boopsum-form");
  var rowsEl = document.getElementById("player-rows");
  var addBtn = document.getElementById("add-player");
  var calcBtn = document.getElementById("calc-boopsum");
  var errEl = document.getElementById("boopsum-error");
  var resEl = document.getElementById("boopsum-result");

  function showError(msg) {
    errEl.textContent = msg;
    errEl.hidden = false;
    resEl.hidden = true;
  }

  function clearError() {
    errEl.hidden = true;
    errEl.textContent = "";
  }

  function addRow(value) {
    var row = document.createElement("div");
    row.className = "player-row";
    var input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = String(MAX_IDX);
    input.step = "1";
    input.placeholder = "Player level";
    input.value = value != null ? String(value) : "";
    var rm = document.createElement("button");
    rm.type = "button";
    rm.className = "btn danger";
    rm.textContent = "Remove";
    rm.addEventListener("click", function () {
      row.remove();
      if (!rowsEl.querySelector(".player-row")) addRow(3);
    });
    row.appendChild(input);
    row.appendChild(rm);
    rowsEl.appendChild(row);
  }

  addBtn.addEventListener("click", function () {
    addRow("");
  });

  if (rowsEl && !rowsEl.querySelector(".player-row")) {
    addRow(3);
    addRow(3);
    addRow(3);
    addRow(3);
  }

  function collectLevels() {
    var inputs = rowsEl.querySelectorAll(".player-row input");
    var levels = [];
    inputs.forEach(function (inp) {
      var v = inp.value.trim();
      if (v === "") return;
      levels.push(clampLevel(v));
    });
    return levels;
  }

  function fmtList(nums) {
    return nums.map(function (n) {
      return String(n);
    }).join(", ");
  }

  calcBtn.addEventListener("click", function () {
    clearError();
    var totalXp = Math.floor(Number(form.totalXp.value));
    if (!Number.isFinite(totalXp) || totalXp < 0) {
      showError("Enter a valid total adjusted XP (0 or greater).");
      return;
    }
    var DMLvL = clampLevel(form.dmLevel.value);
    var PArr = collectLevels();
    var NParty = PArr.length;
    if (NParty === 0) {
      showError("Add at least one player level.");
      return;
    }

    var XPArr = PArr.map(function () {
      return Math.floor(totalXp / NParty);
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
    var rankSum = PArr.reduce(function (acc, x) {
      return acc + Math.ceil(x / 4);
    }, 0);
    var rank = rankSum / NParty;

    if (rank >= 7) {
      showError(
        "Average rank ceil(level/4) is " +
          rank.toFixed(2) +
          ", which hits the original formula boundary (needs rank < 7 for DM XP). Try different levels or party size."
      );
      return;
    }

    var hp = HalfProf[DMLvL];
    if (hp === 0) {
      showError("DM level 0 uses a half-proficiency of 0 in the source tables; pick DM level 1 or higher for DM rewards.");
      return;
    }

    var DMXP = Math.floor(DMLimits[DMLvL] * (1 / (7 - rank)));
    var DMGP = Math.floor((DMXP / hp) * DMod[2] * GPMod[DMLvL]);

    document.getElementById("out-nparty").textContent = String(NParty);
    document.getElementById("out-levels").textContent = fmtList(LText);
    document.getElementById("out-apl").textContent = String(APL);
    document.getElementById("out-totalxp").textContent = String(totalXp);
    document.getElementById("out-gp-a").textContent = fmtList(NewGP_A);
    document.getElementById("out-gp-b").textContent = fmtList(NewGP_B);
    document.getElementById("out-gp-c").textContent = fmtList(NewGP_C);
    document.getElementById("out-itemloot").textContent = String(ItemLoot);
    document.getElementById("out-dmlvl").textContent = String(DMLvL);
    document.getElementById("out-dmxp").textContent = String(DMXP);
    document.getElementById("out-dmgp").textContent = String(DMGP);

    resEl.hidden = false;
  });
})();
