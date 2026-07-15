import type { CollectionEntry } from 'astro:content';

export type WritingEntry = CollectionEntry<'writing'>;

export function getPublishedWriting(entries: WritingEntry[]): WritingEntry[] {
  return entries
    .filter((entry) => !entry.data.draft)
    .toSorted((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
}

export function selectFeaturedWriting(entries: WritingEntry[]): WritingEntry {
  const featured = getPublishedWriting(entries).filter((entry) => entry.data.featured);

  if (featured.length !== 1) {
    throw new Error(`Expected exactly one published featured writing entry, received ${featured.length}.`);
  }

  return featured[0];
}

export function formatChineseDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}
