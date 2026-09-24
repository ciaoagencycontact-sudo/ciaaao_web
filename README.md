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
- Espaces : Astro 7 applique les règles JSX. Entre du texte et une balise inline placées sur
  deux lignes, écrire `{' '}` pour conserver l'espace.

## Animations

GSAP (ScrollTrigger, et SplitText / DrawSVG disponibles) et Lenis pour le scroll fluide, dans
[`src/scripts/motion/`](src/scripts/motion/) :

- `index.ts` : point d'entrée chargé par `BaseLayout`, qui lance Lenis et les modules (une fois
  pour le header, à chaque page pour le contenu) ;
- `lenis.ts` : scroll fluide synchronisé avec ScrollTrigger, ancres décalées sous le header ;
- `media.ts` : breakpoints et `gsap.matchMedia()` partagé (desktop / mobile / mouvement réduit) ;
- `draw.ts` : tracé d'un trait SVG (`drawPath` / `erasePath`), partagé par toutes les animations dessinées ;
- `route.ts` : comparaison de chemins (lien actif) ;
- `modules/` : une animation = un module (`reveal.ts`, `sketch.ts` pour les décorations, `nav.ts` pour le header).

Le header est « dessiné à la main » : marque au feutre sur les liens (survol, focus clavier, page
active ; cercle, soulignés, vague, cadre, crochets… tirés au sort à chaque fois, voir
`src/scripts/motion/marks.ts` et `components/deco/marks.json`), vapeur du café, intro du logo une fois par session, et menu mobile plein écran
(`src/scripts/menu.ts`, qui fonctionne aussi sans animations). Les griffonnages réutilisables sont
dans `src/components/deco/Scribble.astro` et `scribbles.json`.

Navigation sans rechargement : `<ClientRouter />` (dans `BaseLayout`) télécharge la page suivante
et ne remplace que le contenu. Le header et le calque de transition sont conservés
(`transition:persist`), ce qui évite tout écran vide entre deux pages.

- Transition (`modules/transition.ts`, calque `components/layout/PageCover.astro`) : pendant le
  téléchargement, un coup de feutre orange colorie l'écran sous le header, dans le sens de
  l'onglet visé (de haut en bas pour les autres liens), et le nom de la page y est tamponné en
  crème (`transitionLabels` dans `site.ts`, sinon le titre de la page ; le logo pour l'accueil).
  Le contenu change dessous, puis le coloriage s'efface dans le même sens, en emportant le nom.
- Préchargement (`prefetch` dans `astro.config.mjs`) : les pages sont téléchargées au survol des
  liens, et celles du header dès le chargement (pas de survol sur mobile).
- Marque de la page active : au changement de page, celle de la page quittée s'efface, puis celle
  de la nouvelle page se dessine avec un léger chevauchement (déjà là si elle était tracée au
  survol). Au premier chargement, elle se dessine après l'intro du logo ; au rechargement, le
  cercle est déjà là.
- Un script de composant ne s'exécute qu'une fois : ce qui doit être rebranché à chaque page
  s'écrit dans `document.addEventListener('astro:page-load', …)` (voir `ContactForm.astro`).

Règles :

- Apparition au scroll : attribut `data-reveal`, délai optionnel via `--reveal-delay`.
- Nouvelle animation : créer `modules/<nom>.ts`, cibler `[data-anim="<nom>"]`, l'appeler dans `index.ts`.
- Avec « réduire les animations », ni Lenis ni animations : le contenu s'affiche directement.
- Animer uniquement `transform` et `opacity`.

## Déploiement

Site 100 % statique : Vercel ou Netlify détectent Astro automatiquement
(commande `pnpm build`, dossier `dist`). Définir `PUBLIC_SITE_URL` et
`PUBLIC_CONTACT_FORM_ENDPOINT` dans les variables d'environnement de l'hébergeur.

## Licences

- **Bitronik** : licence desktop Monotype, **qui ne couvre pas l'usage web**.
  Une licence web est à acquérir avant la mise en ligne publique.
- DM Sans (OFL), icônes Lucide (ISC), Material Design Icons et Remix Icon (Apache 2.0),
  emojis Noto (Apache 2.0).
