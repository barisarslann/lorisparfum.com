if (!customElements.get('estimated-delivery')) {
  customElements.define(
    'estimated-delivery',
    class EstimatedDelivery extends HTMLElement {
      connectedCallback() {
        this._dateEl = this.querySelector('.wt-estimated-delivery__date');
        this._render();
      }

      _render() {
        const value = this.dataset.value?.trim();
        const excludeWeekends = this.dataset.excludeWeekends === 'true';
        const locale = document.documentElement.lang || 'en';

        if (this._dateEl) {
          this._dateEl.textContent = this._resolve(value, excludeWeekends, locale);
        }
      }

      _resolve(value, excludeWeekends, locale) {
        if (!value) return '';

        const rangeMatch = value.match(/^(\d+)-(\d+)$/);
        if (rangeMatch) {
          const from = this._formatDate(this._addDays(new Date(), parseInt(rangeMatch[1], 10), excludeWeekends), locale);
          const to = this._formatDate(this._addDays(new Date(), parseInt(rangeMatch[2], 10), excludeWeekends), locale);
          return `${from} – ${to}`;
        }

        const daysMatch = value.match(/^(\d+)$/);
        if (daysMatch) {
          return this._formatDate(this._addDays(new Date(), parseInt(daysMatch[1], 10), excludeWeekends), locale);
        }

        const parsed = this._parseDate(value);
        if (parsed) return this._formatDate(parsed, locale);

        return value;
      }

      _parseDate(str) {
        const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      }

      _addDays(date, days, excludeWeekends) {
        const result = new Date(date);
        let added = 0;
        while (added < days) {
          result.setDate(result.getDate() + 1);
          if (!excludeWeekends || (result.getDay() !== 0 && result.getDay() !== 6)) {
            added++;
          }
        }
        return result;
      }

      _formatDate(date, locale) {
        return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
      }
    },
  );
}
