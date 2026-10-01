if (!customElements.get("color-swatch")) {
  // Cache meta sibingów (cena+rating) per URL — współdzielony między kartami.
  const siblingMetaCache = new Map();
  customElements.define(
    "color-swatch",
    class ColorSwatch extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.initialize();
      }

      initialize() {
        this.initProperites();
        this.initButtons();
        this.initCounter();
      }

      initProperites() {
        const node = this;
        this.isProductVariations = node.dataset.productVariations === '';
        this.areFiltersActive = node.dataset.activeFilters === '';
        this.showRating = node.dataset.showRating === "true";
        this.container = node.querySelector(".card__container");
        this.adnotation = node.querySelector(".card");
        this.titleAdnotation = node.querySelector(".card__title a");
        this.color_swatcher_container = this.container.querySelector(
          ".card__color-swatcher--container",
        );
        this.color_swatcher_wrappers = this.container.querySelectorAll(
          ".color-swatcher--wrapper",
        );
        this.color_swatcher_counter = this.container.querySelector(
          ".color-swatcher--counter",
        );
        [this.img, this.hover_img] =
        this.container.querySelectorAll(".card__img");
        this.titleEl = node.querySelector(".card__title");
        this.video = this.querySelector("video");
        this.clicked_href = this.adnotation.getAttribute("href");
        this.clicked_img = this.img?.getAttribute("src");
        this.clicked_srcset = this.img?.getAttribute("srcset");
        this.clicked_hover_img = this.hover_img?.getAttribute("src");
        this.clicked_hover_srcset= this.hover_img?.getAttribute("srcset");
        this.quickAdds = this.querySelectorAll("quick-add");

        this.loader = this.querySelector(".card__loader");
        this.priceEl = this.container?.querySelector(".card__price");
        this.ratingSlot = this.container?.querySelector(".card__rating-slot");
        this.hideWhenNoReviews = this.dataset.hideWhenNoReviews === 'true';


        this.optionsAsColorSwatches = this.color_swatcher_container?.dataset.optionsAsColorSwatches?.split(",") || [];
      }

      initCounter() {
        if (this.color_swatcher_wrappers?.length > 4) {
          this.color_swatcher_counter.innerHTML += `+ ${this.color_swatcher_wrappers.length - 4}`;
          this.color_swatcher_counter.addEventListener("click", () =>
            this.showAllWrappers(),
          );
        }
      }

      showAllWrappers() {
        this.color_swatcher_wrappers.forEach((wrapper) =>
          wrapper.classList.remove("hidden"),
        );
        this.color_swatcher_counter.classList.add("hidden");
      }

      initButtons() {
        this.isCheckedOption = 0;
        this.isCheckedActiveFilter = false;
        
        if (this.color_swatcher_wrappers) {
          this.sortButtons();
          this.color_swatcher_wrappers.forEach((wrapper, index) => {
            const button = wrapper.querySelector(".color-swatcher");
            const attributes = this.getButtonAttributes(button);
            const tooltip = wrapper.querySelector(".color-swatcher--tooltip");
            
            if (index > 3) {
              wrapper.classList.add("hidden");
            }
            
            // find filter color and preselect it 
            if(!this.isCheckedActiveFilter){
              const isActiveSwatch = button.dataset.activeSwatch === '';

              if(this.isProductVariations && this.areFiltersActive){
                const currentVariantHandle = this.dataset.currentVariantHandle;
                if(currentVariantHandle === attributes.button_product_handle){
                  this.handleClickEvent(wrapper, attributes, true)
                  this.isCheckedActiveFilter = true;
                }
              } else if (isActiveSwatch) {
                  this.handleClickEvent(wrapper, attributes, true)
                  this.isCheckedActiveFilter = true;
              }
          }

            this.assignWrapperEvents(wrapper, attributes, tooltip);
          });
        }

        if (this.color_swatcher_container) {
          this.color_swatcher_container.addEventListener("mouseleave", () =>
            this.restoreAttributes(),
          );
        }
      }

      getButtonAttributes(button) {
        return {
          dataColor: button.getAttribute("data-color"),
          button_href: button.getAttribute("data-href"),
          button_img: button.getAttribute("data-img"),
          button_srcset: button.getAttribute("data-srcset"),
          button_hover: button.getAttribute("data-hover"),
          button_hover_srcset: button.getAttribute("data-hover-srcset"),
          button_product_handle: button.getAttribute("data-product-handle"),
          button_title: button.getAttribute("data-title"),
        };
      }

      assignWrapperEvents(wrapper, attributes, tooltip) {
        wrapper.addEventListener("click", () =>
          this.handleClickEvent(wrapper, attributes),
        );
        wrapper.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            this.handleClickEvent(wrapper, attributes);
          }
        });
        wrapper.addEventListener("mouseover", () =>
          this.handleMouseOverEvent(wrapper, attributes, tooltip),
        );
        wrapper.addEventListener("mouseout", () =>
          this.handleMouseOutEvent(tooltip),
        );
      }

      handleClickEvent(
        wrapper,
        { button_href, button_img, button_hover, button_srcset, button_hover_srcset, button_product_handle, button_title },
        skipMeta,
      ) {
        if(!button_img) return

        this.showLoader();
        this.img.classList.remove("hidden");
        this.img.onload = () => {
          this.hideLoader();
          this.img.onload = null;
        };

        this.setAttributes(this.adnotation, { href: button_href });
        this.setAttributes(this.img, { src: button_img });
        this.setAttributes(this.img, { srcset: button_srcset });
        this.setAttributes(this.adnotation, { href: button_href });
        this.setAttributes(this.titleAdnotation, { href: button_href });

        this.quickAdds?.forEach((quickAdd) => {
          quickAdd.setAttribute("data-product-handle", button_product_handle);
          quickAdd.querySelector("button").dataset.productUrl = button_href;
        });

        if (this.isProductVariations && !skipMeta) {
          if (button_title && this.titleAdnotation) {
            this.titleAdnotation.textContent = button_title;
          }
          this.loadSiblingMeta(button_href);
        }
        this.checkHoverImage(button_hover, button_hover_srcset);
        this.color_swatcher_wrappers.forEach((wrap) => {
          wrap.classList.remove("active");
        });
        this.clicked_href = button_href;
        this.clicked_img = button_img;
        this.clicked_srcset = button_srcset;
        this.clicked_hover_img = button_hover;
        this.clicked_hover_srcset = button_hover_srcset;
        wrapper.classList.add("active");

        this.video?.classList.add("hidden");
        this.isVideoHidden = true;
      }

      showLoader() {
        this.loader.classList.remove("hidden");
        this.loader.innerHTML = '<div class="spinner-ring"></div>';
        if (!this.img) return;
        this.img.style.opacity = 0;
      }

      hideLoader() {
        this.loader.classList.add("hidden");
        this.loader.innerHTML = "";
        if (!this.img) return;
        this.img.style.opacity = 1;
      }

      // Product siblings (tylko tryb variations): dociągnięcie ceny+ratingu sibinga
      // z lekkiego widoku (cache per URL). Tytuł idzie z data-title (bez fetcha).
      fetchSiblingMeta(url) {
        if (!url) return Promise.reject(new Error("no url"));
        if (siblingMetaCache.has(url)) return siblingMetaCache.get(url);

        const u = new URL(url, window.location.origin);
        u.searchParams.set("view", "card-pro-sibling");

        const promise = fetch(u.toString())
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.text();
          })
          .then((html) => {
            const doc = new DOMParser().parseFromString(html, "text/html");
            return {
              priceHtml: doc.querySelector("[data-sib-price]")?.innerHTML || "",
              ratingHtml: doc.querySelector("[data-sib-rating]")?.innerHTML || "",
              ratingValue: doc.querySelector("[data-sib-rating]")?.dataset.sibRatingValue || "",
            };
          })
          .catch((err) => {
            siblingMetaCache.delete(url);
            throw err;
          });

        siblingMetaCache.set(url, promise);
        return promise;
      }

      prefetchSiblingMeta(url) {
        this.fetchSiblingMeta(url).catch(() => {});
      }

      loadSiblingMeta(url) {
        // Guard na race: jeśli w międzyczasie kliknięto inny swatch, porzuć wynik.
        this._activeMetaUrl = url;
        this.fetchSiblingMeta(url)
          .then((meta) => {
            if (url !== this._activeMetaUrl) return;
            if (this.priceEl && meta.priceHtml) this.priceEl.innerHTML = meta.priceHtml;

            if (!this.ratingSlot || !this.showRating) return;
            this.ratingSlot.innerHTML =
              this.hideWhenNoReviews && meta.ratingValue === '' ? '' : meta.ratingHtml;
          })
          .catch(() => {});
      }

      handleMouseOverEvent(
        wrapper,
        { button_href, button_img, button_hover, button_srcset, button_hover_srcset },
        tooltip,
      ) {
        if (this.isProductVariations) this.prefetchSiblingMeta(button_href);
        if(!this.img?.src?.includes(button_img) || this.img?.classList.contains("hidden")){
        this.showLoader();
        this.img.classList.remove("hidden");
        this.img.onload = () => {
          this.hideLoader();
          this.img.onload = null;
        };

        this.setAttributes(this.adnotation, { href: button_href });
        this.setAttributes(this.img, { src: button_img });
        this.setAttributes(this.img, { srcset: button_srcset });
        this.setAttributes(this.titleAdnotation, { href: button_href });
      }

        this.checkHoverImage(button_hover, button_hover_srcset);
        tooltip.classList.remove("hidden");
        this.setTooltipPosition(tooltip);
      }

      handleMouseOutEvent(tooltip) {
        tooltip.classList.add("hidden");
        tooltip.classList.remove(
          "color-swatcher--tooltip-left",
          "color-swatcher--tooltip-right",
        );
      }

      setTooltipPosition(tooltip) {
        const coords = tooltip.getBoundingClientRect();
        const screenWidth = window.innerWidth;

        if (!coords) return;

        if (coords.x < 0) {
          tooltip.classList.add("color-swatcher--tooltip-left");
        } else if (coords.right > screenWidth) {
          tooltip.classList.add("color-swatcher--tooltip-right");
        }
      }

      setFirstOptionActive() {
        const wrapper = this.color_swatcher_wrappers[0];
        if (wrapper) {
          const button = wrapper.querySelector(".color-swatcher");
          const attributes = this.getButtonAttributes(button);
          this.setAttributes(this.adnotation, { href: attributes.button_href });
          this.setAttributes(this.titleAdnotation, { href: attributes.button_href });
          this.setAttributes(this.img, { src: attributes.button_img });
          this.setAttributes(this.img, { srcset: attributes.button_srcset });
          this.checkHoverImage(attributes.button_hover, attributes.button_hover_srcset);
          wrapper.classList.add("active");
        }
      }

      restoreAttributes() {
        this.setAttributes(this.adnotation, { href: this.clicked_href });
        this.setAttributes(this.titleAdnotation, { href: this.clicked_href });
        this.setAttributes(this.img, { src: this.clicked_img });
        this.setAttributes(this.img, { srcset: this.clicked_srcset });
        this.checkHoverImage(this.clicked_hover_img, this.clicked_hover_srcset);
      }

      sortButtons() {
        if (this.color_swatcher_wrappers) {
          const newArr = Array.from(this.color_swatcher_wrappers).sort(
            (a, b) => {
              const classA = a.classList?.contains("unavailable");
              const classB = b.classList?.contains("unavailable");
              return classA && !classB ? 1 : !classA && classB ? -1 : 0;
            },
          );

          if (this.color_swatcher_container) {
            this.color_swatcher_container.innerHTML = "";
          }

          newArr.forEach((el) => this.color_swatcher_container.append(el));
          this.createCounterSpan();
          this.color_swatcher_wrappers = this.container.querySelectorAll(
            ".color-swatcher--wrapper",
          );
          this.color_swatcher_counter = this.container.querySelector(
            ".color-swatcher--counter",
          );
        }
      }

      createCounterSpan() {
        const counter_span = document.createElement("span");
        counter_span.classList.add("color-swatcher--counter");
        this.color_swatcher_container?.appendChild(counter_span);
      }

      setAttributes(element, attrs) {
        for (let key in attrs) {
          element?.setAttribute(key, attrs[key]);
        }
      }

      checkHoverImage(button_hover, button_hover_srcset) {
        if (button_hover && this.hover_img) {
          this.setAttributes(this.hover_img, { src: button_hover });
          if (button_hover_srcset) {
            this.setAttributes(this.hover_img, { srcset: button_hover_srcset });
          }
        }
      }
    },
  );
}
