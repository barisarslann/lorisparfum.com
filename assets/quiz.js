if (!customElements.get('quiz-section')) {
  customElements.define(
    'quiz-section',
    class QuizSection extends HTMLElement {
      connectedCallback() {
        this._key = `wt-quiz-${this.dataset.sectionId}`;
        this.slides = Array.from(this.querySelectorAll('quiz-slide'));

        // Tag each slide with a CSS class based on its content's data-block-type
        this.slides.forEach(slide => {
          const type = this._getSlideType(slide);
          if (type) slide.classList.add(`wt-quiz__slide--${type}`);
        });
        const questionSlides = this.slides.filter(s => this._isQuestionSlide(s));
        if (questionSlides.length) questionSlides.at(-1).classList.add('wt-quiz__slide--last-question');
        this._progressFill = this.querySelector('.wt-quiz__progress-fill');
        this._progressText = this.querySelector('.wt-quiz__progress-text');

        this._state = { currentIndex: 0, tagMap: {} };

        let restored = false;
        try {
          const saved = JSON.parse(localStorage.getItem(this._key));
          if (saved?.completedAt) {
            this._state = saved;
            const ri = this._resultsIndex();
            if (ri >= 0) {
              this._activate(ri, false);
              this._renderSavedResult();
              restored = true;
            }
          }
        } catch (_) {}

        if (!restored) this._activate(0, false);

        this._onAnswer = this._handleAnswer.bind(this);
        this._onNewsletterSubmit = this._handleNewsletterSubmit.bind(this);

        this.addEventListener('quiz:answer', this._onAnswer);

        this.addEventListener('click', e => {
          if (e.target.closest('.wt-quiz__nav-next:not([disabled])')) {
            const nextBtn = e.target.closest('.wt-quiz__nav-next');
            if (nextBtn?.dataset.redirectUrl) { window.location.href = nextBtn.dataset.redirectUrl; return; }
            this._advance();
            return;
          }
          if (e.target.closest('.wt-quiz__nav-prev')) { this._back(); return; }
          if (e.target.closest('.wt-quiz__retake')) { e.preventDefault(); this._retake(); return; }
          if (e.target.closest('.wt-quiz__newsletter-skip')) { e.preventDefault(); this._advance(); return; }
          const newsletterSubmitBtn = e.target.closest('.wt-newsletter__send');
          if (newsletterSubmitBtn) {
            e.preventDefault();
            newsletterSubmitBtn.closest('form')?.requestSubmit();
            return;
          }
          if (e.target.closest('.hero__button')) { e.preventDefault(); this._advance(); return; }
        });

        const newsletterForm = this.querySelector('.wt-quiz__newsletter-form');
        if (newsletterForm) newsletterForm.addEventListener('submit', this._onNewsletterSubmit);
      }

      disconnectedCallback() {
        this.removeEventListener('quiz:answer', this._onAnswer);
      }

      _activate(index, _animate = true) {
        this.slides.forEach((slide, i) => {
          slide.classList.toggle('is-active', i === index);
        });
        this._state.currentIndex = index;
        this._syncProgress(index);
        this._syncNavButtons(index);

        if (_animate) {
          const firstOption = this.slides[index]?.querySelector('quiz-option');
          if (firstOption) {
            requestAnimationFrame(() => firstOption.focus({ preventScroll: true }));
          }
        }
      }

      _syncNavButtons(index) {
        const slide = this.slides[index];
        if (!slide) return;
        const nextBtn = slide.querySelector('.wt-quiz__nav-next');
        if (!nextBtn) return;

        const hasSelection = !!slide.querySelector('quiz-option.is-selected');
        nextBtn.disabled = !hasSelection;

        const questionSlides = this.slides.filter(
          s => this._isQuestionSlide(s)
        );
        const qi = questionSlides.indexOf(slide);
        if (qi === -1) return;

        const prevBtn = slide.querySelector('.wt-quiz__nav-prev');
        if (prevBtn) prevBtn.hidden = qi === 0;

        const isLast = qi === questionSlides.length - 1;
        const label = nextBtn.querySelector('.wt-quiz__nav-label');
        if (label) {
          label.textContent = isLast
            ? (nextBtn.dataset.resultLabel || label.textContent)
            : (nextBtn.dataset.nextLabel || label.textContent);
        }
      }

      _syncProgress(index) {
        const questionSlides = this.slides.filter(
          s => this._isQuestionSlide(s)
        );
        const current = this.slides[index];
        const isQuestion = this._isQuestionSlide(current);

        const progressEl = this.querySelector('.wt-quiz__progress');
        if (progressEl) progressEl.hidden = !isQuestion;

        if (!isQuestion) return;

        const headerEl = this.querySelector('.wt-quiz__header');
        if (headerEl) {
          const styles = getComputedStyle(current);
          headerEl.style.backgroundColor = styles.getPropertyValue('--quiz-block-bg').trim() || '';
          headerEl.style.color = styles.getPropertyValue('--quiz-block-text').trim() || '';
        }

        const qi = questionSlides.indexOf(current) + 1;
        const total = questionSlides.length;
        if (this._progressFill) this._progressFill.style.width = `${(qi / total) * 100}%`;
        if (this._progressText) this._progressText.textContent = `${qi} / ${total}`;
      }

      _handleAnswer(e) {
        const oldTags = (e.detail.oldTags || '').split(',').map(t => t.trim()).filter(Boolean);
        oldTags.forEach(tag => {
          const key = tag.toLowerCase();
          if (this._state.tagMap[key] > 1) {
            this._state.tagMap[key]--;
          } else {
            delete this._state.tagMap[key];
          }
        });
        const tags = (e.detail.tags || '').split(',').map(t => t.trim()).filter(Boolean);
        tags.forEach(tag => {
          const key = tag.toLowerCase();
          this._state.tagMap[key] = (this._state.tagMap[key] || 0) + 1;
        });
        this._save();
        const currentSlide = this.slides[this._state.currentIndex];
        const nextBtn = currentSlide?.querySelector('.wt-quiz__nav-next');
        if (nextBtn) {
          nextBtn.disabled = false;
          const questionSlides = this.slides.filter(
            s => this._isQuestionSlide(s)
          );
          const qi = questionSlides.indexOf(currentSlide);
          const isLast = qi !== -1 && qi === questionSlides.length - 1;
          if (isLast) {
            const url = this._getRedirectUrl();
            if (url) nextBtn.dataset.redirectUrl = url;
          }
        }
      }

      _handleNewsletterSubmit(e) {
        e.preventDefault();
        const form = e.target;
        fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          redirect: 'manual',
        })
          .catch(() => {})
          .finally(() => this._advance());
      }

      _advance() {
        const next = this._state.currentIndex + 1;
        if (next >= this.slides.length) return;
        if (next === this._resultsIndex()) {
          this._calcResult();
          this._state.completedAt = new Date().toISOString();
          this._save();
        }
        this._activate(next);
      }

      _back() {
        const prev = this._state.currentIndex - 1;
        if (prev >= 0) this._activate(prev);
      }

      _retake() {
        const firstQuestionIndex = this.slides.findIndex(s => this._isQuestionSlide(s));
        const startIndex = firstQuestionIndex >= 0 ? firstQuestionIndex : 0;
        this._state = { currentIndex: startIndex, tagMap: {} };
        try { localStorage.removeItem(this._key); } catch (_) {}
        this.querySelectorAll('quiz-option').forEach(o => o.classList.remove('is-selected'));
        if (this._progressFill) {
          this._progressFill.style.transition = 'none';
          this._progressFill.style.width = '0%';
          requestAnimationFrame(() => { this._progressFill.style.transition = ''; });
        }
        this._activate(startIndex);
      }

      _getSlideType(slide) {
        return slide.querySelector('[data-block-type]')?.dataset.blockType || null;
      }

      _isQuestionSlide(slide) {
        const t = this._getSlideType(slide);
        return t === 'question';
      }

      _resultsIndex() {
        return this.slides.findIndex(s => this._getSlideType(s) === 'results');
      }

      _getRedirectUrl() {
        const resultsEl = this.querySelector('.wt-quiz__results');
        if (resultsEl?.dataset.redirect !== 'true') return null;
        const topTag = Object.entries(this._state.tagMap)
          .filter(([, count]) => count > 0)
          .sort(([, a], [, b]) => b - a)[0]?.[0]?.toLowerCase();
        if (!topTag) return null;
        const match = this.querySelector(`[data-result-tag="${topTag}"]`);
        return match?.dataset.url || null;
      }

      _calcResult() {
        const items = Array.from(this.querySelectorAll('[data-result-tag]'));
        items.forEach(item => { item.hidden = true; });
        const fallback = this.querySelector('.wt-quiz__result-fallback');
        const infoEl = this.querySelector('.wt-quiz__result-info');

        const sortedTags = Object.entries(this._state.tagMap)
          .filter(([, count]) => count > 0)
          .sort(([, a], [, b]) => b - a);

        const topTag = sortedTags[0]?.[0]?.toLowerCase();

        const match = topTag
          ? items.find(item => item.dataset.resultTag === topTag)
          : null;

        if (infoEl) {
          const preRendered = match?.querySelector('.wt-quiz__result-item-info');
          if (preRendered) {
            infoEl.innerHTML = preRendered.innerHTML;
          }
          infoEl.hidden = !match;
          infoEl.style.setProperty('--quiz-result-info-bg', match?.dataset.infoBg || '');
          infoEl.style.setProperty('--quiz-result-info-text', match?.dataset.infoText || '');
        }

        if (match) {
          match.hidden = false;
          this._state.resultHandle = match.dataset.resultTag;
          if (fallback) fallback.hidden = true;
          this._refreshSlider(match);
        } else {
          if (fallback) fallback.hidden = false;
        }
      }


      _renderSavedResult() {
        if (!this._state.resultHandle) return;
        const match = this.querySelector(`[data-result-tag="${this._state.resultHandle}"]`);
        if (!match) {
          const fallback = this.querySelector('.wt-quiz__result-fallback');
          if (fallback) fallback.hidden = false;
          return;
        }
        match.hidden = false;
        const infoEl = this.querySelector('.wt-quiz__result-info');
        if (infoEl) {
          const preRendered = match.querySelector('.wt-quiz__result-item-info');
          if (preRendered) {
            infoEl.innerHTML = preRendered.innerHTML;
            infoEl.hidden = false;
            infoEl.style.setProperty('--quiz-result-info-bg', match.dataset.infoBg || '');
            infoEl.style.setProperty('--quiz-result-info-text', match.dataset.infoText || '');
          }
        }
        this._refreshSlider(match);
      }

      _refreshSlider(container) {
        const slideshow = container?.querySelector('slideshow-section');
        if (!slideshow) return;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (slideshow.swiper) {
            slideshow.swiper.destroy(true, true);
            slideshow.swiper = null;
          }
          if (typeof slideshow.swiperInitilize === 'function') {
            slideshow.swiperInitilize();
          }
        }));
      }

      _save() {
        try {
          localStorage.setItem(this._key, JSON.stringify(this._state));
        } catch (_) {}
      }
    }
  );
}

if (!customElements.get('quiz-slide')) {
  customElements.define('quiz-slide', class QuizSlide extends HTMLElement {});
}

if (!customElements.get('quiz-option')) {
  customElements.define(
    'quiz-option',
    class QuizOption extends HTMLElement {
      connectedCallback() {
        if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
        this._onClick = this._handleClick.bind(this);
        this._onKeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._handleClick(); }
        };
        this.addEventListener('click', this._onClick);
        this.addEventListener('keydown', this._onKeydown);
      }

      disconnectedCallback() {
        this.removeEventListener('click', this._onClick);
        this.removeEventListener('keydown', this._onKeydown);
      }

      _handleClick() {
        if (this.classList.contains('is-selected')) return;
        const options = this.closest('.wt-quiz__options');
        let oldTags = '';
        if (options) {
          const prev = options.querySelector('quiz-option.is-selected');
          if (prev) oldTags = prev.dataset.tags || '';
          options.querySelectorAll('quiz-option').forEach(o => o.classList.remove('is-selected'));
        }
        this.classList.add('is-selected');
        this.dispatchEvent(
          new CustomEvent('quiz:answer', {
            bubbles: true,
            detail: { tags: this.dataset.tags || '', oldTags },
          })
        );
      }
    }
  );
}
