import { gsap } from 'gsap';
import { PEN_SPEED } from '../draw';

/**
 * Tracé « à la main » des décorations <Sketch>.
 * Toutes les décorations d'une scène (`data-sketch-scene`) sont dessinées à la suite par une seule main :
 * vitesse constante selon la longueur, levées de crayon courtes et un peu irrégulières.
 * Chaque trait est un tiret qui grandit de 0 à sa longueur réelle (le reste du motif est un vide).
 * Un trait reste invisible jusqu'à ce que la main l'attaque : sinon le bout arrondi de son tiret vide
 * (un disque à son point de départ) apparaîtrait trop tôt sur une autre partie du dessin.
 */

/** Ajoute les traits d'une décoration à une timeline, après une éventuelle levée de crayon. */
function appendStrokes(timeline: gsap.core.Timeline, svg: SVGSVGElement, firstPause: number) {
  const strokes = gsap.utils.toArray<SVGPathElement>(svg.querySelectorAll('[data-stroke]'));

  strokes.forEach((stroke, index) => {
    const length = stroke.getTotalLength?.() || 40;
    const gap = length + 100;
    // Levée de crayon : courte entre deux traits d'une même décoration.
    const pause = index > 0 ? gsap.utils.random(0.03, 0.08) : firstPause;

    // Visibilité et tiret vide appliqués au démarrage du trait, pas avant (sinon un point apparaîtrait trop tôt).
    timeline.fromTo(
      stroke,
      { strokeDasharray: `0 ${gap}` },
      {
        strokeDasharray: `${length} ${gap}`,
        // Plafond haut pour les longs traits (ex. le fil de la team) : la main ralentit sans traîner.
        duration: gsap.utils.clamp(0.1, 2, length / PEN_SPEED),
        ease: 'sine.inOut',
        immediateRender: false,
        onStart: () => {
          stroke.style.opacity = '1';
        },
      },
      `>+${pause}`,
    );
  });
}

/** (Re)dessine une décoration seule, depuis zéro. Utilisé par exemple à l'ouverture du menu mobile. */
export function drawSketch(svg: SVGSVGElement) {
  svg
    .querySelectorAll<SVGPathElement>('[data-stroke]')
    .forEach((stroke) => (stroke.style.opacity = '0'));
  const timeline = gsap.timeline();
  appendStrokes(timeline, svg, 0);
  return timeline;
}

export function initSketch() {
  const scenes = gsap.utils.toArray<HTMLElement>('[data-sketch-scene]');

  // Une décoration hors scène forme sa propre scène.
  document.querySelectorAll<SVGSVGElement>('[data-anim="sketch"]').forEach((svg) => {
    if (!svg.closest('[data-sketch-scene]')) scenes.push(svg as unknown as HTMLElement);
  });

  scenes.forEach((scene) => {
    const all = gsap.utils.toArray<SVGSVGElement>(
      scene.matches('[data-anim="sketch"]')
        ? [scene]
        : scene.querySelectorAll('[data-anim="sketch"]'),
    );
    const isVisible = (svg: SVGSVGElement) => svg.getBoundingClientRect().width > 0;

    // Décorations masquées (ex. sur mobile, menu fermé) : affichées complètes si elles apparaissent plus tard.
    all
      .filter((svg) => !isVisible(svg))
      .forEach((svg) =>
        gsap.set(svg.querySelectorAll('[data-stroke]'), { strokeDasharray: 'none', opacity: 1 }),
      );

    const drawings = all
      .filter(isVisible)
      .sort((a, b) => Number(a.dataset.sketchOrder) - Number(b.dataset.sketchOrder));

    if (!drawings.length) return;

    const timeline = gsap.timeline({
      delay: 0.25,
      scrollTrigger: { trigger: scene, start: 'top 90%', once: true },
    });

    drawings.forEach((svg, index) => {
      // Levée de crayon plus longue pour passer à la décoration suivante.
      appendStrokes(timeline, svg, index > 0 ? gsap.utils.random(0.1, 0.16) : 0);
    });
  });
}
