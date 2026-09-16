import { gsap } from 'gsap';

/** Vitesse du « crayon », en unités de viewBox par seconde. */
const PEN_SPEED = 420;

/**
 * Tracé « à la main » des décorations <Sketch>.
 * Toutes les décorations d'une scène (`data-sketch-scene`) sont dessinées à la suite par une seule main :
 * vitesse constante selon la longueur, levées de crayon courtes et un peu irrégulières.
 * Chaque trait est un tiret qui grandit de 0 à sa longueur réelle (le reste du motif est un vide).
 * Un trait reste invisible jusqu'à ce que la main l'attaque : sinon le bout arrondi de son tiret vide
 * (un disque à son point de départ) apparaîtrait trop tôt sur une autre partie du dessin.
 */
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

    // Décorations masquées (ex. sur mobile) : affichées complètes si elles apparaissent plus tard.
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

    drawings.forEach((svg, drawingIndex) => {
      const strokes = gsap.utils.toArray<SVGPathElement>(svg.querySelectorAll('[data-stroke]'));

      strokes.forEach((stroke, strokeIndex) => {
        const length = stroke.getTotalLength?.() || 40;
        // Levée de crayon : courte entre deux traits, plus longue pour passer à la décoration suivante.
        const pause =
          strokeIndex > 0
            ? gsap.utils.random(0.03, 0.08)
            : drawingIndex > 0
              ? gsap.utils.random(0.1, 0.16)
              : 0;

        const gap = length + 100;
        timeline.set(stroke, { opacity: 1 }, `>+${pause}`).fromTo(
          stroke,
          { strokeDasharray: `0 ${gap}` },
          {
            strokeDasharray: `${length} ${gap}`,
            duration: gsap.utils.clamp(0.1, 0.5, length / PEN_SPEED),
            ease: 'sine.inOut',
          },
          '<',
        );
      });
    });
  });
}
