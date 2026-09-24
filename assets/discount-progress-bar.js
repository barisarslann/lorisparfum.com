class DiscountProgressBar extends HTMLElement {
  connectedCallback() {
    requestAnimationFrame(() => this.animateFill());
  }

  animateFill() {
    const track = this.querySelector(".wt-discount-bar__track");
    if (!track) return;

    const targetPct = track.style.getPropertyValue("--progress-percentage");
    if (!targetPct) return;

    // Reset to 0 then restore to trigger CSS transition
    track.style.setProperty("--progress-percentage", "0%");
    // Force reflow
    track.getBoundingClientRect();
    track.style.setProperty("--progress-percentage", targetPct);
  }
}

if (!customElements.get("discount-progress-bar")) {
  customElements.define("discount-progress-bar", DiscountProgressBar);
}
