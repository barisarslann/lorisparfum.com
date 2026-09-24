if (!customElements.get('scroll-to-top')) {
  customElements.define('scroll-to-top', class extends HTMLElement {
    connectedCallback() {
      this._btn = this.querySelector('.wt-scroll-to-top__button');
      this._bundleEl = document.querySelector('.wt-bundle');
      this._stickyBuyEl = document.querySelector('.wt-product__sticky-buy');

      this._onScroll = this._handleScroll.bind(this);
      this._onClick = () => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' });
      };

      window.addEventListener('scroll', this._onScroll, { passive: true });
      this._btn.addEventListener('click', this._onClick);
      this._handleScroll();
    }

    disconnectedCallback() {
      window.removeEventListener('scroll', this._onScroll);
      this._btn.removeEventListener('click', this._onClick);
    }

    _overlapsBundlePanel() {
      if (!this._bundleEl || window.innerWidth > 899) return false;
      const rect = this._bundleEl.getBoundingClientRect();
      const topEntered = rect.top <= window.innerHeight;
      const bottomClearedFold = window.innerHeight - rect.bottom >= 100;
      return topEntered && !bottomClearedFold;
    }

    _stickyBuyVisible() {
      if (!this._stickyBuyEl) return false;
      return (
        this._stickyBuyEl.classList.contains('wt-product__sticky-buy--show') &&
        getComputedStyle(this._stickyBuyEl).display !== 'none'
      );
    }

    _handleScroll() {
      this.classList.toggle(
        'wt-scroll-to-top--visible',
        window.scrollY > 100 && !this._overlapsBundlePanel() && !this._stickyBuyVisible(),
      );
    }
  });
}
