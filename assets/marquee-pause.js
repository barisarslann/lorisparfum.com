if (!window.wtMarqueePauseInitialized) {
  window.wtMarqueePauseInitialized = true;

  const MARQUEE_SELECTOR =
    ".wt-testimonials-marquee__container .wt-brands__marquee";
  const PAUSED_CLASS = "wt-brands__marquee--paused";
  const MOBILE_MEDIA_QUERY = "(max-width: 899px)";

  let pausedMarquee = null;

  const resume = () => {
    if (!pausedMarquee) return;

    pausedMarquee.classList.remove(PAUSED_CLASS);
    pausedMarquee = null;
  };

  document.addEventListener("click", (event) => {
    if (!window.matchMedia(MOBILE_MEDIA_QUERY).matches) return;

    const marquee = event.target.closest?.(MARQUEE_SELECTOR) || null;
    const clickedPausedMarquee = marquee !== null && marquee === pausedMarquee;

    resume();

    if (marquee && !clickedPausedMarquee) {
      marquee.classList.add(PAUSED_CLASS);
      pausedMarquee = marquee;
    }
  });

  window.addEventListener("scroll", resume, { passive: true });
}
