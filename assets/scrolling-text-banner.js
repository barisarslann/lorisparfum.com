if (!customElements.get("scrolling-text-banner")) {
  customElements.define(
    "scrolling-text-banner",

    class ScrollingTextBanner extends HTMLElement {
      constructor() {
        super();
        this.spacing = 20; // Default spacing between phrases
        this.speedFactor = 10; // Base speed multiplier
        this.speed = 100; // Initial speed (calculated later)
        this.mobileBreakpoint = 600; // Width threshold for mobile devices
        this.mobileSpeedFactor = 0.7; // Default factor for mobile speed adjustment
        this.resizeObserver = null; // For observing size changes
        this.sectionType = this.dataset.sectionType;
        this.itemIteration = 10;
        this.showDots = this.dataset.dotSeparator;
        this.dot = `<svg width="20" height="20" aria-hidden="true">
                    <circle cx="10" cy="10"/>
                    </svg>`;
      }

      connectedCallback() {
        // Read spacing and speed from data attributes
        this.spacing =
          parseInt(this.getAttribute("data-spacing")) || this.spacing;

        // Read speed in range 1-10 and map to actual speed
        const speedInput = parseInt(this.getAttribute("data-speed")) || 5; // Default to 5
        this.speed = this.mapSpeed(speedInput);

        // Read mobile speed factor from data attribute
        this.mobileSpeedFactor =
          parseFloat(this.getAttribute("data-mobile-speed-factor")) ||
          this.mobileSpeedFactor;

        // Initialize the scrolling text
        if (this.sectionType === 'scrolling-text-with-icon'){
          this.initializeScrollingIcon();
        } else {
          this.initializeScrollingText();
        }
        
        // Add resize listener
        this.observeResizing();
      }

      disconnectedCallback() {
        // Clean up resize observer if the component is removed
        if (this.resizeObserver) {
          this.resizeObserver.disconnect();
        }
      }

      mapSpeed(input) {
        // Map input range [1, 10] to speed in pixels per second
        const minSpeed = 30; // Slowest speed in pixels per second
        const maxSpeed = 300; // Fastest speed in pixels per second
        return minSpeed + (maxSpeed - minSpeed) * ((input - 1) / 9);
      }

      getAdjustedSpeed() {
        // Adjust speed based on the mobile breakpoint
        if (window.innerWidth < this.mobileBreakpoint) {
          return this.speed * this.mobileSpeedFactor;
        }
        return this.speed;
      }

      initializeScrollingIcon(){
        // Find the `.hero__title` element inside the component
        const heroIcon = this.querySelectorAll(".hero__icon-with-text");
        if (!heroIcon.length) {
          console.error(
            "No `.hero__icon-with-text` element found inside the scrolling-text-banner component.",
          );
          return;
        }
        
        const parentElement = heroIcon[0].parentElement;
        const iterations = Math.ceil(this.itemIteration / heroIcon.length);

        // Create a container for the scrolling container
        const scrollingOuter = document.createElement("div");
        scrollingOuter.classList.add("scrolling-outer");

        // Create a container for the scrolling wrappers
        const scrollingContainer = document.createElement("div");
        scrollingContainer.classList.add("scrolling-container");

        scrollingOuter.appendChild(scrollingContainer);
        parentElement?.appendChild(scrollingOuter);

        // Create two wrappers for seamless animation
        for (let i = 0; i < 2; i++) {
          const wrapper = document.createElement("div");
          wrapper.classList.add("scrolling-wrapper");

          // Create and append three divs with the text content inside the wrapper
          for (let j = 0; j < iterations; j++) {
            heroIcon.forEach((icon) => {
              const textWrapper = document.createElement("div");
              textWrapper.classList.add("scrolling-text");
              const clone = icon.cloneNode(true);
              clone.classList.remove('scroll-trigger', 'scroll-trigger--offscreen', 'scroll-trigger--cancel');
              const htmlContent = clone.outerHTML;
              if(htmlContent){
                if(this.showDots == "true"){
                  textWrapper.innerHTML = htmlContent + this.dot;
                  textWrapper.style.marginRight = `${this.spacing}px`;
                  textWrapper.style.gap = `${this.spacing}px`;
                } else {
                  textWrapper.innerHTML = htmlContent;
                  textWrapper.style.marginRight = `${this.spacing}px`;
                }
              }
              wrapper.appendChild(textWrapper);
            })
          }

          // Append the wrapper to the container
          scrollingContainer.appendChild(wrapper);
        }

        heroIcon.forEach((icon) => {
          icon.style.display = 'none';
          icon.inert = true;
        })

        // Set animation speed dynamically
        this.setAnimationSpeed(scrollingContainer);
      }

      initializeScrollingText() {
        // Find the `.hero__title` element inside the component
        const heroTitle = this.querySelector(".hero__title");
        if (!heroTitle) {
          console.error(
            "No `.hero__title` element found inside the scrolling-text-banner component.",
          );
          return;
        }

        // Get the text content of the `.hero__title`
        const textContent = heroTitle.textContent.trim();
        if (!textContent) {
          console.error(
            "No text content found inside the `.hero__title` element.",
          );
          return;
        }

        // Clear the original content of `.hero__title`
        heroTitle.innerHTML = "";

        // Create a container for the scrolling wrappers
        const scrollingContainer = document.createElement("div");
        scrollingContainer.classList.add("scrolling-container");
        heroTitle.appendChild(scrollingContainer);

        // Create two wrappers for seamless animation
        for (let i = 0; i < 2; i++) {
          const wrapper = document.createElement("div");
          wrapper.classList.add("scrolling-wrapper");

          // Create and append three divs with the text content inside the wrapper
          for (let j = 0; j < this.itemIteration; j++) {
            const textWrapper = document.createElement("div");
            textWrapper.classList.add("scrolling-text");
            if(this.showDots == "true"){
              textWrapper.innerHTML = textContent + this.dot;
              textWrapper.style.marginRight = `${this.spacing}px`; // Apply spacing
              textWrapper.style.gap = `${this.spacing}px`;
            } else {
              textWrapper.textContent = textContent;
              textWrapper.style.marginRight = `${this.spacing}px`;
            }
            wrapper.appendChild(textWrapper);
          }

          // Append the wrapper to the container
          scrollingContainer.appendChild(wrapper);
        }

        // Set animation speed dynamically
        this.setAnimationSpeed(scrollingContainer);
      }

      setAnimationSpeed(scrollingContainer) {
        // Wait for layout to calculate sizes
        requestAnimationFrame(() => {
          const wrappers =
            scrollingContainer.querySelectorAll(".scrolling-wrapper");
          if (wrappers.length !== 2) return;

          const wrapperWidth = wrappers[0].offsetWidth; // Dynamic width of the first wrapper
          const adjustedSpeed = this.getAdjustedSpeed(); // Adjust speed for mobile
          const duration = wrapperWidth / adjustedSpeed; // Use pre-calculated speed

          // Apply calculated width and animation styles
          scrollingContainer.style.width = `${wrapperWidth * 2}px`; // Allow two wrappers to fit seamlessly
          wrappers.forEach((wrapper, index) => {
            wrapper.style.animationDuration = `${duration}s`;
            wrapper.style.animationDelay = `${-index * duration}s`; // Offset the second wrapper
          });
        });
      }

      observeResizing() {
        // Observe the size of the `.hero__title` element
        if (this.sectionType === 'scrolling-text-with-icon'){
          const heroIcon = this.querySelectorAll(".hero__icon-with-text");
          if (!heroIcon.length) return;
          this.resizeObserver = new ResizeObserver(() => {
            this.recalculateAnimation();
          });
          heroIcon.forEach((icon) => {
            this.resizeObserver.observe(icon);
          })
        } else {
          const heroTitle = this.querySelector(".hero__title");
          if (!heroTitle) return;

          this.resizeObserver = new ResizeObserver(() => {
            this.recalculateAnimation();
          });
          this.resizeObserver.observe(heroTitle);
        }
      }

      recalculateAnimation() {
        const scrollingContainer = this.querySelector(".scrolling-container");
        if (scrollingContainer) {
          this.setAnimationSpeed(scrollingContainer);
        }
      }
    },
  );
}
