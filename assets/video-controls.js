if (!customElements.get("video-controls")) {
    customElements.define(
      "video-controls",
      class VideoControls extends HTMLElement {
        constructor() {
          super();
        }
        

        connectedCallback() {
          this.video = this.querySelector("video");
          this.hasVideoClickToggle = this.dataset.videoClick === "false" ? false : true;
          this.productsContainer = this.querySelector(
            ".shoppable-video__products",
          );
          this.controlButton = this.querySelector(
            ".shoppable-video__control-button",
          );
          this.muteButton = this.querySelector(".wt-hero-video__sound-toggle");

          this.togglePlayPause = this.togglePlayPause.bind(this);
          this.toggleVideoIcon = this.toggleVideoIcon.bind(this);
          this.toggleMute = this.toggleMute.bind(this);
          this.stopTouchPropagation = (e) => e.stopPropagation();

          this.addEventListeners();
          if(this.controlButton && this.video) this.toggleVideoIcon();
        }

        addEventListeners() {
          if(this.controlButton) {
            this.controlButton.addEventListener("click", this.togglePlayPause);
            this.controlButton.addEventListener("touchstart", this.stopTouchPropagation, { passive: true });
          }
          if(this.muteButton) {
            this.muteButton.addEventListener("click", this.toggleMute);
            this.muteButton.addEventListener("touchstart", this.stopTouchPropagation, { passive: true });
          }
          if(this.video && this.hasVideoClickToggle) this.video.addEventListener("click", this.togglePlayPause);
          if(this.controlButton && this.video){
            this.video.addEventListener("play", this.toggleVideoIcon);
            this.video.addEventListener("pause", this.toggleVideoIcon);
          }
        }

        removeEventListeners() {
          if(this.controlButton) {
            this.controlButton.removeEventListener("click", this.togglePlayPause);
            this.controlButton.removeEventListener("touchstart", this.stopTouchPropagation);
          }
          if(this.muteButton) {
            this.muteButton.removeEventListener("click", this.toggleMute);
            this.muteButton.removeEventListener("touchstart", this.stopTouchPropagation);
          }
          if(this.video && this.hasVideoClickToggle) this.video.removeEventListener("click", this.togglePlayPause);
          if(this.controlButton && this.video){
            this.video.removeEventListener("play", this.toggleVideoIcon);
            this.video.removeEventListener("pause", this.toggleVideoIcon);
          }
        }

        toggleVideoIcon() {
          const isPlaying = !this.video.paused;
          this.controlButton.classList.toggle(
            "shoppable-video__control-button--play",
            isPlaying,
          );
          this.controlButton.classList.toggle(
            "shoppable-video__control-button--pause",
            !isPlaying,
          );
        }

        togglePlayPause(e) {
          e.preventDefault();
          e.stopPropagation();
          const videoElement = this.video;

          if (!videoElement) return;

          if (videoElement.paused || videoElement.ended) {
            videoElement.play();
            this.controlButton?.setAttribute("aria-pressed", "true");
          } else {
            videoElement.pause();
            this.controlButton?.setAttribute("aria-pressed", "false");
          }
        }

        toggleMute(e) {
          e.preventDefault();
          e.stopPropagation();
          const video = this.video;
          if (!video) return;
          video.muted = !video.muted;
          this.muteButton.setAttribute("data-sound", video.muted ? "off" : "on");
          this.muteButton.setAttribute("aria-pressed", video.muted ? "false" : "true");
          this.muteButton.classList.toggle("wt-hero-video__sound-toggle--unmuted", !video.muted);
        }

        disconnectedCallback(){
          this.removeEventListeners();
        }

      },
    );
  }
  