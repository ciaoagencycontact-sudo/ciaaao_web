/** Chemins de page, normalisés sans slash final (« /projets/ » → « /projets »). */
export const normalizePath = (path: string) => path.replace(/\/$/, '') || '/';

/** Le lien `href` correspond-il à la page `path` (ou à une de ses sous-pages) ? */
export const matchesPath = (path: string, href: string) =>
  path === href || path.startsWith(`${href}/`);
