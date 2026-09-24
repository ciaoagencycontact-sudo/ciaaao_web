import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { site } from '@/config/site';
import { getLenis } from '../lenis';
import { matchesPath, normalizePath } from '../route';

/**
 * Transition entre les pages, dessinée au feutre sous le header.
 *
 * Le routeur client d'Astro (<ClientRouter /> dans BaseLayout) ne recharge pas la page : il
 * télécharge la suivante et remplace le contenu, en gardant le header et le calque
 * [data-page-cover] (transition:persist). Pendant le téléchargement, un coup de feutre colorie
 * l'écran dans le sens de l'onglet visé ; le contenu change sous le calque, puis le coloriage
 * s'efface dans le même sens.
 */

type Direction = 'right' | 'left' | 'down';

const COVER_DURATION = 0.45;
const REVEAL_DURATION = 0.5;

const layer = document.querySelector<HTMLElement>('[data-page-cover]');
const svg = layer?.querySelector<SVGSVGElement>('svg');
const path = svg?.querySelector<SVGPathElement>('path');

/** Épaisseur du feutre : assez large pour couvrir l'écran en quelques allers-retours. */
const penWidth = (width: number, height: number) =>
  gsap.utils.clamp(70, 140, Math.max(width, height) / 11);

const jitter = (amount: number) => gsap.utils.random(-amount, amount);
const point = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;

/**
 * Coloriage en zigzag qui avance dans une direction et déborde de l'écran.
 * Chaque passe est légèrement bombée, comme un poignet qui balaie : le front reste irrégulier.
 */
function scribblePath(width: number, height: number, direction: Direction) {
  const pen = penWidth(width, height);
  // Passes serrées : deux demi-tours voisins restent à moins d'une épaisseur (pas de trou aux bords).
  const step = pen * 0.42;
  const horizontal = direction !== 'down';
  const along = horizontal ? width : height;
  const across = horizontal ? height : width;
  // Coordonnées (avancée, travers) → écran.
  const toScreen = (a: number, c: number) =>
    horizontal ? point(direction === 'left' ? width - a : a, c) : point(c, a);

  let d = `M${toScreen(-pen, -pen)}`;
  let previous = -pen;
  for (let i = 1, position = -pen + step; position < along + pen * 1.5; i++, position += step) {
    const a = position + jitter(step * 0.2);
    const c = (i % 2 === 0 ? -pen : across + pen) + jitter(pen * 0.2);
    const bulge = (a + previous) / 2 + step * gsap.utils.random(0.5, 1.5);
    d += ` Q${toScreen(bulge, across / 2 + jitter(across * 0.15))} ${toScreen(a, c)}`;
    previous = a;
  }
  return { d, pen };
}

/** Sens du coloriage : vers l'onglet visé dans le menu, sinon de haut en bas. */
function directionBetween(from: string, to: string): Direction {
  const nav = site.mainNav.map((link) => link.href);
  const start = nav.findIndex((link) => matchesPath(from, link));
  const end = nav.findIndex((link) => matchesPath(to, link));
  if (start === -1 || end === -1 || start === end) return 'down';
  return end > start ? 'right' : 'left';
}

let tween: gsap.core.Tween | undefined;
let covering: Promise<void> | undefined;
let covered: { length: number; pen: number } | undefined;

/** Colorie l'écran ; si un coloriage est déjà en cours (clic pendant une transition), on l'attend. */
function cover(direction: Direction) {
  if (covering) return covering;
  if (!layer || !svg || !path) return Promise.resolve();

  const { width, height } = layer.getBoundingClientRect();
  const { d, pen } = scribblePath(width, height, direction);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  path.setAttribute('d', d);
  path.setAttribute('stroke-width', String(pen));
  const length = path.getTotalLength();
  const gap = length + 200;

  layer.style.visibility = 'visible';
  tween?.kill();
  covering = new Promise((resolve) => {
    tween = gsap.fromTo(
      path,
      { strokeDasharray: `0 ${gap}`, strokeDashoffset: 0 },
      {
        strokeDasharray: `${length} ${gap}`,
        duration: COVER_DURATION,
        ease: 'power2.inOut',
        onComplete: () => {
          covered = { length, pen };
          resolve();
        },
      },
    );
  });
  return covering;
}

/** Efface le coloriage dans le sens où il a été tracé. Résout quand le contenu réapparaît. */
function reveal(): Promise<void> {
  const state = covered;
  covering = undefined;
  covered = undefined;
  if (!layer || !path || !state) return Promise.resolve();

  return new Promise((resolve) => {
    tween = gsap.to(path, {
      strokeDashoffset: -(state.length + state.pen),
      duration: REVEAL_DURATION,
      ease: 'power2.inOut',
      onComplete: () => {
        layer.style.visibility = '';
      },
    });
    // Le contenu commence à s'animer quand l'écran est à moitié découvert.
    gsap.delayedCall(REVEAL_DURATION * 0.4, resolve);
  });
}

/**
 * Lance les transitions de page.
 * `initPage` anime le contenu d'une page (apparitions, décorations) et renvoie de quoi le
 * nettoyer : appelé tout de suite pour la première page, puis à chaque nouvelle page, une fois
 * l'écran en train de se découvrir.
 */
export function initPageTransitions(initPage: () => () => void) {
  let cleanup = initPage();
  let pageId = 0;

  document.addEventListener('astro:before-preparation', (event) => {
    const from = normalizePath(event.from.pathname);
    const to = normalizePath(event.to.pathname);
    if (from === to) return;

    // L'écran se colorie pendant que la page suivante se télécharge.
    const load = event.loader;
    event.loader = async () => {
      await Promise.all([cover(directionBetween(from, to)), load()]);
    };
  });

  document.addEventListener('astro:before-swap', () => {
    cleanup();
    cleanup = () => {};
  });

  document.addEventListener('astro:after-swap', () => {
    // Le routeur a remis la page en haut (ou à sa position, en revenant en arrière).
    getLenis()?.resize();
    getLenis()?.scrollTo(window.scrollY, { immediate: true, force: true });

    const id = ++pageId;
    reveal().then(() => {
      if (id !== pageId) return;
      cleanup = initPage();
      ScrollTrigger.refresh();
    });
  });
}
