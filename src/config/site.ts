export type PageTransition = 'scribble' | 'circle';

export interface NavLink {
  label: string;
  href: string;
}

export const site = {
  name: 'CIAAAO Agency',
  description:
    "Agence web : des sites qui convertissent et se trouvent. Nous créons des expériences web où le design humain rencontre la puissance de l'IA.",
  locale: 'fr_FR',

  // Lien de prise de rendez-vous (Cal.com / Calendly). Tant qu'il est vide, les CTA mènent à /contact.
  bookingUrl: '',

  /**
   * Transition entre les pages (scripts/motion/modules/transition.ts) :
   * - 'scribble' : un coup de feutre colorie l'écran dans le sens du lien, puis s'efface ;
   * - 'circle' : une spirale part du lien cliqué, envahit l'écran, puis se rétracte.
   * Pour comparer sans rebuild : ajouter ?transition=circle (ou scribble) à l'URL, le choix est
   * retenu dans le navigateur (à retirer une fois la variante choisie).
   */
  pageTransition: 'scribble' as PageTransition,

  // Endpoint du formulaire de contact (ex. https://formspree.io/f/xxxxxxx).
  contactFormEndpoint: import.meta.env.PUBLIC_CONTACT_FORM_ENDPOINT ?? '',

  // TODO : renseigner les vrais comptes.
  socials: {
    instagram: 'https://www.instagram.com/',
    linkedin: 'https://www.linkedin.com/',
    x: 'https://x.com/',
  },

  mainNav: [
    { label: 'Projets', href: '/projets' },
    { label: 'Offres', href: '/offres' },
    { label: 'La team', href: '/la-team' },
  ] satisfies NavLink[],

  footerNav: [
    { label: 'Projets', href: '/projets' },
    { label: 'Offres', href: '/offres' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact', href: '/contact' },
  ] satisfies NavLink[],

  legalNav: [
    { label: 'Mentions légales', href: '/mentions-legales' },
    { label: 'Politique de confidentialité', href: '/confidentialite' },
    { label: 'CGU/CGV', href: '/cgu-cgv' },
  ] satisfies NavLink[],
};

export const bookingHref = site.bookingUrl || '/contact';
export const isExternalBooking = Boolean(site.bookingUrl);
