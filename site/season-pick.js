// Runs in <head> before the page paints: picks the season from the date
// (or ?season=spring|summer|autumn|winter to preview one) and its favicon.
(() => {
  const names = ["winter", "spring", "summer", "autumn"];
  const asked = new URLSearchParams(location.search).get("season");
  const season = names.includes(asked) ? asked : names[Math.floor(((new Date().getMonth() + 1) % 12) / 3)];
  document.documentElement.dataset.season = season;
  const icon = document.querySelector('link[rel="icon"]');
  if (icon) icon.href = `/favicon-${season}.svg`;
})();
