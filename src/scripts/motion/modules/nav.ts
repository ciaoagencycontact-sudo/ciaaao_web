import { gsap } from 'gsap';
import { drawPath, erasePath, hidePath, setPathProgress } from '../draw';
import { type Arrival, getArrival, matchesPath, trackDepartures } from '../handoff';

const CIRCLE_SPEED = 650;
const ERASE_SPEED = 1400;
/** Effacement du cercle de la page quittée : plus posé qu'au simple survol. */
const HANDOFF_ERASE_SPEED = 900;
/** Le nouveau cercle commence quand l'ancien est effacé à 60 % (chevauchement). */
const HANDOFF_OVERLAP = 0.6;
/** Délai de l'intro quand le logo ne joue pas la sienne. */
const INTRO_DELAY = 0.5;

interface Circle {
  link: HTMLAnchorElement;
  path: SVGPathElement;
  href: string;
  current: boolean;
  tween?: gsap.core.Tween;
}

const play = (circle: Circle, tween?: gsap.core.Tween) => {
  circle.tween?.kill();
  circle.tween = tween;
};

/**
 * Cercles de la navigation, selon d'où l'on vient (voir handoff.ts) :
 * - arrivée directe : le cercle de la page active se dessine après l'intro du logo ;
 * - rechargement, ou lien de la page actuelle : il est déjà là ;
 * - changement de page : le cercle de la page quittée s'efface, puis celui de la nouvelle page
 *   se dessine, ou est déjà là (terminé s'il l'était à moitié) s'il a été tracé au survol.
 */
function playArrival(circles: Circle[], arrival: Arrival, introEnd: number) {
  const from = 'from' in arrival ? arrival.from : null;
  let drawAt = 0.15;

  circles.forEach((circle) => {
    if (circle.current) return;
    if (matchesPath(from, circle.href) && circle.link.getBoundingClientRect().width > 0) {
      setPathProgress(circle.path, 1);
      const erase = erasePath(circle.path, { speed: HANDOFF_ERASE_SPEED });
      play(circle, erase);
      drawAt = erase.duration() * HANDOFF_OVERLAP;
    } else {
      // Remet à zéro les cercles restés tracés (page restaurée du cache avec un survol figé).
      play(circle);
      hidePath(circle.path);
    }
  });

  circles.forEach((circle) => {
    // Menu mobile fermé : son cercle se dessine à l'ouverture (scripts/menu.ts).
    if (!circle.current || circle.link.getBoundingClientRect().width === 0) return;
    const progress = arrival.kind === 'internal' ? arrival.progress : 0;

    if (arrival.kind === 'reload' || matchesPath(from, circle.href) || progress >= 1) {
      play(circle);
      setPathProgress(circle.path, 1);
    } else if (progress > 0) {
      setPathProgress(circle.path, progress);
      play(circle, drawPath(circle.path, { speed: CIRCLE_SPEED }));
    } else {
      hidePath(circle.path);
      const delay = arrival.kind === 'external' ? introEnd || INTRO_DELAY : drawAt;
      play(circle, drawPath(circle.path, { speed: CIRCLE_SPEED }).delay(delay));
    }
  });
}

/** Liens entourés au feutre : tracé au survol / focus clavier, effacé en sens inverse ; page active toujours entourée. */
function initNavCircles(introEnd: number) {
  const circles: Circle[] = [];

  document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]').forEach((link) => {
    const path = link.querySelector<SVGPathElement>(
      '[data-scribble="circle"] [data-scribble-path]',
    );
    if (!path) return;
    const circle: Circle = {
      link,
      path,
      href: link.getAttribute('href') ?? '',
      current: link.getAttribute('aria-current') === 'page',
    };
    circles.push(circle);
    if (circle.current) return;

    const show = () => play(circle, drawPath(path, { speed: CIRCLE_SPEED, ease: 'power1.inOut' }));
    const hide = () => {
      if (link.matches(':hover') || link.matches(':focus-visible')) return;
      play(circle, erasePath(path, { speed: ERASE_SPEED }));
    };

    // Au doigt, pas de survol : le menu mobile dessine le cercle au tap (scripts/menu.ts).
    link.addEventListener('pointerenter', (event) => event.pointerType !== 'touch' && show());
    link.addEventListener('pointerleave', (event) => event.pointerType !== 'touch' && hide());
    link.addEventListener('focus', () => link.matches(':focus-visible') && show());
    link.addEventListener('blur', hide);
  });

  playArrival(circles, getArrival(), introEnd);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) playArrival(circles, getArrival(), 0);
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
  trackDepartures();
  initNavCircles(initLogo());
  initCoffeeSteam();
}
