import { gsap } from 'gsap';
import { drawPath, erasePath, hidePath } from '../draw';
import { drawMark, eraseMark, hideMarks, markProgress, showMark } from '../marks';
import { matchesPath, normalizePath } from '../route';

const ERASE_SPEED = 1400;
/** Effacement de la marque de la page quittée : plus posé qu'au simple survol. */
const HANDOFF_ERASE_SPEED = 900;
/** La nouvelle marque commence quand l'ancienne est effacée à 60 % (chevauchement). */
const HANDOFF_OVERLAP = 0.6;
/** Délai de l'intro quand le logo ne joue pas la sienne. */
const INTRO_DELAY = 0.5;

const isCurrent = (link: Element) => link.getAttribute('aria-current') === 'page';
const isVisible = (link: Element) => link.getBoundingClientRect().width > 0;

/**
 * Premier affichage (chargement complet de la page) : la marque de la page active se dessine
 * après l'intro du logo ; au rechargement, le cercle est déjà là (posé en CSS avant le rendu).
 */
function playIntro(links: HTMLAnchorElement[], introEnd: number) {
  const reload = document.documentElement.classList.contains('nav-static');
  document.documentElement.classList.remove('nav-static');

  links.forEach((link) => {
    // Menu mobile fermé : sa marque se dessine à l'ouverture (scripts/menu.ts).
    if (!isCurrent(link) || !isVisible(link)) return hideMarks(link);
    if (reload) showMark(link, 'circle');
    else {
      hideMarks(link);
      drawMark(link, { delay: introEnd || INTRO_DELAY });
    }
  });
}

/**
 * Changement de page (le header reste en place) : la marque de la page quittée s'efface, puis
 * celle de la nouvelle page se dessine en chevauchement. Si elle était déjà tracée au survol,
 * elle reste, et se termine si elle l'était à moitié.
 */
function moveCurrent(links: HTMLAnchorElement[], to: string) {
  let drawAt = 0;

  links.forEach((link) => {
    if (!isCurrent(link) || matchesPath(to, link.getAttribute('href') ?? '')) return;
    link.removeAttribute('aria-current');
    if (isVisible(link))
      drawAt = eraseMark(link, { speed: HANDOFF_ERASE_SPEED }).duration() * HANDOFF_OVERLAP;
    else hideMarks(link);
  });

  links.forEach((link) => {
    if (isCurrent(link) || !matchesPath(to, link.getAttribute('href') ?? '')) return;
    link.setAttribute('aria-current', 'page');
    if (isVisible(link)) drawMark(link, { delay: markProgress(link) > 0 ? 0 : drawAt });
  });
}

/** Liens marqués au feutre : tracé au survol / focus clavier, effacé en sens inverse ; page active toujours marquée. */
function initNavMarks(introEnd: number) {
  const links = gsap.utils.toArray<HTMLAnchorElement>('[data-nav-link]');

  links.forEach((link) => {
    const show = () => !isCurrent(link) && drawMark(link, { ease: 'power1.inOut' });
    const hide = () => {
      if (isCurrent(link) || link.matches(':hover') || link.matches(':focus-visible')) return;
      eraseMark(link, { speed: ERASE_SPEED });
    };

    // Au doigt, pas de survol : la marque se dessine au changement de page.
    link.addEventListener('pointerenter', (event) => event.pointerType !== 'touch' && show());
    link.addEventListener('pointerleave', (event) => event.pointerType !== 'touch' && hide());
    link.addEventListener('focus', () => link.matches(':focus-visible') && show());
    link.addEventListener('blur', hide);
  });

  playIntro(links, introEnd);

  // Header conservé d'une page à l'autre (transition:persist) : les marques suivent la navigation.
  document.addEventListener('astro:before-preparation', (event) => {
    moveCurrent(links, normalizePath(event.to.pathname));
  });
}

