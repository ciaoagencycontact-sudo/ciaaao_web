/**
 * Menu mobile plein écran.
 * Le comportement (ouverture, focus, Échap, blocage du scroll) fonctionne partout ;
 * les animations « dessinées » ne tournent que si la classe .motion est active.
 */
import { gsap } from 'gsap';
import { drawPath, erasePath, hidePath, setPathProgress } from './motion/draw';
import { getLenis } from './motion/lenis';
import { drawMark, hideMarks } from './motion/marks';
import { drawSketch } from './motion/modules/sketch';

const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const panel = document.querySelector<HTMLElement>('[data-menu]');

if (toggle && panel) {
  const label = toggle.querySelector('[data-menu-label]');
  const burger = gsap.utils.toArray<SVGPathElement>(
    toggle.querySelectorAll('[data-scribble="burger"] [data-scribble-path]'),
  );
  const cross = gsap.utils.toArray<SVGPathElement>(
    toggle.querySelectorAll('[data-scribble="close"] [data-scribble-path]'),
  );
  const items = gsap.utils.toArray<HTMLElement>(panel.querySelectorAll('[data-menu-item]'));
  const sketch = panel.querySelector<SVGSVGElement>('[data-anim="sketch"]');
  // Requêtes à chaque ouverture : le contenu et la page active changent sous le header conservé.
  const currentLink = () => panel.querySelector<HTMLElement>('[aria-current="page"]');
  const background = () => [document.getElementById('contenu'), document.querySelector('footer')];

  const withMotion = () => document.documentElement.classList.contains('motion');
  let isOpen = false;
  let timeline: gsap.core.Timeline | undefined;

  const setOpen = (open: boolean, { restoreFocus = true, instant = false } = {}) => {
    if (open === isOpen) return;
    isOpen = open;

    toggle.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? 'Fermer le menu' : 'Ouvrir le menu';
    background().forEach((element) => element && (element.inert = open));
    document.documentElement.classList.toggle('overflow-hidden', open);
    if (open) getLenis()?.stop();
    else getLenis()?.start();

    timeline?.kill();

    if (open) {
      panel.hidden = false;

      if (withMotion()) {
        timeline = gsap.timeline();
        // Le burger s'efface, une croix griffonnée se dessine.
        burger.forEach((line, index) =>
          timeline!.add(erasePath(line, { speed: 500 }), index * 0.04),
        );
        cross.forEach((line, index) =>
          timeline!.add(drawPath(line, { speed: 160, ease: 'power1.out' }), 0.14 + index * 0.12),
        );
        // Le panneau glisse, les liens arrivent en cascade en se redressant.
        timeline
          .fromTo(
            panel,
            { opacity: 0, y: -12 },
            { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
            0,
          )
          .fromTo(
            items,
            { opacity: 0, y: 28, rotation: -4 },
            { opacity: 1, y: 0, rotation: 0, duration: 0.55, stagger: 0.07, ease: 'back.out(1.7)' },
            0.08,
          );
        if (sketch) timeline.add(drawSketch(sketch), 0.45);
        const link = currentLink();
        if (link) {
          hideMarks(link);
          timeline.add(drawMark(link), 0.55);
        }
      }

      panel.querySelector<HTMLAnchorElement>('a')?.focus({ preventScroll: true });
    } else {
      if (withMotion() && !instant) {
        timeline = gsap.timeline({ onComplete: () => (panel.hidden = true) });
        cross.forEach((line) => timeline!.add(erasePath(line, { speed: 500 }), 0));
        burger.forEach((line, index) =>
          timeline!.add(drawPath(line, { speed: 220 }), 0.1 + index * 0.06),
        );
        timeline.to(panel, { opacity: 0, y: -8, duration: 0.2, ease: 'power1.in' }, 0);
      } else {
        panel.hidden = true;
        if (withMotion()) {
          gsap.set(panel, { clearProps: 'opacity,transform' });
          cross.forEach(hidePath);
          burger.forEach((line) => setPathProgress(line, 1));
        }
      }

      if (restoreFocus) toggle.focus();
    }
  };

  toggle.addEventListener('click', () => setOpen(!isOpen));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen) setOpen(false);
  });

  // Lien d'ancre sur la même page : on referme le menu.
  panel.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('a[href^="#"]'))
      setOpen(false, { restoreFocus: false });
  });

  // Autre page (routeur client, header conservé) : le menu se referme sous le coloriage, une
  // fois le nouveau contenu en place.
  document.addEventListener('astro:after-swap', () => setOpen(false, { restoreFocus: false }));

  // Page restaurée du cache (précédent / suivant) : le menu est refermé, sans animation.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) setOpen(false, { restoreFocus: false, instant: true });
  });

  window.matchMedia('(min-width: 64rem)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false, { restoreFocus: false });
  });
}
