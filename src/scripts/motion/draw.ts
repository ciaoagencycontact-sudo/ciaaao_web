import { gsap } from 'gsap';

/** Vitesse du « crayon », en unités de viewBox par seconde. */
export const PEN_SPEED = 420;

interface DrawOptions {
  /** Vitesse en unités de viewBox par seconde (défaut : PEN_SPEED). */
  speed?: number;
  /** Durée minimale / maximale d'un trait, en secondes. */
  min?: number;
  max?: number;
  ease?: string;
}

const measure = (path: SVGGeometryElement) => {
  const length = path.getTotalLength?.() || 40;
  return { length, gap: length + 100 };
};

/** Longueur actuellement tracée (0 si le trait est masqué, tout si aucun tiret n'est posé). */
const drawnLength = (path: SVGGeometryElement, length: number) => {
  const style = getComputedStyle(path);
  if (style.opacity === '0') return 0;
  const dash = style.strokeDasharray.match(/[\d.]+/);
  return dash ? Math.min(parseFloat(dash[0]), length) : length;
};

const durationFor = (distance: number, { speed = PEN_SPEED, min = 0.1, max = 2 }: DrawOptions) =>
  gsap.utils.clamp(min, max, distance / speed);

/*
 * Les états de départ (visibilité, longueur déjà tracée) sont appliqués au démarrage du tracé
 * et non à sa création (`immediateRender: false`) : un tracé placé plus loin dans une timeline
 * ne doit rien afficher avant son tour.
 */

/** Trace un trait depuis son état actuel jusqu'à sa longueur complète. */
export function drawPath(path: SVGGeometryElement, options: DrawOptions = {}) {
  const { length, gap } = measure(path);

  return gsap.fromTo(
    path,
    { strokeDasharray: () => `${drawnLength(path, length)} ${gap}` },
    {
      strokeDasharray: `${length} ${gap}`,
      duration: durationFor(length - drawnLength(path, length), options),
      ease: options.ease ?? 'sine.inOut',
      immediateRender: false,
      // Rendu visible quand la main attaque le trait (une propriété 1 → 1 serait ignorée par GSAP).
      onStart: () => {
        path.style.opacity = '1';
      },
    },
  );
}

/** Efface un trait en le rembobinant vers son point de départ, puis le masque. */
export function erasePath(path: SVGGeometryElement, options: DrawOptions = {}) {
  const { length, gap } = measure(path);

  return gsap.fromTo(
    path,
    { strokeDasharray: () => `${drawnLength(path, length)} ${gap}` },
    {
      strokeDasharray: `0 ${gap}`,
      duration: durationFor(drawnLength(path, length), { min: 0.06, ...options }),
      ease: options.ease ?? 'sine.in',
      immediateRender: false,
      // Masquage direct : le bout arrondi du tiret vide laisserait sinon un point visible.
      onComplete: () => {
        path.style.opacity = '0';
      },
    },
  );
}

/** Masque un trait sans animation (état « pas encore dessiné »). */
export function hidePath(path: SVGGeometryElement) {
  // Styles posés directement (et non via gsap.set, appliqué en différé) : l'état est immédiat.
  path.style.opacity = '0';
  path.style.strokeDasharray = `0 ${measure(path).gap}`;
}
