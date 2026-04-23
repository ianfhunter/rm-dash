(function () {
  var tabs = document.querySelectorAll('.tab');
  var brandHome = document.getElementById('brand-home');
  var landingTiles = document.querySelectorAll('[data-open-tab]');
  var panels = {
    home: document.getElementById('panel-home'),
    boopsum: document.getElementById('panel-boopsum'),
    loot: document.getElementById('panel-loot'),
    staff: document.getElementById('panel-staff'),
    questinfo: document.getElementById('panel-questinfo'),
    avrae: document.getElementById('panel-avrae'),
    links: document.getElementById('panel-links'),
  };

  function activate(name) {
    document.body.classList.toggle('tab-wide', name === 'loot' || name === 'avrae');
    document.body.classList.toggle('is-home', name === 'home');
    tabs.forEach(function (btn) {
      var on = btn.dataset.tab === name;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    Object.keys(panels).forEach(function (key) {
      var panel = panels[key];
      if (!panel) return;
      var on = key === name;
      panel.classList.toggle('is-active', on);
      panel.hidden = !on;
    });
    window.dispatchEvent(new CustomEvent('rmtools-tab', { detail: { tab: name } }));
  }

  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activate(btn.dataset.tab);
    });
  });

  if (brandHome) {
    brandHome.addEventListener('click', function () {
      activate('home');
    });
  }

  landingTiles.forEach(function (tile) {
    tile.addEventListener('click', function () {
      activate(tile.dataset.openTab);
    });
  });

  activate('home');
})();
