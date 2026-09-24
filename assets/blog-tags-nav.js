import Swiper from "./swiper-bundle.esm.browser.min.js";

if (!customElements.get("blog-tags-nav")) {
  customElements.define(
    "blog-tags-nav",
    class BlogTagsNav extends HTMLElement {
      connectedCallback() {
        this.swiperEl = this.querySelector(".swiper");
        this.dataCenterSlides = this.dataset.centerSlides === "";
        if (!this.swiperEl) return;
        this.initSwiper();
      }

      initSwiper() {
        const scrollToActiveSlide = (swiper) => {
          const slides = [...swiper.slides];
          const activeIndex = slides.findIndex((el) =>
            el.classList.contains("main-blog__tag-slide--active"),
          );
          if (activeIndex > 0) {
            swiper.slideTo(activeIndex, activeIndex * 220, true);
          }
        };

        const centerSlides = (swiper) => {
          const shouldBeCentered =
            swiper.snapGrid.length === 1 && swiper.snapGrid[0] === -0;
          swiper.wrapperEl.classList.toggle(
            "main-blog__tags-track--center",
            shouldBeCentered,
          );
        };

        this.swiper = new Swiper(this.swiperEl, {
          loop: false,
          slidesPerView: "auto",
          spaceBetween: 0,
          init: false,
          navigation: {
            nextEl: this.querySelector(".swiper-button-next"),
            prevEl: this.querySelector(".swiper-button-prev"),
          },
        });

        this.swiper.on("afterInit", scrollToActiveSlide);
        if (this.dataCenterSlides) {
          this.swiper.on("init", centerSlides);
          this.swiper.on("resize", centerSlides);
        }

        this.swiper.init();
      }

      disconnectedCallback() {
        this.swiper?.destroy(true, true);
      }
    },
  );
}
