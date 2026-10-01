/**
 * Global In-memory cache to store product HTML. 
 * Shared across all instances to prevent redundant processing during a single session.
 */
const CACHE_TTL = 300000; // 5 minutes
const PRODUCT_CACHE = new Map();

/**
 * Fetches product cards with local and session caching strategies.
 * @param {Array} handles - List of Shopify product handles.
 * @param {string} currentHandle - The handle of the product currently being viewed (to exclude it).
 */
async function getProducts(handles, currentHandle) {
  const filteredHandles = handles.filter(handle => handle !== currentHandle);

  const productPromises = filteredHandles.map(async (handle) => {
    const now = new Date().getTime();

    // 1. Check In-Memory Cache (Fastest)
    if (PRODUCT_CACHE.has(handle)) {
      const memCached = PRODUCT_CACHE.get(handle);
      if (now < memCached.expiry) return memCached.html;
    }

    // 2. Check Session Storage Cache z weryfikacją czasu wygasania
    const sessionRaw = sessionStorage.getItem(`rvp_${handle}`);
    if (sessionRaw) {
      try {
        const sessionCached = JSON.parse(sessionRaw);
        if (now < sessionCached.expiry) {
          // Odświeżamy in-memory cache i zwracamy
          PRODUCT_CACHE.set(handle, sessionCached);
          return sessionCached.html;
        } else {
          // Jeśli wygasł, usuwamy stary wpis
          sessionStorage.removeItem(`rvp_${handle}`);
        }
      } catch (e) {
        console.error("Błąd parsowania cache", e);
      }
    }

    try {
      // 3. Network Fetch using a specific alternative template (view=recently-viewed-card)
      const response = await fetch(`/products/${handle}?view=recently-viewed-card`);
      if (!response.ok) return '';

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract only the necessary swiper-slide HTML
      const productHTML = doc?.querySelector("[data-swiper-slide]")?.outerHTML || '';

      if (productHTML) {
        const cacheEntry = {
          html: productHTML,
          expiry: now + CACHE_TTL // Ustawiamy datę wygaśnięcia
        };

        PRODUCT_CACHE.set(handle, cacheEntry);
        sessionStorage.setItem(`rvp_${handle}`, JSON.stringify(cacheEntry));
      }
      return productHTML;
    } catch (e) {
      console.error(`Recently Viewed: Failed to fetch handle ${handle}`, e);
      return '';
    }
  });

  return Promise.all(productPromises);
}

/**
 * Helper to wrap a promise with a timeout.
 * Prevents the application from hanging if a component fails to load.
 */
const withTimeout = (promise, ms) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout: Promise exceeded time limit')), ms)
  );
  return Promise.race([promise, timeout]);
};

if (!customElements.get("recently-viewed-products")) {
  customElements.define(
    "recently-viewed-products",
    class RecentlyViewedProducts extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        /**
         * Use Intersection Observer for Lazy Loading.
         * Only triggers data fetching when the section is near the viewport (200px margin).
         */
        const observer = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.init();
              observer.unobserve(this);
            }
          });
        }, { rootMargin: '200px' });

        observer.observe(this);
      }

      async init() {
        // Prevent execution in Shopify Theme Editor design mode if necessary
        if (this.dataset.designMode === '') return;

        const STORAGE_KEY = "recently_viewed_handles_" + this.dataset.shopId;
        const parsedList = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        
        // Handle logic for product templates where current item shouldn't count towards the total display limit
        const isProductTemplate = this.dataset.productTemplate === '';
        const productsToShow = isProductTemplate ? parseInt(this.dataset.productsToShow) + 1 : parseInt(this.dataset.productsToShow);
        
        const list = parsedList.slice(0, productsToShow);
        const currentHandle = this.dataset.currentHandle;

        // Hide section if no items are found in history
        if (list.length === 0) {
          if (this.dataset.hideEmptySection === '') this.closest('section')?.classList.add('hidden');
          return;
        }

        try {
          const products = await getProducts(list, currentHandle);
          const swiperWrapper = this.querySelector("[data-swiper-container]");
          
          if (!swiperWrapper || products.filter(p => p !== '').length === 0) return;
          
          // Inject fetched products into the DOM
          swiperWrapper.innerHTML = products.join('');

          /**
           * Wait for the "slideshow-section" custom element to be defined.
           * Wrapped in a 3s timeout to ensure the UI remains functional even if JS fails.
           */
          try {
            await withTimeout(customElements.whenDefined('slideshow-section'), 3000);
            
            const slideShow = this.querySelector("slideshow-section");
            if (slideShow && typeof slideShow.swiperInitilize === 'function') {
              if (typeof slideShow.swiperDestroy === 'function') slideShow.swiperDestroy();
              slideShow.swiperInitilize();
            }
          } catch (e) {
            console.warn("Recently Viewed: Slideshow component timed out or failed. Displaying static grid.");
            swiperWrapper.classList.add('fallback-grid');
          }
        } catch (error) {
          console.error("Recently Viewed: Initialization error", error);
        }
      }
    }
  );
}