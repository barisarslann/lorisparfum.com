class LorisGiftOptions extends HTMLElement {
  connectedCallback() {
    this.onChange = this.onChange.bind(this);
    this.addEventListener('change', this.onChange);
    const drawer = this.closest('cart-drawer');
    if (drawer) this.querySelectorAll('input').forEach(input => { input.tabIndex = drawer.hasAttribute('open') ? 0 : -1; });
    this.setAttribute('data-ready', '');
  }

  disconnectedCallback() {
    this.removeEventListener('change', this.onChange);
  }

  async request(endpoint, body) {
    const response = await fetch(`${window.Shopify.routes.root}${endpoint}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.description || this.dataset.error);
    return result;
  }

  async refreshDrawer(drawer) {
    const ids = drawer.getSectionsToRender().map(section => section.id);
    const sections = await this.request(`?sections=${ids.join(',')}`);
    if (ids.some(id => !sections[id])) throw new Error(this.dataset.error);
    drawer.renderContents({ sections }, false);
  }

  async onChange(event) {
    const checkbox = event.target;
    if (!checkbox.matches('input[type="checkbox"]')) return;
    const drawer = this.closest('cart-drawer');
    if (!drawer || drawer.hasAttribute('aria-busy')) return;

    const selectedId = checkbox.checked ? Number(checkbox.value) : null;
    const giftIds = [...this.querySelectorAll('input')].map(input => Number(input.value));
    const blockInteraction = event => {
      if (event.target.closest('.wt-cart__drawer__close')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    drawer.setAttribute('aria-busy', 'true');
    drawer.addEventListener('click', blockInteraction, true);
    drawer.addEventListener('submit', blockInteraction, true);
    drawer.addEventListener('change', blockInteraction, true);
    this.querySelector('fieldset').disabled = true;
    this.querySelector('[role="alert"]').hidden = true;
    let errorMessage = '';

    try {
      let cart = await this.request('cart.js');
      // Add first: an unavailable replacement must not remove the existing gift.
      if (selectedId && !cart.items.some(item => item.variant_id === selectedId)) {
        await this.request('cart/add.js', { items: [{ id: selectedId, quantity: 1 }] });
        cart = await this.request('cart.js');
      }
      const updates = {};
      let keptSelected = false;
      for (const item of cart.items) {
        if (!giftIds.includes(item.variant_id)) continue;
        const quantity = item.variant_id === selectedId && !keptSelected ? 1 : 0;
        if (quantity) keptSelected = true;
        if (item.quantity !== quantity) updates[item.key] = quantity;
      }
      if (Object.keys(updates).length) await this.request('cart/update.js', { updates });
    } catch (error) {
      errorMessage = error.message || this.dataset.error;
    }

    try {
      // Re-render totals, cart count and gift checks from Shopify's actual cart.
      await this.refreshDrawer(drawer);
    } catch (error) {
      // A failed section refresh must not leave checkout showing stale totals.
      window.location.assign(window.routes.cart_url);
      return;
    } finally {
      drawer.removeAttribute('aria-busy');
      drawer.removeEventListener('click', blockInteraction, true);
      drawer.removeEventListener('submit', blockInteraction, true);
      drawer.removeEventListener('change', blockInteraction, true);
      const fieldset = drawer.querySelector('loris-gift-options fieldset');
      if (fieldset) fieldset.disabled = false;
    }
    const current = drawer.querySelector('loris-gift-options');
    if (errorMessage && current) {
      const message = current.querySelector('[role="alert"]');
      message.textContent = errorMessage;
      message.hidden = false;
    }
    current?.querySelector(`input[value="${checkbox.value}"]`)?.focus();
  }
}

if (!customElements.get('loris-gift-options')) customElements.define('loris-gift-options', LorisGiftOptions);
