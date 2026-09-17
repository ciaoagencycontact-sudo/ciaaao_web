import { gsap } from 'gsap';
import { drawPath, erasePath, hidePath } from '../draw';

const CIRCLE_SPEED = 650;
const ERASE_SPEED = 1400;

/** Liens entourés au feutre : tracé au survol / focus clavier, effacé en sens inverse ; page active toujours entourée. */
function initNavCircles() {
  document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]').forEach((link) => {
    const path = link.querySelector<SVGPathElement>(
      '[data-scribble="circle"] [data-scribble-path]',
    );
    if (!path) return;

    if (link.getAttribute('aria-current') === 'page') {
      // Visible tout de suite si le lien est affiché (desktop), sinon dessiné à l'ouverture du menu.
      if (link.getBoundingClientRect().width > 0)
        drawPath(path, { speed: CIRCLE_SPEED }).delay(0.5);
      return;
    }

    hidePath(path);
    let tween: gsap.core.Tween | undefined;

    const show = () => {
      tween?.kill();
      tween = drawPath(path, { speed: CIRCLE_SPEED, ease: 'power1.inOut' });
    };
    const hide = () => {
      if (link.matches(':hover') || link.matches(':focus-visible')) return;
      tween?.kill();
      tween = erasePath(path, { speed: ERASE_SPEED });
    };

    link.addEventListener('pointerenter', show);
    link.addEventListener('pointerleave', hide);
    link.addEventListener('focus', () => link.matches(':focus-visible') && show());
    link.addEventListener('blur', hide);
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

/** Logo : barres qui arrivent une à une (une fois par session), puis frémissent au survol. */
function initLogo() {
  const link = document.querySelector<HTMLElement>('[data-logo-link]');
  const mark = link?.querySelector<SVGSVGElement>('[data-logo-mark]');
  if (!link || !mark) return;

  const bars = gsap.utils.toArray<SVGPathElement>(mark.querySelectorAll('path'));
  const boxes = new Map(bars.map((bar) => [bar, bar.getBBox()]));
  const horizontal = bars
    .filter((bar) => boxes.get(bar)!.width > boxes.get(bar)!.height)
    .sort((a, b) => boxes.get(b)!.y - boxes.get(a)!.y); // du bas vers le haut
  const vertical = bars.filter((bar) => !horizontal.includes(bar));

  const root = document.documentElement;
  if (root.classList.contains('logo-intro')) {
    try {
      sessionStorage.setItem('ciaaao:logo-intro', '1');
    } catch {
      /* stockage indisponible */
    }
    gsap
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
}

export function initNav() {
  initNavCircles();
  initCoffeeSteam();
  initLogo();
}
