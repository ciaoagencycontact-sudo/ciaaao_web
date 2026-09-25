/**
 * Menu mobile plein écran, et liens vers la page où l'on est déjà.
 * Le comportement (ouverture, focus, Échap, blocage du scroll) fonctionne partout ;
 * les animations « dessinées » ne tournent que si la classe .motion est active.
 */
import { gsap } from 'gsap';
import { drawPath, erasePath, hidePath, setPathProgress } from './motion/draw';
import { getLenis } from './motion/lenis';
import { drawMark, hideMarks } from './motion/marks';
import { drawSketch } from './motion/modules/sketch';
import { normalizePath } from './motion/route';

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

  // Autre page choisie dans le menu : le lien tapé reste seul (sa marque se dessine, voir
  // modules/nav.ts), les autres s'effacent, puis le rideau tombe (modules/transition.ts).
  document.addEventListener('astro:before-preparation', (event) => {
    const chosen =
      event.sourceElement instanceof Element
        ? event.sourceElement.closest('[data-menu-item]')
        : null;
    if (!isOpen || !chosen || !withMotion()) return;
    timeline?.kill();
    timeline = gsap
      .timeline()
      .to([...items.filter((item) => item !== chosen), sketch].filter(Boolean), {
        opacity: 0,
        x: -24,
        rotation: -3,
        duration: 0.25,
        stagger: 0.04,
        ease: 'power2.in',
      });
  });

  // Nouveau contenu en place (routeur client, header conservé) : le menu se referme sous le
  // coloriage.
  document.addEventListener('astro:after-swap', () => {
    setOpen(false, { restoreFocus: false });
    gsap.set([...items, sketch].filter(Boolean), { clearProps: 'x,rotation' });
  });

  // Page restaurée du cache (précédent / suivant) : le menu est refermé, sans animation.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) setOpen(false, { restoreFocus: false, instant: true });
  });

  window.matchMedia('(min-width: 64rem)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false, { restoreFocus: false });
  });

  // Lien vers la page où l'on est déjà (menu, logo, footer…) : pas de rechargement du contenu,
  // on referme le menu et on remonte en haut. En phase de capture, avant le routeur.
  document.addEventListener(
    'click',
    (event) => {
      const link = (event.target as Element).closest?.<HTMLAnchorElement>('a[href]');
      if (!link || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if ((link.target && link.target !== '_self') || link.origin !== location.origin) return;
      if (link.hash || normalizePath(link.pathname) !== normalizePath(location.pathname)) return;

      event.preventDefault();
      setOpen(false, { restoreFocus: false });
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(0, { duration: 0.9 });
      else window.scrollTo({ top: 0, behavior: withMotion() ? 'smooth' : 'auto' });
    },
    { capture: true },
  );
}
