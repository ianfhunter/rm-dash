(function () {
  function findCopyValue(targetEl) {
    if (!targetEl) return "";
    if ("value" in targetEl) return String(targetEl.value || "");
    return String(targetEl.textContent || "");
  }

  function setButtonCopiedState(btn) {
    var original = btn.dataset.copyLabel || btn.textContent || "Copy";
    btn.dataset.copyLabel = original;
    btn.textContent = "Copied!";
    btn.disabled = true;
    window.setTimeout(function () {
      btn.textContent = original;
      btn.disabled = false;
    }, 1200);
  }

  function copyText(text, targetEl) {
    if (!text) return Promise.resolve(false);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () {
        return true;
      }).catch(function () {
        return false;
      });
    }
    if (targetEl && typeof targetEl.select === "function") {
      targetEl.focus();
      targetEl.select();
      return Promise.resolve(document.execCommand("copy"));
    }
    return Promise.resolve(false);
  }

  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest(".copyable-output-btn");
    if (!btn) return;
    var wrap = btn.closest(".copyable-output");
    if (!wrap) return;
    var selector = wrap.getAttribute("data-copy-target");
    if (!selector) return;
    var target = document.querySelector(selector);
    if (!target) return;
    var text = findCopyValue(target);
    copyText(text, target).then(function (ok) {
      if (ok) setButtonCopiedState(btn);
    });
  });
})();
