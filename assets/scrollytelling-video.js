if (!customElements.get('scrollytelling-video')) {
  customElements.define('scrollytelling-video', class ScrollytellingVideo extends HTMLElement {
    constructor() {
      super();
      this.video = this.querySelector('.wt-scrollytelling__video-source');
      this.canvas = this.querySelector('.wt-scrollytelling__canvas');
      this.blocks = this.querySelectorAll('.wt-scrollytelling__block');
      this.imageFramesContainer = this.querySelector('.wt-scrollytelling__image-frames');
      this.imageFrames = this.imageFramesContainer
        ? this.imageFramesContainer.querySelectorAll('.wt-scrollytelling__frame')
        : [];

      this.mediaType = this.dataset.mediaType || 'video';
      this.mobileFallback = this.dataset.mobileFallback === 'true';
      this.androidOnlyFallback = this.dataset.androidOnlyFallback !== 'false';
      this.designMode = this.dataset.designMode === 'true';

      this.state = {
        currentProgress: 0,
        targetProgress: 0,
        isReady: false,
        isSeeking: false,
        isMobile: window.innerWidth < 768,
        isAndroid: typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
      };

      this.isPlaceholderMode = !this.video;
      this.useImageMode = this.computeUseImageMode();

      if (!this.isPlaceholderMode && this.canvas) {
        this.ctx = this.canvas.getContext('2d', { alpha: true, willReadFrequently: true });
        this.ctx.globalCompositeOperation = 'clear';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = 'source-over';
      }

      if (this.useImageMode && this.imageFrames.length) {
        this.state.isReady = true;
        this.applyImageModeVisibility(true);
        this.loadFallbackImages();
      } else if (this.isPlaceholderMode) {
        this.state.isReady = true;
      }

      this.init();
    }

    computeUseImageMode() {
      if (this.mediaType === 'images') return true;
      if (!this.mobileFallback) return false;
      if (!this.state.isMobile) return false;
      if (this.androidOnlyFallback && !this.state.isAndroid) return false;
      return true;
    }

    loadFallbackImages() {
      if (!this.imageFramesContainer?.classList.contains('wt-scrollytelling__image-frames--fallback')) return;
      this.imageFrames.forEach((frame) => {
        const img = frame.querySelector('.wt-scrollytelling__frame-img[data-src]');
        if (img && img.dataset.src) {
          img.src = img.dataset.src;
          if (img.dataset.srcset) img.srcset = img.dataset.srcset;
          if (img.dataset.sizes) img.sizes = img.dataset.sizes;
        }
      });
    }

    applyImageModeVisibility(useImageMode) {
      if (this.video) this.video.style.display = useImageMode ? 'none' : '';
      if (this.canvas) this.canvas.style.display = useImageMode ? 'none' : '';
      if (this.imageFramesContainer) {
        this.imageFramesContainer.classList.toggle('wt-scrollytelling__image-frames--active', useImageMode);
      }
    }

    init() {
      if (!this.useImageMode && !this.isPlaceholderMode) {
        this.setupVideo();
        this.applyImageModeVisibility(false);
      } else if (this.useImageMode) {
        this.applyImageModeVisibility(true);
      }

      window.addEventListener('scroll', this.onScroll.bind(this), { passive: true });
      window.addEventListener('resize', this.onResize.bind(this));

      this.isVisible = false;
      const observer = new IntersectionObserver((entries) => {
        this.isVisible = entries[0].isIntersecting;
        if (this.isVisible) this.animate();
      }, { threshold: 0.01 });

      observer.observe(this);
    }

    setupVideo() {
      if (!this.video) return;
      const src = this.state.isMobile ? this.video.dataset.videoMobile : this.video.dataset.videoDesktop;
      if (!src) return;

      if (this._onLoadedData) {
        this.video.removeEventListener('loadeddata', this._onLoadedData);
        this.video.removeEventListener('seeked', this._onSeeked);
      }

      this.video.src = src;
      this.video.load();

      this._onLoadedData = () => {
        if (this.canvas) {
          this.canvas.width = this.video.videoWidth;
          this.canvas.height = this.video.videoHeight;
        }
        this.state.isReady = true;
        this.video.currentTime = 0.001;
        this.renderCanvas();
      };
      this._onSeeked = () => {
        this.state.isSeeking = false;
        this.renderCanvas();
      };
      this.video.addEventListener('loadeddata', this._onLoadedData);
      this.video.addEventListener('seeked', this._onSeeked);
    }

    onScroll() {
      if (this.designMode && this.parentElement?.classList.contains('wt-scrollytelling-wrapper--preview-initial')) {
        this.parentElement.classList.remove('wt-scrollytelling-wrapper--preview-initial');
      }
      const wrapper = this.parentElement;
      const rect = wrapper.getBoundingClientRect();
      const totalHeight = rect.height - window.innerHeight;
      this.state.targetProgress = Math.max(0, Math.min(1, -rect.top / totalHeight));
    }

    animate() {
      if (!this.isVisible) return;

      if (this.state.isReady) {
        const lerpFactor = 0.05;
        const diff = this.state.targetProgress - this.state.currentProgress;

        if (Math.abs(diff) > 0.00005) {
          this.state.currentProgress += diff * lerpFactor;
          if (!this.useImageMode && !this.isPlaceholderMode && this.video?.duration) {
            const targetTime = this.state.currentProgress * this.video.duration;
            if (!this.state.isSeeking) {
              this.state.isSeeking = true;
              this.video.currentTime = targetTime;
            }
          }
        }

        const progressPct = this.state.currentProgress * 100;
        this.updateBlocks(progressPct);
        if (this.useImageMode) this.updateImageFrames(progressPct);
      }
      requestAnimationFrame(this.animate.bind(this));
    }

    updateImageFrames(progress) {
      const blockCount = this.blocks.length;
      if (!blockCount) return;

      let activeIndex = -1;
      for (let i = 0; i < blockCount; i++) {
        const start = parseFloat(getComputedStyle(this.blocks[i]).getPropertyValue('--timing-start'));
        const end = parseFloat(getComputedStyle(this.blocks[i]).getPropertyValue('--timing-end'));
        if (progress >= start && progress <= end) {
          activeIndex = i;
          break;
        }
      }

      if (activeIndex < 0) {
        const firstStart = parseFloat(getComputedStyle(this.blocks[0]).getPropertyValue('--timing-start'));
        const lastEnd = parseFloat(getComputedStyle(this.blocks[blockCount - 1]).getPropertyValue('--timing-end'));
        if (progress < firstStart) {
          activeIndex = 0;
        } else if (progress > lastEnd) {
          activeIndex = blockCount - 1;
        } else {
          // In a gap between blocks: show the block we just left (first image only at start, then 2nd, etc.)
          for (let i = blockCount - 1; i >= 0; i--) {
            const end = parseFloat(getComputedStyle(this.blocks[i]).getPropertyValue('--timing-end'));
            if (progress >= end) {
              activeIndex = i;
              break;
            }
          }
          if (activeIndex < 0) activeIndex = 0;
        }
      }

      this.imageFrames.forEach((frame, i) => {
        frame.classList.toggle('is-visible', i === activeIndex);
      });
    }

    renderCanvas() {
      if (!this.isPlaceholderMode && this.state.isReady && this.video?.readyState >= 2 && this.ctx) {
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      }
    }

    updateBlocks(progress) {
      this.blocks.forEach((block) => {
        const start = parseFloat(getComputedStyle(block).getPropertyValue('--timing-start'));
        const end = parseFloat(getComputedStyle(block).getPropertyValue('--timing-end'));

        if (progress >= start && progress <= end) {
          block.classList.add('is-active', 'is-was-active');
        } else {
          block.classList.remove('is-active');
          if (progress < start) block.classList.remove('is-was-active');
        }
      });
    }

    onResize() {
      const isMobileNow = window.innerWidth < 768;
      const wasMobile = this.state.isMobile;
      const wasImageMode = this.useImageMode;
      this.state.isMobile = isMobileNow;
      this.useImageMode = this.computeUseImageMode();

      if (wasImageMode !== this.useImageMode) {
        if (this.useImageMode && this.imageFrames.length) {
          this.state.isReady = true;
          this.loadFallbackImages();
          this.applyImageModeVisibility(true);
          if (this.video) {
            this.video.removeAttribute('src');
            this.video.load();
          }
        } else {
          this.applyImageModeVisibility(false);
          if (!this.isPlaceholderMode) {
            this.state.isReady = false;
            this.setupVideo();
          }
        }
      } else if (!this.useImageMode && !this.isPlaceholderMode && isMobileNow !== wasMobile) {
        this.setupVideo();
      }
    }
  });
}