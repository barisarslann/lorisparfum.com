class LorisStickyCart extends HTMLElement {
  connectedCallback() {
    this.onClick = this.onClick.bind(this);
    this.addEventListener('click', this.onClick);
    this.sync();
    this.timer = window.setInterval(() => this.sync(), 300);
  }

  disconnectedCallback() {
    window.clearInterval(this.timer);
    this.removeEventListener('click', this.onClick);
    this.form?.classList.remove('loris-sticky-source');
  }

  sync() {
    this.form = document.getElementById(this.dataset.formId);
    this.originalButton = this.form?.querySelector('button[name="add"]');
    if (!this.originalButton) {
      this.removeAttribute('data-ready');
      return;
    }
    this.setAttribute('data-ready', '');
    this.form.classList.add('loris-sticky-source');
    const drawerOpen = document.querySelector('cart-drawer[open]') ||
      /overflow-hidden|drawer-open|cart-open|cart-active|page-overlay-cart-on|quick-buy-page-overlay|menu-open/.test(document.body.className) ||
      document.documentElement.classList.contains('overflow-hidden');
    this.style.opacity = drawerOpen ? '0' : '1';
    this.style.visibility = drawerOpen ? 'hidden' : 'visible';
    this.style.pointerEvents = drawerOpen ? 'none' : 'auto';

    const button = this.querySelector('[data-action="submit"]');
    button.disabled = this.originalButton.disabled || this.originalButton.getAttribute('aria-disabled') === 'true';
    const label = this.originalButton.querySelector('.wt-btn__label span')?.textContent.trim();
    if (label && button.textContent !== label) button.textContent = label;
    const errorWrapper = this.form.closest('product-form')?.querySelector('.product-form__error-message-wrapper');
    const errorText = errorWrapper && !errorWrapper.hidden ? errorWrapper.querySelector('.product-form__error-message')?.textContent.trim() || '' : '';
    const error = this.querySelector('.loris-sticky-error');
    error.hidden = !errorText;
    if (error.textContent !== errorText) error.textContent = errorText;
    const quantity = this.form.elements.namedItem('quantity');
    if (quantity) this.querySelector('.wt-sticky-qty-val').value = quantity.value;

    const price = document.getElementById(`price-${this.dataset.sectionId}`)?.querySelector('.price');
    if (!price) return;
    const priceText = price.querySelector(price.classList.contains('price--on-sale') ? '.price-item--sale' : '.price__regular .price-item--regular')?.textContent.trim();
    const display = this.querySelector('.wt-sticky-price-display');
    if (priceText && display.textContent !== priceText) display.textContent = priceText;

    const parts = (this.dataset.shippingThreshold || '').split('|');
    const currencyPart = parts.find(part => part.split(':')[0].trim() === this.dataset.currency);
    const threshold = Number(currencyPart ? currencyPart.split(':')[1] : parts[0]);
    const cents = Number(price.dataset.priceAmount);
    const shipping = this.querySelector('.wt-sticky-ship-info');
    const locale = document.documentElement.lang || 'tr';
    shipping.hidden = !Number.isFinite(cents) || !Number.isFinite(threshold) || threshold <= 0;
    if (!shipping.hidden) {
      const remaining = Math.max(0, threshold * 100 - cents);
      const money = new Intl.NumberFormat(locale, { style: 'currency', currency: this.dataset.currency || 'TRY' }).format(remaining / 100);
      const tr = locale.startsWith('tr'), ar = locale.startsWith('ar');
      const text = remaining === 0
        ? (tr ? '🎉 Üründe Kargo Bedava Hakkı Kazandınız!' : ar ? '🎉 لقد حصلت على شحن مجاني!' : '🎉 This product qualifies for free shipping!')
        : (tr ? `Kargo Bedava için ${money} daha ekle!` : ar ? `أضف ${money} للحصول على شحن مجاني` : `Add ${money} more for free shipping!`);
      if (shipping.textContent !== text) shipping.textContent = text;
      shipping.style.color = remaining === 0 ? '#2ecc71' : '#333';
    }
  }

  onClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button || !this.contains(button)) return;
    const action = button.dataset.action;
    if (action === 'minimize' || action === 'expand') {
      const minimized = action === 'minimize';
      this.classList.toggle('sticky-minimized', minimized);
      this.querySelector('#wt-sticky-top').hidden = minimized;
      this.querySelector(minimized ? '[data-action="expand"]' : '[data-action="minimize"]').focus();
      return;
    }
    this.sync();
    if (!this.form || !this.originalButton) return;
    if (action === 'submit') {
      if (!button.disabled) this.originalButton.click();
      this.sync();
      return;
    }
    let quantity = this.form.elements.namedItem('quantity');
    if (!quantity) {
      quantity = document.createElement('input');
      quantity.type = 'hidden';
      quantity.name = 'quantity';
      quantity.value = '1';
      this.form.appendChild(quantity);
    }
    const min = Number(quantity.min) || 1, max = Number(quantity.max) || 999;
    const step = Number(quantity.step) || 1;
    quantity.value = Math.max(min, Math.min(max, (Number(quantity.value) || min) + (action === 'increase' ? step : -step)));
    quantity.dispatchEvent(new Event('change', { bubbles: true }));
    this.sync();
  }
}

if (!customElements.get('loris-sticky-cart')) customElements.define('loris-sticky-cart', LorisStickyCart);
