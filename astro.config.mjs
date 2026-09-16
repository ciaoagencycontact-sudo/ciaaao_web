// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import process from 'node:process';

// URL publique du site (canonical, Open Graph, sitemap).
// À définir dans les variables d'environnement de l'hébergeur.
const site = process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321';

export default defineConfig({
  site,
  // compressHTML reste sur le défaut v7 ('jsx') : c'est la règle d'espaces qu'applique Prettier.
  // Entre deux éléments inline sur des lignes différentes, écrire {' '} pour garder un espace.
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      // Police de texte : DM Sans variable (axe wght, opsz par défaut comme la maquette), latin,
      // servie depuis le paquet Fontsource installé (aucun appel réseau au build).
      provider: fontProviders.local(),
      name: 'DM Sans',
      cssVariable: '--font-dm-sans',
      fallbacks: ['sans-serif'],
      options: {
        variants: [
          {
            src: ['@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2'],
            weight: '100 1000',
            style: 'normal',
            unicodeRange: [
              'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
            ],
          },
        ],
      },
    },
    {
      // Police display : Bitronik (licence desktop uniquement, licence web à acquérir avant la prod).
      provider: fontProviders.local(),
      name: 'Bitronik',
      cssVariable: '--font-bitronik',
      fallbacks: ['sans-serif'],
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/CFBitronik-Regular.woff2'],
            weight: 'normal',
            style: 'normal',
          },
        ],
      },
    },
  ],
});
