import { gsap } from 'gsap';

/**
 * Apparition au scroll.
 * Usage : `data-reveal` sur un élément, délai optionnel via la variable CSS `--reveal-delay` (ex. 120ms).
 */
export function initReveal() {
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
    const delay = parseFloat(getComputedStyle(element).getPropertyValue('--reveal-delay')) || 0;

    gsap.fromTo(
      element,
      { autoAlpha: 0, y: 24 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        delay: delay / 1000,
        ease: 'power3.out',
        scrollTrigger: { trigger: element, start: 'top 90%', once: true },
      },
    );
  });
}
