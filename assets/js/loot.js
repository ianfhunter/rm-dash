(function () {
  var XLSX_URL = "RMMagicItems.xlsx";
  var PAGE_SIZE = 100;
  var CART_STORAGE_KEY = "rm-loot-cart-v1";

  var budgetInput = document.getElementById("loot-budget");
  var searchBtn = document.getElementById("loot-search");
  var showAllBtn = document.getElementById("loot-show-all");
  var statusEl = document.getElementById("loot-status");
  var errEl = document.getElementById("loot-error");
  var tableWrap = document.getElementById("loot-table-wrap");
  var headerRowEl = document.getElementById("loot-header-row");
  var filterRowEl = document.getElementById("loot-filter-row");
  var tbody = document.getElementById("loot-tbody");
  var pagEl = document.getElementById("loot-pagination");
  var cartList = document.getElementById("loot-cart-list");
  var cartTotalEl = document.getElementById("loot-cart-total");
  var cartClear = document.getElementById("loot-cart-clear");
  var cartCheckout = document.getElementById("loot-cart-checkout");
  var checkoutWrap = document.getElementById("loot-checkout-wrap");
  var checkoutOutput = document.getElementById("loot-checkout-output");

  if (!searchBtn || !budgetInput || !headerRowEl || !filterRowEl || !tbody) return;

  var workbookCache = null;
  var headers = [];
  var costKey = "";
  var budgetFiltered = [];
  var sortCol = "";
  var sortDir = 1;
  var colFilters = {};
  var page = 1;
  var cart = {};
  var nameKey = "";

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

  function parseCost(val) {
    if (val == null || val === "") return NaN;
    var n = Number(String(val).replace(/,/g, "").trim());
    return n;
  }

  function uniqueHeaders(row) {
    var seen = {};
    var out = [];
    for (var i = 0; i < row.length; i++) {
      var raw = row[i];
      var h = raw == null ? "" : String(raw).trim();
      if (!h) h = "Column " + (i + 1);
      var base = h;
      var n = seen[base] || 0;
      seen[base] = n + 1;
      if (n > 0) h = base + " (" + (n + 1) + ")";
      out.push(h);
    }
    return out;
  }

  function findCostKey(hdrs) {
    for (var i = 0; i < hdrs.length; i++) {
      var h = String(hdrs[i]).toLowerCase();
      if (h === "cost (gp)" || /\bcost\b.*\bgp\b/.test(h) || h.replace(/\s/g, "") === "cost(gp)") return hdrs[i];
    }
    return "";
  }

  function findNameKey(hdrs) {
    for (var i = 0; i < hdrs.length; i++) {
      var h = String(hdrs[i]).toLowerCase();
      if (h === "name" || h === "item" || h === "item name") return hdrs[i];
    }
    return hdrs[0] || "";
  }

  function rowToObject(hdrs, arr) {
    var o = {};
    for (var i = 0; i < hdrs.length; i++) {
      o[hdrs[i]] = i < arr.length ? arr[i] : "";
    }
    return o;
  }

  function loadWorkbook() {
    if (workbookCache) return Promise.resolve(workbookCache);
    return fetch(XLSX_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("Could not load " + XLSX_URL + " (" + res.status + ").");
        return res.arrayBuffer();
      })
      .then(function (buf) {
        if (typeof XLSX === "undefined" || !XLSX.read) {
          throw new Error("Spreadsheet library failed to load. Check your network connection.");
        }
        workbookCache = XLSX.read(buf, { type: "array" });
        return workbookCache;
      });
  }

  function buildRowsFromSheet(wb) {
    var name = wb.SheetNames[0];
    var ws = wb.Sheets[name];
    if (!ws) throw new Error("The workbook has no sheets.");
    var aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
    if (!aoa.length) throw new Error("The sheet is empty.");
    var headerRow = aoa[0];
    var visibleColIdx = [];
    var i;
    for (i = 0; i < headerRow.length; i++) {
      var rawH = headerRow[i];
      if (rawH != null && String(rawH).trim() !== "") visibleColIdx.push(i);
    }
    var headerNames = [];
    for (i = 0; i < visibleColIdx.length; i++) {
      headerNames.push(String(headerRow[visibleColIdx[i]]).trim());
    }
    var hdrs = uniqueHeaders(headerNames);
    var ck = findCostKey(hdrs);
    var rows = [];
    for (var r = 1; r < aoa.length; r++) {
      var line = aoa[r];
      if (!line || !line.length) continue;
      var empty = true;
      for (var j = 0; j < line.length; j++) {
        if (String(line[j]).trim() !== "") {
          empty = false;
          break;
        }
      }
      if (empty) continue;
      var cells = [];
      for (i = 0; i < visibleColIdx.length; i++) {
        var ci = visibleColIdx[i];
        cells.push(ci < line.length ? line[ci] : "");
      }
      var obj = rowToObject(hdrs, cells);
      obj._sheetRow = r + 1;
      rows.push(obj);
    }
    return { headers: hdrs, costKey: ck, rows: rows };
  }

  function cellStr(row, key) {
    var v = row[key];
    if (v == null) return "";
    return String(v);
  }

  function matchesFilters(row) {
    var keys = Object.keys(colFilters);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k.charAt(0) === "_") continue;
      var q = colFilters[k];
      if (!q) continue;
      var cell = cellStr(row, k).toLowerCase();
      if (cell.indexOf(q) === -1) return false;
    }
    return true;
  }

  function compareValues(a, b) {
    var sa = a == null ? "" : String(a);
    var sb = b == null ? "" : String(b);
    var na = Number(sa.replace(/,/g, ""));
    var nb = Number(sb.replace(/,/g, ""));
    var aNum = !isNaN(na) && sa.trim() !== "";
    var bNum = !isNaN(nb) && sb.trim() !== "";
    if (aNum && bNum) return na - nb;
    return sa.localeCompare(sb, undefined, { sensitivity: "base" });
  }

  function sortedAndFiltered() {
    var list = budgetFiltered.filter(matchesFilters);
    if (sortCol && headers.indexOf(sortCol) !== -1) {
      list.sort(function (ra, rb) {
        var c = compareValues(ra[sortCol], rb[sortCol]);
        return c * sortDir;
      });
    }
    return list;
  }

  function totalPages(n) {
    return Math.max(1, Math.ceil(n / PAGE_SIZE));
  }

  function renderTable() {
    var data = sortedAndFiltered();
    var tp = totalPages(data.length);
    if (page > tp) page = tp;
    var start = (page - 1) * PAGE_SIZE;
    var slice = data.slice(start, start + PAGE_SIZE);

    headerRowEl.innerHTML = "";
    filterRowEl.innerHTML = "";
    var trh = headerRowEl;
    var trf = filterRowEl;
    for (var i = 0; i < headers.length; i++) {
      var key = headers[i];
      if (key.charAt(0) === "_") continue;
      var th = document.createElement("th");
      th.scope = "col";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "loot-th-btn";
      var label = document.createElement("span");
      label.textContent = key;
      btn.appendChild(label);
      if (sortCol === key) {
        var ind = document.createElement("span");
        ind.className = "loot-sort-ind";
        ind.textContent = sortDir > 0 ? " ▲" : " ▼";
        ind.setAttribute("aria-hidden", "true");
        btn.appendChild(ind);
      }
      btn.addEventListener(
        "click",
        (function (col) {
          return function () {
            if (sortCol === col) sortDir = -sortDir;
            else {
              sortCol = col;
              sortDir = 1;
            }
            page = 1;
            renderTable();
          };
        })(key)
      );
      th.appendChild(btn);
      trh.appendChild(th);

      var thf = document.createElement("th");
      var inp = document.createElement("input");
      inp.type = "search";
      inp.className = "loot-filter-input";
      inp.placeholder = "Filter…";
      inp.setAttribute("aria-label", "Filter " + key);
      inp.value = colFilters[key] || "";
      inp.addEventListener(
        "input",
        (function (col) {
          return function (evt) {
            var source = evt && evt.target ? evt.target : this;
            var v = source && source.value ? source.value.trim().toLowerCase() : "";
            if (v) colFilters[col] = v;
            else delete colFilters[col];
            page = 1;
            renderTable();
          };
        })(key)
      );
      thf.appendChild(inp);
      trf.appendChild(thf);
    }
    var thAct = document.createElement("th");
    thAct.className = "loot-actions-head";
    thAct.textContent = "Cart";
    trh.appendChild(thAct);
    var thActF = document.createElement("th");
    thActF.className = "loot-actions-head";
    thActF.textContent = "";
    trf.appendChild(thActF);
    tbody.innerHTML = "";
    for (var r = 0; r < slice.length; r++) {
      var row = slice[r];
      var tr = document.createElement("tr");
      for (var c = 0; c < headers.length; c++) {
        var k = headers[c];
        if (k.charAt(0) === "_") continue;
        var td = document.createElement("td");
        var text = cellStr(row, k);
        if (/^https?:\/\//i.test(text)) {
          var a = document.createElement("a");
          a.href = text;
          a.textContent = text.length > 48 ? text.slice(0, 45) + "…" : text;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          td.appendChild(a);
        } else {
          td.textContent = text;
        }
        tr.appendChild(td);
      }
      var id = String(row._sheetRow);
      var actTd = document.createElement("td");
      actTd.className = "loot-actions-cell";
      var buyBtn = document.createElement("button");
      buyBtn.type = "button";
      buyBtn.className = "btn ghost loot-add-btn";
      buyBtn.textContent = "Buy";
      buyBtn.addEventListener(
        "click",
        (function (copy, rid) {
          return function () {
            addToCart(rid, copy, "buy");
          };
        })(JSON.parse(JSON.stringify(row)), id)
      );
      actTd.appendChild(buyBtn);
      var sellBtn = document.createElement("button");
      sellBtn.type = "button";
      sellBtn.className = "btn ghost loot-add-btn loot-add-btn-sell";
      sellBtn.textContent = "Sell (½)";
      sellBtn.addEventListener(
        "click",
        (function (copy, rid) {
          return function () {
            addToCart(rid, copy, "sell");
          };
        })(JSON.parse(JSON.stringify(row)), id)
      );
      actTd.appendChild(sellBtn);
      tr.appendChild(actTd);
      tbody.appendChild(tr);
    }

    pagEl.hidden = data.length === 0;
    if (!pagEl.hidden) {
      pagEl.innerHTML =
        '<div class="loot-pag-info">Showing ' +
        (data.length ? start + 1 : 0) +
        "–" +
        Math.min(start + PAGE_SIZE, data.length) +
        " of " +
        data.length +
        '</div><div class="loot-pag-buttons">' +
        '<button type="button" class="btn ghost" id="loot-pag-prev">Previous</button>' +
        '<span class="loot-pag-meta">Page ' +
        page +
        " of " +
        tp +
        '</span>' +
        '<button type="button" class="btn ghost" id="loot-pag-next">Next</button></div>';
      var prev = document.getElementById("loot-pag-prev");
      var next = document.getElementById("loot-pag-next");
      prev.disabled = page <= 1;
      next.disabled = page >= tp;
      prev.addEventListener("click", function () {
        if (page > 1) {
          page--;
          renderTable();
        }
      });
      next.addEventListener("click", function () {
        if (page < tp) {
          page++;
          renderTable();
        }
      });
    }

    tableWrap.hidden = false;
  }

  function cartCost(row) {
    if (!costKey) return 0;
    var n = parseCost(row[costKey]);
    return isNaN(n) ? 0 : n;
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {}
  }

  function loadCart() {
    try {
      var raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) cart = JSON.parse(raw) || {};
    } catch (e) {
      cart = {};
    }
  }

  function toPriceText(n) {
    return String(Math.round(n * 100) / 100);
  }

  function addToCart(id, row, mode) {
    var cartId = id + ":" + mode;
    if (!cart[cartId]) cart[cartId] = { row: row, mode: mode, qty: 0 };
    cart[cartId].row = row;
    cart[cartId].mode = mode || "buy";
    cart[cartId].qty = (cart[cartId].qty || 0) + 1;
    saveCart();
    renderCart();
  }

  function removeFromCart(id) {
    delete cart[id];
    saveCart();
    renderCart();
    if (tableWrap && !tableWrap.hidden) renderTable();
  }

  function changeCartQty(id, delta) {
    var entry = cart[id];
    if (!entry) return;
    var nextQty = (Number(entry.qty) || 1) + delta;
    if (nextQty <= 0) {
      removeFromCart(id);
      return;
    }
    entry.qty = nextQty;
    saveCart();
    renderCart();
  }

  function clearCart() {
    cart = {};
    saveCart();
    renderCart();
    if (tableWrap && !tableWrap.hidden) renderTable();
  }

  function normalizeCartEntry(id, entry) {
    if (!entry || !entry.row) return null;
    if (!entry.mode) entry.mode = id.indexOf(":sell") !== -1 ? "sell" : "buy";
    entry.qty = Number(entry.qty) || 1;
    return entry;
  }

  function buildCheckoutMarkdown(ids) {
    var buying = [];
    var selling = [];
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var entry = normalizeCartEntry(id, cart[id]);
      if (!entry) continue;
      var rw = entry.row;
      var nk = nameKey || headers[0] || "";
      var name = nk ? cellStr(rw, nk) : "";
      if (!name) name = "Item";
      var qty = entry.qty || 1;
      var baseCost = cartCost(rw);
      if (entry.mode === "sell") selling.push("- " + name + " x(" + qty + ") +" + toPriceText((baseCost * qty) / 2));
      else buying.push("- " + name + " x(" + qty + ") -" + toPriceText(baseCost * qty));
    }
    var out = [];
    if (buying.length) out.push("**Buying**\n" + buying.join("\n"));
    if (selling.length) out.push("**Selling**\n" + selling.join("\n"));
    return out.join("\n\n");
  }

  function renderCart() {
    cartList.innerHTML = "";
    var ids = Object.keys(cart);
    var sum = 0;
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var entry = normalizeCartEntry(id, cart[id]);
      if (!entry) continue;
      var rw = entry.row;
      var nk = nameKey || headers[0] || "";
      var name = nk ? cellStr(rw, nk) : "";
      if (!name) name = "Item";
      var qty = entry.qty || 1;
      var mode = entry.mode === "sell" ? "sell" : "buy";
      var lineTotal = (mode === "sell" ? -cartCost(rw) / 2 : cartCost(rw)) * qty;
      sum += lineTotal;
      var li = document.createElement("li");
      li.className = "loot-cart-item";
      var info = document.createElement("div");
      info.className = "loot-cart-item-info";
      var title = document.createElement("p");
      title.className = "loot-cart-item-name";
      title.textContent = name + " × " + qty;
      var meta = document.createElement("p");
      meta.className = "loot-cart-item-meta";
      meta.textContent = (mode === "sell" ? "Selling" : "Buying") + " · " + (mode === "sell" ? "+" : "-") + toPriceText(Math.abs(lineTotal)) + " gp";
      info.appendChild(title);
      info.appendChild(meta);
      var controls = document.createElement("div");
      controls.className = "loot-cart-item-controls";
      var decBtn = document.createElement("button");
      decBtn.type = "button";
      decBtn.className = "btn ghost loot-cart-qty-btn";
      decBtn.setAttribute("aria-label", "Decrease quantity for " + name);
      decBtn.textContent = "−";
      decBtn.addEventListener(
        "click",
        (function (rid) {
          return function () {
            changeCartQty(rid, -1);
          };
        })(id)
      );
      var incBtn = document.createElement("button");
      incBtn.type = "button";
      incBtn.className = "btn ghost loot-cart-qty-btn";
      incBtn.setAttribute("aria-label", "Increase quantity for " + name);
      incBtn.textContent = "+";
      incBtn.addEventListener(
        "click",
        (function (rid) {
          return function () {
            changeCartQty(rid, 1);
          };
        })(id)
      );
      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "btn ghost loot-cart-remove";
      rm.setAttribute("aria-label", "Remove " + name);
      rm.textContent = "×";
      rm.addEventListener(
        "click",
        (function (rid) {
          return function () {
            removeFromCart(rid);
          };
        })(id)
      );
      controls.appendChild(decBtn);
      controls.appendChild(incBtn);
      controls.appendChild(rm);
      li.appendChild(info);
      li.appendChild(controls);
      cartList.appendChild(li);
    }
    cartTotalEl.textContent = toPriceText(sum);
    if (checkoutWrap && checkoutOutput) {
      checkoutOutput.value = buildCheckoutMarkdown(ids);
      checkoutWrap.hidden = !checkoutOutput.value;
    }
  }

  function runSearch(opts) {
    var showAll = !!(opts && opts.showAll);
    clearError();
    var budget = Number(budgetInput.value);
    if (!showAll && (budgetInput.value.trim() === "" || isNaN(budget) || budget < 0)) {
      showError("Enter a valid budget (0 or more gold pieces).");
      return;
    }
    setStatus("Loading spreadsheet…");
    searchBtn.disabled = true;
    if (showAllBtn) showAllBtn.disabled = true;
    loadWorkbook()
      .then(function (wb) {
        var built = buildRowsFromSheet(wb);
        headers = built.headers;
        costKey = built.costKey;
        nameKey = findNameKey(headers);
        if (!costKey) throw new Error('No "Cost (GP)" column found in the first row of the sheet.');
        var ck = costKey;
        budgetFiltered = built.rows.filter(function (row) {
          var c = parseCost(row[ck]);
          if (isNaN(c)) return false;
          return showAll || c <= budget;
        });
        sortCol = headers[0] || "";
        sortDir = 1;
        colFilters = {};
        page = 1;
        if (showAll) {
          budgetInput.value = "";
          setStatus("Showing all " + budgetFiltered.length + " items.");
        } else {
          setStatus("Found " + budgetFiltered.length + " items within " + budget + " gp.");
        }
        renderTable();
      })
      .catch(function (e) {
        showError(e.message || String(e));
        setStatus("");
        tableWrap.hidden = true;
      })
      .then(function () {
        searchBtn.disabled = false;
        if (showAllBtn) showAllBtn.disabled = false;
      });
  }

  searchBtn.addEventListener("click", function () {
    runSearch({ showAll: false });
  });
  if (showAllBtn) {
    showAllBtn.addEventListener("click", function () {
      runSearch({ showAll: true });
    });
  }

  cartClear.addEventListener("click", clearCart);
  if (cartCheckout && checkoutWrap && checkoutOutput) {
    cartCheckout.addEventListener("click", function () {
      var md = checkoutOutput.value || "";
      checkoutWrap.hidden = !md;
      if (!md) return;
      checkoutOutput.focus();
      checkoutOutput.select();
      try {
        navigator.clipboard.writeText(md).catch(function () {});
      } catch (e) {}
    });
  }

  loadCart();
  renderCart();
  setStatus("Enter a budget and choose Search to load the catalog from the spreadsheet.");
})();
