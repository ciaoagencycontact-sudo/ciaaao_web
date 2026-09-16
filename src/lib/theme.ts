export type Theme = 'light' | 'dark';

/** Couleurs de fond et de texte d'une section selon son thème. */
export const surface: Record<Theme, string> = {
  light: 'bg-cream text-ink',
  dark: 'bg-ink text-cream',
};
