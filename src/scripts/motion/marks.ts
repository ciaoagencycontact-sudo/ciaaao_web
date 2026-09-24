import { gsap } from 'gsap';
import { drawPath, erasePath, hidePath, pathProgress, setPathProgress } from './draw';

/**
 * Marques au feutre des liens de navigation (components/deco/Scribble.astro, variante `circle`) :
 * cercle, soulignés, vague, cadre, crochets… Chaque fois que le lien est marqué à nouveau, la
 * marque suivante est tirée d'un sac mélangé : toutes passent avant qu'une ne revienne, jamais
 * deux fois de suite. Tant qu'une marque n'est pas entièrement effacée, c'est elle qui revient.
 */

const DRAW_SPEED = 650;
/** Les traits courts (soulignés, crochets) gardent un geste lisible. */
const MIN_STROKE = 0.16;
/** Levée de crayon entre deux traits d'une même marque. */
const PEN_LIFT = 0.05;

interface MarkState {
  name?: string;
  bag: string[];
  timeline?: gsap.core.Timeline;
}

const states = new WeakMap<Element, MarkState>();
const stateOf = (link: Element) => {
  let state = states.get(link);
  if (!state) states.set(link, (state = { bag: [] }));
  return state;
};

const groupsOf = (link: Element) =>
  gsap.utils.toArray<SVGGElement>(link.querySelectorAll('[data-scribble="circle"] [data-mark]'));

const strokesOf = (link: Element, name?: string) =>
  name
    ? gsap.utils.toArray<SVGPathElement>(
        link.querySelectorAll(`[data-scribble="circle"] [data-mark="${name}"] path`),
      )
    : [];

/** Part de la marque actuelle déjà tracée (0 : rien, 1 : complète). */
export function markProgress(link: Element) {
  const strokes = strokesOf(link, stateOf(link).name);
  if (!strokes.length) return 0;
  return strokes.reduce((sum, stroke) => sum + pathProgress(stroke), 0) / strokes.length;
}

/** Tire la marque suivante du sac (rempli et mélangé quand il est vide). */
function draw(link: Element, state: MarkState) {
  if (!state.bag.length) {
    state.bag = gsap.utils.shuffle(groupsOf(link).map((group) => group.dataset.mark!));
    // Pas deux fois la même d'affilée d'un sac à l'autre.
    if (state.bag.length > 1 && state.bag.at(-1) === state.name)
      state.bag.unshift(state.bag.pop()!);
  }
  return state.bag.pop()!;
}

/** Choisit la marque à tracer : la même si elle est encore visible, sinon la suivante du sac. */
function choose(link: Element, name?: string) {
  const state = stateOf(link);
  if (state.name && markProgress(link) > 0) return state.name;

  const next = name ?? draw(link, state);
  groupsOf(link).forEach((group) => {
    if (group.dataset.mark !== next) group.querySelectorAll('path').forEach(hidePath);
  });
  state.name = next;
  return next;
}

const play = (link: Element, timeline?: gsap.core.Timeline) => {
  const state = stateOf(link);
  state.timeline?.kill();
  state.timeline = timeline;
  return timeline;
};

/** Trace une marque (reprend là où elle en est si elle est à moitié tracée). */
export function drawMark(link: Element, { delay = 0, ease = 'sine.inOut', name = '' } = {}) {
  const strokes = strokesOf(link, choose(link, name || undefined));
  const timeline = gsap.timeline({ delay });
  strokes.forEach((stroke, index) => {
    timeline.add(
      drawPath(stroke, { speed: DRAW_SPEED, min: MIN_STROKE, ease }),
      index === 0 ? 0 : `>+${PEN_LIFT}`,
    );
  });
  return play(link, timeline)!;
}

/** Efface la marque actuelle, dernier trait d'abord. */
export function eraseMark(link: Element, { speed = 1400 } = {}) {
  const strokes = strokesOf(link, stateOf(link).name).reverse();
  const timeline = gsap.timeline();
  strokes.forEach((stroke) => timeline.add(erasePath(stroke, { speed })));
  return play(link, timeline)!;
}

/** Affiche une marque complète, sans animation. */
export function showMark(link: Element, name?: string) {
  play(link);
  strokesOf(link, choose(link, name)).forEach((stroke) => setPathProgress(stroke, 1));
}

/** Masque toutes les marques, sans animation. */
export function hideMarks(link: Element) {
  play(link);
  groupsOf(link).forEach((group) => group.querySelectorAll('path').forEach(hidePath));
}
