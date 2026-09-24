(() => {
  if (window.__cartCheckboxListenerAdded) return;
  window.__cartCheckboxListenerAdded = true;

  document.addEventListener("change", (e) => {
    if (!e.target || e.target.id !== "cart_additional_checkbox") return;

    const isChecked = e.target.checked;
    const label = e.target.dataset.label;
    if (!label) return;

    const body = JSON.stringify({ attributes: { [label]: isChecked } });
    fetch(window.routes.cart_update_url, { ...fetchConfig(), body });
  });
})();
