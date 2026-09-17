/**
 * Point d'entrée des animations (chargé une fois par BaseLayout).
 * Ajouter une animation : créer un module dans ./modules, puis l'appeler ci-dessous.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initLenis } from './lenis';
import { prefersReducedMotion } from './media';
import { initNav } from './modules/nav';
import { initReveal } from './modules/reveal';
import { initSketch } from './modules/sketch';

gsap.registerPlugin(ScrollTrigger);

// En dev : `gsap` accessible depuis la console pour inspecter / rejouer les timelines.
if (import.meta.env.DEV) Object.assign(window, { gsap });

const root = document.documentElement;

if (!prefersReducedMotion()) {
  initLenis();
  initReveal();
  initSketch();
  initNav();
}

// Signale au script du <head> que les animations ont pris la main.
root.dataset.motionReady = '';
