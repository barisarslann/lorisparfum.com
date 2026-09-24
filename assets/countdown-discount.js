if (!customElements.get('countdown-discount')) {
  customElements.define(
    'countdown-discount',
    class CountdownDiscountCopy extends HTMLElement {
      connectedCallback() {
        this.btn = this.querySelector('.wt-countdown-discount__copy-btn');
        if (!this.btn) return;

        this.span = this.btn.querySelector('span');
        this.icon = this.btn.querySelector('.icon-copy');
        this.labelDefault = this.span
          ? this.span.textContent.trim()
          : this.btn.textContent.trim();

        this._onCopy = this.onCopy.bind(this);
        this.btn.addEventListener('click', this._onCopy);
      }

      disconnectedCallback() {
        if (this.btn) this.btn.removeEventListener('click', this._onCopy);
      }

      onCopy() {
        const code = this.btn.dataset.copy;
        const labelCopied = this.btn.dataset.labelCopied;

        navigator.clipboard.writeText(code).then(() => {
          if (this.span) this.span.textContent = labelCopied;
          else this.btn.textContent = labelCopied;

          if (this.icon) this.icon.classList.add('is-hidden');
          this.btn.classList.add('is-copied');

          setTimeout(() => {
            if (this.span) this.span.textContent = this.labelDefault;
            else this.btn.textContent = this.labelDefault;

            if (this.icon) this.icon.classList.remove('is-hidden');
            this.btn.classList.remove('is-copied');
          }, 2000);
        });
      }
    }
  );
}
