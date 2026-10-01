if (!customElements.get("load-more-pagination")) {
  customElements.define(
    "load-more-pagination",
    class LoadMorePagination extends HTMLElement {
      connectedCallback() {
        this.gridId = this.dataset.gridId || "product-grid";
        this.grid = document.getElementById(this.gridId);
        if (!this.grid) return;

        this.total = parseInt(this.dataset.total, 10) || 0;
        this.sectionId = this.dataset.sectionId;
        this.showingTemplate = this.dataset.showingTemplate || "";

        // Cumulative count of products from page 1 through the furthest loaded page.
        // On a mid-collection refresh (e.g. ?page=4) the grid only holds the current
        // page's cards, but the server seeds data-loaded with the full page-1..current
        // total so the counter/progress stay truthful. Loading "next" extends the top
        // boundary (+= appended); loading "previous" backfills already-counted pages, so
        // it must NOT change the count. Fall back to the DOM count if the attr is absent.
        this.loaded = parseInt(this.dataset.loaded, 10) || this.items.length;

        this.barFill = this.querySelector(".wt-load-more__bar-fill");
        this.count = this.querySelector(".wt-load-more__count");
        this.nextButton = this.querySelector("[data-load-more]");
        this.prevButton = this.grid.querySelector("[data-load-prev]");

        this._onNext = this.onNext.bind(this);
        this._onPrev = this.onPrev.bind(this);

        if (this.nextButton) {
          this.nextButton.addEventListener("click", this._onNext);
        }

        if (this.prevButton) {
          this.prevButton.addEventListener("click", this._onPrev);
        }

        this.updateProgress();
      }

      disconnectedCallback() {
        if (this.nextButton) {
          this.nextButton.removeEventListener("click", this._onNext);
        }
        if (this.prevButton) {
          this.prevButton.removeEventListener("click", this._onPrev);
        }
      }

      get items() {
        return this.grid.querySelectorAll(".collection__grid__item");
      }

      onNext(event) {
        event.preventDefault();
        this.load(this.nextButton, "next");
      }

      onPrev(event) {
        event.preventDefault();
        this.load(this.prevButton, "previous");
      }

      load(button, direction) {
        if (!button || this.loading) return;
        const url = button.getAttribute("href");
        if (!url) return;

        this.loading = true;
        button.setAttribute("aria-busy", "true");
        button.classList.add("is-loading");

        fetch(this.sectionUrl(url))
          .then((response) => response.text())
          .then((text) => {
            const doc = new DOMParser().parseFromString(text, "text/html");
            const fetchedGrid = doc.getElementById(this.gridId);
            if (!fetchedGrid) return;

            const newItems = Array.from(
              fetchedGrid.querySelectorAll(".collection__grid__item"),
            );
            if (!newItems.length) return;

            if (direction === "next") {
              this.appendItems(newItems);
              this.loaded += newItems.length;
            } else {
              this.prependItems(newItems);
            }

            this.updateButton(doc, button, direction);
            this.updateProgress();

            if (typeof initializeScrollAnimationTrigger === "function") {
              initializeScrollAnimationTrigger();
            }

            history.replaceState({}, "", url);
          })
          .catch(() => {})
          .finally(() => {
            this.loading = false;
            button.removeAttribute("aria-busy");
            button.classList.remove("is-loading");
          });
      }

      appendItems(newItems) {
        const items = this.items;
        const anchor = items[items.length - 1];
        if (anchor) anchor.after(...newItems);
        else this.grid.append(...newItems);
      }

      prependItems(newItems) {
        const previousHeight = document.body.scrollHeight;
        const anchor = this.items[0];
        if (anchor) anchor.before(...newItems);
        else this.grid.prepend(...newItems);
        window.scrollBy(0, document.body.scrollHeight - previousHeight);
      }

      updateButton(doc, button, direction) {
        const fetched = doc.querySelector("load-more-pagination");
        const nextUrl = fetched && fetched.dataset.nextUrl;
        const prevUrl = fetched && fetched.dataset.prevUrl;
        const url = direction === "next" ? nextUrl : prevUrl;

        if (url) button.setAttribute("href", url);
        else button.hidden = true;
      }

      updateProgress() {
        if (this.barFill && this.total > 0) {
          const pct = Math.min(100, Math.round((this.loaded / this.total) * 100));
          this.barFill.style.setProperty("--wt-load-more-progress", `${pct}%`);
        }

        if (this.count && this.showingTemplate) {
          this.count.textContent = this.showingTemplate.replace(
            "%count%",
            this.loaded,
          );
        }
      }

      sectionUrl(url) {
        if (!this.sectionId) return url;
        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}section_id=${this.sectionId}`;
      }
    },
  );
}
