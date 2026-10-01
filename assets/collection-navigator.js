import Swiper from "./swiper-bundle.esm.browser.min.js";

if (!customElements.get('collection-navigator')) {
    class CollectionNavigator extends HTMLElement {
      constructor() {
        super();
        this.tabsSwiper = null;
        this.panelsSwiper = null;
        this._breakpointQuery = null;
        this._boundSectionLoad = this._onSectionLoad.bind(this);
        this._boundBlockSelect = this._onBlockSelect.bind(this);
        this._boundTabKeyDown = this._onTabKeyDown.bind(this);
        this._boundPanelFocusin = this._onPanelFocusin.bind(this);
        this._boundBreakpointChange = () => {
          if (this.panelsSwiper) this.panelsSwiper.updateAutoHeight(400);
        };
      }

      _onSectionLoad(e) {
        if (e.target.contains(this)) this.init();
      }

      _onPanelFocusin(e) {
        const activeIndex = this.panelsSwiper?.activeIndex ?? 0;
        const panels = this.querySelectorAll('.wt-collection-navigator__panel-item');
        const activePanel = panels[activeIndex];
        if (activePanel && activePanel.contains(e.target)) {
          e.target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        }
      }

      _onBlockSelect(event) {
        const wrapper = event.target.closest('.swiper-wrapper');
        if (!wrapper || !this.panelsSwiper) return;
        const index = Array.from(wrapper.children).indexOf(event.target);
        if (index !== -1) this.panelsSwiper.slideTo(index);
      }

      updateTabAria() {
        const tabs = this.getTabs();
        const activeIndex = this.tabsSwiper?.activeIndex ?? 0;
        tabs.forEach((tab, i) => {
          const selected = i === activeIndex;
          tab.setAttribute('aria-selected', selected);
          tab.setAttribute('tabindex', selected ? '0' : '-1');
        });
      }

      /** Same focusable selector as featured collection (slider.js). */
      _focusableSelector() {
        return 'a, button, input, textarea, select, [tabindex]';
      }

      updatePanelsAria() {
        const panels = this.querySelectorAll('.wt-collection-navigator__panel-item');
        const activeIndex = this.panelsSwiper?.activeIndex ?? 0;
        const focusableSelectors = this._focusableSelector();

        panels.forEach((panel, i) => {
          const isVisible = i === activeIndex;
          panel.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
          panel.querySelectorAll(focusableSelectors).forEach((el) => {
            el.setAttribute('tabindex', '-1');
          });
        });

        const activePanel = panels[activeIndex];
        if (activePanel) {
          activePanel.querySelectorAll(focusableSelectors).forEach((el) => {
            el.setAttribute(
              'tabindex',
              el.hasAttribute('data-omit-tabindex') ? '-1' : '0'
            );
          });
        }
      }

      getTabs() {
        return Array.from(
          this.querySelectorAll('.wt-collection-navigator__tabs-wrapper [role="tab"]')
        );
      }

      _onTabKeyDown(e) {
        const tabs = this.getTabs();
        if (!tabs.length || !this.tabsSwiper) return;
        const currentIndex = tabs.indexOf(document.activeElement);
        if (currentIndex === -1) return;

        let nextIndex = null;
        switch (e.key) {
          case 'ArrowLeft':
          case 'ArrowUp':
            e.preventDefault();
            nextIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
            break;
          case 'ArrowRight':
          case 'ArrowDown':
            e.preventDefault();
            nextIndex = currentIndex >= tabs.length - 1 ? 0 : currentIndex + 1;
            break;
          case 'Home':
            e.preventDefault();
            nextIndex = 0;
            break;
          case 'End':
            e.preventDefault();
            nextIndex = tabs.length - 1;
            break;
          default:
            return;
        }

        if (nextIndex !== null) {
          this.tabsSwiper.slideTo(nextIndex);
          this.panelsSwiper.slideTo(nextIndex);
          tabs[nextIndex].focus();
          this.updateTabAria();
        }
      }

      connectedCallback() {
        this.init();
        document.addEventListener('shopify:section:load', this._boundSectionLoad);
        this.addEventListener('shopify:block:select', this._boundBlockSelect);
        this.addEventListener('keydown', this._boundTabKeyDown);
        this.addEventListener('focusin', this._boundPanelFocusin);
      }

      init() {
        const tabsContainer = this.querySelector('.wt-collection-navigator__swiper-tabs');
        const panelsContainer = this.querySelector('.wt-collection-navigator__swiper-panels');
        const tabButtonsSpacing = parseInt(this.dataset.tabButtonsSpacing);

        if (!tabsContainer || !panelsContainer) return;

        if (this.tabsSwiper) this.tabsSwiper.destroy();
        if (this.panelsSwiper) this.panelsSwiper.destroy();

        if (this._breakpointQuery) {
          this._breakpointQuery.removeEventListener('change', this._boundBreakpointChange);
        }
        this._breakpointQuery = window.matchMedia('(min-width: 900px)');
        this._breakpointQuery.addEventListener('change', this._boundBreakpointChange);

        this.tabsSwiper = new Swiper(tabsContainer, {
          slidesPerView: 'auto',
          loop: false,
          watchSlidesProgress: true,
          spaceBetween: tabButtonsSpacing,
          slideToClickedSlide: true,
          centeredSlides: true,
          breakpoints: {
            900: {
              spaceBetween: 32,
            }
          },
          on: {
            slideChange: () => {
              if (this.panelsSwiper) this.panelsSwiper.slideTo(this.tabsSwiper.activeIndex);
              this.updateTabAria();
            },
            afterInit: () => {
              this.updateTabAria();
            }
          }
        });

        this.panelsSwiper = new Swiper(panelsContainer, {
          slidesPerView: 1,
          autoHeight: true,
          spaceBetween: 20,
          speed: 400,
          grabCursor: true,
          noSwiping: true,
          noSwipingSelector: ".card-pro__gallery-track",
          thumbs: {
            swiper: this.tabsSwiper,
          },
          on: {
            afterInit: () => {
              this.selectFirstNonEmptyTab();
              this.updatePanelsAria();
              this.setupTabKeyboard();
              setTimeout(() => this.panelsSwiper.updateAutoHeight(), 200);
            },
            slideChange: () => {
               if (this.tabsSwiper) this.tabsSwiper.slideTo(this.panelsSwiper.activeIndex);
               this.updatePanelsAria();
               if (window.AOS) window.AOS.refresh();
            }
          }
        });
      }

      selectFirstNonEmptyTab() {
        const panels = this.querySelectorAll('.wt-collection-navigator__panel-item');
        const firstNonEmptyIndex = Array.from(panels).findIndex(
          (panel) => panel.getAttribute('data-has-products') === 'true'
        );
        if (firstNonEmptyIndex > 0 && this.tabsSwiper && this.panelsSwiper) {
          this.tabsSwiper.slideTo(firstNonEmptyIndex, 0);
          this.panelsSwiper.slideTo(firstNonEmptyIndex, 0);
          this.updateTabAria();
          this.updatePanelsAria();
          const tabs = this.getTabs();
          if (tabs[firstNonEmptyIndex]) tabs[firstNonEmptyIndex].focus();
        }
      }

      setupTabKeyboard() {
        const tablist = this.querySelector('.wt-collection-navigator__tabs-wrapper[role="tablist"]');
        if (!tablist) return;
        tablist.setAttribute('tabindex', '-1');
      }

      disconnectedCallback() {
        document.removeEventListener('shopify:section:load', this._boundSectionLoad);
        this.removeEventListener('shopify:block:select', this._boundBlockSelect);
        this.removeEventListener('keydown', this._boundTabKeyDown);
        this.removeEventListener('focusin', this._boundPanelFocusin);
        if (this._breakpointQuery) {
          this._breakpointQuery.removeEventListener('change', this._boundBreakpointChange);
          this._breakpointQuery = null;
        }
        if (this.tabsSwiper) this.tabsSwiper.destroy();
        this.tabsSwiper = null;
        if (this.panelsSwiper) this.panelsSwiper.destroy();
        this.panelsSwiper = null;
      }
    }

    customElements.define('collection-navigator', CollectionNavigator);
  }
