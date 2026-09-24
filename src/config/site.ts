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
   * Nom peint sur la transition vers chaque page (modules/transition.ts).
   * Page absente de la liste : son titre. Accueil : le logo.
   */
  transitionLabels: {
    '/projets': 'Nos projets',
    '/offres': 'Nos offres',
    '/la-team': 'La team',
    '/faq': 'FAQ',
    '/contact': 'Un petit café ?',
  } as Record<string, string>,

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
