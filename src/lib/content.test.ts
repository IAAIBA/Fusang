import { describe, expect, it } from 'vitest';
import type { WritingEntry } from './content';
import { formatChineseDate, getPublishedWriting, selectFeaturedWriting } from './content';

function entry(title: string, featured: boolean, publishedAt: string, draft = false): WritingEntry {
  return {
    id: title,
    data: {
      title,
      description: title,
      publishedAt: new Date(publishedAt),
      tags: [],
      readingLayout: 'long',
      featured,
      draft,
    },
  } as unknown as WritingEntry;
}

describe('writing collection helpers', () => {
  it('filters drafts and sorts newest first', () => {
    const entries = [
      entry('旧作', false, '2025-01-01'),
      entry('草稿', false, '2027-01-01', true),
      entry('新作', true, '2026-01-01'),
    ];

    expect(getPublishedWriting(entries).map((item) => item.data.title)).toEqual(['新作', '旧作']);
  });

  it('requires exactly one published representative work', () => {
    const representative = entry('代表作', true, '2026-01-01');
    expect(selectFeaturedWriting([representative])).toBe(representative);
    expect(() => selectFeaturedWriting([])).toThrow(/exactly one/);
    expect(() => selectFeaturedWriting([representative, entry('另一篇', true, '2025-01-01')])).toThrow(/received 2/);
  });

  it('formats publication dates without local timezone drift', () => {
    expect(formatChineseDate(new Date('2026-07-15T00:00:00.000Z'))).toBe('2026/07/15');
  });
});
