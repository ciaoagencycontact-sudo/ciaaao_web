/**
 * Passage de relais entre deux pages : d'où l'on vient, et comment.
 *
 * Au départ, la page note dans sessionStorage le lien cliqué et la part de son cercle déjà
 * tracée au survol. À l'arrivée, le script inline du header (Header.astro) lit cette note une
 * seule fois, avant le premier rendu, et expose le résultat dans `window.ciaaaoArrival`.
 * Les deux côtés partagent la clé et le format ci-dessous.
 */
import { pathProgress } from './draw';

/** Clé sessionStorage, reprise telle quelle dans le script inline de Header.astro. */
export const DEPARTURE_KEY = 'ciaaao:nav-departure';

export interface Departure {
  /** Page quittée. */
  from: string;
  /** Page visée par le lien cliqué (absente si on est parti autrement). */
  to?: string;
  /** Part du cercle du lien cliqué déjà tracée au moment du clic (0 à 1). */
  progress?: number;
  /** Horodatage : une note de plus de quelques secondes est ignorée. */
  at: number;
}

export type Arrival =
  /** Lien interne cliqué dans cet onglet. */
  | { kind: 'internal'; from: string; progress: number }
  /** Boutons précédent / suivant (page reconstruite ou restaurée du cache). */
  | { kind: 'history'; from: string | null }
  /** Rechargement de la page. */
  | { kind: 'reload' }
  /** Arrivée directe : URL tapée, lien externe, nouvel onglet. */
  | { kind: 'external' };

declare global {
  interface Window {
    ciaaaoArrival?: Arrival;
  }
}

/** Contexte d'arrivée de la page (mis à jour par le header lors d'une restauration du cache). */
export const getArrival = (): Arrival => window.ciaaaoArrival ?? { kind: 'external' };

export const normalizePath = (path: string) => path.replace(/\/$/, '') || '/';

/** Le lien `href` correspond-il à la page `path` (ou à une de ses sous-pages) ? */
export const matchesPath = (path: string | null, href: string) =>
  path !== null && (path === href || path.startsWith(`${href}/`));

/** Clic gauche simple sur un lien qui ouvre une autre page du site dans cet onglet. */
export function isPlainNavigation(event: MouseEvent, link: HTMLAnchorElement) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (link.target && link.target !== '_self') return false;
  if (link.hasAttribute('download') || link.origin !== location.origin) return false;
  // Ancre sur la même page : pas de changement de page.
  return !(link.pathname === location.pathname && link.hash);
}

/** Note le départ de chaque page, pour que la suivante sache d'où l'on vient. */
export function trackDepartures() {
  let clicked: Pick<Departure, 'to' | 'progress'> = {};

  document.addEventListener('click', (event) => {
    const link = (event.target as Element).closest?.<HTMLAnchorElement>('a[href]');
    if (!link || !isPlainNavigation(event, link)) return;
    const circle = link.matches('[data-nav-link]')
      ? link.querySelector<SVGPathElement>('[data-scribble="circle"] [data-scribble-path]')
      : null;
    clicked = {
      to: normalizePath(link.pathname),
      progress: circle ? pathProgress(circle) : 0,
    };
  });

  window.addEventListener('pagehide', () => {
    const departure: Departure = {
      from: normalizePath(location.pathname),
      ...clicked,
      at: Date.now(),
    };
    clicked = {};
    try {
      sessionStorage.setItem(DEPARTURE_KEY, JSON.stringify(departure));
    } catch {
      /* stockage indisponible : la page suivante jouera l'intro */
    }
  });
}
