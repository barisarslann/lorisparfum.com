if (!customElements.get("wt-modal-content")) {
  customElements.define(
    "wt-modal-content",
    class ModalContent extends HTMLElement {
      constructor() {
        super();
        this.handleTriggerClick = this.handleTriggerClick.bind(this);
        this.handleVariantChange = this.handleVariantChange.bind(this);
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
        window.removeEventListener("variantChangeEnd", this.handleVariantChange);
        this.querySelectorAll(".wt-drawer-content__trigger").forEach((t) => {
          t.removeEventListener("click", this.handleTriggerClick);
        });
      }

      handleVariantChange(e) {
        const variantId = String(e.target.currentVariant.id);
        const currentVariantInfo = this.variantJson?.variants?.find(
          (el) => el.id === variantId
        );
        if (!currentVariantInfo) return;

        for (const metafield of currentVariantInfo.metafields) {
          const { placeholder_name, value } = metafield;
          this.querySelectorAll(
            `[data-variant-metafield="${placeholder_name}"]`
          ).forEach((el) => {
            el.innerHTML = value || "";
          });
        }
      }

      handleTriggerClick(e) {
        e.preventDefault();
        const trigger = e.currentTarget;
        const blockId = trigger.dataset.drawerId;
        const modalId = `wt-modal-content-${blockId}`;

        let modal = document.getElementById(modalId);
        if (!modal) {
          modal = this.createModal(modalId, blockId);
        }

        modal.show(trigger);
      }

      createModal(modalId, blockId) {
        const titleEl = document.getElementById(`wt-drawer-content-title-${blockId}`);
        const bodyEl = document.getElementById(`wt-drawer-content-body-${blockId}`);

        const title = titleEl ? titleEl.innerText : "";
        const body = bodyEl ? bodyEl.innerHTML : "";
        const closeLabel = this.dataset.closeLabel || "Close";

        const modal = document.createElement("modal-dialog");
        modal.id = modalId;
        modal.className = "wt-modal-content-dialog";

        modal.innerHTML = `
          <div role="dialog" aria-label="${title}" aria-modal="true" class="wt-modal-content-dialog__inner" tabindex="-1">
            <div class="wt-modal-content-dialog__header">
              <span class="wt-modal-content-dialog__title">${title}</span>
              <button id="ModalClose-${modalId}" class="wt-modal-content-dialog__close" aria-label="${closeLabel}" type="button">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <div class="wt-modal-content-dialog__body rte">${body}</div>
          </div>
        `;

        document.body.appendChild(modal);
        return modal;
      }

      init() {
        this.querySelectorAll(".wt-drawer-content__trigger").forEach((t) => {
          t.addEventListener("click", this.handleTriggerClick);
        });
      }
    }
  );
}
