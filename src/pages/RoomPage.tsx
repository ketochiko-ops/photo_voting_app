import { useEffect, useState } from 'react';
import type { RoomView, VoteType } from '../../shared/types';
import { PrivateImage } from '../components/PrivateImage';
import { ImageViewer } from '../components/ImageViewer';
import { consumeFragment, participantToken } from '../lib/access';
import { downloadResults, getRoom, joinRoom, toggleVote, uploadPhotos } from '../lib/api';

const voteButtons: { type: VoteType; label: string; inactive: string; active: string }[] = [
  { type: 'favorite', label: 'お気に入り', inactive: '♡', active: '♥' },
  { type: 'recommendation', label: 'イチ押し', inactive: 'イチ押し', active: '★ イチ押し' },
  { type: 'unpublishable', label: '掲載不可', inactive: '掲載不可', active: '× 掲載不可' },
];

export function RoomPage({ roomId }: { roomId: string }) {
  const [access] = useState(() => consumeFragment(roomId)),
    [room, setRoom] = useState<RoomView | null>(null),
    [error, setError] = useState(''),
    [name, setName] = useState(''),
    [needsName, setNeedsName] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [selectedPhoto, setSelectedPhoto] = useState<{ id: string; alt: string } | null>(null);
  async function refresh() {
    if (access)
      setRoom(
        await getRoom(
          roomId,
          access.key,
          access.role === 'participant' ? participantToken(roomId) : undefined,
        ),
      );
  }
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
  }, [access, roomId]);
  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!access) return;
    await joinRoom(roomId, access.key, name, participantToken(roomId));
    localStorage.setItem(`participant-name:${roomId}`, name);
    setNeedsName(false);
    await refresh();
  }
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!access || !e.target.files?.length) return;
    setBusy(true);
    setNotice('');
    try {
      await uploadPhotos(roomId, access.key, [...e.target.files]);
      await refresh();
      setNotice('写真を追加しました');
      e.target.value = '';
    } catch (uploadError) {
      setNotice(uploadError instanceof Error ? uploadError.message : '写真の追加に失敗しました');
    } finally {
      setBusy(false);
    }
  }
  async function vote(photoId: string, voteType: VoteType) {
    if (!access || room?.role !== 'participant') return;
    setBusy(true);
    try {
      await toggleVote(roomId, photoId, access.key, participantToken(roomId), voteType);
      await refresh();
    } catch (voteError) {
      setNotice(voteError instanceof Error ? voteError.message : '投票に失敗しました');
    } finally {
      setBusy(false);
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
      {room.role === 'admin' && (
        <section className="admin-panel" aria-labelledby="admin-panel-title">
          <div>
            <span className="eyebrow">ADMIN</span>
            <h2 id="admin-panel-title">管理者パネル</h2>
            <p>写真の追加と、ファイル名・投票数をまとめたテキストの出力ができます。</p>
          </div>
          <div className="admin-actions">
            <label className="primary upload-button">
              {busy ? '処理中…' : '写真を追加'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={busy}
                onChange={upload}
              />
            </label>
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                access &&
                downloadResults(roomId, room.title, access.key).catch(() =>
                  setNotice('投票結果の出力に失敗しました'),
                )
              }
            >
              投票結果をテキスト出力
            </button>
          </div>
          {notice && (
            <p className="admin-notice" role="status">
              {notice}
            </p>
          )}
        </section>
      )}
      <section className="members" aria-labelledby="members-title">
        <div className="members-heading">
          <span className="eyebrow">MEMBERS</span>
          <h2 id="members-title">参加メンバー</h2>
        </div>
        {room.participants.length === 0 ? (
          <p>まだ参加メンバーはいません。</p>
        ) : (
          <ul>
            {room.participants.map((participant) => (
              <li key={participant.id}>{participant.displayName}</li>
            ))}
          </ul>
        )}
      </section>
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
      {selectedPhoto && (
        <ImageViewer
          roomId={room.id}
          photoId={selectedPhoto.id}
          accessKey={access?.key ?? ''}
          alt={selectedPhoto.alt}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
      <section className="grid">
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
              <button
                className="photo-preview"
                aria-label={`${photo.originalFilename}を拡大表示`}
                onClick={() =>
                  setSelectedPhoto({
                    id: photo.id,
                    alt: `${index + 1}枚目 ${photo.originalFilename}`,
                  })
                }
              >
                <PrivateImage
                  roomId={room.id}
                  photoId={photo.id}
                  accessKey={access?.key ?? ''}
                  alt={`${index + 1}枚目 ${photo.originalFilename}`}
                />
              </button>
              <div>
                <span>#{index + 1}</span>
                <small>{photo.originalFilename}</small>
                <div className="vote-actions">
                  {voteButtons.map((button) => (
                    <button
                      key={button.type}
                      className={`vote-${button.type}`}
                      aria-label={`${photo.originalFilename}を${button.label}に投票`}
                      aria-pressed={photo.votedByMe[button.type]}
                      disabled={busy || room.role === 'admin'}
                      onClick={() => vote(photo.id, button.type)}
                    >
                      {photo.votedByMe[button.type] ? button.active : button.inactive}{' '}
                      {photo.voteCounts[button.type]}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
