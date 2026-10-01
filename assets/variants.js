if (!customElements.get("variant-options")) {
  customElements.define(
    "variant-options",
    class VariantOptions extends HTMLElement {
      whenLoaded = Promise.all([customElements.whenDefined("gallery-section")]);
      constructor() {
        super();
        this.addEventListener("change", this.onVariantChange);
        this.addEventListener("keydown", this.onKeyDown);

        this.container = document.querySelector(
          `section[data-product-handle="${this.getAttribute("data-product-handle")}"]`,
        );
      }

      connectedCallback() {
        this.isHighVariantsProduct = this.dataset.highVariantsProduct === "";
        this.toggleDisabledVariantOptions = this.toggleDisabledVariantOptions.bind(this);
        this._variantChangeRequestId = 0;
        this._variantFetchAbortController = null;
        this.whenLoaded.then(() => {
          this.initialize();
        });
      }

      disconnectedCallback() {}

      initialize() {
        if (this.isHighVariantsProduct) {
          // High-variant: options/state are set on first selection via fetchVariant(); only sync gallery if we have initial variant.
          if (this.currentVariant) {
            this.updateGallery();
          }
        } else {
          this.updateOptions();
          this.updateMasterId();
          if (this.currentVariant) {
            this.updateGallery();
          }
          this.updateVariantStatuses();
          this.updateDropdownButtons();
        }
      }

      onKeyDown(event) {
        if (event.key === "Enter" || event.keyCode === 13) {
          const input = event.target.querySelector("input");
          input?.click();
          // this.onVariantChange();
        }
      }

      async onVariantChange() {
        const variantChangeStartEvent = new CustomEvent("variantChangeStart", {
          bubbles: true,
          composed: true,
        });
        this.dispatchEvent(variantChangeStartEvent);
        this.toggleAddButton(true, "", false);
        if (this.isHighVariantsProduct) {
          // updateVariantStatuses/updateDropdownButtons are skipped: availability comes from server-rendered HTML (fetchVariant replaces innerHTML; product_option_value.available is used server-side).
          const requestId = ++this._variantChangeRequestId;
          this._variantFetchAbortController?.abort();
          this._variantFetchAbortController = new AbortController();
          const signal = this._variantFetchAbortController.signal;
          this.toggleDisabledVariantOptions(true);
          try {
            await this.fetchVariant(signal);
            if (requestId !== this._variantChangeRequestId) return;
            this.postVariantResolution(this.fetchedVariantHTML);
          } catch (e) {
            if (requestId !== this._variantChangeRequestId) return;
            console.error("Variant fetch failed:", e);
            this.toggleAddButton(true, "", true);
          } finally {
            this.toggleDisabledVariantOptions(false);
          }
        } else {
          this.updateOptions();
          this.updateMasterId();
          this.updateVariantStatuses();
          this.updateDropdownButtons();
          this.postVariantResolution(null);
        }
        const variantChangeEndEvent = new CustomEvent("variantChangeEnd", {
          bubbles: true,
          composed: true,
        });
        this.dispatchEvent(variantChangeEndEvent);
      }

      toggleDisabledVariantOptions(isDisabled = true) {
        this.classList.toggle("wt-variant-options--disabled", isDisabled);
        this.setAttribute("aria-busy", isDisabled ? "true" : "false");
        this.querySelectorAll('input[type="radio"]').forEach((input) => {
          input.disabled = isDisabled;
        });
      }

      /**
       * Shared sequence after variant is resolved: gallery, pickup, error clear,
       * then either unavailable UI or media/URL/input + product info + share URL.
       * @param {Document|null} htmlOrNull - If set, apply product info from this doc (high-variant path). If null, fetch section then apply (standard path).
       */
      postVariantResolution(htmlOrNull) {
        this.updateGallery();
        this.updatePickupAvailability();
        this.removeErrorMessage();
        if (!this.currentVariant) {
          this.toggleAddButton(true, "", true);
          this.setUnavailable();
          return;
        }
        this.updateMedia();
        this.lenOfVariantOptions =
          document.querySelectorAll("variant-options").length;
        if (this.lenOfVariantOptions === 1) {
          this.updateURL();
        }
        this.updateVariantInput();
        if (htmlOrNull) {
          this.applyVariantUpdate(htmlOrNull);
        } else {
          this.renderProductInfo();
        }
        this.updateShareUrl();
      }

      /**
       * Updates price, SKU, inventory, add-button state and publishes variantChange from a section HTML document.
       * Used by both renderProductInfo (after fetch) and renderProductInfoWithoutFetch (from fetchedVariantHTML).
       */
      applyVariantUpdate(html) {
        if (!html) return;
        const sectionId = this.dataset.originalSection
          ? this.dataset.originalSection
          : this.dataset.section;
        const destination = document.getElementById(
          `price-${this.dataset.section}`,
        );
        const source = html.getElementById(`price-${sectionId}`);

        const stickyDestination = document.getElementById(`sticky-price-${this.dataset.section}`);
        const stickySource = html.getElementById(`sticky-price-${sectionId}`);

        const featuredDestination = document.getElementById(`sticky-image-${this.dataset.section}`);
        const featuredSource = html.getElementById(`sticky-image-${sectionId}`);

        const skuSource = html.getElementById(`Sku-${sectionId}`);
        const skuDestination = document.getElementById(
          `Sku-${this.dataset.section}`,
        );
        const inventorySource = html.getElementById(`Inventory-${sectionId}`);
        const inventoryDestination = document.getElementById(
          `Inventory-${this.dataset.section}`,
        );

        if (source && destination) destination.innerHTML = source.innerHTML;

        if (stickySource && stickyDestination) {
          stickyDestination.innerHTML = stickySource.innerHTML;
        }
        if (featuredDestination && featuredSource) {
          const clone = featuredSource.cloneNode(true);
          featuredDestination.replaceWith(clone);
        }
        if (inventorySource && inventoryDestination)
          inventoryDestination.innerHTML = inventorySource.innerHTML;
        if (skuSource && skuDestination) {
          skuDestination.innerHTML = skuSource.innerHTML;
          skuDestination.classList.toggle(
            "visibility-hidden",
            skuSource.classList.contains("visibility-hidden"),
          );
        }

        const price = document.getElementById(
          `price-${this.dataset.section}`,
        );
        if (price) price.classList.remove("visibility-hidden");

        if (inventoryDestination)
          inventoryDestination.classList.toggle(
            "visibility-hidden",
            inventorySource?.innerText === "",
          );

        const addButtonUpdated = html.getElementById(
          `ProductSubmitButton-${sectionId}`,
        );
        this.toggleAddButton(
          addButtonUpdated
            ? addButtonUpdated.hasAttribute("disabled")
            : true,
          window.variantStrings?.soldOut,
        );

        const btnPriceSource = addButtonUpdated?.querySelector("wt-btn-price");
        const btnPriceDestination = document
          .getElementById(`ProductSubmitButton-${this.dataset.section}`)
          ?.querySelector("wt-btn-price");
        if (btnPriceSource && btnPriceDestination) {
          btnPriceDestination.textContent = btnPriceSource.textContent;
        }

        publish(PUB_SUB_EVENTS.variantChange, {
          data: { sectionId, html, variant: this.currentVariant },
        });
      }

      updateGallery() {
        const mediaGallery = document.getElementById(
          `MediaGallery-${this.dataset.section}`,
        );

        let media_id = false;
        if (this.currentVariant && this.currentVariant.featured_media) {
          media_id = this.currentVariant.featured_media.id;
        }

        try{
          mediaGallery?.filterSlides(this.options, media_id, true);
        } catch (error) {}
      }

      updateDropdownButtons(){
        const fieldsets = Array.from(
          this.querySelectorAll(".wt-product__option"),
        );
        this.options = fieldsets.map((fieldset) => {
          return Array.from(fieldset.querySelectorAll("input")).find(
            (radio) => radio.checked,
          )?.value || '';
        });

        fieldsets.forEach((fieldset) => {
          const dropdown = fieldset.querySelector(
            ".wt-product__option__dropdown",
          );
          if (dropdown) {
            const checkedInput = fieldset.querySelector('fieldset input:checked')
            if(!checkedInput) return
            const isInputDisabled = checkedInput?.classList.contains('disabled')
            dropdown.classList.toggle('wt-product__option__dropdown--unavailable', isInputDisabled)
          }
        });
      }

      async updateOptions() {
        const fieldsets = Array.from(
          this.querySelectorAll(".wt-product__option"),
        );
        this.options = fieldsets.map((fieldset) => {
          return (
            Array.from(fieldset.querySelectorAll("input")).find(
              (radio) => radio.checked,
            )?.value || ""
          );
        });

        this.checkedOptions = fieldsets.map((fieldset) => {
          return Array.from(fieldset.querySelectorAll("input")).find(
            (radio) => radio.checked,
          ) || '';
        });

        fieldsets.forEach((fieldset, index) => {
          const selectedOption = this.options[index];

          if (!selectedOption) return;

          // .value may be pre-filled by Liquid for SSR; we overwrite for client state
          fieldset.querySelector(
            ".wt-product__option__title .value",
          ).innerHTML = selectedOption;
          const dropdownSpan = fieldset.querySelector(
            ".wt-product__option__dropdown span",
          );
          if (dropdownSpan) dropdownSpan.innerHTML = selectedOption;
        });
      }

      async fetchVariant(signal) {
        const fieldsets = Array.from(
          this.querySelectorAll(".wt-product__option"),
        );
        this.options = fieldsets.map((fieldset) => {
          return (
            Array.from(fieldset.querySelectorAll("input")).find(
              (radio) => radio.checked,
            )?.value || ""
          );
        });

        this.optionsWithIds = fieldsets.map((fieldset) => {
          return (
            Array.from(fieldset.querySelectorAll("input")).find(
              (radio) => radio.checked,
            )?.getAttribute("data-value-id") || ""
          );
        });
        const sectionId = this.dataset.originalSection
          ? this.dataset.originalSection
          : this.dataset.section;
        const url = new URL(this.dataset.url || "", window.location.origin);
        url.searchParams.set("option_values", this.optionsWithIds.join(","));
        url.searchParams.set("section_id", sectionId);
        const response = await fetch(url.toString(), { signal });
        if (!response.ok) {
          throw new Error(`Variant fetch failed: ${response.status}`);
        }
        const data = await response.text();
        if (signal?.aborted) return;
        const html = new DOMParser().parseFromString(data, "text/html");
        // For high-variants, response can be full page: scope to our section so featured product doesn't get main product's HTML
        const sectionEl = html.getElementById(`shopify-section-${sectionId}`);
        const variant = sectionEl
          ? sectionEl.querySelector("variant-options")
          : html.querySelector("variant-options");
        if (!variant) {
          throw new Error("Variant response: no variant-options element");
        }
        // Prevent re-triggering entry animations on swapped-in content
        variant
          .querySelectorAll(".scroll-trigger.animate--slide-in")
          .forEach((item) => item.classList.remove("animate--slide-in"));

        const selectedVariantScript = variant.querySelector(
          "[data-selected-variant]",
        );
        if (!selectedVariantScript) {
          throw new Error(
            "Variant response: no [data-selected-variant] script (no matching variant)",
          );
        }
        let selectedVariant = null;
        try {
          selectedVariant = JSON.parse(selectedVariantScript.textContent || "null");
        } catch (parseError) {
          throw new Error(
            "Variant response: invalid [data-selected-variant] JSON",
            { cause: parseError },
          );
        }
        if (signal?.aborted) return;
        this.currentVariant = selectedVariant;
        this.innerHTML = variant.innerHTML;
        this.fetchedVariantHTML = html;
      }

      updateMasterId() {
        this.currentVariant = this.getVariantData()?.find((variant) => {
          return !variant.options
            .map((option, index) => {
              return this.options[index] === option;
            })
            .includes(false);
        });
      }

      updateMedia() {
        if (!this.currentVariant) return;
        this.setAttribute("data-variant-id", this.currentVariant?.id);
        if (!this.currentVariant.featured_media) return;
        this.setAttribute(
          "data-featured-image",
          this.currentVariant?.featured_media?.preview_image?.src,
        );
        this.setAttribute(
          "data-featured-image-id",
          this.currentVariant?.featured_media?.id,
        );

        const modalContent = document.querySelector(
          `#ProductModal-${this.dataset.section} .product-media-modal__content`,
        );
        if (!modalContent) return;
        const newMediaModal = modalContent.querySelector(
          `[data-media-id="${this.currentVariant.featured_media.id}"]`,
        );
        modalContent.prepend(newMediaModal);
      }

      updateURL() {
        if (!this.currentVariant || this.dataset.updateUrl === "false") return;
        window.history.replaceState(
          {},
          "",
          `${this.dataset.url}?variant=${this.currentVariant.id}`,
        );
      }

      updateShareUrl() {
        const shareButton = document.getElementById(
          `Share-${this.dataset.section}`,
        );
        if (!shareButton || !shareButton.updateUrl) return;
        shareButton.updateUrl(
          `${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`,
        );
      }

      updateVariantInput() {
        const productForms = document.querySelectorAll(
          `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`,
        );
        productForms.forEach((productForm) => {
          const input = productForm.querySelector('input[name="id"]');
          if (!input) return;
          input.value = this.currentVariant.id;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });
      }

      updateVariantStatuses() {
        // const selectedOptionOneVariants = this.variantData.filter(
        //   (variant) => this.querySelector(':checked').value === variant.option1
        //   );
        const selectedOptionOneVariants = this.variantData?.filter(
          (variant) => variant.available === true,
        );
        const inputWrappers = [
          ...this.querySelectorAll(".product-form__input"),
        ];

        const checkedInputs = [...this.querySelectorAll('.product-form__input :checked')]
        const checkedInputsValues = [...this.querySelectorAll('.product-form__input :checked')].map(input => input.getAttribute('value'))

        const previousSelectedOptions = []
        inputWrappers.forEach((option, index) => {
          if (index === 0 && inputWrappers.length > 1) return;

          const optionInputs = [
            ...option.querySelectorAll('input[type="radio"], option'),
          ];
          const previousOptionSelected =
            inputWrappers[index - 1]?.querySelector(":checked")?.value;
          
            previousSelectedOptions.push(previousOptionSelected)

              const availableOptionInputsValue = selectedOptionOneVariants
              .filter(
                (variant) => {
                  if (index === 2){
                    return variant.available &&
                    variant[`option1`] === previousSelectedOptions[0] &&
                    variant[`option2`] === previousSelectedOptions[1]
                  } else {
                    return variant.available &&
                    variant[`option${index}`] === previousOptionSelected
                  }
                }
              )
              .map((variantOption) => variantOption[`option${index + 1}`]);
              this.setInputAvailability(optionInputs, availableOptionInputsValue, checkedInputsValues, index, checkedInputs);
        });
      }

      setInputAvailability(listOfOptions, listOfAvailableOptions, checkedInputsValues, index, checkedInputs) {
        // helper function to check if array contains another array
        function containsSubarray(arr, subarr) {
          return arr.join(',').includes(subarr.join(','));
        }
        
        const checkedValues = checkedInputsValues.slice(0, index)

        const listOfAvailableVariants = this.getVariantData().filter((variant) => {
          if (containsSubarray(variant.options, checkedValues)) return true;
        });

        // For 3+ options: need all previous options (positions 1..index) to have a selection so listOfAvailableVariants is correct
        const isPreviousOptionChecked =
          index === 0 ||
          Array.from({ length: index }, (_, i) => i + 1).every((pos) =>
            checkedInputs.some((inp) => inp.dataset.position === String(pos)),
          );

        const hideUnavailableOptions = this.dataset.hideUnavailableOptions !== undefined;

        // Normalize option value for comparison (JSON may have number/string, getAttribute is string)
        const norm = (v) => String(v ?? "").trim();

        listOfOptions.forEach((input) => {
          if (!isPreviousOptionChecked) return;
          if (listOfAvailableOptions.includes(input.getAttribute("value"))) {
            input.classList.remove("disabled");
          } else {
            input.classList.add("disabled");
          }

          // check if option exist. If not, it should be disabled (match by option position, not just includes)
          let inputOccurs = false;
          const inputValue = norm(input.getAttribute("value"));
          listOfAvailableVariants.forEach((variant) => {
            if (norm(variant.options[index]) === inputValue) {
              inputOccurs = true;
            }
          });

          if(!inputOccurs) input.classList.add("disabled");

          // Hide only options that don't exist (no variant); only for 2nd/3rd option, never first
          if (hideUnavailableOptions && index >= 1) {
            const listItem = input.closest("li");
            if (listItem) {
              if (!inputOccurs) {
                listItem.classList.add("wt-variant-option--hidden");
              } else {
                listItem.classList.remove("wt-variant-option--hidden");
              }
            }
          }
        });
      }

      updatePickupAvailability() {
        const pickUpAvailability = document.querySelector(
          "pickup-availability",
        );
        if (!pickUpAvailability) return;

        pickUpAvailability.dataset.variantId = this.currentVariant?.id;
        if (this.currentVariant && this.currentVariant.available) {
          pickUpAvailability.fetchAvailability(this.currentVariant.id);
        } else {
          pickUpAvailability.removeAttribute("available");
          pickUpAvailability.innerHTML = "";
        }
      }

      removeErrorMessage() {
        const section = this.closest("section");
        if (!section) return;

        const productForm = section.querySelector("product-form");
        try {
          productForm?.handleErrorMessage();
        } catch (err) {
          console.error(err);
        }
      }

      renderProductInfoWithoutFetch() {
        const requestedVariantId = this.currentVariant?.id;
        if (this.currentVariant?.id !== requestedVariantId) return;
        const html = this.fetchedVariantHTML;
        if (!html) return;
        this.applyVariantUpdate(html);
      }

      renderProductInfo() {
        const requestedVariantId = this.currentVariant?.id;
        const sectionId = this.dataset.originalSection
          ? this.dataset.originalSection
          : this.dataset.section;
        const url = new URL(this.dataset.url || "", window.location.origin);
        url.searchParams.set("variant", requestedVariantId);
        url.searchParams.set("section_id", sectionId);

        fetch(url.toString())
          .then((response) => response.text())
          .then((responseText) => {
            if (this.currentVariant?.id !== requestedVariantId) return;
            const html = new DOMParser().parseFromString(
              responseText,
              "text/html",
            );
            this.applyVariantUpdate(html);
          });
      }

      toggleAddButton(disable = true, text, modifyClass = true) {
        const productForm = document.getElementById(
          `product-form-${this.dataset.section}`,
        );
        if (!productForm) return;
        const addButton = productForm.querySelector('[name="add"]');
        const addButtonText = productForm.querySelector('[name="add"] .wt-btn__label span');
        if (!addButton || !addButtonText) return;

        if (disable) {
          addButton.setAttribute("disabled", "disabled");
          if (text) addButtonText.textContent = text;
        } else {
          addButton.removeAttribute("disabled");
          const customLabel = addButton.getAttribute("data-custom-add-label");
          if (customLabel) {
            addButtonText.innerHTML = customLabel;
          } else {
            addButtonText.textContent = window.variantStrings.addToCart;
          }
        }

        if (!modifyClass) return;
      }

      setUnavailable() {
        const button = document.getElementById(
          `product-form-${this.dataset.section}`,
        );
        const price = document.getElementById(`price-${this.dataset.section}`);
        const inventory = document.getElementById(
          `Inventory-${this.dataset.section}`,
        );
        const sku = document.getElementById(`Sku-${this.dataset.section}`);

        if (price) price.classList.add("visibility-hidden");
        if (inventory) inventory.classList.add("visibility-hidden");
        if (sku) sku.classList.add("visibility-hidden");

        if (!button) return;
        const addButton = button.querySelector('[name="add"]');
        const addButtonText = button.querySelector('[name="add"] .wt-btn__label span');
        if (!addButton || !addButtonText) return;
        addButtonText.textContent = window.variantStrings.unavailable;

        const btnPrice = button.querySelector("wt-btn-price");
        if (btnPrice) btnPrice.textContent = "";
      }

      getVariantData() {
        this.variantData =
          this.variantData ||
          JSON.parse(
            this.querySelector('[type="application/json"]').textContent,
          );
        return this.variantData;
      }
    },
  );
}
// customElements.define('variant-options', VariantOptions);
