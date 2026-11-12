// The 404 page is served for any missing path, so the prompt shows which one
const target = document.querySelector("[data-missing-path]");
if (target !== null) {
  try {
    target.textContent = decodeURIComponent(location.pathname);
  } catch {
    // A malformed escape in the URL; show it as it was typed
    target.textContent = location.pathname;
  }
}
