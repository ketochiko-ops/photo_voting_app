import type { PhotoSummary } from '../../shared/types';
export const isExpired = (expiresAt: string, now = new Date()) =>
  new Date(expiresAt).getTime() <= now.getTime();
export const voteRate = (votes: number, participants: number) =>
  participants === 0 ? 0 : Math.round((votes / participants) * 100);
export function sortPhotos(
  photos: PhotoSummary[],
  mode: 'original' | 'votes' | 'mine',
): PhotoSummary[] {
  const selected = mode === 'mine' ? photos.filter((photo) => photo.votedByMe) : [...photos];
  return selected.sort((a, b) =>
    mode === 'votes'
      ? b.voteCount - a.voteCount || a.sortOrder - b.sortOrder
      : a.sortOrder - b.sortOrder,
  );
}
export function csvEscape(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
export function createResultsCsv(photos: PhotoSummary[], participants: number): string {
  return [
    'photoNumber,originalFilename,voteCount,voteRate',
    ...photos.map((p, i) =>
      [i + 1, p.originalFilename, p.voteCount, `${voteRate(p.voteCount, participants)}%`]
        .map(csvEscape)
        .join(','),
    ),
  ].join('\n');
}
