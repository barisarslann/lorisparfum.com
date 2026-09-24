if (!customElements.get('shoppable-buy-all')) {
  customElements.define('shoppable-buy-all', class ShoppableBuyAll extends HTMLElement {
    connectedCallback() {
      this._productRows = Array.from(this.querySelectorAll('[data-product-row]'));
      this._dots = Array.from(this.querySelectorAll('.wt-shoppable-buy-all__dot'));
      this._button = this.querySelector('[data-buy-all-button]');
      this._totalPriceEl = this.querySelector('[data-total-price]');
      this._errorEl = this.querySelector('[data-error-message]');

      this._cart = document.querySelector('cart-drawer');
      this._cartType = this._cart?.dataset.cartType || 'page';

      this._productRows.forEach(row => this._initRow(row));
      this._dots.forEach(dot => this._initDot(dot));
      this._updateTotal();

      this._onButtonClick = (e) => { e.preventDefault(); this._handleBuyAll(); };
      this._onButtonKeydown = (e) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this._handleBuyAll(); }
      };
      this._button?.addEventListener('click', this._onButtonClick);
      this._button?.addEventListener('keydown', this._onButtonKeydown);
    }

    disconnectedCallback() {
      this._button?.removeEventListener('click', this._onButtonClick);
      this._button?.removeEventListener('keydown', this._onButtonKeydown);
      this._productRows?.forEach(row => {
        row._variantSelect?.removeEventListener('change', row._variantSelectFn);
        row._titleRow?.removeEventListener('click', row._quickViewFn);
        row._thumb?.removeEventListener('click', row._quickViewFn);
      });
      this._dots?.forEach(dot => {
        dot.removeEventListener('mouseenter', dot._enterFn);
        dot.removeEventListener('mouseleave', dot._leaveFn);
      });
    }

    _initDot(dot) {
      dot._enterFn = () => this._activateRow(dot.dataset.blockId);
      dot._leaveFn = () => this._deactivateRows();
      dot.addEventListener('mouseenter', dot._enterFn);
      dot.addEventListener('mouseleave', dot._leaveFn);
    }

    _activateRow(blockId) {
      this._productRows.forEach(row => {
        if (row.dataset.blockId === blockId) {
          row.classList.add('wt-shoppable-buy-all__product-row--active');
          row.classList.remove('wt-shoppable-buy-all__product-row--dim');
        } else {
          row.classList.add('wt-shoppable-buy-all__product-row--dim');
          row.classList.remove('wt-shoppable-buy-all__product-row--active');
        }
      });
    }

    _deactivateRows() {
      this._productRows.forEach(row => {
        row.classList.remove(
          'wt-shoppable-buy-all__product-row--active',
          'wt-shoppable-buy-all__product-row--dim'
        );
      });
    }

    _initRow(row) {
      const select = row.querySelector('[data-variant-select]');
      if (select) {
        row._variantSelect = select;
        row._variantSelectFn = () => { this._updateVariant(row); this._updateTotal(); };
        select.addEventListener('change', row._variantSelectFn);
        this._updateVariant(row);
      }

      const titleRow = row.querySelector('[data-title-row]');
      const thumb = row.querySelector('.wt-shoppable-buy-all__product-thumb');
      const quickAddBtn = row.querySelector('.wt-shoppable-buy-all__quick-add button');
      if (quickAddBtn && (titleRow || thumb)) {
        row._quickViewFn = (e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey) return;
          e.preventDefault();
          quickAddBtn.click();
        };
        if (titleRow) {
          row._titleRow = titleRow;
          titleRow.addEventListener('click', row._quickViewFn);
        }
        if (thumb) {
          row._thumb = thumb;
          thumb.addEventListener('click', row._quickViewFn);
        }
      }
    }

    _updateVariant(row) {
      const select = row._variantSelect;
      if (!select) return;

      const opt = select.options[select.selectedIndex];
      if (!opt) return;

      row.dataset.selectedVariantId = opt.value;
      if (opt.dataset.priceCents) row.dataset.priceCents = opt.dataset.priceCents;

      const priceEl = row.querySelector('[data-price]');
      if (priceEl && opt.dataset.variantPrice) priceEl.textContent = opt.dataset.variantPrice;

      this._updateComparePrice(row, opt);
    }

    _updateComparePrice(row, opt) {
      const wrapper = row.querySelector('[data-price-wrapper]');
      const compareEl = row.querySelector('[data-price-compare]');
      if (!wrapper || !compareEl) return;

      const priceCents = parseInt(opt.dataset.priceCents) || 0;
      const compareCents = parseInt(opt.dataset.compareCents) || 0;
      const onSale = compareCents > priceCents;

      wrapper.classList.toggle('wt-shoppable-buy-all__product-price--on-sale', onSale);
      compareEl.hidden = !onSale;
      if (onSale && opt.dataset.variantComparePrice) {
        compareEl.textContent = opt.dataset.variantComparePrice;
      }
    }

    _updateTotal() {
      if (!this._totalPriceEl) return;
      const totalCents = this._productRows.reduce(
        (sum, row) => sum + (parseInt(row.dataset.priceCents) || 0),
        0
      );
      this._totalPriceEl.textContent = this._formatMoney(totalCents);
    }

    _formatMoney(cents) {
      const currency = window.Shopify?.currency?.active || 'USD';
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
      } catch {
        return `${(cents / 100).toFixed(2)} ${currency}`;
      }
    }

    async _handleBuyAll() {
      if (this._loading) return;

      const items = this._productRows
        .map(row => ({ id: Number(row.dataset.selectedVariantId), quantity: 1 }))
        .filter(item => item.id);

      if (!items.length) return;

      this._loading = true;

      this._clearError();
      this._cart?.setActiveElement(document.activeElement);
      this._button.setAttribute('aria-disabled', 'true');
      this._button.classList.add('loading');
      const spinner = this._button.querySelector('.loading-overlay__spinner');
      spinner?.classList.remove('hidden');

      try {
        const body = { items };
        if (this._cart && typeof this._cart.getSectionsToRender === 'function') {
          body.sections = this._cart.getSectionsToRender().map(section => section.id);
          body.sections_url = window.location.pathname;
        }

        const response = await fetch(window.routes.cart_add_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
          this._showError(data.description || data.message || response.statusText);
          return;
        }

        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: 'shoppable-buy-all',
          cartData: data,
        });

        this._openCartOrRedirect(data);
      } catch (e) {
        this._showError(e.message);
      } finally {
        this._loading = false;
        this._button.removeAttribute('aria-disabled');
        this._button.classList.remove('loading');
        spinner?.classList.add('hidden');
      }
    }

    _openCartOrRedirect(data) {
      // No cart drawer on the page (or configured as its own page) — go to the cart page.
      if (!this._cart || this._cartType !== 'drawer') {
        window.location = window.routes.cart_url;
        return;
      }

      // On the cart page itself the drawer isn't used — reload to reflect the new items.
      if (window.location.pathname === window.routes.cart_url) {
        window.location = window.routes.cart_url;
        return;
      }

      const isClosedCart = !document.body.classList.contains('page-overlay-cart-on');
      this._cart.renderContents(data, isClosedCart);
    }

    _showError(msg) {
      if (this._errorEl) {
        this._errorEl.textContent = msg;
        this._errorEl.removeAttribute('hidden');
      }
    }

    _clearError() {
      if (this._errorEl) {
        this._errorEl.textContent = '';
        this._errorEl.setAttribute('hidden', '');
      }
    }
  });
}
