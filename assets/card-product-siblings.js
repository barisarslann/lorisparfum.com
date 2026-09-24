/**
 * <card-product-siblings> — product-siblings swatche na card-pro.
 */
if (!customElements.get("card-product-siblings")) {
  const fragmentCache = new Map();

  customElements.define(
    "card-product-siblings",
    class CardProductSiblings extends HTMLElement {
      connectedCallback() {
        if (!this.hasAttribute("data-card-siblings")) return;

        this.container = this.querySelector(".card__color-swatcher--container");
        if (!this.container) return;

        this.gallery = this.querySelector("card-gallery");
        this.track = this.querySelector("[data-gallery-track]");
        this.indicator = this.querySelector("[data-gallery-indicator]");
        this.cardLink = this.querySelector(".card");
        this.titleLink = this.querySelector(".card__title a");
        this.priceEl = this.querySelector(".card__price");
        this.ratingSlot = this.querySelector(".card__rating-slot");
        this.quickAdds = this.querySelectorAll("quick-add");
        this.qbp = this.querySelector("quick-size-picker");
        this.loader = this.querySelector(".card__loader");

        this.galleryLimit = parseInt(this.dataset.galleryLimit, 10) || 5;
        this.showRating = this.dataset.showRating === "true";
        this.hideWhenNoReviews = this.dataset.hideWhenNoReviews === 'true';


        this.sortButtons();
        this.wrappers = Array.from(
          this.container.querySelectorAll(".color-swatcher--wrapper"),
        );
        this.initCounter();

        this.wrappers.forEach((wrapper, index) => {
          if (index > 3) wrapper.classList.add("hidden");
          const tooltip = wrapper.querySelector(".color-swatcher--tooltip");
          wrapper.addEventListener("click", () => this.select(wrapper));
          wrapper.addEventListener("keydown", (e) => {
            if (e.key === "Enter") this.select(wrapper);
          });
          wrapper.addEventListener("mouseenter", () =>
            this.prefetch(wrapper.dataset.siblingUrl),
          );
          wrapper.addEventListener("focusin", () =>
            this.prefetch(wrapper.dataset.siblingUrl),
          );
          if (tooltip) {
            wrapper.addEventListener("mouseover", () => this.showTooltip(tooltip));
            wrapper.addEventListener("mouseout", () => this.hideTooltip(tooltip));
          }
        });
      }

      fetchFragment(url) {
        if (!url) return Promise.reject(new Error("no url"));
        if (fragmentCache.has(url)) return fragmentCache.get(url);

        const u = new URL(url, window.location.origin);
        u.searchParams.set("view", "card-pro-sibling");

        const promise = fetch(u.toString())
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.text();
          })
          .then((html) => {
            const doc = new DOMParser().parseFromString(html, "text/html");
            const qbpEl = doc.querySelector("[data-sib-qbp]");
            return {
              trackHtml: doc.querySelector("[data-sib-track]")?.innerHTML || "",
              priceHtml: doc.querySelector("[data-sib-price]")?.innerHTML || "",
              ratingHtml: doc.querySelector("[data-sib-rating]")?.innerHTML || "",
              ratingValue: doc.querySelector("[data-sib-rating]")?.dataset.sibRatingValue || "",
              qbpRowsHtml:
                doc.querySelector("[data-sib-qbp-rows]")?.innerHTML || "",
              qbpSingleId: qbpEl?.dataset.singleId || "",
              qbpSingleAvailable: qbpEl?.dataset.singleAvailable === "true",
            };
          })
          .catch((err) => {
            fragmentCache.delete(url);
            throw err;
          });

        fragmentCache.set(url, promise);
        return promise;
      }

      prefetch(url) {
        this.fetchFragment(url).catch(() => {});
      }

      async select(wrapper) {
        if (wrapper.classList.contains("active")) return;
        const url = wrapper.dataset.siblingUrl;
        const handle = wrapper.dataset.siblingHandle;
        const title = wrapper.dataset.siblingTitle;

        const prevActive = this.container.querySelector(
          ".color-swatcher--wrapper.active",
        );
        this.wrappers.forEach((w) => w.classList.remove("active"));
        wrapper.classList.add("active");
        this.showLoader();
        // Guard na race: jeśli w międzyczasie kliknięto inny swatch, porzuć wynik.
        this._activeUrl = url;

        let data;
        try {
          data = await this.fetchFragment(url);
        } catch (err) {
          wrapper.classList.remove("active");
          prevActive?.classList.add("active");
          this.hideLoader();
          return;
        }

        if (url !== this._activeUrl) return;

        if (this.track) {
          const temp = document.createElement("div");
          temp.innerHTML = data.trackHtml;
          const slides = Array.from(
            temp.querySelectorAll(".card-pro__gallery-slide"),
          ).slice(0, this.galleryLimit);
          this.track.innerHTML = "";
          slides.forEach((s) => this.track.appendChild(s));
          this.rebuildIndicator();
          this.gallery?.refresh?.();
          this.bindLoader();
        } else {
          this.hideLoader();
        }

        if (this.titleLink) {
          this.titleLink.textContent = title;
          if (url) this.titleLink.setAttribute("href", url);
        }
        if (url) this.cardLink?.setAttribute("href", url);

        if (this.priceEl && data.priceHtml) this.priceEl.innerHTML = data.priceHtml;



        this.quickAdds?.forEach((qa) => {
          if (handle) qa.setAttribute("data-product-handle", handle);
          const btn = qa.querySelector("button");
          if (btn && url) btn.dataset.productUrl = url;
        });

        this.qbp?.refreshVariants?.({
          rowsHtml: data.qbpRowsHtml,
          singleId: data.qbpSingleId,
          singleAvailable: data.qbpSingleAvailable,
        });

        if (!this.ratingSlot || !this.showRating) return;
        this.ratingSlot.innerHTML =
          this.hideWhenNoReviews && data.ratingValue === '' ? '' : data.ratingHtml;
      }

      rebuildIndicator() {
        if (!this.indicator) return;
        const count = this.track.querySelectorAll(".card-pro__gallery-slide").length;
        this.indicator.innerHTML = "";
        for (let i = 0; i < count; i++) {
          const seg = document.createElement("span");
          seg.className =
            "card-pro__gallery-indicator__seg" + (i === 0 ? " is-active" : "");
          this.indicator.appendChild(seg);
        }
      }

      bindLoader() {
        const firstImg = this.track.querySelector("img");
        if (firstImg && !firstImg.complete) {
          firstImg.addEventListener("load", () => this.hideLoader(), { once: true });
          firstImg.addEventListener("error", () => this.hideLoader(), { once: true });
        } else {
          this.hideLoader();
        }
      }

      showLoader() {
        if (!this.loader) return;
        this.loader.classList.remove("hidden");
        this.loader.innerHTML = '<div class="spinner-ring"></div>';
      }

      hideLoader() {
        if (!this.loader) return;
        this.loader.classList.add("hidden");
        this.loader.innerHTML = "";
      }

      showTooltip(tooltip) {
        tooltip.classList.remove("hidden");
        const coords = tooltip.getBoundingClientRect();
        if (coords.x < 0) tooltip.classList.add("color-swatcher--tooltip-left");
        else if (coords.right > window.innerWidth)
          tooltip.classList.add("color-swatcher--tooltip-right");
      }

      hideTooltip(tooltip) {
        tooltip.classList.add("hidden");
        tooltip.classList.remove(
          "color-swatcher--tooltip-left",
          "color-swatcher--tooltip-right",
        );
      }

      initCounter() {
        if (this.wrappers.length <= 4) return;
        this.counter = this.container.querySelector(".color-swatcher--counter");
        if (!this.counter) {
          this.counter = document.createElement("span");
          this.counter.classList.add("color-swatcher--counter");
          this.container.appendChild(this.counter);
        }
        this.counter.innerHTML += `+ ${this.wrappers.length - 4}`;
        this.counter.addEventListener("click", () => this.showAll());
      }

      showAll() {
        this.wrappers.forEach((w) => w.classList.remove("hidden"));
        this.counter?.classList.add("hidden");
      }

      sortButtons() {
        const arr = Array.from(
          this.container.querySelectorAll(".color-swatcher--wrapper"),
        );
        this.container.innerHTML = "";
        arr.forEach((el) => this.container.append(el));
        const counter = document.createElement("span");
        counter.classList.add("color-swatcher--counter");
        this.container.appendChild(counter);
      }
    },
  );
}
