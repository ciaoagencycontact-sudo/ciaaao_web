import { gsap } from 'gsap';

/** Breakpoints alignés sur Tailwind (lg = 64rem). */
export const conditions = {
  desktop: '(min-width: 64rem)',
  mobile: '(max-width: 63.999rem)',
  reduceMotion: '(prefers-reduced-motion: reduce)',
} as const;

export const prefersReducedMotion = () => window.matchMedia(conditions.reduceMotion).matches;

/**
 * Contexte responsive partagé par les modules :
 * chaque module y ajoute ses animations, qui sont nettoyées quand une condition change.
 */
export const mm = gsap.matchMedia();
