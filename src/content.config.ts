import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const serviceIcons = ['mail', 'zap', 'chart', 'calendar', 'send'] as const;

/** Offres : une entrée = un bloc « Ce que nous proposons ». */
const services = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/services' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      icon: z.enum(serviceIcons),
      description: z.string(),
      solutions: z.array(z.string()).min(1),
      image: image().optional(),
      imageAlt: z.string().optional(),
      order: z.number(),
    }),
});

/**
 * Projets : une entrée = un panneau de la page Projets.
 * Les thèmes clair/sombre alternent automatiquement selon l'ordre.
 */
const projects = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      tagline: z.string(),
      heading: z.string(),
      summary: z.string(),
      tags: z.array(z.string()),
      url: z.url().optional(),
      image: image().optional(),
      imageAlt: z.string().optional(),
      order: z.number(),
      /** Les brouillons sont visibles en dev uniquement. */
      draft: z.boolean().default(false),
    }),
});

/** Membres de l'équipe (cartes illustrées). */
const team = defineCollection({
  loader: glob({ pattern: '**/[^_]*.json', base: './src/content/team' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      role: z.string(),
      card: image(),
      order: z.number(),
    }),
});

export const collections = { services, projects, team };
