/**
 * Point d'entrée des animations (chargé une fois par BaseLayout).
 * Ajouter une animation : créer un module dans ./modules, puis l'appeler ci-dessous.
 *
 * Le routeur client ne recharge pas la page : ce fichier ne s'exécute qu'une fois. Le header
 * (conservé) s'anime une fois pour toutes ; le contenu, à chaque page (initPage).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initLenis } from './lenis';
import { prefersReducedMotion } from './media';
import { initNav } from './modules/nav';
import { initReveal } from './modules/reveal';
import { initSketch } from './modules/sketch';
import { initPageTransitions } from './modules/transition';

gsap.registerPlugin(ScrollTrigger);

// En dev : `gsap` accessible depuis la console pour inspecter / rejouer les timelines.
if (import.meta.env.DEV) Object.assign(window, { gsap });

const root = document.documentElement;

// Le routeur remplace les attributs de <html> par ceux de la page suivante : on garde nos
// classes (.motion, Lenis…) et le signal motionReady.
document.addEventListener('astro:before-swap', (event) => {
  const next = event.newDocument.documentElement;
  next.className = root.className;
  if ('motionReady' in root.dataset) next.dataset.motionReady = '';

  // Header conservé : la page active vient de la page suivante (avec ou sans animations).
  const links = event.newDocument.querySelectorAll('[data-nav-link]');
  document.querySelectorAll('[data-nav-link]').forEach((link, index) => {
    const current = links[index]?.getAttribute('aria-current');
    if (current) link.setAttribute('aria-current', current);
    else link.removeAttribute('aria-current');
  });
});

/** Animations du contenu d'une page ; renvoie leur nettoyage (avant le changement de page). */
function initPage() {
  const context = gsap.context(() => {
    initReveal();
    initSketch();
  });
  return () => context.revert();
}

if (!prefersReducedMotion()) {
  initLenis();
  initNav();
  initPageTransitions(initPage);
}

// Signale au script du <head> que les animations ont pris la main.
root.dataset.motionReady = '';
