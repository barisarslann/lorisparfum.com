if (!customElements.get('blur-banner')) {
  customElements.define('blur-banner',
    class extends HTMLElement {
      constructor() {
        super();
        this.hero = null;
        this.contentBottom = null;
        this.contentBottomContent = null;

        this.config = {
          windowHeight: window.innerHeight
        }

        this.rafId = null;
        this.isScrollHandlerScheduled = false;
      }

      connectedCallback() {
        this.hero = this.querySelector('.wt-blur-banner__hero');
        this.contentBottom = this.querySelector('.wt-blur-banner__content__bottom');
        this.contentBottomContent = this.contentBottom?.querySelector('.wt-blur-banner__content__bottom__content');
        if (!this.hero || !this.contentBottom || !this.contentBottomContent) {
          return;
        }

        this.updateConfig();
        this.resizeHandler = () => this.updateConfig();
        this.scrollHandler = () => this.handleScroll();
        window.addEventListener('resize', this.resizeHandler);
        window.addEventListener('scroll', this.scrollHandler);
      }

      disconnectedCallback() {
        window.removeEventListener('resize', this.resizeHandler);
        window.removeEventListener('scroll', this.scrollHandler);
        if (this.rafId !== null) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
        this.isScrollHandlerScheduled = false;
      }

      handleScroll() {
        if (!this.isScrollHandlerScheduled) {
          this.isScrollHandlerScheduled = true;
          this.rafId = requestAnimationFrame(() => {
            this.toggleHeroFilter();
            this.isScrollHandlerScheduled = false;
            this.rafId = null;
          });
        }
      }

      updateConfig() {
        this.config = {
          windowHeight: window.innerHeight
        }
      }

      toggleHeroFilter() {
        if (!this.hero || !this.contentBottomContent) {
          return;
        }

        const contentBottomContentTop = this.contentBottomContent.getBoundingClientRect().top;

        if (contentBottomContentTop < this.config.windowHeight) {
          this.hero.classList.add('wt-blur-banner__hero--filter-active');
        } else {
          this.hero.classList.remove('wt-blur-banner__hero--filter-active');
        }
      }
    }
  );
}
