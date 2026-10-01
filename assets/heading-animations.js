if (!customElements.get('heading-underline')) {
  const UNDERLINE_SVGS = {
    line: {
      viewBox: '0 0 325 18',
      path: 'M4 14C70.4617 7.0274 226.908 -3.22071 321 11.5677',
    },
    squiggle: {
      viewBox: '0 0 307 34',
      path: 'M3 30.5195C34.6842 11.509 90.6596 -16.5844 61.0877 23.1265C57.2152 29.4627 58.1305 37.0655 92.7719 16.7876C98.0526 12.9151 108.825 6.85987 109.67 13.6192C110.726 22.0683 112.839 26.2928 123.4 26.2928C133.961 26.2928 120.232 27.349 202.611 13.6192C268.514 2.6353 297.663 9.04256 304 13.6192',
    },
    circle: {
      viewBox: '0 0 322 95',
      path: 'M99.1387 3.65975C184.432 1.26683 274.324 8.74987 307.799 42.2267C369.842 104.272 -60.4867 108.988 11.3736 47.3969C71.6928 -4.30271 288.842 16.382 318.14 19.8286',
    },
  };
  customElements.define('heading-underline', class extends HTMLElement {
    connectedCallback() {
      if (this._initialized) return;
      this._initialized = true;

      const style = this.dataset.underlineStyle;
      if (!style || style === 'none') return;

      const hasAnimation = this.classList.contains('scroll-trigger');

      this.querySelectorAll('strong').forEach((el) => {
        el.classList.add('wt-heading-underline', `wt-heading-underline--${style}`);

        if (style === 'highlight') return;

        const svgDef = UNDERLINE_SVGS[style] || UNDERLINE_SVGS.line;
        const originalHTML = el.innerHTML;
        el.innerHTML =
          `<span class="wt-heading-underline__text">${originalHTML}</span>` +
          `<svg class="wt-heading-underline__svg" aria-hidden="true" viewBox="${svgDef.viewBox}" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">` +
          `<path d="${svgDef.path}" stroke-linecap="round"/>` +
          `</svg>`;

        const path = el.querySelector('path');
        const length = Math.ceil(path.getTotalLength());
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;

        if (!hasAnimation) {
          path.style.strokeDashoffset = '0';
          return;
        }

        const observer = new IntersectionObserver((entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                path.style.transition = 'stroke-dashoffset 0.6s ease 0.3s';
                path.style.strokeDashoffset = '0';
              });
            });
            obs.unobserve(entry.target);
          });
        }, { threshold: 0.1 });

        observer.observe(this);
      });
    }
  });
}
