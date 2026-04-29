(function () {
  var subtabButtons = document.querySelectorAll('[data-avrae-subtab]');
  var panes = document.querySelectorAll('[data-avrae-pane]');

  if (!subtabButtons.length || !panes.length) return;

  function activate(name) {
    subtabButtons.forEach(function (btn) {
      var on = btn.getAttribute('data-avrae-subtab') === name;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    panes.forEach(function (pane) {
      var on = pane.getAttribute('data-avrae-pane') === name;
      pane.classList.toggle('is-active', on);
      pane.hidden = !on;
    });
  }

  subtabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activate(btn.getAttribute('data-avrae-subtab'));
    });
  });
})();
