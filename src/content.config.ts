import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const writing = defineCollection({
  loader: glob({ base: './src/content/writing', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) => z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    readingLayout: z.enum(['long', 'vertical-short', 'horizontal-short']),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    cover: image().optional(),
  }),
});

export const collections = { writing };
