class CartServiceCheckbox extends HTMLElement {
  connectedCallback() {
    this.variantId = this.dataset.productId;
    if (!this.variantId) return;

    this.handleChange = this.handleChange.bind(this);
    this.addEventListener("change", this.handleChange);
  }

  disconnectedCallback() {
    this.removeEventListener("change", this.handleChange);
  }

  async handleChange(event) {
    if (!event.target || event.target.type !== "checkbox") return;

    const shouldAdd = event.target.checked;
    this.setLoading(true);

    try {
      if (shouldAdd) {
        await this.addProduct();
      } else {
        await this.removeProduct();
      }
      await this.refreshCart();
    } catch (err) {
      console.error("[cart-service-checkbox]", err);
      const checkbox = this.querySelector('input[type="checkbox"]');
      if (checkbox) checkbox.checked = !shouldAdd;
    } finally {
      this.setLoading(false);
    }
  }

  async addProduct() {
    const response = await fetch(`${window.Shopify.routes.root}cart/add.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        items: [{ id: parseInt(this.variantId, 10), quantity: 1 }],
      }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.description || "Add to cart failed");
    }
    return response.json();
  }

  async removeProduct() {
    const cartResponse = await fetch(`${window.Shopify.routes.root}cart.js`);
    const cart = await cartResponse.json();
    const variantId = parseInt(this.variantId, 10);

    const matchingLines = [];
    cart.items.forEach((item, idx) => {
      if (item.id === variantId || item.variant_id === variantId) {
        matchingLines.push(idx + 1);
      }
    });

    if (matchingLines.length === 0) return;

    matchingLines.sort((a, b) => b - a);
    for (const line of matchingLines) {
      await fetch(`${window.Shopify.routes.root}cart/change.js`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ line, quantity: 0 }),
      });
    }
  }

  async refreshCart() {
    const cartDrawer = document.querySelector("cart-drawer");
    if (cartDrawer && typeof cartDrawer.refreshCartDrawer === "function") {
      cartDrawer.refreshCartDrawer();
    }

    const cartItemsEl = document.getElementById("main-cart-items");
    const cartFooterEl = document.getElementById("main-cart-footer");

    if (cartItemsEl || cartFooterEl) {
      const sectionIds = [];
      if (cartItemsEl?.dataset.id) sectionIds.push(cartItemsEl.dataset.id);
      if (cartFooterEl?.dataset.id) sectionIds.push(cartFooterEl.dataset.id);
      sectionIds.push("cart-icon-bubble");

      try {
        const response = await fetch(
          `${window.Shopify.routes.root}?sections=${sectionIds.join(",")}`,
        );
        const data = await response.json();

        const targets = [
          {
            key: cartItemsEl?.dataset.id,
            el: cartItemsEl,
            selector: ".js-contents",
          },
          {
            key: cartFooterEl?.dataset.id,
            el: cartFooterEl,
            selector: ".js-contents",
          },
          {
            key: "cart-icon-bubble",
            el: document.getElementById("shopify-section-cart-icon-bubble"),
            selector: ".shopify-section",
          },
        ];

        targets.forEach((target) => {
          if (!target.key || !target.el || !data[target.key]) return;
          const parsed = new DOMParser().parseFromString(data[target.key], "text/html");
          const incoming = parsed.querySelector(target.selector);
          const existing = target.el.querySelector(target.selector);
          if (incoming && existing) {
            existing.innerHTML = incoming.innerHTML;
          }
        });
      } catch (err) {
        console.error("[cart-service-checkbox] section refresh", err);
      }
    }

    if (typeof publish === "function" && typeof PUB_SUB_EVENTS !== "undefined") {
      publish(PUB_SUB_EVENTS.cartUpdate, { source: "cart-service-checkbox" });
    }
  }

  setLoading(loading) {
    const loader = this.querySelector(".wt-cart__checkbox__loader");
    if (loader) loader.classList.toggle("hidden", !loading);
    const checkbox = this.querySelector('input[type="checkbox"]');
    if (checkbox) checkbox.disabled = loading;
    this.classList.toggle("wt-cart__checkbox--loading", loading);
  }
}

if (!customElements.get("cart-service-checkbox")) {
  customElements.define("cart-service-checkbox", CartServiceCheckbox);
}
