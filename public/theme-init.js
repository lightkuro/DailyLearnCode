// Applies the saved theme before first paint so the page doesn't flash the wrong theme.
// Light is the default (older saves that still had the old default, "system", count as light).
(function () {
  var pref = 'light';
  try {
    var saved = JSON.parse(localStorage.getItem('learn:v1') || 'null');
    var theme = saved && saved.state && saved.state.settings && saved.state.settings.theme;
    if (theme && !(theme === 'system' && (saved.version || 0) < 2)) pref = theme;
  } catch (e) {
    /* storage blocked */
  }
  var light = pref === 'light' || (pref === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
})();
