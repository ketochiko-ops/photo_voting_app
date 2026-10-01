import type { CreatedRoom, RetentionDays, RoomView } from '../../shared/types';
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
export async function getRoom(
  roomId: string,
  key: string,
  participantToken?: string,
): Promise<RoomView> {
  return parse(
    await fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        ...(participantToken ? { 'X-Participant-Token': participantToken } : {}),
      },
    }),
  );
}

export async function toggleVote(
  roomId: string,
  photoId: string,
  key: string,
  participantToken: string,
): Promise<{ voted: boolean; voteCount: number }> {
  return parse(
    await fetch(
      `/api/rooms/${encodeURIComponent(roomId)}/photos/${encodeURIComponent(photoId)}/vote`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantToken }),
      },
    ),
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
