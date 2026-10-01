import { describe, expect, it } from 'vitest';
import { createResultsCsv, isExpired, sortPhotos, voteRate } from '../../worker/utils/domain';
const photos = [
  {
    id: 'a',
    originalFilename: 'a.jpg',
    width: 1,
    height: 1,
    sortOrder: 1,
    voteCount: 1,
    votedByMe: true,
  },
  {
    id: 'b',
    originalFilename: 'b,2.jpg',
    width: 1,
    height: 1,
    sortOrder: 2,
    voteCount: 3,
    votedByMe: false,
  },
  {
    id: 'c',
    originalFilename: 'c.jpg',
    width: 1,
    height: 1,
    sortOrder: 3,
    voteCount: 3,
    votedByMe: true,
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
  it('escapes CSV', () => expect(createResultsCsv(photos, 4)).toContain('"b,2.jpg"'));
  it('detects expiration at the boundary', () =>
    expect(isExpired('2025-01-01T00:00:00Z', new Date('2025-01-01T00:00:00Z'))).toBe(true));
});
