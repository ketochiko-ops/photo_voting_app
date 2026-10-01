import { useEffect, useState } from 'react';
import type { RoomView } from '../../shared/types';
import { PrivateImage } from '../components/PrivateImage';
import { consumeFragment, participantToken } from '../lib/access';
import { getRoom, joinRoom, toggleVote } from '../lib/api';
export function RoomPage({ roomId }: { roomId: string }) {
  const [room, setRoom] = useState<RoomView | null>(null),
    [error, setError] = useState(''),
    [actionError, setActionError] = useState(''),
    [name, setName] = useState(''),
    [needsName, setNeedsName] = useState(false),
    [voting, setVoting] = useState<string | null>(null);
  const access = consumeFragment(roomId);
  useEffect(() => {
    if (!access) {
      setError('参加URLまたは管理者URLからアクセスしてください');
      return;
    }
    getRoom(
      roomId,
      access.key,
      access.role === 'participant' ? participantToken(roomId) : undefined,
    )
      .then((value) => {
        setRoom(value);
        if (value.role === 'participant' && !localStorage.getItem(`participant-name:${roomId}`))
          setNeedsName(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'ルームを利用できません'));
  }, [roomId]);
  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!access) return;
    await joinRoom(roomId, access.key, name, participantToken(roomId));
    localStorage.setItem(`participant-name:${roomId}`, name);
    setNeedsName(false);
  }
  async function vote(photoId: string) {
    if (!access || access.role !== 'participant' || needsName || voting) return;
    setVoting(photoId);
    setActionError('');
    try {
      const result = await toggleVote(roomId, photoId, access.key, participantToken(roomId));
      setRoom((current) =>
        current
          ? {
              ...current,
              photos: current.photos.map((photo) =>
                photo.id === photoId
                  ? { ...photo, votedByMe: result.voted, voteCount: result.voteCount }
                  : photo,
              ),
            }
          : current,
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '投票に失敗しました');
    } finally {
      setVoting(null);
    }
  }
  if (error)
    return (
      <main className="center">
        <h1>アクセスできません</h1>
        <p>{error}</p>
      </main>
    );
  if (!room)
    return (
      <main className="center">
        <p>読み込み中…</p>
      </main>
    );
  return (
    <main className="room">
      <header>
        <div>
          <span className="eyebrow">PHOTO ROOM</span>
          <h1>{room.title}</h1>
        </div>
        <div>{room.participantCount}人参加</div>
      </header>
      {needsName && (
        <div className="dialog-backdrop">
          <form className="dialog" role="dialog" onSubmit={join}>
            <h2>表示名を入力してください</h2>
            <input
              required
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="あきさめ"
            />
            <button className="primary">参加する</button>
          </form>
        </div>
      )}
      <section className="grid">
        {actionError && <p role="alert">{actionError}</p>}
        {room.photos.length === 0 ? (
          <div className="empty">
            <strong>まだ写真がありません</strong>
            <p>
              {room.role === 'admin'
                ? '管理者パネルから写真を追加してください。'
                : '管理者が写真を追加するまでお待ちください。'}
            </p>
          </div>
        ) : (
          room.photos.map((photo, index) => (
            <article className="photo" key={photo.id}>
              <PrivateImage
                roomId={room.id}
                photoId={photo.id}
                accessKey={access?.key ?? ''}
                alt={`${index + 1}枚目 ${photo.originalFilename}`}
              />
              <div>
                <span>#{index + 1}</span>
                <small>{photo.originalFilename}</small>
                <button
                  aria-pressed={photo.votedByMe}
                  disabled={room.role !== 'participant' || needsName || voting !== null}
                  onClick={() => void vote(photo.id)}
                >
                  {photo.votedByMe ? '♥' : '♡'} {photo.voteCount}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
