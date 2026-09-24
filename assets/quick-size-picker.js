if (!customElements.get("quick-size-picker")) {
  customElements.define(
    "quick-size-picker",
    class QuickSizePicker extends HTMLElement {
      connectedCallback() {
        this.mode = this.dataset.mode || "picker";
        this.cartType = this.dataset.cartType || "drawer";
        this.trigger = this.querySelector("[data-qbp-trigger]");
        if (!this.trigger) return;

        if (this.mode === "single") {
          this.trigger.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.dataset.available === "false") return;
            this.addVariant(this.dataset.variantId, this.trigger);
          });
          return;
        }

        if (this.mode === "fallback") {
          const inner = this.querySelector(
            "quick-add button, .card-pro__qbp-fallback button",
          );
          this.trigger.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            inner?.click();
          });
          return;
        }

        this.sheet = this.querySelector("[data-qbp-sheet]");
        this.list = this.querySelector(".card-pro__qbp-list");
        this.closeBtn = this.querySelector("[data-qbp-close]");
        this.rows = Array.from(this.querySelectorAll(".card-pro__qbp-row"));

        this.trigger.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.openSheet(e.detail === 0);
        });
        this.closeBtn?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.closeSheet(false, e.detail === 0);
        });
        this.sheet?.addEventListener("click", (e) => {
          if (e.target === this.sheet) this.closeSheet();
        });
        this.sheet?.addEventListener("close", () => {
          this.trigger.setAttribute("aria-expanded", "false");
        });

        this.rows.forEach((row) => {
          if (row.dataset.available !== "true") return;
          row.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.addVariant(row.dataset.variantId, row);
          });
        });

        this.setupSwipe();
        this.setupSizeGuide();

        this.list?.addEventListener(
          "scroll",
          () => this.updateScrollHint(),
          { passive: true },
        );
      }

      setupSizeGuide() {
        const guide = this.querySelector("[data-qbp-guide]");
        const open = this.querySelector("[data-qbp-guide-open]");
        if (!guide || !open) return;

        const closeGuide = () => {
          if (typeof guide.close === "function" && guide.open) guide.close();
          else guide.removeAttribute("open");
        };

        open.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof guide.showModal === "function") guide.showModal();
          else guide.setAttribute("open", "");
        });
        guide
          .querySelector("[data-qbp-guide-close]")
          ?.addEventListener("click", (e) => {
            e.preventDefault();
            closeGuide();
          });
        guide.addEventListener("click", (e) => {
          if (e.target === guide) closeGuide();
        });
      }

      updateScrollHint() {
        if (!this.list) return;
        const canScroll = this.list.scrollHeight > this.list.clientHeight + 1;
        const atBottom =
          this.list.scrollTop + this.list.clientHeight >=
          this.list.scrollHeight - 1;
        this.classList.toggle(
          "card-pro__qbp--scroll-hint",
          canScroll && !atBottom,
        );
      }

      setupSwipe() {
        if (!this.sheet) return;
        const THRESHOLD = 80;
        let startY = 0;
        let dy = 0;
        let dragging = false;

        const onDown = (e) => {
          if (this.isDesktop) return;
          if (!e.target.closest("[data-qbp-grabber], .card-pro__qbp-head")) return;
          if (
            e.target.closest(
              "[data-qbp-close], [data-qbp-guide-open], [data-qbp-guide]",
            )
          )
            return;
          dragging = true;
          startY = e.clientY;
          dy = 0;
          this.sheet.style.transition = "none";
          this.sheet.setPointerCapture?.(e.pointerId);
        };

        const onMove = (e) => {
          if (!dragging) return;
          dy = Math.max(0, e.clientY - startY);
          this.sheet.style.transform = `translateY(${dy}px)`;
        };

        const onUp = () => {
          if (!dragging) return;
          dragging = false;
          this.sheet.style.transition = "";
          this.sheet.style.transform = "";
          if (dy > THRESHOLD) this.closeSheet();
        };

        this.sheet.addEventListener("pointerdown", onDown);
        this.sheet.addEventListener("pointermove", onMove);
        this.sheet.addEventListener("pointerup", onUp);
        this.sheet.addEventListener("pointercancel", onUp);
      }

      get isDesktop() {
        return window.matchMedia("(min-width: 900px)").matches;
      }

      openSheet(keyboardOpen) {
        if (!this.sheet || this.sheet.open) return;
        this.trigger.setAttribute("aria-expanded", "true");

        if (this.isDesktop && typeof this.sheet.show === "function") {
          // show at the start position (translateY 100%), force reflow to commit it,
          // then add --inline-open so the transition slides it up. Removing the class in
          // closeSheet slides it back down — one transition both ways, no flicker.
          this.sheet.show();
          void this.sheet.offsetWidth;
          this.classList.add("card-pro__qbp--inline-open");
          this.bindDismiss();
        } else if (typeof this.sheet.showModal === "function") {
          this.sheet.showModal();
        } else {
          this.sheet.setAttribute("open", "");
        }

        if (
          !keyboardOpen &&
          document.activeElement &&
          this.sheet.contains(document.activeElement)
        ) {
          document.activeElement.blur();
        }

        requestAnimationFrame(() => this.updateScrollHint());
      }

      bindDismiss() {
        this._onDocClick = (e) => {
          if (this.sheet.contains(e.target) || this.trigger.contains(e.target)) return;
          const gallery = this.closest(".card-pro__gallery");
          if (gallery && gallery.contains(e.target)) {
            e.preventDefault();
            e.stopPropagation();
          }
          this.closeSheet();
        };
        this._onEsc = (e) => {
          if (e.key === "Escape") this.closeSheet(false, true);
        };
        setTimeout(() => {
          document.addEventListener("click", this._onDocClick, true);
          document.addEventListener("keydown", this._onEsc, true);
        });
      }

      unbindDismiss() {
        if (this._onDocClick)
          document.removeEventListener("click", this._onDocClick, true);
        if (this._onEsc)
          document.removeEventListener("keydown", this._onEsc, true);
      }

      disconnectedCallback() {
        this.unbindDismiss();
      }

      closeSheet(instant, keepFocus) {
        if (!this.sheet) return;

        const finalize = () => {
          if (typeof this.sheet.close === "function" && this.sheet.open) {
            this.sheet.close();
          } else {
            this.sheet.removeAttribute("open");
          }
          this.classList.remove("card-pro__qbp--inline-open");
          this.classList.remove("card-pro__qbp--scroll-hint");
          if (!keepFocus) this.trigger.blur();
        };

        this.unbindDismiss();
        this.trigger.setAttribute("aria-expanded", "false");

        // Desktop (non-modal): slide the panel back down first, then close it when the
        // transition ends. Removing --inline-open drives the same transition used to open,
        // so it's flicker-free. Timeout backstops the no-transition case (reduced-motion).
        if (
          !instant &&
          this.isDesktop &&
          this.classList.contains("card-pro__qbp--inline-open")
        ) {
          let done = false;
          const wrap = () => {
            if (done) return;
            done = true;
            this.sheet.removeEventListener("transitionend", onEnd);
            finalize();
          };
          const onEnd = (e) => {
            if (e.target === this.sheet && e.propertyName === "transform") wrap();
          };
          this.sheet.addEventListener("transitionend", onEnd);
          this.classList.remove("card-pro__qbp--inline-open");
          setTimeout(wrap, 400);
          return;
        }

        // Mobile (modal, animates via its own @starting-style) / instant close.
        if (instant) this.sheet.style.transition = "none";
        finalize();
        if (instant) {
          requestAnimationFrame(() => {
            this.sheet.style.transition = "";
          });
        }
      }

      setLoading(el, loading) {
        el?.classList.toggle("is-loading", loading);
        el?.toggleAttribute("aria-busy", loading);
      }

      refreshVariants({ rowsHtml, singleId, singleAvailable } = {}) {
        if (this.mode === "single") {
          if (singleId) this.dataset.variantId = singleId;
          this.dataset.available = singleAvailable ? "true" : "false";
          const unavailable = this.dataset.available === "false";
          if (this.trigger) {
            this.trigger.disabled = unavailable;
            this.trigger.toggleAttribute("aria-disabled", unavailable);
          }
          return;
        }

        if (this.mode !== "picker" || !this.list || !rowsHtml) return;

        this.list.innerHTML = rowsHtml;
        this.rows = Array.from(this.querySelectorAll(".card-pro__qbp-row"));
        this.rows.forEach((row) => {
          if (row.dataset.available !== "true") return;
          row.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.addVariant(row.dataset.variantId, row);
          });
        });
        this.updateScrollHint();
      }

      addVariant(id, el) {
        if (!id || el?.classList.contains("is-loading")) return;
        this.setLoading(el, true);

        const cart = document.querySelector("cart-drawer");
        const config = fetchConfig("javascript");
        config.headers["X-Requested-With"] = "XMLHttpRequest";
        delete config.headers["Content-Type"];

        const formData = new FormData();
        formData.append("id", id);
        formData.append("quantity", 1);

        let sectionIds = "cart-icon-bubble";
        if (cart && typeof cart.getSectionsToRender === "function") {
          sectionIds = cart
            .getSectionsToRender()
            .map((s) => s.id)
            .join(",");
        }
        formData.append("sections", sectionIds);
        formData.append("sections_url", window.location.pathname);
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: "quick-size-picker",
                productVariantId: id,
                errors: response.errors || response.description,
                message: response.message,
              });
              return;
            }

            publish(PUB_SUB_EVENTS.cartUpdate, {
              source: "quick-size-picker",
              productVariantId: id,
              cartData: response,
            });

            const isCartPage =
              document.body.classList.contains("template-cart");

            if (cart && this.cartType === "drawer" && !isCartPage) {
              const isClosedCart = !document.body.classList.contains(
                "page-overlay-cart-on",
              );
              cart.renderContents(response, isClosedCart);
              this.closeSheet(true);
            } else {
              this.closeSheet();
              this.refreshBubble(response);
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.setLoading(el, false);
          });
      }

      refreshBubble(response) {
        const bubble = document.getElementById("cart-icon-bubble");
        const html = response?.sections?.["cart-icon-bubble"];
        if (!bubble || !html) return;
        const parsed = new DOMParser().parseFromString(html, "text/html");
        const src = parsed.querySelector(".shopify-section") || parsed.body;
        if (src) bubble.innerHTML = src.innerHTML;
      }
    },
  );
}
