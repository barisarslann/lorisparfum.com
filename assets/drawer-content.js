if (!customElements.get("wt-drawer-content")) {
  customElements.define(
      "wt-drawer-content",
    class DrawerContent extends HTMLElement {
      constructor() {
        super();

        this.drawerClass = "wt-drawer-content__drawer";
        this.classDrawerActive = `${this.drawerClass}--open`;
        this.pageOverlayClass = "wt-drawer-content__overlay";
        this.activeOverlayBodyClass = `${this.pageOverlayClass}-on`;

        this.isOpen = false;
        this.lastTrigger = null;
        this.drawerId = null;

        this.handleVariantChange = this.handleVariantChange.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleTriggerClick = this.handleTriggerClick.bind(this);
        this.handleOverlayClick = this.handleOverlayClick.bind(this);
      }

      connectedCallback() {

        this.drawerId = this.dataset.drawerId;
        this.init();

        const jsonScript = this.querySelector("[data-variants-metafields]");
        if (jsonScript) {
          this.variantJson = JSON.parse(jsonScript.textContent);
          window.addEventListener("variantChangeEnd", this.handleVariantChange);
        }
      }


      disconnectedCallback() {
        document.removeEventListener("keydown", this.handleKeydown);
        window.removeEventListener("variantChangeEnd", this.handleVariantChange);
        this.cleanup();
      }

      cleanup() {
        this.triggers = this.querySelectorAll(
          `.wt-drawer-content__trigger`
        );
        this.triggers.forEach((trigger) => {
            trigger.removeEventListener("click", this.handleTriggerClick);
        });

        const closeBtn = document.querySelector(".wt-drawer-content__drawer__close");
        if (closeBtn) {
          closeBtn.removeEventListener("click", this.handleTriggerClick);
        }

        const overlay = this.getOverlay();
        if (overlay) {
          overlay.removeEventListener("click", this.handleOverlayClick);
        }
      }

      handleKeydown(e) {
        if (!this.isOpen) return;

        const isEsc = e.key === "Escape";
        const isTab = e.key === "Tab";

        if (isEsc) {
          e.preventDefault();
          this.closeDrawer();
        } else if (isTab) {
          this.handleFocusTrap(e);
        }
      }

      handleFocusTrap(e) {
        const { first, last } = this.getFocusableElements();

        if (!first || !last) return;

        const activeElement = document.activeElement;
        const isWithinDrawer = this.drawer.contains(activeElement);

        if (!isWithinDrawer) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
          return;
        }

        if (e.shiftKey && activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }

      handleVariantChange(e) {
        const variantId = String(e.target.currentVariant.id);
        const currentVariantInfo = this.variantJson?.variants?.find(
          (el) => el.id === variantId,
        );
        if (!currentVariantInfo) return;

        for (const metafield of currentVariantInfo.metafields) {
          const { placeholder_name, value } = metafield;
          const els = this.querySelectorAll(
            `[data-variant-metafield="${placeholder_name}"]`,
          );
          els.forEach((el) => {
            el.innerHTML = value || "";
          });
        }
      }

      handleTriggerClick(e) {
        e.preventDefault();
        const trigger = e.currentTarget;

        const isOpeningTrigger = trigger.classList.contains("wt-drawer-content__trigger");
        const isClosingTrigger = trigger.classList.contains("wt-drawer-content__drawer__close");
        const isKeyboardActivation = e.detail === 0;

        if (isOpeningTrigger) {
          this.setLastTrigger(trigger);
          this.openDrawer();
          this.updateDrawerContent(trigger);
        } else if (isClosingTrigger) {
          this.closeDrawer();
        }

        this.updateCloseBtnFocusState(e.detail);
      }

      handleOverlayClick(e) {
        e.preventDefault();
        document.querySelector('wt-drawer-content[open]')?.closeDrawer();
      }

      setLastTrigger(trigger) {
        const isFocusable = trigger.matches(
          'button, a[href], [tabindex]:not([tabindex="-1"])'
        );

        if (isFocusable) {
          this.lastTrigger = trigger;
        } else {
          const focusableChild = trigger.querySelector(
            'button, a[href], [tabindex]:not([tabindex="-1"])'
          );
          this.lastTrigger = focusableChild || trigger;
        }
      }

      updateCloseBtnFocusState(clickDetail) {
        const closeBtn = document.querySelector(".wt-drawer-content__drawer__close");
        if (!closeBtn) return;

        if (clickDetail > 0) {
          closeBtn.classList.add("remove-focus");
        } else {
          closeBtn.classList.remove("remove-focus");
        }
      }

      getFocusableElements() {
        const focusableSelector = "button, [href], input, select, [tabindex]";
        const focusableElements = Array.from(
          this.drawer.querySelectorAll(focusableSelector)
        ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex >= 0);

        return {
          first: focusableElements[0],
          last: focusableElements[focusableElements.length - 1],
        };
      }

      temporaryHideFocusVisible() {
        document.body.classList.add("no-focus-visible");
        setTimeout(() => {
          document.body.classList.remove("no-focus-visible");
        }, 200);
      }

      getOverlay() {
        return document.querySelector(`.${this.pageOverlayClass}`);
      }

      openDrawer() {
        this.setAttribute("open", "");
        this.isOpen = true;
        this.drawer.removeAttribute("inert");
        this.drawer.setAttribute("aria-hidden", "false");
        this.drawer.classList.add(this.classDrawerActive);
        document.body.classList.add(this.activeOverlayBodyClass);
        document.addEventListener("keydown", this.handleKeydown);
        this.closeBtn = document.querySelector(".wt-drawer-content__drawer__close");
        if(this.closeBtn) {
           this.closeBtn.addEventListener("click", this.handleTriggerClick);
           this.closeBtn.focus();
        }

        if (this.lastTrigger) {
          this.lastTrigger.setAttribute("aria-expanded", "true");
        }

        const overlay = this.getOverlay();
        if (overlay) {
          overlay.setAttribute("aria-hidden", "false");
        }

        this.temporaryHideFocusVisible();
      }

      updateDrawerContent(trigger){
        const blockId = trigger.dataset.drawerId;

        const drawerTitleSource = document.getElementById(`wt-drawer-content-title-${blockId}`).innerText;
        const drawerBodySource = document.getElementById(`wt-drawer-content-body-${blockId}`).innerHTML;

        this.drawerTitle.innerText = drawerTitleSource;
        this.drawerBody.innerHTML = drawerBodySource;
      }

      closeDrawer() {
        if (this.lastTrigger) {
          this.lastTrigger.focus();
        }

        this.removeAttribute("open");
        this.isOpen = false;
        this.drawer.setAttribute("inert", "");
        this.drawer.setAttribute("aria-hidden", "true");
        this.drawer.classList.remove(this.classDrawerActive);
        document.body.classList.remove(this.activeOverlayBodyClass);
        document.removeEventListener("keydown", this.handleKeydown);
        
        if (this.closeBtn) {
        this.closeBtn.removeEventListener("click", this.handleTriggerClick);
        }

        if (this.lastTrigger) {
          this.lastTrigger.setAttribute("aria-expanded", "false");
        }

        const overlay = this.getOverlay();
        if (overlay) {
          overlay.setAttribute("aria-hidden", "true");
        }

        this.temporaryHideFocusVisible();
      }

      setupDrawerOverlay(){
        if (!document.querySelector(`.${this.pageOverlayClass}`)) {
            this.overlay = document.createElement('div');
            this.overlay.className = `${this.pageOverlayClass}`;
            document.body.appendChild(this.overlay);
        } else {
            this.overlay = document.querySelector(`.${this.pageOverlayClass}`);
        }
        this.overlay.addEventListener("click", this.handleOverlayClick);
        this.overlay.setAttribute("aria-hidden", "true");
      }

      setupDrawer(){
        if (!document.querySelector(`.${this.drawerClass}`)){
            this.drawer = document.createElement('div');
            this.drawer.className = `${this.drawerClass}`;
            document.body.appendChild(this.drawer);

            this.drawerHeader = document.createElement('header');
            this.drawerHeader.className = 'wt-drawer-content__drawer__header';

            
            this.drawerTitle = document.createElement('div');
            this.drawerTitle.className = 'wt-drawer-content__drawer__title';
            this.drawerHeader.appendChild(this.drawerTitle);

            
            this.closeBtn = document.createElement('button');
            this.closeBtn.className = 'wt-drawer-content__drawer__close';
            this.closeBtn.setAttribute('aria-label', 'Close');
            this.closeBtn.innerHTML = `<svg class="svg-icon svg-icon--close wt-cart__drawer__close" width="72" height="72" viewBox="0 0 72 72" tabindex="0">
                <g transform="rotate(-90 -0.00000157361 72)" id="Close">
                    <rect x="0" y="72" fill="none" height="72" width="72" id="Rectangle_29"/>
                    <path d="m58.76152,133.58844l-22.762,-22.577l-22.762,22.577a1.413,1.413 0 0 1 -1.994,0l-0.828,-0.824a1.381,1.381 0 0 1 0,-1.976l22.973,-22.787l-22.973,-22.788a1.387,1.387 0 0 1 0,-1.98l0.828,-0.824a1.422,1.422 0 0 1 1.994,0l22.764,22.579l22.76,-22.579a1.425,1.425 0 0 1 2,0l0.828,0.824a1.39,1.39 0 0 1 0,1.98l-22.969,22.788l22.969,22.787a1.389,1.389 0 0 1 0,1.979l-0.828,0.82a1.415,1.415 0 0 1 -2,0l0,0.001z" id="Union_1"/>
                </g>
            </svg>`;
            this.drawerHeader.appendChild(this.closeBtn);

            this.drawer.appendChild(this.drawerHeader);

            this.drawerBody = document.createElement('div');
            this.drawerBody.className = 'wt-drawer-content__drawer__body rte';
            this.drawer.appendChild(this.drawerBody);
        } else {
            this.drawer = document.querySelector(`.${this.drawerClass}`);
            this.drawerTitle = this.drawer.querySelector(".wt-drawer-content__drawer__title");
            this.drawerBody = this.drawer.querySelector(".wt-drawer-content__drawer__body.rte")
        }

        this.drawer.setAttribute("aria-hidden", "true");
        this.drawer.setAttribute("inert", "");
      }

      init() {
        this.triggers = this.querySelectorAll(
          `.wt-drawer-content__trigger`
        );
        this.triggers.forEach((trigger) => {
            trigger.addEventListener("click", this.handleTriggerClick);
        });


        this.setupDrawerOverlay();
        this.setupDrawer();
      }
    },
  );
}