# CIAAAO Agency — site web

Site vitrine de CIAAAO Agency, construit avec **Astro 7** (sortie statique) et **Tailwind CSS 4**.
Les maquettes et éléments graphiques d'origine sont dans [`CIAAAO_CONTENT/`](CIAAAO_CONTENT/).

## Démarrer

Prérequis : Node.js ≥ 22.12 et pnpm (`corepack enable` ou `npm i -g pnpm`).

```sh
pnpm install
pnpm dev        # http://localhost:4321
```

| Commande       | Rôle                                           |
| -------------- | ---------------------------------------------- |
| `pnpm dev`     | Serveur de développement (brouillons visibles) |
| `pnpm build`   | Build statique dans `dist/`                    |
| `pnpm preview` | Sert le build localement                       |
| `pnpm check`   | Vérification TypeScript / Astro                |
| `pnpm lint`    | ESLint (dont règles d'accessibilité)           |
| `pnpm format`  | Prettier (+ tri des classes Tailwind)          |

Variables d'environnement : voir [`.env.example`](.env.example).

## Structure

```
src/
├─ assets/          logos, décorations, icônes, polices, visuels
├─ components/
│  ├─ layout/       Header, Footer
│  ├─ ui/           Button, Badge, Tag, SectionHeading, Icon, MediaFrame…
│  ├─ deco/         Divider (bandes, pente, chevron, zigzags)
│  └─ sections/     Hero, ServicesSection, Benefits, Process, About, ProjectShowcase, ContactForm…
├─ content/         contenus éditables (services, projets, équipe)
├─ config/site.ts   nom, navigation, lien de prise de RDV, réseaux sociaux
├─ layouts/         BaseLayout (SEO), LegalLayout
├─ pages/           une page = une route
└─ styles/          global.css (tokens de couleurs, polices, utilitaires)
```

## Modifier le contenu

- **Ajouter un projet** : créer un fichier dans `src/content/projects/` (copier `chuttt.md`).
  Les panneaux alternent automatiquement clair / sombre selon `order`.
  `draft: true` le rend visible en dev uniquement.
- **Ajouter une offre** : créer un fichier dans `src/content/services/`.
  Sans `image`, un visuel de remplacement est affiché.
- **Équipe** : fichiers JSON dans `src/content/team/`.
- **Lien « Un petit café ? » / « Réserver un appel »** : `bookingUrl` dans `src/config/site.ts`.
  Tant qu'il est vide, ces boutons mènent à `/contact`.

## Design system

- Couleurs : `cream`, `orange`, `orange-light`, `salmon`, `red`, `ink`, `black`, `coal`, `muted`
  (ex. `bg-cream`, `text-orange`), définies dans `src/styles/global.css`.
- Polices : `font-display` (Bitronik) et `font-sans` (DM Sans), chargées via l'API Fonts d'Astro.
- Animation d'apparition : ajouter l'attribut `data-reveal` (délai optionnel via `--reveal-delay`).
- Espaces : Astro 7 applique les règles JSX. Entre du texte et une balise inline placées sur
  deux lignes, écrire `{' '}` pour conserver l'espace.

## Déploiement

Site 100 % statique : Vercel ou Netlify détectent Astro automatiquement
(commande `pnpm build`, dossier `dist`). Définir `PUBLIC_SITE_URL` et
`PUBLIC_CONTACT_FORM_ENDPOINT` dans les variables d'environnement de l'hébergeur.

## Licences

- **Bitronik** : licence desktop Monotype, **qui ne couvre pas l'usage web**.
  Une licence web est à acquérir avant la mise en ligne publique.
- DM Sans (OFL), icônes Lucide (ISC), Material Design Icons et Remix Icon (Apache 2.0),
  emojis Noto (Apache 2.0).
