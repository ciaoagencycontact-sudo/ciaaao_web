import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

let instance: Lenis | undefined;

/** Instance Lenis active (absente en mouvement réduit). */
export const getLenis = () => instance;

/** Scroll fluide, piloté par le ticker GSAP pour rester synchronisé avec ScrollTrigger. */
export function initLenis() {
  const header = document.querySelector<HTMLElement>('header');

  const lenis = new Lenis({
    autoRaf: false,
    // Les liens d'ancre (#offres…) défilent en douceur, sous le header sticky.
    anchors: { offset: -(header?.offsetHeight ?? 0) },
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  instance = lenis;
  return lenis;
}
