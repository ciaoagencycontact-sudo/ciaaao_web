import { gsap } from 'gsap';
import { site } from '@/config/site';
import { isPlainNavigation, matchesPath, normalizePath } from '../handoff';

/**
 * Transition entre les pages, dessinée au feutre sous le header.
 *
 * Le site recharge la page à chaque clic : au départ, le calque [data-page-cover] recouvre le
 * contenu, puis on change de page. La page suivante démarre couverte (classe .page-cover posée par
 * le script du <head> de BaseLayout, avant le premier rendu) et se découvre.
 * Seuls les clics simples vers une autre page du site sont concernés : pas les nouveaux onglets,
 * les ancres, précédent / suivant ni les arrivées directes.
 */

/** Clé sessionStorage, reprise telle quelle dans le script du <head> de BaseLayout. */
const COVER_KEY = 'ciaaao:page-cover';

type Direction = 'right' | 'left' | 'down';

interface Cover {
  to: string;
  direction: Direction;
  at: number;
}

const COVER_DURATION = 0.45;
const REVEAL_DURATION = 0.5;

const root = document.documentElement;
const layer = document.querySelector<HTMLElement>('[data-page-cover]');
const svg = layer?.querySelector<SVGSVGElement>('svg');
const path = svg?.querySelector<SVGPathElement>('path');

let leaving = false;
let tween: gsap.core.Tween | undefined;

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

/** Prépare le tracé du calque (dimensions de l'écran) et renvoie sa longueur. */
function prepare(direction: Direction) {
  if (!layer || !svg || !path) return 0;
  const { width, height } = layer.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const { d, pen } = scribblePath(width, height, direction);
  path.setAttribute('d', d);
  path.setAttribute('stroke-width', String(pen));
  return path.getTotalLength();
}

/** Sens du coloriage : vers l'onglet visé dans le menu, sinon de haut en bas. */
function directionTo(href: string): Direction {
  const here = normalizePath(location.pathname);
  const nav = site.mainNav.map((link) => link.href);
  const from = nav.findIndex((link) => matchesPath(here, link));
  const to = nav.findIndex((link) => matchesPath(href, link));
  if (from === -1 || to === -1 || from === to) return 'down';
  return to > from ? 'right' : 'left';
}

/** Couvre l'écran puis ouvre `link` (utilisé aussi par le menu mobile). */
export function leavePage(link: HTMLAnchorElement) {
  if (leaving) return;
  if (!layer || !path) {
    location.assign(link.href);
    return;
  }
  leaving = true;

  const cover: Cover = {
    to: normalizePath(link.pathname),
    direction: directionTo(normalizePath(link.pathname)),
    at: Date.now(),
  };
  try {
    sessionStorage.setItem(COVER_KEY, JSON.stringify(cover));
  } catch {
    /* stockage indisponible : la page suivante s'affichera sans être couverte */
  }

  const length = prepare(cover.direction);
  const gap = length + 200;

  layer.style.visibility = 'visible';
  tween?.kill();
  tween = gsap.fromTo(
    path,
    { strokeDasharray: `0 ${gap}`, strokeDashoffset: 0 },
    {
      strokeDasharray: `${length} ${gap}`,
      duration: COVER_DURATION,
      ease: 'power2.inOut',
      onComplete: () => location.assign(link.href),
    },
  );
}

/** Découvre la page si elle arrive couverte. Résout quand le contenu devient visible. */
function reveal(): Promise<void> {
  if (!root.classList.contains('page-cover') || !layer || !path) return Promise.resolve();

  const length = prepare((root.dataset.coverDirection as Direction | undefined) ?? 'down');
  const gap = length + 200;
  const pen = Number(path.getAttribute('stroke-width'));

  // Le fond plein posé en CSS laisse la place au tracé complet, dans la même image.
  path.style.strokeDasharray = `${length} ${gap}`;
  path.style.strokeDashoffset = '0';
  layer.style.visibility = 'visible';
  root.classList.remove('page-cover');

  return new Promise((resolve) => {
    // Le coloriage s'efface dans le sens où il a été tracé.
    tween = gsap.to(path, {
      strokeDashoffset: -(length + pen),
      duration: REVEAL_DURATION,
      ease: 'power2.inOut',
      onComplete: () => {
        layer.style.visibility = '';
        resolve();
      },
    });
    gsap.delayedCall(REVEAL_DURATION * 0.4, resolve);
  });
}

/**
 * Lance les transitions de page. Renvoie une promesse résolue quand le contenu de la page
 * commence à apparaître (tout de suite si la page n'arrive pas couverte).
 */
export function initPageTransition() {
  document.addEventListener('click', (event) => {
    const link = (event.target as Element).closest?.<HTMLAnchorElement>('a[href]');
    if (!link || !isPlainNavigation(event, link) || link.hasAttribute('data-no-transition')) return;
    // Même page (rechargement) ou fichier (sitemap, PDF…) : navigation normale.
    if (normalizePath(link.pathname) === normalizePath(location.pathname)) return;
    if (/\.\w+$/.test(link.pathname)) return;

    event.preventDefault();
    leavePage(link);
  });

  // Page restaurée du cache (précédent / suivant) après un départ : on retire le calque.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    leaving = false;
    tween?.kill();
    root.classList.remove('page-cover');
    if (layer) layer.style.visibility = '';
  });

  return reveal();
}
