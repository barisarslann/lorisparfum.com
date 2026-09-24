if (!customElements.get('metric-counter')) {
  customElements.define(
    'metric-counter',
    class MetricCounter extends HTMLElement {
      connectedCallback() {
        if (this.closest('.swiper-slide-duplicate')) return;

        this._duration = parseInt(this.dataset.duration, 10) || 2000;
        this._easeOut = this.dataset.easeOut !== 'false';
        this._target = this.firstElementChild;

        if (!this._target) return;

        const text = this._target.textContent.trim();
        const match = text.match(/^([^0-9]*)([0-9][0-9,.]*)(.*)$/);
        if (!match) return;

        this._prefix = match[1];
        this._suffix = match[3];
        this._endValue = parseFloat(match[2].replace(/,/g, ''));
        this._hasCommas = match[2].includes(',');
        this._hasDecimals = match[2].includes('.');
        this._originalHTML = this._target.innerHTML;

        if (isNaN(this._endValue)) return;

        this._observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              this._observer.disconnect();
              this._startAnimation();
            }
          },
          { threshold: 0.2 }
        );
        this._observer.observe(this);
      }

      disconnectedCallback() {
        if (this._observer) this._observer.disconnect();
        if (this._rafId) cancelAnimationFrame(this._rafId);
      }

      _startAnimation() {
        const start = performance.now();
        const startValue = this._endValue / 2;

        const step = (now) => {
          const rawT = Math.min((now - start) / this._duration, 1);
          const t = this._easeOut ? 1 - Math.pow(1 - rawT, 3) : rawT;
          const current = startValue + t * (this._endValue - startValue);

          let formatted;
          if (this._hasDecimals) {
            formatted = current.toFixed(1);
          } else {
            const rounded = Math.round(current);
            formatted = this._hasCommas ? rounded.toLocaleString('en-US') : String(rounded);
          }

          this._target.textContent = this._prefix + formatted + this._suffix;

          if (rawT < 1) {
            this._rafId = requestAnimationFrame(step);
          } else {
            this._target.innerHTML = this._originalHTML;
          }
        };

        this._rafId = requestAnimationFrame(step);
      }
    }
  );
}