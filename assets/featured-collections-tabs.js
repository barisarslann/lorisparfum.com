if (!customElements.get("wt-tabs")) {
  customElements.define(
    "wt-tabs",
    class WtTabs extends HTMLElement {
      constructor() {
        super();
        this._onClick = this._onClick.bind(this);
        this._onKeydown = this._onKeydown.bind(this);
      }

      connectedCallback() {
        this._tablist = this.querySelector('[role="tablist"]');
        this._tabs = Array.from(this.querySelectorAll('[role="tab"]'));
        this._panels = Array.from(this.querySelectorAll('[role="tabpanel"]'));

        if (
          !this._tablist ||
          this._tabs.length === 0 ||
          this._panels.length === 0
        )
          return;

        let startIndex = this._tabs.findIndex(
          (t) => t.getAttribute("aria-selected") === "true",
        );

        if (startIndex < 0) startIndex = 0;

        this._activate(startIndex, { focus: false });

        this._tablist.addEventListener("click", this._onClick);
        this._tablist.addEventListener("keydown", this._onKeydown);
      }

      disconnectedCallback() {
        this._tablist?.removeEventListener("click", this._onClick);
        this._tablist?.removeEventListener("keydown", this._onKeydown);
      }

      _onClick(e) {
        const tab = e.target.closest('[role="tab"]');
        if (!tab || !this.contains(tab)) return;

        const index = this._tabs.indexOf(tab);
        if (index >= 0) this._activate(index, { focus: true });
      }

      _onKeydown(e) {
        const current = document.activeElement?.closest?.('[role="tab"]');
        if (!current || !this.contains(current)) return;

        const i = this._tabs.indexOf(current);
        if (i < 0) return;

        const last = this._tabs.length - 1;

        switch (e.key) {
          case "ArrowLeft":
          case "Left": {
            e.preventDefault();
            const next = i === 0 ? last : i - 1;
            this._activate(next, { focus: true });
            break;
          }
          case "ArrowRight":
          case "Right": {
            e.preventDefault();
            const next = i === last ? 0 : i + 1;
            this._activate(next, { focus: true });
            break;
          }
          case "Home": {
            e.preventDefault();
            this._activate(0, { focus: true });
            break;
          }
          case "End": {
            e.preventDefault();
            this._activate(last, { focus: true });
            break;
          }
          case "Enter":
          case " ": {
            e.preventDefault();
            this._activate(i, { focus: true });
            break;
          }
        }
      }

      _activate(index, { focus = true } = {}) {
        this._tabs.forEach((tab, i) => {
          const selected = i === index;
          tab.setAttribute("aria-selected", selected ? "true" : "false");
          tab.setAttribute("tabindex", selected ? "0" : "-1");
        });

        this._panels.forEach((panel, i) => {
          const active = i === index;
          panel.hidden = !active;

          if (active) {
            requestAnimationFrame(() => {
              panel.querySelectorAll("slideshow-section").forEach((ss) => {
                if (!ss.swiper) return;
                ss.swiper.update();
                ss.swiper.setTranslate(ss.swiper.translate);
              });
            });
          }
        });

        if (focus) this._tabs[index]?.focus();
      }
    },
  );
}

if (!customElements.get("wt-tab")) {
  customElements.define("wt-tab", class WtTab extends HTMLElement {});
}

if (!customElements.get("wt-tab-panel")) {
  customElements.define(
    "wt-tab-panel",
    class WtTabPanel extends HTMLElement {},
  );
}
