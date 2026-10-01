class CartAdditionalFeatures extends HTMLElement {
  // CSS selector for things we consider focusable inside a panel —
  // used by the focus trap when this component runs in 'drawer' (modal) context.
  static FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  connectedCallback() {
    this.triggers = this.querySelectorAll(".wt-cart-features__trigger");
    this.drawers = this.querySelectorAll(".wt-cart-features__drawer");
    this.overlay = this.querySelector("[data-overlay]");
    this.closeButtons = this.querySelectorAll("[data-close]");
    this.context = this.dataset.context || "page";
    this.shopCurrency = this.dataset.shopCurrency || "";
    this.lastTrigger = null;

    // i18n strings — provided by the snippet via `data-i18n-*` attributes.
    // English fallbacks here mean the component still works if the
    // attributes are missing (e.g. older cached HTML). Convention:
    // hyphenated `data-i18n-foo-bar` becomes `dataset.i18nFooBar`.
    const ds = this.dataset;
    this.strings = {
      shippingSelect: ds.i18nShippingSelect || "Please select a country and enter a postal code.",
      shippingCalculating: ds.i18nShippingCalculating || "Calculating…",
      shippingNoRate: ds.i18nShippingNoRate || "There is no shipping rate for this destination. Try to check the address.",
      shippingOneRate: ds.i18nShippingOneRate || "There is one shipping rate for this destination:",
      // n-rates template uses `__COUNT__` as a placeholder; we substitute at use site.
      shippingNRatesTpl: ds.i18nShippingNRates || "There are __COUNT__ shipping rates for this destination:",
      shippingFree: ds.i18nShippingFree || "Free",
      discountEnter: ds.i18nDiscountEnter || "Please enter a discount code.",
      discountApplying: ds.i18nDiscountApplying || "Applying…",
      discountApplied: ds.i18nDiscountApplied || "Discount applied!",
      discountInvalid: ds.i18nDiscountInvalid || "Discount code is invalid or does not apply to the current cart.",
      discountError: ds.i18nDiscountError || "Something went wrong. Please try again.",
    };

    this.onTriggerClick = this.onTriggerClick.bind(this);
    this.closeAll = this.closeAll.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);

    this.triggers.forEach((t) => t.addEventListener("click", this.onTriggerClick));
    this.closeButtons.forEach((b) => b.addEventListener("click", this.closeAll));
    if (this.overlay) this.overlay.addEventListener("click", this.closeAll);
    this.addEventListener("keydown", this.onKeyDown);

    // a11y: collapsed panels must not be focusable. `max-height: 0;
    // overflow: hidden;` (desktop accordion) and `transform: translateY(100%)`
    // (mobile/cart-drawer slide-up) both hide visually but leave children
    // tab-reachable — `inert` removes them from the a11y tree + tab order.
    this.drawers.forEach((d) => {
      if (!d.hasAttribute("open")) d.setAttribute("inert", "");
    });

    this.initNote();
    this.initShipping();
    this.initDiscount();
  }

  disconnectedCallback() {
    this.removeEventListener("keydown", this.onKeyDown);
  }

  // ── Drawer toggling ─────────────────────────────────────────
  onTriggerClick(event) {
    const trigger = event.currentTarget;
    const feature = trigger.dataset.feature;
    const drawer = this.querySelector(`.wt-cart-features__drawer[data-drawer="${feature}"]`);

    // Toggle: clicking an already-open trigger collapses everything.
    // Used by the desktop accordion (cart-page ≥900px) so a second
    // click closes the panel; mobile slide-up behaves the same way.
    if (drawer && drawer.hasAttribute("open")) {
      this.closeAll();
      return;
    }

    this.openDrawer(feature);
  }

  openDrawer(feature) {
    this.closeAll();

    const drawer = this.querySelector(`.wt-cart-features__drawer[data-drawer="${feature}"]`);
    if (!drawer) return;

    const trigger = this.querySelector(`.wt-cart-features__trigger[data-feature="${feature}"]`);
    // Remember which trigger opened the panel so we can return focus
    // to it on close (a11y: don't drop focus to <body>).
    this.lastTrigger = trigger || null;

    drawer.setAttribute("open", "");
    drawer.removeAttribute("inert");
    if (trigger) {
      trigger.classList.add("wt-cart-features__trigger--open");
      trigger.setAttribute("aria-expanded", "true");
    }
    this.overlay?.setAttribute("open", "");
    this.classList.add("wt-cart-features--open");

    // Modal contexts (cart drawer slide-up): move focus into the panel
    // so it ends up inside the focus trap. The desktop cart-page
    // accordion keeps focus on the trigger so the trigger row reads
    // naturally as the heading.
    if (this.context === "drawer") {
      const firstField = drawer.querySelector(CartAdditionalFeatures.FOCUSABLE_SELECTOR);
      if (firstField) setTimeout(() => firstField.focus(), 50);
    }
  }

  closeAll() {
    const wasOpen = this.classList.contains("wt-cart-features--open");

    this.drawers.forEach((d) => {
      d.removeAttribute("open");
      // Re-disable interaction + tab order on every collapsed panel.
      d.setAttribute("inert", "");
    });
    this.triggers.forEach((t) => {
      t.classList.remove("wt-cart-features__trigger--open");
      t.setAttribute("aria-expanded", "false");
    });
    this.overlay?.removeAttribute("open");
    this.classList.remove("wt-cart-features--open");

    // Return focus to the trigger that opened the panel (a11y: keyboard
    // user shouldn't be dumped to <body>). Only do this if we were
    // genuinely closing something — avoid stealing focus on initial render.
    if (wasOpen && this.lastTrigger) {
      this.lastTrigger.focus();
    }
    this.lastTrigger = null;
  }

  onKeyDown(event) {
    if (!this.classList.contains("wt-cart-features--open")) return;

    if (event.key === "Escape") {
      this.closeAll();
      return;
    }

    // Focus trap — only meaningful in 'drawer' context where the panel is
    // a real modal (`role="dialog" aria-modal="true"`). On the cart page
    // the panel is an inline accordion / region, no trap needed.
    if (event.key === "Tab" && this.context === "drawer") {
      const openDrawer = this.querySelector(".wt-cart-features__drawer[open]");
      if (!openDrawer) return;

      const focusable = Array.from(
        openDrawer.querySelectorAll(CartAdditionalFeatures.FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !openDrawer.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  // ── Order note ──────────────────────────────────────────────
  initNote() {
    const textarea = this.querySelector("[data-note-textarea]");
    const saveBtn = this.querySelector("[data-note-save]");
    if (!textarea || !saveBtn) return;

    saveBtn.addEventListener("click", async () => {
      saveBtn.disabled = true;
      try {
        const response = await fetch(`${window.Shopify.routes.root}cart/update.js`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ note: textarea.value }),
        });
        if (!response.ok) throw new Error("Failed to save note");
        this.closeAll();
      } catch (err) {
        console.error("[cart-features note]", err);
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  // ── Estimate Shipping ───────────────────────────────────────
  initShipping() {
    const submit = this.querySelector("[data-shipping-submit]");
    if (!submit) return;

    this.shippingSubmit = submit;
    this.shippingResult = this.querySelector("[data-shipping-result]");
    this.shippingCountry = this.querySelector("[data-shipping-country]");
    this.shippingZip = this.querySelector("[data-shipping-zip]");

    submit.addEventListener("click", this.onShippingSubmit.bind(this));
  }

  async onShippingSubmit() {
    const country = this.shippingCountry?.value || "";
    const zip = this.shippingZip?.value.trim() || "";

    if (!country || !zip) {
      this.renderShippingResult(this.strings.shippingSelect, "error");
      return;
    }

    this.shippingSubmit.disabled = true;
    this.renderShippingResult(this.strings.shippingCalculating, "loading");

    try {
      const url = `${window.Shopify.routes.root}cart/shipping_rates.json?shipping_address[country]=${encodeURIComponent(
        country,
      )}&shipping_address[zip]=${encodeURIComponent(zip)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      const rates = data.shipping_rates || [];
      if (rates.length === 0) {
        this.renderShippingResult(this.strings.shippingNoRate, "error");
      } else {
        this.renderShippingRates(rates);
      }
    } catch (err) {
      console.error("[cart-features shipping]", err);
      this.renderShippingResult(this.strings.shippingNoRate, "error");
    } finally {
      this.shippingSubmit.disabled = false;
    }
  }

  renderShippingRates(rates) {
    const intro =
      rates.length === 1
        ? this.strings.shippingOneRate
        : this.strings.shippingNRatesTpl.replace("__COUNT__", String(rates.length));
    const items = rates
      .map((rate) => {
        const price = rate.price === "0.00" ? this.strings.shippingFree : this.formatMoney(rate.price);
        return `<li>${this.escape(rate.name)}: ${price}</li>`;
      })
      .join("");
    this.shippingResult.innerHTML = `<p>${intro}</p><ul class="wt-cart-features__rates">${items}</ul>`;
    this.shippingResult.dataset.state = "success";
  }

  renderShippingResult(message, state) {
    this.shippingResult.textContent = message;
    this.shippingResult.dataset.state = state;
  }

  formatMoney(stringAmount) {
    // /cart/shipping_rates.json returns `price` in the shop's settlement
    // (base) currency — e.g. "5.00" for a 5 PLN rate on a PLN shop. On a
    // multi-currency store the customer browses in a presentment currency
    // (`Shopify.currency.active`, e.g. "ALL"), and `Shopify.currency.rate`
    // holds the conversion factor from base → presentment.
    //
    // To match the rest of the cart UI (which shows everything in the
    // customer's presentment currency), convert the rate to presentment
    // and format with the active currency code.
    //   shop=PLN, customer=ALL, rate=21.5 → 5.00 PLN displayed as 107.50 L
    //
    // Falls through gracefully:
    //   - no presentment set → format the base amount with `shopCurrency`
    //   - missing or 1.0 rate → no conversion, format with whichever
    //     currency code is available
    const baseAmount = parseFloat(stringAmount);
    const presentment = window.Shopify?.currency?.active || "";
    const rate = parseFloat(window.Shopify?.currency?.rate || "1") || 1;
    const baseCode = this.shopCurrency || presentment || "USD";

    let amount = baseAmount;
    let code = baseCode;
    if (presentment && rate && rate !== 1) {
      amount = baseAmount * rate;
      code = presentment;
    } else if (presentment) {
      // Same currency on both sides (or rate not provided) — use
      // presentment so the code matches the rest of the storefront.
      code = presentment;
    }

    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
      }).format(amount);
    } catch (e) {
      return `${amount.toFixed(2)} ${code}`;
    }
  }

  escape(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Discount code ───────────────────────────────────────────
  initDiscount() {
    const applyBtn = this.querySelector("[data-discount-apply]");
    if (!applyBtn) return;

    this.discountInput = this.querySelector("[data-discount-input]");
    this.discountResult = this.querySelector("[data-discount-result]");
    this.applyBtn = applyBtn;

    applyBtn.addEventListener("click", this.onDiscountApply.bind(this));

    this.querySelectorAll("[data-discount-remove-code]").forEach((btn) => {
      btn.addEventListener("click", () => this.onDiscountRemoveCode(btn.dataset.discountRemoveCode, btn));
    });

    this.discountInput?.addEventListener("input", () => {
      delete this.discountInput.dataset.error;
    });
  }

  async onDiscountApply() {
    const code = (this.discountInput?.value || "").trim();
    if (!code) {
      this.renderDiscountResult(this.strings.discountEnter, "error");
      return;
    }

    this.applyBtn.disabled = true;
    this.renderDiscountResult(this.strings.discountApplying, "loading");

    try {
      const cartBefore = await fetch(`${window.Shopify.routes.root}cart.js`).then((r) => r.json());

      const existingCodes = (cartBefore?.discount_codes ?? []).map(el => el.code);
      const appliedCodes = [...existingCodes, code];
      const codesString = appliedCodes.join(',')

      await fetch(`${window.Shopify.routes.root}cart/update.js`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ discount: codesString }),
      });

      const cartAfter = await fetch(`${window.Shopify.routes.root}cart.js`).then((r) => r.json());

      if (this.isDiscountApplied(cartAfter, code, cartBefore)) {
        this.renderDiscountResult(this.strings.discountApplied, "success");
        this.refreshCart();
        setTimeout(() => this.closeAll(), 1500);
      } else {
        this.renderDiscountResult(this.strings.discountInvalid, "error");
        if (this.discountInput) this.discountInput.dataset.error = "";
      }
    } catch (err) {
      console.error("[cart-features discount apply]", err);
      this.renderDiscountResult(this.strings.discountError, "error");
    } finally {
      this.applyBtn.disabled = false;
    }
  }

  isDiscountApplied(cartAfter, code, cartBefore) {
    const normalCode = code.trim().toLowerCase();
    const apps = cartAfter.cart_level_discount_applications || [];
    if (apps.some((a) => a.title && a.title.toLowerCase() === normalCode)) return true;
    if (cartAfter.total_discount > (cartBefore.total_discount || 0)) return true;
    if (apps.length > (cartBefore.cart_level_discount_applications || []).length) return true;
    return false;
  }

  async onDiscountRemoveCode(codeToRemove, btn) {
    if (btn) {
      btn.disabled = true;
      btn.dataset.loading = "";
    }

    try {
      const remaining = (this.dataset.discountCodes || "")
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c && c.toLowerCase() !== codeToRemove.trim().toLowerCase())
        .join(',');

      // Clear all discounts via cart update, then re-apply remaining ones
      await fetch(`${window.Shopify.routes.root}cart/update.js`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ discount: '' }),
      });

      await fetch(`${window.Shopify.routes.root}cart/update.js`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ discount: remaining }),
      });


      this.refreshCart();
      this.closeAll();
    } catch (err) {
      console.error("[cart-features discount remove]", err);
    } finally {
      if (btn) {
        btn.disabled = false;
        delete btn.dataset.loading;
      }
    }
  }

  renderDiscountResult(message, state) {
    if (!this.discountResult) return;
    this.discountResult.textContent = message;
    this.discountResult.dataset.state = state;
  }

  async refreshCart() {
    const cartDrawer = document.querySelector("cart-drawer");
    if (cartDrawer && typeof cartDrawer.refreshCartDrawer === "function") {
      cartDrawer.refreshCartDrawer();
    }

    // 2. Cart page — fetch fresh `main-cart-items` + `main-cart-footer`
    //    + `cart-icon-bubble` sections and swap their `.js-contents` /
    //    `.shopify-section` regions. Without this the cart page would
    //    stay stale (subtotal, savings, line discounts) after applying
    //    or removing a discount code on the page.
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
          { key: cartItemsEl?.dataset.id, el: cartItemsEl, selector: ".js-contents" },
          { key: cartFooterEl?.dataset.id, el: cartFooterEl, selector: ".js-contents" },
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
        console.error("[cart-features] section refresh", err);
      }
    }

    // 3. Notify pub/sub subscribers (cart icon bubble, sticky bars, …).
    //    Convention from CLAUDE.md: "JS — Pub/Sub events via constants.js
    //    (PUB_SUB_EVENTS)". Same call as cart-service-checkbox.js.
    if (typeof publish === "function" && typeof PUB_SUB_EVENTS !== "undefined") {
      publish(PUB_SUB_EVENTS.cartUpdate, { source: "cart-additional-features" });
    }
  }
}

if (!customElements.get("cart-additional-features")) {
  customElements.define("cart-additional-features", CartAdditionalFeatures);
}
