import type { CreatedRoom, RetentionDays, RoomView, VoteType } from '../../shared/types';
import { createResultFilename } from '../../shared/results';
async function parse<T>(response: Response): Promise<T> {
  if (!response.ok)
    throw new Error(response.status === 404 ? 'ルームを利用できません' : '操作に失敗しました');
  return response.json() as Promise<T>;
}
export async function createRoom(title: string, days: RetentionDays): Promise<CreatedRoom> {
  return parse(
    await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, retentionDays: days }),
    }),
  );
}
export async function getRoom(roomId: string, key: string, token?: string): Promise<RoomView> {
  return parse(
    await fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        ...(token ? { 'X-Participant-Token': token } : {}),
      },
    }),
  );
}
export async function joinRoom(
  roomId: string,
  key: string,
  displayName: string,
  participantToken: string,
): Promise<void> {
  await parse(
    await fetch(`/api/rooms/${encodeURIComponent(roomId)}/participants`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, participantToken }),
    }),
  );
}
export async function uploadPhotos(roomId: string, key: string, files: File[]): Promise<void> {
  for (const file of files) {
    const form = new FormData();
    form.set('photo', file);
    await parse(
      await fetch(`/api/rooms/${encodeURIComponent(roomId)}/photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      }),
    );
  }
}
export async function toggleVote(
  roomId: string,
  photoId: string,
  key: string,
  token: string,
  voteType: VoteType,
): Promise<void> {
  await parse(
    await fetch(
      `/api/rooms/${encodeURIComponent(roomId)}/photos/${encodeURIComponent(photoId)}/vote`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantToken: token, voteType }),
      },
    ),
  );
}
export async function downloadResults(
  roomId: string,
  roomTitle: string,
  key: string,
): Promise<void> {
  const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/admin/results.txt`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error('投票結果の出力に失敗しました');
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = createResultFilename(roomTitle, 'txt');
  anchor.click();
  URL.revokeObjectURL(url);
}
