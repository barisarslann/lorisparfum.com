const SCROLL_ANIMATION_TRIGGER_CLASSNAME = "scroll-trigger";
const SCROLL_ANIMATION_OFFSCREEN_CLASSNAME = "scroll-trigger--offscreen";
const SCROLL_ANIMATION_CANCEL_CLASSNAME = "scroll-trigger--cancel";

function revealElement(elementTarget, index) {
  if (elementTarget.classList.contains(SCROLL_ANIMATION_OFFSCREEN_CLASSNAME)) {
    elementTarget.classList.remove(SCROLL_ANIMATION_OFFSCREEN_CLASSNAME);
    if (elementTarget.hasAttribute("data-cascade"))
      elementTarget.setAttribute("style", `--animation-order: ${index};`);
  }
}

function isElementInViewport(element) {
  const rect = element.getBoundingClientRect();
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;
  return rect.top < viewportHeight && rect.bottom > 0;
}

// Scroll in animation logic
function onIntersection(elements, observer) {
  elements.forEach((element, index) => {
    if (element.isIntersecting) {
      revealElement(element.target, index);
      observer.unobserve(element.target);
    } else {
      element.target.classList.add(SCROLL_ANIMATION_OFFSCREEN_CLASSNAME);
      element.target.classList.remove(SCROLL_ANIMATION_CANCEL_CLASSNAME);
    }
  });
}

/**
 * Safe helper: returns a root that supports querySelectorAll.
 */
function getQueryRoot(rootEl) {
  if (rootEl && typeof rootEl.querySelectorAll === "function") return rootEl;
  return document;
}

function initializeScrollAnimationTrigger(
  rootEl = document,
  isDesignModeEvent = false,
) {
  const root = getQueryRoot(rootEl);

  const animationTriggerElements = Array.from(
    root.getElementsByClassName(SCROLL_ANIMATION_TRIGGER_CLASSNAME),
  );

  if (animationTriggerElements.length === 0) return;

  if (isDesignModeEvent) {
    animationTriggerElements.forEach((element) => {
      element.classList.add("scroll-trigger--design-mode");
    });
    return;
  }

  const nonStickyFooterSections = Array.from(
    document.querySelectorAll(
      ".shopify-section-group-footer-group:not(.wt-footer-page-section)",
    ),
  );

  const elementsToObserve = [];

  animationTriggerElements.forEach((element) => {
    const inNonStickyFooter = nonStickyFooterSections.some((section) =>
      section.contains(element),
    );

    if (inNonStickyFooter) {
      element.classList.add(SCROLL_ANIMATION_CANCEL_CLASSNAME);
    } else {
      elementsToObserve.push(element);
    }
  });

  if (elementsToObserve.length === 0) return;

  const observer = new IntersectionObserver(onIntersection, {
    rootMargin: "0px 0px -50px 0px",
  });

  elementsToObserve.forEach((element, index) => {
    observer.observe(element);
    // Observer's first callback can briefly report offscreen before correcting itself, causing a visible jump.
    if (isElementInViewport(element)) {
      revealElement(element, index);
      observer.unobserve(element);
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  initializeScrollAnimationTrigger();
});

if (Shopify.designMode) {
  document.addEventListener("shopify:section:load", (event) =>
    initializeScrollAnimationTrigger(event.target, true),
  );
  document.addEventListener("shopify:section:reorder", () =>
    initializeScrollAnimationTrigger(document, true),
  );
}
