(function () {
  var DEFAULT_CSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSH9cqtzXf0D5gSXfiueKRmSufsZrdWEvsIF_umg2G2ND1OYEry6Y-JcR36rM5W1JrNcR3E0HYVvPP8/pub?output=csv&gid=553653062";

  var REWARDS = [
    { name: "Common Item Request", cost: 30 },
    { name: "Uncommon Item Request", cost: 60 },
    { name: "Rare Item Request", cost: 120 },
  ];

  var userInput = document.getElementById("staff-username");
  var lookupBtn = document.getElementById("staff-lookup");
  var statusEl = document.getElementById("staff-status");
  var errEl = document.getElementById("staff-error");
  var balanceWrap = document.getElementById("staff-balance-wrap");
  var balanceEl = document.getElementById("staff-balance");
  var rewardsBody = document.getElementById("staff-rewards-tbody");

  if (!lookupBtn || !userInput || !rewardsBody) return;

  var workbookCache = null;

  function csvUrl() {
    try {
      var q = new URLSearchParams(window.location.search).get("staffCsv");
      if (q) {
        var t = decodeURIComponent(q.trim());
        if (t && /^https?:\/\//i.test(t)) return t;
      }
    } catch (e) {}
    return DEFAULT_CSV;
  }

  function showError(msg) {
    errEl.textContent = msg;
    errEl.hidden = false;
  }

  function clearError() {
    errEl.hidden = true;
    errEl.textContent = "";
  }

  function setStatus(msg) {
    statusEl.textContent = msg || "";
  }

  function parseCsvLine(line) {
    var out = [];
    var cur = "";
    var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (ch === '"') {
        inQ = !inQ;
        continue;
      }
      if (!inQ && ch === ",") {
        out.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    for (var j = 0; j < out.length; j++) {
      out[j] = out[j].replace(/^\s+|\s+$/g, "");
    }
    return out;
  }

  function parseCsv(text) {
    var lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    var rows = [];
    for (var i = 0; i < lines.length; i++) {
      if (lines[i] === "") continue;
      rows.push(parseCsvLine(lines[i]));
    }
    return rows;
  }

  function normUser(s) {
    return String(s || "")
      .trim()
      .toLowerCase();
  }

  function findColumnIndex(headerRow, matchers) {
    for (var m = 0; m < matchers.length; m++) {
      var fn = matchers[m];
      for (var i = 0; i < headerRow.length; i++) {
        var h = String(headerRow[i] || "").trim();
        if (fn(h)) return i;
      }
    }
    return -1;
  }

  function loadSheet() {
    if (workbookCache) return Promise.resolve(workbookCache);
    var url = csvUrl();
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Could not load staff totals (" + res.status + ").");
        return res.text();
      })
      .then(function (text) {
        var rows = parseCsv(text);
        if (!rows.length) throw new Error("The staff totals export was empty.");
        workbookCache = rows;
        return workbookCache;
      });
  }

  function findBalanceColumn(headerRow) {
    var nameIdx = findColumnIndex(headerRow, [
      function (h) {
        return /^name$/i.test(h);
      },
      function (h) {
        return /username/i.test(h) && /name/i.test(h);
      },
      function (h) {
        return /^user$/i.test(h);
      },
    ]);
    var balIdx = findColumnIndex(headerRow, [
      function (h) {
        return /staff\s*points\s*balance/i.test(h);
      },
      function (h) {
        return /\bsp\b/i.test(h) && /bal/i.test(h);
      },
      function (h) {
        return /balance/i.test(h) && /staff/i.test(h);
      },
    ]);
    return { nameIdx: nameIdx, balanceIdx: balIdx };
  }

  function parsePoints(cell) {
    var n = Number(String(cell || "").replace(/,/g, "").trim());
    return n;
  }

  function lookupBalance(rows, username) {
    var header = rows[0];
    var cols = findBalanceColumn(header);
    if (cols.nameIdx < 0) throw new Error('No "Name" column found in the staff totals sheet.');
    if (cols.balanceIdx < 0) throw new Error('No "Staff Points Balance" column found in the staff totals sheet.');
    var want = normUser(username);
    if (!want) throw new Error("Enter a username to look up.");
    for (var r = 1; r < rows.length; r++) {
      var line = rows[r];
      if (!line || !line.length) continue;
      var nm = line[cols.nameIdx];
      if (normUser(nm) === want) {
        var pts = parsePoints(line[cols.balanceIdx]);
        if (isNaN(pts)) pts = 0;
        return { name: String(nm || "").trim(), balance: pts };
      }
    }
    return null;
  }

  function renderRewards(balance) {
    rewardsBody.innerHTML = "";
    var known = typeof balance === "number" && !isNaN(balance);
    for (var i = 0; i < REWARDS.length; i++) {
      var rw = REWARDS[i];
      var tr = document.createElement("tr");
      var affordable = !known || balance >= rw.cost;
      tr.className = affordable ? "staff-reward-row" : "staff-reward-row is-unaffordable";
      var tdName = document.createElement("td");
      tdName.textContent = rw.name;
      var tdCost = document.createElement("td");
      tdCost.textContent = rw.cost + " SP";
      tr.appendChild(tdName);
      tr.appendChild(tdCost);
      rewardsBody.appendChild(tr);
    }
  }

  function runLookup() {
    clearError();
    balanceWrap.hidden = true;
    setStatus("Loading staff totals…");
    lookupBtn.disabled = true;
    loadSheet()
      .then(function (rows) {
        var found = lookupBalance(rows, userInput.value);
        if (!found) {
          showError("No row matched that username (matching is case-insensitive).");
          renderRewards(null);
          setStatus("");
          return;
        }
        balanceEl.textContent = String(found.balance);
        balanceWrap.hidden = false;
        renderRewards(found.balance);
        setStatus("Showing rewards for " + found.name + ".");
      })
      .catch(function (e) {
        showError(e.message || String(e));
        setStatus("");
        renderRewards(null);
      })
      .then(function () {
        lookupBtn.disabled = false;
      });
  }

  lookupBtn.addEventListener("click", runLookup);
  userInput.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      runLookup();
    }
  });

  window.addEventListener("rmtools-tab", function (ev) {
    if (ev.detail && ev.detail.tab === "staff" && !statusEl.textContent) {
      setStatus("Enter your roster username and choose Look up.");
    }
  });

  renderRewards(null);
  setStatus("Enter your roster username and choose Look up.");
})();