/** « Un petit café ? » : la vapeur se dessine, flotte, puis s'évapore. */
function initCoffeeSteam() {
  document.querySelectorAll<HTMLElement>('[data-coffee]').forEach((coffee) => {
    const steam = coffee.querySelector<SVGSVGElement>('[data-scribble="steam"]');
    if (!steam) return;
    const wisps = gsap.utils.toArray<SVGPathElement>(
      steam.querySelectorAll('[data-scribble-path]'),
    );
    wisps.forEach(hidePath);

    let timeline: gsap.core.Timeline | undefined;

    const show = () => {
      timeline?.kill();
      timeline = gsap.timeline();
      wisps.forEach((wisp, index) => {
        // Volutes décalées, du bas vers le haut, comme une vapeur qui monte.
        timeline!.add(drawPath(wisp, { speed: 90, ease: 'sine.out' }), index * 0.12);
      });
      timeline.fromTo(
        steam,
        { y: 4 },
        { y: -3, duration: 1.4, ease: 'sine.inOut', repeat: -1, yoyo: true },
        0,
      );
    };

    const hide = () => {
      if (coffee.matches(':hover') || coffee.matches(':has(:focus-visible)')) return;
      timeline?.kill();
      timeline = gsap.timeline();
      wisps.forEach((wisp) => timeline!.add(erasePath(wisp, { speed: 260 }), 0));
      timeline.to(steam, { y: -8, duration: 0.3, ease: 'sine.out' }, 0).set(steam, { y: 0 });
    };

    coffee.addEventListener('pointerenter', show);
    coffee.addEventListener('pointerleave', hide);
    coffee.addEventListener('focusin', () => coffee.matches(':has(:focus-visible)') && show());
    coffee.addEventListener('focusout', hide);
  });
}

/**
 * Logo : barres qui arrivent une à une (une fois par session), puis frémissent au survol.
 * Renvoie la fin de l'intro, en secondes (0 sans intro).
 */
function initLogo() {
  const link = document.querySelector<HTMLElement>('[data-logo-link]');
  const mark = link?.querySelector<SVGSVGElement>('[data-logo-mark]');
  if (!link || !mark) return 0;

  const bars = gsap.utils.toArray<SVGPathElement>(mark.querySelectorAll('path'));
  const boxes = new Map(bars.map((bar) => [bar, bar.getBBox()]));
  const horizontal = bars
    .filter((bar) => boxes.get(bar)!.width > boxes.get(bar)!.height)
    .sort((a, b) => boxes.get(b)!.y - boxes.get(a)!.y); // du bas vers le haut
  const vertical = bars.filter((bar) => !horizontal.includes(bar));

  const root = document.documentElement;
  let introEnd = 0;
  if (root.classList.contains('logo-intro')) {
    try {
      sessionStorage.setItem('ciaaao:logo-intro', '1');
    } catch {
      /* stockage indisponible */
    }
    const intro = gsap
      .timeline({ delay: 0.15 })
      .set(mark, { visibility: 'visible' })
      .call(() => root.classList.remove('logo-intro'))
      .from(horizontal, {
        scaleX: 0,
        transformOrigin: '0% 50%',
        duration: 0.35,
        stagger: 0.09,
        ease: 'power3.out',
      })
      .from(
        vertical,
        { scaleY: 0, transformOrigin: '50% 100%', duration: 0.35, ease: 'back.out(2)' },
        '-=0.1',
      );
    introEnd = intro.delay() + intro.duration();
  }

  let shiver: gsap.core.Timeline | undefined;
  link.addEventListener('pointerenter', () => {
    if (shiver?.isActive()) return;
    shiver = gsap
      .timeline()
      .to(bars, {
        x: () => gsap.utils.random(-14, 14),
        y: () => gsap.utils.random(-6, 6),
        rotation: () => gsap.utils.random(-5, 5),
        transformOrigin: '50% 50%',
        duration: 0.14,
        ease: 'power2.out',
        stagger: 0.02,
      })
      .to(bars, { x: 0, y: 0, rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)' });
  });

  return introEnd;
}

export function initNav() {
  initNavMarks(initLogo());
  initCoffeeSteam();
}
