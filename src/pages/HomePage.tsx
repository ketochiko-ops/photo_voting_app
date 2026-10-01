import { useState } from 'react';
import { retentionDays, type CreatedRoom, type RetentionDays } from '../../shared/types';
import { createRoom } from '../lib/api';
export function HomePage() {
  const [open, setOpen] = useState(false),
    [title, setTitle] = useState(''),
    [days, setDays] = useState<RetentionDays>(7),
    [created, setCreated] = useState<CreatedRoom | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      setCreated(await createRoom(title, days));
    } catch (e) {
      setError(e instanceof Error ? e.message : '作成に失敗しました');
    } finally {
      setBusy(false);
    }
  }
  const base = location.origin;
  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">PRIVATE · TEMPORARY · SIMPLE</span>
        <h1>
          みんなの一票で、
          <br />
          <em>残したい瞬間</em>を選ぶ。
        </h1>
        <p>大量の写真から掲載候補を、仲間だけで安全に選定。登録不要、期限が来たら自動削除。</p>
        <button className="primary" onClick={() => setOpen(true)}>
          写真選定ルームを作成
        </button>
        <div className="trust">
          <span>🔒 非公開アクセス</span>
          <span>◷ 自動削除</span>
          <span>✓ 登録不要</span>
        </div>
      </section>
      {open && (
        <div className="dialog-backdrop">
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
          >
            <button className="close" aria-label="閉じる" onClick={() => setOpen(false)}>
              ×
            </button>
            <h2 id="create-title">新しいルーム</h2>
            {created ? (
              <div className="links">
                <p>この画面でのみ秘密鍵を確認できます。安全な方法で共有してください。</p>
                <label>
                  参加者URL
                  <textarea
                    readOnly
                    value={`${base}/r/${created.roomId}#k=${created.participantAccessKey}`}
                  />
                </label>
                <label>
                  管理者URL
                  <textarea
                    readOnly
                    value={`${base}/r/${created.roomId}#admin=${created.adminKey}`}
                  />
                </label>
              </div>
            ) : (
              <form onSubmit={submit}>
                <label>
                  ルーム名
                  <input
                    autoFocus
                    required
                    maxLength={100}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="春のポートレート撮影"
                  />
                </label>
                <label>
                  保存期間
                  <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value) as RetentionDays)}
                  >
                    {retentionDays.map((day) => (
                      <option key={day} value={day}>
                        {day}日
                      </option>
                    ))}
                  </select>
                </label>
                {error && (
                  <p role="alert" className="error">
                    {error}
                  </p>
                )}
                <button className="primary" disabled={busy}>
                  {busy ? '作成中…' : 'ルームを作成'}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
