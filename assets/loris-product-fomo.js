if (!customElements.get('loris-fomo')) {
  customElements.define('loris-fomo', class extends HTMLElement {
    connectedCallback() {
      const source = this.querySelector('[data-fomo-messages]');
      const text = this.querySelector('[data-fomo-text]');
      if (!source || !text || this.interval) return;

      const locale = this.lang || document.documentElement.lang || 'en';
      const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
      const integer = new Intl.NumberFormat(locale);
      // Retain the existing display ranges; only message/number localization changes.
      const messages = JSON.parse(source.textContent).map(message => {
        const count = message.count ?? Math.floor(Math.random() * (message.max - message.min + 1)) + message.min;
        const formatted = message.count !== undefined ? integer.format(count) : compact.format(count);
        return message.text.replaceAll('__count__', formatted);
      });
      if (!messages.length) return;
      for (let i = messages.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [messages[i], messages[j]] = [messages[j], messages[i]];
      }

      const colors = ['#DBA4B4', '#E1C1A2', '#91D2E5'];
      let index = 0;
      let colorIndex = 0;
      text.innerHTML = messages[index];
      text.style.opacity = '1';
      this.style.setProperty('--fomo-color', colors[colorIndex]);
      this.interval = setInterval(() => {
        text.style.opacity = '0';
        this.timeout = setTimeout(() => {
          index = (index + 1) % messages.length;
          colorIndex = (colorIndex + 1) % colors.length;
          text.innerHTML = messages[index];
          this.style.setProperty('--fomo-color', colors[colorIndex]);
          text.style.opacity = '1';
        }, 500);
      }, 5000);
    }

    disconnectedCallback() {
      clearInterval(this.interval);
      clearTimeout(this.timeout);
      this.interval = null;
    }
  });
}
