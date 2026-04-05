(function() {
  function dismiss() {
    var el = document.getElementById('boot-loader');
    if (!el || !el.parentNode) return;
    el.classList.add('hide');
    setTimeout(function() { if (el.parentNode) el.remove(); }, 400);
  }
  window.addEventListener('webgl-ready', dismiss);
  // Safety: force-remove after 4s even if React never hydrates
  setTimeout(dismiss, 4000);
})();
