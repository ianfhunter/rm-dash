(function () {
  var tabs = document.querySelectorAll(".tab");
  var panels = {
    boopsum: document.getElementById("panel-boopsum"),
    loot: document.getElementById("panel-loot"),
    staff: document.getElementById("panel-staff"),
    questinfo: document.getElementById("panel-questinfo"),
    avrae: document.getElementById("panel-avrae"),
  };

  function activate(name) {
    document.body.classList.toggle("tab-wide", name === "loot" || name === "avrae");
    tabs.forEach(function (btn) {
      var on = btn.dataset.tab === name;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    Object.keys(panels).forEach(function (key) {
      var panel = panels[key];
      if (!panel) return;
      var on = key === name;
      panel.classList.toggle("is-active", on);
      panel.hidden = !on;
    });
    window.dispatchEvent(new CustomEvent("rmtools-tab", { detail: { tab: name } }));
  }

  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      activate(btn.dataset.tab);
    });
  });
})();
