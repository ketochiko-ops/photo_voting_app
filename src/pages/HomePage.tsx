import { useState } from 'react';
import { retentionDays, type CreatedRoom, type RetentionDays } from '../../shared/types';
import { createRoom } from '../lib/api';
export function HomePage() {
  const [open, setOpen] = useState(false),
    [title, setTitle] = useState(''),
    [days, setDays] = useState<RetentionDays>(7),
    [created, setCreated] = useState<CreatedRoom | null>(null),
    [copied, setCopied] = useState<'participant' | 'admin' | null>(null),
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
  const participantUrl = created
    ? `${base}/r/${created.roomId}#k=${created.participantAccessKey}`
    : '';
  const adminUrl = created ? `${base}/r/${created.roomId}#admin=${created.adminKey}` : '';
  async function copyUrl(kind: 'participant' | 'admin', url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(kind);
  }
  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">PRIVATE · TEMPORARY · SIMPLE</span>
        <h1>
          併せ写真アップ
          <br />
          <em>支援アプリ</em>
        </h1>
        <p>大量の写真から掲載候補を、仲間だけで安全に選べます。</p>
        <button className="primary" onClick={() => setOpen(true)}>
          写真選定ルームを作成
        </button>
        <div className="trust">
          <span>🔒 非公開アクセス</span>
          <span>◷ 自動削除</span>
          <span>✓ 登録不要</span>
        </div>
        <aside className="announcements" aria-labelledby="announcements-title">
          <div className="announcements-heading">
            <span className="announcements-icon" aria-hidden="true">
              i
            </span>
            <h2 id="announcements-title">お知らせ</h2>
          </div>
          <article>
            <time dateTime="2026-10-05">2026.10.05</time>
            <div>
              <strong>画像拡大機能実装</strong>
              <p>
                各ルームの写真をタップ（クリック）すると、その写真全体を表示できピンチ操作やボタン操作でさらに拡大できます。
              </p>
            </div>
          </article>
          <article>
            <time dateTime="2026-10-04">2026.10.04</time>
            <div>
              <strong>サービスをリリースしました</strong>
              <p>リリースノートやメンテナンス情報をこちらでお知らせします。</p>
            </div>
          </article>
          <p className="contact">
            不具合情報・改修要望は
            <a href="https://x.com/03St_akisame" target="_blank" rel="noreferrer">
              X（@03St_akisame）
            </a>
            へDMでお送りください。
          </p>
        </aside>
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
                  共有用URL
                  <textarea readOnly value={participantUrl} />
                </label>
                <button
                  type="button"
                  className="copy-button"
                  onClick={() => copyUrl('participant', participantUrl)}
                >
                  {copied === 'participant' ? 'コピーしました' : '共有用URLをコピー'}
                </button>
                <label>
                  管理者URL
                  <textarea readOnly value={adminUrl} />
                </label>
                <button
                  type="button"
                  className="copy-button"
                  onClick={() => copyUrl('admin', adminUrl)}
                >
                  {copied === 'admin' ? 'コピーしました' : '管理者URLをコピー'}
                </button>
                <p className="copy-status" aria-live="polite">
                  {copied && `${copied === 'admin' ? '管理者' : '共有用'}URLをコピーしました。`}
                </p>
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
