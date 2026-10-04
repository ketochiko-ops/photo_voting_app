import type { ParticipantSummary, PhotoSummary } from '../../shared/types';
export const isExpired = (expiresAt: string, now = new Date()) =>
  new Date(expiresAt).getTime() <= now.getTime();
export const voteRate = (votes: number, participants: number) =>
  participants === 0 ? 0 : Math.round((votes / participants) * 100);
export function sortPhotos(
  photos: PhotoSummary[],
  mode: 'original' | 'votes' | 'mine',
): PhotoSummary[] {
  const selected =
    mode === 'mine' ? photos.filter((photo) => photo.votedByMe.favorite) : [...photos];
  return selected.sort((a, b) =>
    mode === 'votes'
      ? b.voteCounts.favorite - a.voteCounts.favorite || a.sortOrder - b.sortOrder
      : a.sortOrder - b.sortOrder,
  );
}
export function csvEscape(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
export function createResultsCsv(
  photos: PhotoSummary[],
  participants: ParticipantSummary[],
): string {
  return [
    'photoNumber,originalFilename,favoriteCount,favoriteRate,recommendationCount,recommendationRate,unpublishableCount,unpublishableRate',
    ...photos.map((p, i) =>
      [
        i + 1,
        p.originalFilename,
        p.voteCounts.favorite,
        `${voteRate(p.voteCounts.favorite, participants.length)}%`,
        p.voteCounts.recommendation,
        `${voteRate(p.voteCounts.recommendation, participants.length)}%`,
        p.voteCounts.unpublishable,
        `${voteRate(p.voteCounts.unpublishable, participants.length)}%`,
      ]
        .map(csvEscape)
        .join(','),
    ),
    '',
    'participants',
    ...participants.map((participant) => csvEscape(participant.displayName)),
  ].join('\n');
}

export function createResultsText(
  photos: PhotoSummary[],
  participants: ParticipantSummary[],
): string {
  return [
    'ファイル名\t♥\tイチ押し\t掲載不可',
    ...photos.map(
      (photo) =>
        `${photo.originalFilename.replaceAll('\t', ' ')}\t${photo.voteCounts.favorite}\t${photo.voteCounts.recommendation}\t${photo.voteCounts.unpublishable}`,
    ),
    '',
    '参加メンバー',
    ...participants.map((participant) => participant.displayName.replaceAll('\t', ' ')),
  ].join('\n');
}
