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
 * l'écran dans le sens de l'onglet visé, et le nom de la page visée y apparaît (tamponné en
 * crème, masqué par la peinture) ; le contenu change sous le calque, puis le coloriage s'efface
 * dans le même sens, emportant le nom avec lui.
 */

type Direction = 'right' | 'left' | 'down';

const COVER_DURATION = 0.45;
const REVEAL_DURATION = 0.5;
/** Le nom est tamponné quand la peinture couvre à peu près la moitié de l'écran… */
const LABEL_AT = COVER_DURATION * 0.5;
const LABEL_DURATION = 0.35;
/** … et reste lisible un instant avant que le contenu change. */
const LABEL_HOLD = 0.15;
/** Accueil : le logo remplace le nom. */
const LOGO = 'logo';

const layer = document.querySelector<HTMLElement>('[data-page-cover]');
const svg = layer?.querySelector<SVGSVGElement>('svg');
// Le tracé peint, et sa copie qui sert de masque au nom.
const strokes = layer
  ? gsap.utils.toArray<SVGPathElement>(layer.querySelectorAll('[data-cover-stroke]'))
  : [];
const path = strokes.at(-1);
const label = layer?.querySelector<SVGGElement>('[data-cover-label]');
const title = layer?.querySelector<SVGTextElement>('[data-cover-title]');
const logo = layer?.querySelector<SVGGElement>('[data-cover-logo]');
const logoMark = layer?.querySelector<SVGSVGElement>('[data-cover-logo-mark]');
const logoWordmark = layer?.querySelector<SVGSVGElement>('[data-cover-logo-wordmark]');

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

/** Nom peint sur la transition vers `to` : réglé dans site.ts, sinon le titre de la page. */
function labelFor(to: string, newDocument?: Document) {
  if (to === '/') return LOGO;
  return site.transitionLabels[to] ?? newDocument?.title.split(' | ')[0];
}

/** Place le nom (ou le logo) au centre de l'écran, à une taille qui tient en largeur. */
function layoutLabel(text: string, width: number, height: number) {
  if (!title || !logo || !logoMark || !logoWordmark) return;
  const isLogo = text === LOGO;
  title.textContent = isLogo ? '' : text;
  logo.style.display = isLogo ? '' : 'none';

  if (isLogo) {
    // Proportions du composant Logo : barres 198×203 à 83 % de la hauteur du logotype 339×245.
    const h = gsap.utils.clamp(60, 150, width * 0.12);
    const markH = h * 0.8286;
    const markW = (markH * 198) / 203;
    const wordW = (h * 339) / 245;
    const gap = h * 0.1837;
    const x = (width - markW - gap - wordW) / 2;
    const place = (el: SVGSVGElement, left: number, w: number, hh: number) => {
      el.setAttribute('x', String(left));
      el.setAttribute('y', String(height / 2 - hh / 2));
      el.setAttribute('width', String(w));
      el.setAttribute('height', String(hh));
    };
    place(logoMark, x, markW, markH);
    place(logoWordmark, x + markW + gap, wordW, h);
    return;
  }

  title.setAttribute('x', String(width / 2));
  title.setAttribute('y', String(height / 2));
  // Plus grand en proportion sur mobile, où l'écran est étroit.
  let size = gsap.utils.clamp(48, 170, width * (width < 640 ? 0.17 : 0.13));
  title.style.fontSize = `${size}px`;
  // Réduit la taille si le nom dépasse 86 % de la largeur (ex. « Politique de confidentialité »).
  const fit = (width * 0.86) / title.getComputedTextLength();
  if (fit < 1) {
    size *= fit;
    title.style.fontSize = `${size}px`;
  }
}

const wait = (seconds: number) =>
  new Promise<void>((resolve) => gsap.delayedCall(seconds, resolve));

let tween: gsap.core.Tween | undefined;
let covering: Promise<void> | undefined;
let covered: { length: number; pen: number } | undefined;

/** Tamponne le nom sur la peinture : il arrive légèrement de travers, comme posé à la main. */
function stampLabel(text: string | undefined, width: number, height: number) {
  if (!label || !text) return Promise.resolve();
  layoutLabel(text, width, height);
  return new Promise<void>((resolve) => {
    gsap.fromTo(
      label,
      { opacity: 0, scale: 0.82, rotation: -9, transformOrigin: '50% 50%' },
      {
        opacity: 1,
        scale: 1,
        rotation: gsap.utils.random(-4, -1.5),
        duration: LABEL_DURATION,
        ease: 'back.out(2.2)',
        onComplete: () => void wait(LABEL_HOLD).then(resolve),
      },
    );
  });
}

/**
 * Colorie l'écran et y tamponne le nom de la page (`text` peut n'être connu qu'une fois la page
 * téléchargée). Si un coloriage est déjà en cours (clic pendant une transition), on l'attend.
 */
function cover(direction: Direction, text: Promise<string | undefined>) {
  if (covering) return covering;
  if (!layer || !svg || !path) return Promise.resolve();

  const { width, height } = layer.getBoundingClientRect();
  const { d, pen } = scribblePath(width, height, direction);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  strokes.forEach((stroke) => {
    stroke.setAttribute('d', d);
    stroke.setAttribute('stroke-width', String(pen));
  });
  const length = path.getTotalLength();
  const gap = length + 200;

  layer.style.visibility = 'visible';
  tween?.kill();
  const painting = new Promise<void>((resolve) => {
    tween = gsap.fromTo(
      strokes,
      { strokeDasharray: `0 ${gap}`, strokeDashoffset: 0 },
      {
        strokeDasharray: `${length} ${gap}`,
        duration: COVER_DURATION,
        ease: 'power2.inOut',
        onComplete: resolve,
      },
    );
  });
  const stamping = Promise.all([text, wait(LABEL_AT)]).then(([name]) =>
    stampLabel(name, width, height),
  );
  covering = Promise.all([painting, stamping]).then(() => {
    covered = { length, pen };
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
    tween = gsap.to(strokes, {
      strokeDashoffset: -(state.length + state.pen),
      duration: REVEAL_DURATION,
      ease: 'power2.inOut',
      onComplete: () => {
        layer.style.visibility = '';
        if (label) gsap.set(label, { opacity: 0 });
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
      const loading = load();
      const known = labelFor(to);
      const text = known
        ? Promise.resolve(known)
        : loading.then(() => labelFor(to, event.newDocument));
      await Promise.all([cover(directionBetween(from, to), text), loading]);
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
