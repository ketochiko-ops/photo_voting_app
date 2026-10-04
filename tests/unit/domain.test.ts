import { describe, expect, it } from 'vitest';
import { createResultContentDisposition, createResultFilename } from '../../shared/results';
import {
  createResultsCsv,
  createResultsText,
  isExpired,
  sortPhotos,
  voteRate,
} from '../../worker/utils/domain';
const photos = [
  {
    id: 'a',
    originalFilename: 'a.jpg',
    width: 1,
    height: 1,
    sortOrder: 1,
    voteCounts: { favorite: 1, recommendation: 2, unpublishable: 0 },
    votedByMe: { favorite: true, recommendation: false, unpublishable: false },
  },
  {
    id: 'b',
    originalFilename: 'b,2.jpg',
    width: 1,
    height: 1,
    sortOrder: 2,
    voteCounts: { favorite: 3, recommendation: 1, unpublishable: 1 },
    votedByMe: { favorite: false, recommendation: true, unpublishable: false },
  },
  {
    id: 'c',
    originalFilename: 'c.jpg',
    width: 1,
    height: 1,
    sortOrder: 3,
    voteCounts: { favorite: 3, recommendation: 0, unpublishable: 2 },
    votedByMe: { favorite: true, recommendation: false, unpublishable: true },
  },
];
describe('voting domain', () => {
  it('calculates rates safely', () => {
    expect(voteRate(5, 6)).toBe(83);
    expect(voteRate(1, 0)).toBe(0);
  });
  it('sorts by votes stably and filters mine', () => {
    expect(sortPhotos(photos, 'votes').map((p) => p.id)).toEqual(['b', 'c', 'a']);
    expect(sortPhotos(photos, 'mine').map((p) => p.id)).toEqual(['a', 'c']);
  });
  it('escapes CSV and includes participant names', () => {
    const csv = createResultsCsv(photos, [{ id: 'p1', displayName: 'あきさめ' }]);
    expect(csv).toContain('"b,2.jpg"');
    expect(csv).toContain('participants\nあきさめ');
  });
  it('creates text results with all vote counts and participant names', () => {
    const text = createResultsText(photos, [{ id: 'p1', displayName: 'あきさめ' }]);
    expect(text).toContain('b,2.jpg\t3\t1\t1');
    expect(text).toContain('参加メンバー\nあきさめ');
  });
  it('uses the room title in result filenames and RFC 5987 headers', () => {
    expect(createResultFilename('秋/併せ', 'txt')).toBe('秋_併せ_投票結果.txt');
    expect(createResultContentDisposition('秋の併せ', 'csv')).toContain(
      "filename*=UTF-8''%E7%A7%8B%E3%81%AE%E4%BD%B5%E3%81%9B_%E6%8A%95%E7%A5%A8%E7%B5%90%E6%9E%9C.csv",
    );
  });
  it('detects expiration at the boundary', () =>
    expect(isExpired('2025-01-01T00:00:00Z', new Date('2025-01-01T00:00:00Z'))).toBe(true));
});
