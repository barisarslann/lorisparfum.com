if (!customElements.get("timeline-section")) {
  customElements.define(
    "timeline-section",
    class TimelineSection extends HTMLElement {
      constructor() {
        super();
        this.onScroll = this.onScroll.bind(this);
        this.onResize = this.onResize.bind(this);
        this.handleBodyLinkClick = this.handleBodyLinkClick.bind(this);
      }

      connectedCallback() {
        this.track = this.querySelector(".wt-timeline__track") || this;
        this.progressLine = this.track.querySelector("[data-timeline-progress]");
        this.items = this.track.querySelectorAll(".wt-timeline__item");

        this.addEventListener("click", this.handleBodyLinkClick);
        window.addEventListener("scroll", this.onScroll, { passive: true });
        window.addEventListener("resize", this.onResize);
        this.onScroll();
      }

      disconnectedCallback() {
        window.removeEventListener("scroll", this.onScroll);
        window.removeEventListener("resize", this.onResize);
        this.removeEventListener("click", this.handleBodyLinkClick);
      }

      onScroll() {
        const rect = this.track.getBoundingClientRect();
        const trackTop = rect.top + window.scrollY;
        const trackHeight = this.track.offsetHeight;

        const viewportCenterY = window.scrollY + window.innerHeight / 2;
        let progress = (viewportCenterY - trackTop) / trackHeight;
        progress = Math.max(0, Math.min(1, progress));

        const progressHeight = progress * trackHeight;

        if (this.progressLine) {
          this.progressLine.style.height = progressHeight + "px";
        }

        this.items.forEach((item) => {
          const dot = item.querySelector(".wt-timeline__dot");
          const timeHeading = item.querySelector(".wt-timeline__time");
          if (!dot) return;

          const dotRect = dot.getBoundingClientRect();
          const dotCenterFromTrackTop =
            dotRect.top - rect.top + dot.offsetHeight / 2;
          const isActive = progressHeight >= dotCenterFromTrackTop;

          dot.classList.toggle("active", isActive);
          if (timeHeading) timeHeading.classList.toggle("active", isActive);
        });
      }

      onResize() {
        this.onScroll();
      }

      // --- Drawer link handling ---

      handleBodyLinkClick(e) {
        const link = e.target.closest(".wt-timeline__body a[href]");
        if (!link) return;

        const href = link.getAttribute("href");
        if (!href || href === "#" || href.startsWith("#")) return;

        const url = this.getAbsoluteUrl(href);
        if (!this.isSameOrigin(url)) return;

        e.preventDefault();

        const drawer = document.querySelector("wt-drawer-content");
        if (!drawer || typeof drawer.openWithContent !== "function") {
          window.location.href = url;
          return;
        }

        drawer.openWithContent("Loading…", "<p>Loading…</p>", link);

        fetch(url, { headers: { Accept: "text/html" } })
          .then((res) => res.text())
          .then((html) => {
            const extracted = this.extractPageContent(html, url);
            if (drawer.drawerTitle)
              drawer.drawerTitle.innerText = extracted.title || "Page";
            if (drawer.drawerBody)
              drawer.drawerBody.innerHTML =
                extracted.bodyHtml || "<p>No content.</p>";
          })
          .catch(() => {
            if (drawer.drawerTitle) drawer.drawerTitle.innerText = "Error";
            if (drawer.drawerBody)
              drawer.drawerBody.innerHTML =
                '<p>Could not load the page. <a href="' +
                url +
                '">Open in new tab</a></p>';
          });
      }

      getAbsoluteUrl(href) {
        try {
          return new URL(href, window.location.href).href;
        } catch (e) {
          return href;
        }
      }

      isSameOrigin(href) {
        try {
          const u = new URL(href, window.location.href);
          return u.origin === window.location.origin;
        } catch (e) {
          return false;
        }
      }

      extractPageContent(html, pageUrl) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const titleEl = doc.querySelector("title");
        let title = titleEl ? titleEl.textContent.trim() : "";
        const h1 = doc.querySelector("h1");
        if (!title && h1) title = h1.textContent.trim();

        const bodyEl =
          doc.querySelector(".wt-page__wrapper") ||
          doc.querySelector("main#root .rte") ||
          doc.querySelector("main#root") ||
          doc.querySelector("main") ||
          doc.querySelector(".rte");
        let bodyHtml = bodyEl ? bodyEl.innerHTML : "";
        if (bodyHtml && pageUrl) {
          const safeUrl = String(pageUrl)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;");
          bodyHtml = '<base href="' + safeUrl + '">' + bodyHtml;
        }
        return { title, bodyHtml };
      }
    },
  );
}
