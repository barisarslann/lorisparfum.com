/**
 * <card-gallery> — lightweight image/video gallery on the product card.
 */
if (!customElements.get("card-gallery")) {
  customElements.define(
    "card-gallery",
    class CardGallery extends HTMLElement {
      connectedCallback() {
        if (!this.hasAttribute("data-card-gallery")) return;

        this.track = this.querySelector("[data-gallery-track]");
        if (!this.track) return;

        this.slides = Array.from(this.track.children);

        if (window.matchMedia("(pointer: coarse)").matches) {
          this.track.classList.add("swiper-no-swiping");
          const stopStart = (e) => e.stopPropagation();
          this.track.addEventListener("pointerdown", stopStart);
          this.track.addEventListener("touchstart", stopStart, { passive: true });
        }

        this.prevBtn = this.querySelector("[data-gallery-prev]");
        this.nextBtn = this.querySelector("[data-gallery-next]");
        this.buttons = this.querySelector("[data-gallery-buttons]");
        this.indicator = this.querySelector("[data-gallery-indicator]");
        this.status = this.querySelector("[data-gallery-status]");
        this.ofWord = this.dataset.galleryOf || "/";
        this.segments = Array.from(
          this.querySelectorAll("[data-gallery-indicator] > *"),
        );
        this.index = 0;
        this.slideWidth = 0;
        this._ticking = false;
        this._announce = false;

        this.onScroll = this.onScroll.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.track.addEventListener("scroll", this.onScroll, { passive: true });
        this.addEventListener("keydown", this.onKeydown);

        this.prevBtn?.addEventListener("click", (e) => this.onArrow(e, -1));
        this.nextBtn?.addEventListener("click", (e) => this.onArrow(e, 1));

        if ("ResizeObserver" in window) {
          this._resizeObserver = new ResizeObserver(() => this.layout());
          this._resizeObserver.observe(this.track);
        }

        this.layout();
        this.update();
        this._announce = true;
      }

      disconnectedCallback() {
        this.track?.removeEventListener("scroll", this.onScroll);
        this.removeEventListener("keydown", this.onKeydown);
        this._resizeObserver?.disconnect();
      }

      layout() {
      }

      onArrow(e, dir) {
        e.preventDefault();
        this.goTo(this.index + dir);
        if (e.detail !== 0) e.currentTarget.blur();
      }

      onKeydown(e) {
        if (this.slides.length < 2) return;
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        // don't hijack keys typed inside the quick-buy picker
        if (e.target.closest(".card-pro__qbp")) return;
        let target;
        switch (e.key) {
          case "ArrowLeft":
            target = this.index - 1;
            break;
          case "ArrowRight":
            target = this.index + 1;
            break;
          case "Home":
            target = 0;
            break;
          case "End":
            target = this.slides.length - 1;
            break;
          default:
            return;
        }
        e.preventDefault();
        this.goTo(target);
      }

      onScroll() {
        if (this._ticking) return;
        this._ticking = true;
        requestAnimationFrame(() => {
          const width = this.slideWidth || this.track.clientWidth || 1;
          const next = Math.round(this.track.scrollLeft / width);
          if (next !== this.index) {
            this.index = next;
            this.update();
          }
          this._ticking = false;
        });
      }

      goTo(target) {
        const last = this.slides.length - 1;
        const index = Math.max(0, Math.min(target, last));
        const width = this.slideWidth || this.track.clientWidth;
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        this.track.scrollTo({
          left: index * width,
          behavior: reduce ? "auto" : "smooth",
        });
      }

      update() {
        const last = this.slides.length - 1;
        const single = this.slides.length < 2;
        this.segments.forEach((seg, i) =>
          seg.classList.toggle("is-active", i === this.index),
        );
        const prevDisabled = this.index <= 0;
        const nextDisabled = this.index >= last;
        // Keep keyboard focus alive when the focused arrow reaches an end and is
        // about to be disabled — hand focus to the opposite (still enabled) arrow.
        if (prevDisabled && this.prevBtn && document.activeElement === this.prevBtn) {
          this.nextBtn?.focus();
        } else if (
          nextDisabled &&
          this.nextBtn &&
          document.activeElement === this.nextBtn
        ) {
          this.prevBtn?.focus();
        }
        this.prevBtn?.toggleAttribute("disabled", prevDisabled);
        this.nextBtn?.toggleAttribute("disabled", nextDisabled);
        this.buttons?.classList.toggle("card-pro__gallery-buttons--hidden", single);
        this.indicator?.classList.toggle(
          "card-pro__gallery-indicator--hidden",
          single,
        );
        if (this.status && this._announce && !single) {
          this.status.textContent = `${this.index + 1} ${this.ofWord} ${this.slides.length}`;
        }
      }

      refresh() {
        if (!this.track) return;
        this.slides = Array.from(this.track.children);
        this.segments = Array.from(
          this.querySelectorAll("[data-gallery-indicator] > *"),
        );
        this.index = 0;
        this.slideWidth = 0;
        this.track.scrollLeft = 0;
        this.layout();
        this.update();
      }
    },
  );
}
