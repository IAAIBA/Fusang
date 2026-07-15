import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getPublishedWriting } from '../lib/content';

export async function GET(context: { site: URL }) {
  const entries = getPublishedWriting(await getCollection('writing'));
  return rss({
    title: 'Fusang 写作',
    description: '散文与不适合被归档的瞬间。',
    site: context.site,
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publishedAt,
      link: `/writing/${entry.id}`,
    })),
  });
}
