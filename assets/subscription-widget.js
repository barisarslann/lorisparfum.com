if (!customElements.get("sub-widget")) {
  customElements.define(
    "sub-widget",
    class SubWidget extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.init();
      }

      get showDiscountPercentage() {
        return this.dataset.showDiscountPercentage !== 'false';
      }

      init() {
        this.handlePlanClick = this.handlePlanClick.bind(this);

        this.sellingPlanInput = this.querySelector("input[type='hidden']");
        this.allPlans = this.querySelectorAll(".wt-subscription-widget__plans");

        this.addEventListeners();
        this.setInitialPlan();
      }

      setInitialPlan() {
        const initialPlanSelected = this.querySelector('.wt-subscription-widget__plans--selected');
        if (initialPlanSelected) {
          this.handlePlanClick(initialPlanSelected);
        }
      }

      reinit() {
        this.sellingPlanInput = this.querySelector("input[type='hidden']");
        this.allPlans = this.querySelectorAll(".wt-subscription-widget__plans");
        this.allPlans.forEach((plan) => {
          plan.addEventListener("click", () => this.handlePlanClick(plan));
        });

        this.addSelectListeners();
        this.setInitialPlan();
      }

      addEventListeners() {
        this.allPlans.forEach((plan) => {
          plan.addEventListener("click", () => this.handlePlanClick(plan));
        });

        this.addSelectListeners();

        this.unsubscribeVariantChange = subscribe(PUB_SUB_EVENTS.variantChange, (e) => {
          const wrapper = this.closest('[data-section-id]');
          const sectionId = wrapper?.dataset?.sectionId;
          const originalSectionId = wrapper?.dataset?.originalSectionId;
          if (sectionId && e.data.sectionId !== sectionId && e.data.sectionId !== originalSectionId) return;

          const parsedHTML = e.data.html.querySelector(".wt-subscription-widget__container");
          if (!parsedHTML) return;

          const currentContainer = this.querySelector('.wt-subscription-widget__container');
          if (!currentContainer) return;

          currentContainer.innerHTML = parsedHTML.innerHTML;
          this.reinit();

          if (originalSectionId) {
            const hiddenInput = this.querySelector('input[name="selling_plan"]');
            if (hiddenInput) hiddenInput.setAttribute('form', `product-form-${sectionId}`);
          }
        });
      }

      addSelectListeners() {
        this.querySelectorAll(".wt-subscription-widget__plan-content__select").forEach((select) => {
          select.addEventListener("change", (e) => {
            e.stopPropagation();
            this.handleSelectChange(select);
          });
        });
      }

      handleSelectChange(select) {
        const plan = select.closest(".wt-subscription-widget__plans");
        if (!plan || !plan.classList.contains("wt-subscription-widget__plans--selected")) return;

        const selectedOption = select.options[select.selectedIndex];
        if (!selectedOption) return;

        this.sellingPlanInput.value = selectedOption.value;

        const compareAtPrice = selectedOption.dataset.compareAtPrice;
        const price = selectedOption.dataset.price;
        this.updatePrice(plan, compareAtPrice, price);
        this.updateURLParamsIfEnabled(selectedOption.value);
        const priceData = {
          price: selectedOption.dataset.priceFormatted,
          compareAtPrice: selectedOption.dataset.compareAtPriceFormatted,
          priceRaw: Number(selectedOption.dataset.priceRaw),
          compareAtPriceRaw: Number(selectedOption.dataset.compareAtPriceRaw),
        };
        this.updatePriceBlock(priceData);
        this.updateStickyPriceBlock(priceData);
      }

      handlePlanClick(plan) {
        this.allPlans.forEach((item) => {
          item.classList.remove("wt-subscription-widget__plans--selected");
        });
        plan.classList.add("wt-subscription-widget__plans--selected");

        const selectedPlanValue = plan.querySelector("select")?.value;
        if (selectedPlanValue) {
          this.sellingPlanInput.value = selectedPlanValue;
          const selectedOption = [...plan.querySelector("select").options].find(
            (option) => option.value === selectedPlanValue
          );
          if (selectedOption) {
            const compareAtPrice = selectedOption.dataset.compareAtPrice;
            const price = selectedOption.dataset.price;
            this.updatePrice(plan, compareAtPrice, price);
            const priceData = {
              price: selectedOption.dataset.priceFormatted,
              compareAtPrice: selectedOption.dataset.compareAtPriceFormatted,
              priceRaw: Number(selectedOption.dataset.priceRaw),
              compareAtPriceRaw: Number(selectedOption.dataset.compareAtPriceRaw),
            };
            this.updatePriceBlock(priceData);
            this.updateStickyPriceBlock(priceData);
          }
        } else {
          this.sellingPlanInput.value = "";
          const priceData = {
            price: plan.dataset.priceFormatted,
            compareAtPrice: plan.dataset.compareAtPriceFormatted,
            priceRaw: Number(plan.dataset.priceRaw),
            compareAtPriceRaw: Number(plan.dataset.compareAtPriceRaw),
          };
          this.updatePriceBlock(priceData);
          this.updateStickyPriceBlock(priceData);
        }

        this.updateURLParamsIfEnabled(selectedPlanValue);
      }

      updatePrice(plan, compareAtPrice, price) {
        const priceElement = plan.querySelector('.wt-subscription-widget__plan-header__price-regular');
        const compareAtPriceElement = plan.querySelector('.wt-subscription-widget__plan-header__price-sale');

        if (compareAtPrice && compareAtPriceElement) {
          compareAtPriceElement.innerHTML = compareAtPrice;
        }
        if (priceElement) {
          if (compareAtPrice) {
            priceElement.classList.add('wt-subscription-widget__plan-header__price-regular--sale');
          } else {
            priceElement.classList.remove('wt-subscription-widget__plan-header__price-regular--sale');
          }
          if (price) {
            priceElement.innerHTML = price;
          }
        }
      }

      updatePriceBlock({ price, compareAtPrice, priceRaw, compareAtPriceRaw }) {
        const sectionId = this.closest('[data-section-id]')?.dataset?.sectionId;
        if (!sectionId) return;

        publish(PUB_SUB_EVENTS.subscriptionPriceChange, { data: { sectionId, price } });

        const btnPriceDestination = document
          .getElementById(`ProductSubmitButton-${sectionId}`)
          ?.querySelector('wt-btn-price');
        if (btnPriceDestination && price) btnPriceDestination.textContent = price;

        const priceBlock = document.getElementById(`price-${sectionId}`);
        if (!priceBlock) return;

        const priceContainer = priceBlock.querySelector('.price');
        if (!priceContainer) return;

        const isOnSale = compareAtPriceRaw > priceRaw;

        priceContainer.classList.toggle('price--on-sale', isOnSale);

        const regularPriceEl = priceContainer.querySelector('.price__regular .wt-product__price__final');
        if (regularPriceEl) regularPriceEl.innerHTML = price;

        const salePriceEl = priceContainer.querySelector('.price__sale .wt-product__price__final');
        if (salePriceEl) salePriceEl.innerHTML = price;

        const saleDiv = priceContainer.querySelector('.price__sale');
        if (saleDiv) {
          saleDiv.classList.toggle('visible', isOnSale);
          saleDiv.classList.remove('visible-main-product');
        }

        const compareEl = priceContainer.querySelector('.wt-product__price__compare');
        if (compareEl) {
          compareEl.innerHTML = isOnSale ? compareAtPrice : '';
          compareEl.classList.toggle('hidden', !isOnSale);
        }

        let percentEl = priceContainer.querySelector('.price-item--percent');
        if (isOnSale && this.showDiscountPercentage) {
          const percent = Math.round((compareAtPriceRaw - priceRaw) / compareAtPriceRaw * 100);
          if (percentEl) {
            percentEl.textContent = `-${percent}%`;
          } else {
            const wrapper = priceContainer.querySelector('.price__sale__details-wrapper');
            if (wrapper) {
              percentEl = document.createElement('span');
              percentEl.className = 'price-item--percent';
              percentEl.textContent = `-${percent}%`;
              wrapper.appendChild(percentEl);
            }
          }
        } else if (percentEl) {
          percentEl.remove();
        }
      }

      updateStickyPriceBlock({ price, compareAtPrice, priceRaw, compareAtPriceRaw }) {
        const sectionId = this.closest('[data-section-id]')?.dataset?.sectionId;
        if (!sectionId) return;

        const stickyPriceBlock = document.getElementById(`sticky-price-${sectionId}`);
        if (!stickyPriceBlock) return;

        const priceContainer = stickyPriceBlock.querySelector('.price');
        if (!priceContainer) return;

        const isOnSale = compareAtPriceRaw > priceRaw;

        priceContainer.classList.toggle('price--on-sale', isOnSale);

        const regularPriceEl = priceContainer.querySelector('.price__regular .wt-product__price__final');
        if (regularPriceEl) regularPriceEl.innerHTML = price;

        const salePriceEl = priceContainer.querySelector('.price__sale .wt-product__price__final');
        if (salePriceEl) salePriceEl.innerHTML = price;

        const saleDiv = priceContainer.querySelector('.price__sale');
        if (saleDiv) {
          saleDiv.classList.toggle('visible', isOnSale);
          saleDiv.classList.remove('visible-main-product');
        }

        const compareEl = priceContainer.querySelector('.wt-product__price__compare');
        if (compareEl) {
          compareEl.innerHTML = isOnSale ? compareAtPrice : '';
          compareEl.classList.toggle('hidden', !isOnSale);
        }

        let percentEl = priceContainer.querySelector('.price-item--percent');
        if (isOnSale && this.showDiscountPercentage) {
          const percent = Math.round((compareAtPriceRaw - priceRaw) / compareAtPriceRaw * 100);
          if (percentEl) {
            percentEl.textContent = `-${percent}%`;
          } else {
            const wrapper = priceContainer.querySelector('.price__sale__details-wrapper');
            if (wrapper) {
              percentEl = document.createElement('span');
              percentEl.className = 'price-item--percent';
              percentEl.textContent = `-${percent}%`;
              wrapper.appendChild(percentEl);
            }
          }
        } else if (percentEl) {
          percentEl.remove();
        }
      }

      updateURLParamsIfEnabled(planId) {
        const wrapper = this.closest('[data-update-url-on-plan-change]');
        if (wrapper?.dataset.updateUrlOnPlanChange === 'false') return;

        const urlParams = new URLSearchParams(window.location.search);
        if (planId) {
          urlParams.set("selling_plan", planId);
        } else {
          urlParams.delete("selling_plan");
        }
        window.history.pushState({}, "", `${window.location.pathname}?${urlParams.toString()}`);
      }

      disconnectedCallback() {
        if (typeof this.unsubscribeVariantChange === 'function') {
          this.unsubscribeVariantChange();
        }
      }
    }
  );
}
