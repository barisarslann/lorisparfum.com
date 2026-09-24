if (!customElements.get("add-to-recently-viewed")) {
    const MAX_ITEMS = 24;
  
    const addToRecentlyViewed = (handle, STORAGE_KEY) => {
      if (!handle) return;
  
      let list;
      try {
        list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        if (!Array.isArray(list)) list = [];
      } catch (e) {
        list = [];
      }
  
      list = list.filter((h) => h !== handle);
      list.unshift(handle);
  
      if (list.length > MAX_ITEMS) {
        list = list.slice(0, MAX_ITEMS);
      }
  
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    };
  
    customElements.define(
      "add-to-recently-viewed",
      class AddToRecentlyViewed extends HTMLElement {
        constructor() {
          super();
        }
  
        connectedCallback() {
          this.init();
        }
  
        init() {
         const STORAGE_KEY = "recently_viewed_handles_" + this.dataset.shopId;
          const handle = this.dataset.handle || this.getAttribute("handle");
  
          addToRecentlyViewed(handle, STORAGE_KEY);
        }
      },
    );
  }