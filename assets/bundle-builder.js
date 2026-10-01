if (!customElements.get('bundle-builder')) {
  customElements.define(
    'bundle-builder',
    class BundleBuilder extends HTMLElement {
      constructor() {
        super();
        this._items = [];
      }

      connectedCallback() {
        this._bundleEl = this.querySelector('.wt-bundle__bundle');
        this._maxSize = parseInt(this._bundleEl?.dataset.bundleMax) || 3;
        this._minSize = parseInt(this._bundleEl?.dataset.bundleMin) || 1;
        this._placeholders = this._bundleEl
          ? Array.from(this._bundleEl.querySelectorAll('.wt-bundle__placeholder'))
          : [];
        this._totalEl = this.querySelector('[data-bundle-total]');
        this._ctaBtn = this.querySelector('[data-bundle-cta]');
        this._errorEl = this.querySelector('[data-bundle-error]');
        this._moneyFormat = this.dataset.moneyFormat || '${{amount}}';
        this._discountType = this.dataset.discountType || 'percentage';
        this._discountPercentage = parseFloat(this.dataset.discountPercentage) || 0;
        this._discountAmount = parseFloat(this.dataset.discountAmount) || 0;
        this._discountCode = this.dataset.discountCode || '';
        this._animationsEnabled = this.dataset.animations === 'true';
        this._animationsDisabledMobile = this.dataset.animationsDisabledMobile === 'true';
        this._discountIconHtml =
          document.getElementById('bundle-discount-icon')?.innerHTML || '';
        this._storageKey = `wt-bundle-${this.dataset.sectionId || 'default'}`;

        this._handleClick = this._handleClick.bind(this);
        this._handleVariantChange = this._handleVariantChange.bind(this);
        this.addEventListener('click', this._handleClick);
        this.addEventListener('change', this._handleVariantChange);

        this._loadFromStorage();
        if (this._items.length > 0) {
          this._renderPanel();
          this._updateAddButtons();
        }

        this._updateFooter();
        this._updateProgress();
      }

      disconnectedCallback() {
        this.removeEventListener('click', this._handleClick);
        this.removeEventListener('change', this._handleVariantChange);
      }

      _handleClick(e) {
        const addBtn = e.target.closest('.wt-bundle__add-btn');
        const removeBtn = e.target.closest('.wt-bundle__placeholder--remove');
        const ctaBtn = e.target.closest('[data-bundle-cta]');
        const toggleBtn = e.target.closest('.wt-bundle__header');

        if (addBtn) {
          this._onAdd(addBtn);
        } else if (removeBtn) {
          this._onRemove(removeBtn.closest('.wt-bundle__placeholder'));
        } else if (ctaBtn) {
          this._onAddToCart();
        } else if (toggleBtn) {
          this._onTogglePanel(toggleBtn);
        }
      }

      _onAdd(btn) {
        if (btn.disabled) return;
        if (this._items.length >= this._maxSize) return;

        this._items.push({
          variantId: btn.dataset.variantId,
          productId: btn.dataset.productId,
          title: btn.dataset.title,
          price: parseInt(btn.dataset.price, 10),
          image: btn.dataset.image,
          optionNames: btn.dataset.optionNames || '',
          variantOptions: btn.dataset.variantOptions || '',
        });
        this._saveToStorage();

        this._renderPanel();
        this._updateFooter();
        this._updateAddButtons();
        this._updateProgress();
      }

      _onRemove(placeholder) {
        const index = this._placeholders.indexOf(placeholder);
        if (index === -1 || !this._items[index]) return;

        this._items.splice(index, 1);
        this._saveToStorage();

        this._renderPanel();
        this._updateFooter();
        this._updateAddButtons();
        this._updateProgress();
      }

      _onAddToCart() {
        if (this._ctaBtn.classList.contains('loading')) return;
        this._setError(null);
        this._ctaBtn.classList.add('loading');
        this._ctaBtn.querySelector('.loading-overlay__spinner')?.classList.remove('hidden');

        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [...this._items.reduce((map, item) => {
              const id = parseInt(item.variantId, 10);
              map.set(id, (map.get(id) || 0) + 1);
              return map;
            }, new Map())].map(([id, quantity]) => ({ id, quantity })),
            sections: ['cart-drawer', 'cart-icon-bubble'],
          }),
        })
          .then((res) => res.json())
          .then((parsedState) => {
            if (parsedState.status) {
              this._setError(parsedState.description || parsedState.message);
              return;
            }
            if (this._discountCode) {
              return fetch(`/discount/${encodeURIComponent(this._discountCode)}`, {
                credentials: 'same-origin',
                redirect: 'manual',
              })
                .catch(() => {})
                .then(() =>
                  fetch(
                    `${window.Shopify?.routes?.root ?? '/'}?sections=cart-drawer,cart-icon-bubble`,
                    { credentials: 'same-origin' },
                  ),
                )
                .then((res) => res.json())
                .then((refreshedSections) => {
                  const cartDrawer = document.querySelector('cart-drawer');
                  if (cartDrawer) {
                    cartDrawer.renderContents({ sections: refreshedSections }, true);
                  }
                  this._resetBundle();
                });
            }

            const cartDrawer = document.querySelector('cart-drawer');
            if (cartDrawer) {
              cartDrawer.renderContents(parsedState, true);
            }
            this._resetBundle();
          })
          .catch(() => {
            this._setError(this.dataset.errorMessage || 'An error occurred. Please try again.');
          })
          .finally(() => {
            this._ctaBtn.classList.remove('loading');
            this._ctaBtn.querySelector('.loading-overlay__spinner')?.classList.add('hidden');
          });
      }

      _resetBundle() {
        this._items = [];
        this._clearStorage();
        this.querySelectorAll('.wt-bundle__add-btn').forEach((btn) => {
          if (btn.dataset.soldOut === 'true') return;
          btn.disabled = false;
          btn.querySelector('span').textContent = btn.dataset.labelAdd;
        });
        this._renderPanel();
        this._updateFooter();
        this._updateAddButtons();
        this._updateProgress();
      }

      _renderPanel() {
        const isActive = this._items.length >= this._minSize;

        this._placeholders.forEach((placeholder, i) => {
          const item = this._items[i];
          const imgEl = placeholder.querySelector('.wt-bundle__placeholder--image');
          const titleEl = placeholder.querySelector('.wt-bundle__placeholder--title');
          const optionsEl = placeholder.querySelector('.wt-bundle__placeholder--options');
          const discountEl = placeholder.querySelector('.wt-bundle__placeholder--discount');
          const subtitleEl = placeholder.querySelector('.wt-bundle__placeholder--subtitle');

          const descEl = placeholder.querySelector('.wt-bundle__placeholder--description');

          if (item) {
            placeholder.dataset.variantId = item.variantId;

            if (this._animationsEnabled) {
              const animClasses = ['scroll-trigger', 'animate--fade-in'];
              const extra = [
                ...(this._animationsDisabledMobile ? ['disabled-on-mobile'] : []),
                ...(window.Shopify?.designMode ? ['scroll-trigger--design-mode'] : []),
              ];
              if (imgEl) {
                imgEl.style.setProperty('--animation-order', (i * 2) + 1);
                imgEl.classList.add(...animClasses, ...extra);
              }
              if (descEl) {
                descEl.style.setProperty('--animation-order', (i * 2) + 2);
                descEl.classList.add(...animClasses, ...extra);
              }
            }

            if (imgEl) imgEl.innerHTML = `<img src="${this._escapeAttr(item.image)}" alt="${this._escapeAttr(item.title)}" loading="lazy">`;
            if (titleEl) titleEl.textContent = item.title;
            if (optionsEl) optionsEl.innerHTML = this._buildVariantOptionsHtml(item);
            if (discountEl) discountEl.innerHTML = this._buildDiscountHtml(item.price, isActive);
            if (subtitleEl) subtitleEl.innerHTML = this._buildPriceHtml(item.price, isActive);
            placeholder.classList.add('is-filled');
          } else {
            delete placeholder.dataset.variantId;
            placeholder.classList.remove('is-filled');
            ['scroll-trigger', 'animate--fade-in', 'scroll-trigger--design-mode', 'disabled-on-mobile'].forEach(cls => {
              imgEl?.classList.remove(cls);
              descEl?.classList.remove(cls);
            });
            imgEl?.style.removeProperty('--animation-order');
            descEl?.style.removeProperty('--animation-order');
            if (imgEl) imgEl.innerHTML = '';
            if (titleEl) titleEl.textContent = '';
            if (optionsEl) optionsEl.innerHTML = '';
            if (discountEl) discountEl.innerHTML = '';
            if (subtitleEl) subtitleEl.innerHTML = '';
          }
        });
      }

      _buildPriceHtml(priceInCents, isActive) {
        const regular = this._formatMoney(priceInCents);

        if (!isActive || !this._hasDiscount()) {
          return `<span class="price-item price-item--regular">${regular}</span>`;
        }

        const discounted = this._formatMoney(this._calcDiscountedPrice(priceInCents));
        return (
          `<s class="price-item price-item--regular">${regular}</s>` +
          `<span class="price-item price-item--sale">${discounted}</span>`
        );
      }

      _buildVariantOptionsHtml(item) {
        const names = item.optionNames ? item.optionNames.split('|') : [];
        const values = item.variantOptions ? item.variantOptions.split('|') : [];
        if (!names.length || values.join('') === 'Default Title') return '';
        return names
          .map((name, i) => {
            if (!values[i]) return '';
            const div = document.createElement('div');
            div.className = 'product-option';
            const label = document.createElement('span');
            label.className = 'label';
            label.textContent = `${name}: `;
            const val = document.createElement('span');
            val.className = 'value';
            val.textContent = values[i];
            div.append(label, val);
            return div.outerHTML;
          })
          .join('');
      }

      _buildDiscountHtml(priceInCents, isActive) {
        if (!isActive || !this._hasDiscount() || !this._discountCode) return '';

        const saving = priceInCents - this._calcDiscountedPrice(priceInCents);
        const label = `-${this._formatMoney(saving)}`;

        return this._discountIconHtml + `<span>${this._discountCode} ${label}</span>`;
      }

      _hasDiscount() {
        if (this._discountType === 'percentage') return this._discountPercentage > 0;
        return this._discountAmount > 0;
      }

      _calcDiscountedPrice(priceInCents) {
        if (this._discountType === 'percentage') {
          return Math.round(priceInCents * (1 - this._discountPercentage / 100));
        }
        return Math.max(0, priceInCents - this._discountAmount * 100);
      }

      _updateFooter() {
        if (!this._totalEl || !this._ctaBtn) return;

        const isActive = this._items.length >= this._minSize;
        const totalOriginal = this._items.reduce((sum, item) => sum + item.price, 0);
        const totalDiscounted = this._items.reduce(
          (sum, item) => sum + this._calcDiscountedPrice(item.price),
          0,
        );

        if (isActive && this._hasDiscount()) {
          this._totalEl.innerHTML =
            `<s class="price-item price-item--regular">${this._formatMoney(totalOriginal)}</s>` +
            `<span class="price-item price-item--sale">${this._formatMoney(totalDiscounted)}</span>`;
        } else {
          this._totalEl.textContent = this._formatMoney(totalOriginal);
        }

        this._ctaBtn.disabled = !isActive;
      }

      _handleVariantChange(e) {
        const select = e.target.closest('.wt-bundle__variant-select');
        if (!select) return;
        const option = select.options[select.selectedIndex];
        const btn = select.closest('.card__bundle-add-container')
          ?.querySelector('.wt-bundle__add-btn');
        if (!btn || !option) return;

        btn.dataset.variantId = option.value;
        btn.dataset.price = option.dataset.price;
        if (option.dataset.image) btn.dataset.image = option.dataset.image;
        if (option.dataset.options) btn.dataset.variantOptions = option.dataset.options;

        const unavailable = option.disabled;
        if (unavailable) {
          btn.dataset.soldOut = 'true';
        } else {
          delete btn.dataset.soldOut;
        }
        btn.disabled = unavailable || this._items.length >= this._maxSize;
        btn.querySelector('span').textContent = unavailable
          ? btn.dataset.labelSoldOut
          : btn.dataset.labelAdd;

        const card = select.closest('.card__container');
        if (card) {
          this._updateCardPrice(card, parseInt(option.dataset.price, 10), parseInt(option.dataset.comparePrice || '0', 10));
          if (option.dataset.imageCard) {
            const img = card.querySelector('.card__img:not(.card__img--hover)');
            if (img) {
              img.src = option.dataset.imageCard;
              img.removeAttribute('srcset');
            }
          }
        }
      }

      _onTogglePanel(header) {
        const panel = header.closest('.wt-bundle__panel');
        if (!panel) return;
        const expanded = panel.classList.toggle('is-expanded');
        panel.querySelector('.wt-bundle__toggle')?.setAttribute('aria-expanded', expanded);

        if (expanded) {
          const bundle = panel.querySelector('.wt-bundle__bundle');
          if (bundle) bundle.scrollTop = 0;
        }
      }

      _setError(message) {
        if (!this._errorEl) return;
        this._errorEl.toggleAttribute('hidden', !message);
        if (message) {
          this._errorEl.querySelector('.product-form__error-message').textContent = message;
        }
      }

      _updateProgress() {
        if (!this._bundleEl) return;
        const count = this._items.length;
        const pct = Math.min(100, (count / this._minSize) * 100);
        this.style.setProperty('--bundle-progress-pct', pct);

        const countEl = this.querySelector('[data-bundle-count]');
        if (countEl) countEl.textContent = `(${count}/${this._minSize})`;

        const infoEl = this.querySelector('[data-bundle-info]');
        const textSpan = this.querySelector('[data-bundle-text]');
        const discountEl = this.querySelector('[data-bundle-status-discount]');
        const moreEl = this.querySelector('[data-bundle-status-more]');
        const reached = count >= this._minSize;
        const maxReached = count >= this._maxSize;
        if (textSpan) textSpan.toggleAttribute('hidden', reached);
        if (discountEl) discountEl.toggleAttribute('hidden', !reached);
        if (moreEl) moreEl.toggleAttribute('hidden', !(reached && this._maxSize > this._minSize) || maxReached);
        if (infoEl) infoEl.toggleAttribute('hidden', !reached && !textSpan);
      }

      _updateAddButtons() {
        const maxReached = this._items.length >= this._maxSize;
        this.querySelectorAll('.wt-bundle__add-btn').forEach((btn) => {
          if (btn.dataset.soldOut === 'true') return;
          btn.disabled = maxReached;
        });
      }

      _updateCardPrice(card, price, comparePrice) {
        const priceEl = card.querySelector('.price');
        if (!priceEl) return;

        const isSale = comparePrice > price;
        priceEl.classList.toggle('price--on-sale', isSale);

        const regularFinal = priceEl.querySelector('.price__regular .wt-product__price__final');
        if (regularFinal) regularFinal.textContent = this._formatMoney(price);

        const saleFinal = priceEl.querySelector('.price__sale .price-item--sale.wt-product__price__final');
        if (saleFinal) saleFinal.textContent = this._formatMoney(price);

        const compareEl = priceEl.querySelector('.price-item--regular.price-item--lower');
        if (compareEl) {
          compareEl.textContent = this._formatMoney(comparePrice);
          compareEl.classList.toggle('hidden', !isSale);
        }

        const percentEl = priceEl.querySelector('.price-item--percent');
        if (percentEl) {
          if (isSale && comparePrice > 0) {
            percentEl.textContent = `-${Math.round((comparePrice - price) / comparePrice * 100)}%`;
          }
          percentEl.toggleAttribute('hidden', !isSale);
        }

        const saleDiv = priceEl.querySelector('.price__sale');
        if (saleDiv) saleDiv.classList.toggle('visible', isSale);
      }

      _saveToStorage() {
        try {
          localStorage.setItem(this._storageKey, JSON.stringify(this._items));
        } catch (_) {}
      }

      _loadFromStorage() {
        try {
          const stored = localStorage.getItem(this._storageKey);
          if (stored) this._items = JSON.parse(stored);
        } catch (_) {}
      }

      _clearStorage() {
        try {
          localStorage.removeItem(this._storageKey);
        } catch (_) {}
      }

      _escapeAttr(s) {
        return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }

      _formatMoney(cents) {
        const match = this._moneyFormat.match(/\{\{\s*(\w+)\s*\}\}/);
        if (!match) return this._moneyFormat;
        const fmt = (thousands, decimal, precision = 2) => {
          const value = (Math.abs(cents) / 100).toFixed(precision);
          const [int, dec] = value.split('.');
          const intFormatted = int.replace(/(\d)(?=(\d{3})+(?!\d))/g, `$1${thousands}`);
          return (cents < 0 ? '-' : '') + (precision > 0 ? `${intFormatted}${decimal}${dec}` : intFormatted);
        };
        const tokens = {
          amount: fmt(',', '.'),
          amount_no_decimals: fmt(',', '.', 0),
          amount_with_comma_separator: fmt('.', ','),
          amount_no_decimals_with_comma_separator: fmt('.', ',', 0),
          amount_with_period_separator: fmt(',', '.'),
          amount_no_decimals_with_space_separator: fmt(' ', '.', 0),
        };
        return this._moneyFormat.replace(match[0], tokens[match[1]] ?? fmt(',', '.'));
      }
    },
  );
}
