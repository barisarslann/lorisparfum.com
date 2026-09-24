if (!customElements.get("video-reels")) {
  customElements.define(
    "video-reels",
    class VideoReels extends HTMLElement {
      constructor() {
        super();
        this.activeClass = "active";
      }

      connectedCallback() {
        this._sectionObserver = null;
        this.init();
      }

      disconnectedCallback() {
        if (this._sectionObserver) {
          this._sectionObserver.disconnect();
          this._sectionObserver = null;
        }
        this._initObserver?.disconnect();
        this._initObserver = null;
        this.removeVideoEventHandlers();

        if (this._playTimeout) {
          clearTimeout(this._playTimeout);
          this._playTimeout = null;
        }

        // A detached <video> keeps decoding until it is paused.
        this.querySelectorAll("video").forEach((video) => video.pause());
      }

      observeSection() {
        this._sectionObserver?.disconnect();

        const observerOptions = {
          root: null,
          rootMargin: "0px",
          threshold: 0.1,
        };

        const sectionObserver = new IntersectionObserver(
          (entries, observer) => {
            entries.forEach((entry) => {
              const video = this.querySelector(".swiper-slide-active video");

              if (video) {
                if (entry.isIntersecting) {
                  video.play();
                } else {
                  video.pause();
                }
              }
            });
          },
          observerOptions,
        );

        sectionObserver.observe(this);
        this._sectionObserver = sectionObserver;
      }

      hardStopAllExceptActive(swiper) {
        const active = swiper.slides[swiper.activeIndex];
        swiper.slides.forEach((slide) => {
          const video = slide.querySelector("video");
          if (!video) return;

          //Stop and mute all except active
          if (slide !== active) {
            video.pause();
            video.muted = true;
            video.removeAttribute("autoplay"); // avoid Safari storms
            video.autoplay = false;
          }
        });
      }

      handleSoundToggle(swiper) {
        swiper.slides.forEach((slide) => {
          const button = slide.querySelector(".wt-video__sound-toggle");
          if (!button || button._bound) return; // bind only once
          button._bound = true;

          button.addEventListener(
            "click",
            () => {
              const activeSlide = swiper.slides[swiper.activeIndex];
              const activeVideo = activeSlide?.querySelector("video");
              if (!activeVideo) return;

              // stop and mute everything except active
              this.hardStopAllExceptActive(swiper);

              // toggle global state and apply ONLY to active video
              const soundOn = swiper.el.dataset.sound === "on";
              const nextSoundOn = !soundOn;
              swiper.el.dataset.sound = nextSoundOn ? "on" : "off";
              activeVideo.muted = !nextSoundOn;

              // inline playback hints for Safari/iOS
              activeVideo.setAttribute("playsinline", "");
              activeVideo.setAttribute("webkit-playsinline", "");
              activeVideo.removeAttribute("autoplay");
              activeVideo.autoplay = false;

              // (re)play only the active one; tiny delay helps Safari
              setTimeout(() => {
                activeVideo.play().catch(() => {});
              }, 80);
            },
            { passive: true },
          );
        });
      }

      sanitizeVideosOnce() {
        if (this._sanitized) return;
        this._sanitized = true;
        this.querySelectorAll("video").forEach((video) => {
          video.pause();
          video.muted = true;
          video.removeAttribute("autoplay");
          video.autoplay = false;
          video.setAttribute("playsinline", "");
          video.setAttribute("webkit-playsinline", "");
          video.preload = "metadata";
        });
      }

      playVideoInActiveSlide(swiper) {
        const sound = swiper.el.dataset.sound;
        const activeSlideVideo =
          this.findActiveSlide(swiper)?.querySelector("video");
        if (activeSlideVideo) {
          activeSlideVideo.muted = sound !== "on"; // if sound !== "on", keep it muted

          if (this._playTimeout) clearTimeout(this._playTimeout);
          this._playTimeout = setTimeout(() => {
            this._playTimeout = null;
            if (!this.isConnected) return;
            activeSlideVideo.play().catch((err) => {
              console.warn("Autoplay was prevented:", err);
            });
          }, 100);
        }
      }

      findActiveSlide(swiper) {
        const activeSlide = swiper.slides[swiper.activeIndex];
        return activeSlide;
      }

      toggleActiveClass(swiper) {
        const activeSlide = this.findActiveSlide(swiper);
        swiper.slides.forEach((slide) => {
          slide.classList.remove(this.activeClass);

          if (activeSlide === slide) {
            slide.classList.add(this.activeClass);
          }
        });
      }

      handleSlideChange(swiper) {
        this.hardStopAllExceptActive(swiper);
        this.toggleActiveClass(swiper);
        this.playVideoInActiveSlide(swiper);
      }

      addVideoEventHandlers(swiper) {
        this.removeVideoEventHandlers();

        this._boundSwiper = swiper;
        this._onSlideChange = () => this.handleSlideChange(swiper);
        this._onSoundToggleSync = () => this.handleSoundToggle(swiper);

        swiper.on("slideChange", this._onSlideChange);
        swiper.on("slidesLengthChange", this._onSoundToggleSync);
        swiper.on("update", this._onSoundToggleSync);
      }

      removeVideoEventHandlers() {
        const swiper = this._boundSwiper;

        // Swiper's off() wipes all listeners for an event when handler is undefined.
        if (swiper && !swiper.destroyed && this._onSlideChange) {
          swiper.off("slideChange", this._onSlideChange);
          swiper.off("slidesLengthChange", this._onSoundToggleSync);
          swiper.off("update", this._onSoundToggleSync);
        }

        this._boundSwiper = null;
        this._onSlideChange = null;
        this._onSoundToggleSync = null;
      }

      setUpSwiper(swiperContainer, swiperInstance) {
        if (!swiperContainer.dataset.sound) {
          swiperContainer.dataset.sound = "off";
        }
        this.sanitizeVideosOnce();
        this.addVideoEventHandlers(swiperInstance);
        this.handleSlideChange(swiperInstance);
        this.handleSoundToggle(swiperInstance);
        this.observeSection();
      }

      // slider.js strips .wt-slider__container on destroy; [data-swiper] survives.
      init() {
        const swiperContainer = this.querySelector("[data-swiper]");
        if (!swiperContainer) return;

        const sync = () => {
          const swiperInstance = swiperContainer.swiper;
          if (!swiperInstance || swiperInstance === this._boundSwiper) return;
          this.setUpSwiper(swiperContainer, swiperInstance);
        };

        sync();

        this._initObserver = new MutationObserver(sync);
        this._initObserver.observe(swiperContainer, {
          attributes: true,
          attributeFilter: ["class"],
        });
      }
    },
  );
}
