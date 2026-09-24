if (!customElements.get("wt-btn-price")) {
  customElements.define(
    "wt-btn-price",
    class WtBtnPrice extends HTMLElement {
      connectedCallback() {
        const section = this.closest("[data-section-id]");
        if (!section) return;
        this._sectionId = section.dataset.sectionId;
        this._section = section;

        this._onVariantChange = this._onVariantChange.bind(this);
        this._onSubscriptionPriceChange =
          this._onSubscriptionPriceChange.bind(this);
        this._onAppBlockPlanChange = this._onAppBlockPlanChange.bind(this);

        this._unsubscribeVariantChange = subscribe(
          PUB_SUB_EVENTS.variantChange,
          this._onVariantChange,
        );
        this._unsubscribeSubscriptionPriceChange = subscribe(
          PUB_SUB_EVENTS.subscriptionPriceChange,
          this._onSubscriptionPriceChange,
        );
        section.addEventListener("change", this._onAppBlockPlanChange);
      }

      disconnectedCallback() {
        this._unsubscribeVariantChange?.();
        this._unsubscribeSubscriptionPriceChange?.();
        this._section?.removeEventListener(
          "change",
          this._onAppBlockPlanChange,
        );
      }

      _onVariantChange(event) {
        if (event?.data?.sectionId !== this._sectionId) return;

        if (this._syncFromCheckedAppBlockRadio()) return;

        const sellingPlanInput = this._section.querySelector(
          'input[name="selling_plan"]',
        );
        const hasActiveSubscription =
          !!sellingPlanInput && sellingPlanInput.value !== "";
        if (hasActiveSubscription) return;

        const source = event.data.html
          ?.getElementById(`ProductSubmitButton-${this._sectionId}`)
          ?.querySelector("wt-btn-price");

        if (source) {
          this.textContent = source.textContent.trim();
          return;
        }

        this._syncFromPriceBlock();
      }

      _onSubscriptionPriceChange(event) {
        if (event?.data?.sectionId !== this._sectionId) return;
        if (event.data.price) this.textContent = event.data.price;
      }

      _onAppBlockPlanChange(event) {
        const radio = event.target.closest("input[data-variant-price]");
        if (!radio) return;
        this.textContent = this._stripCurrencyCode(radio.dataset.variantPrice);
      }

      _syncFromCheckedAppBlockRadio() {
        const variantInput = this._section.querySelector('input[name="id"]');
        const currentVariantId = variantInput?.value;

        let radio;
        if (currentVariantId) {
          radio = this._section.querySelector(
            `input[data-variant-price][name$="_${currentVariantId}"]:checked`,
          );
        }
        if (!radio) {
          radio = this._section.querySelector(
            "input[data-variant-price]:checked",
          );
        }

        if (radio) {
          this.textContent = this._stripCurrencyCode(radio.dataset.variantPrice);
          return true;
        }
        return false;
      }

      _stripCurrencyCode(price) {
        return price.replace(/^[a-z]{2,4}\s+|\s+[a-z]{2,4}$/gi, "").trim();
      }

      _syncFromPriceBlock() {
        const root =
          document.getElementById(`price-${this._sectionId}`) ??
          document.getElementById(`sticky-price-${this._sectionId}`);
        if (!root) return;

        const saleEl = root.querySelector(
          ".price__sale.visible .price-item--last," +
            ".price__sale.visible-main-product .price-item--last",
        );
        const regularEl = root.querySelector(
          ".price__regular .wt-product__price__final",
        );
        const price = (saleEl ?? regularEl)?.textContent?.trim();

        if (price) this.textContent = price;
      }
    },
  );
}
