// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '../../src/pages/HomePage';
import { RoomPage } from '../../src/pages/RoomPage';
describe('home', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('opens room creation with seven days selected', async () => {
    render(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: '写真選定ルームを作成' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByLabelText('保存期間')).toHaveValue('7');
  });

  it('shows announcements and the support contact', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: '併せ写真アップ 支援アプリ' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'お知らせ' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'X（@03St_akisame）' })).toHaveAttribute(
      'href',
      'https://x.com/03St_akisame',
    );
  });

  it('copies participant and admin URLs after creating a room', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          roomId: 'room-1',
          participantAccessKey: 'share-key',
          adminKey: 'admin-key',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(<HomePage />);
    await user.click(screen.getByRole('button', { name: '写真選定ルームを作成' }));
    await user.type(screen.getByLabelText('ルーム名'), 'テストルーム');
    await user.click(screen.getByRole('button', { name: 'ルームを作成' }));

    await user.click(await screen.findByRole('button', { name: '共有用URLをコピー' }));
    expect(writeText).toHaveBeenLastCalledWith(`${location.origin}/r/room-1#k=share-key`);
    await user.click(screen.getByRole('button', { name: '管理者URLをコピー' }));
    expect(writeText).toHaveBeenLastCalledWith(`${location.origin}/r/room-1#admin=admin-key`);
  });

  it('shows the admin panel and text export in an admin room', async () => {
    sessionStorage.setItem(
      'room-access:room-admin',
      JSON.stringify({ key: 'admin-key', role: 'admin' }),
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'room-admin',
          title: '管理ルーム',
          expiresAt: '2099-01-01T00:00:00Z',
          role: 'admin',
          participantCount: 2,
          participants: [
            { id: 'p1', displayName: 'あきさめ' },
            { id: 'p2', displayName: 'コスプレイヤー' },
          ],
          photos: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(<RoomPage roomId="room-admin" />);

    expect(await screen.findByRole('heading', { name: '管理者パネル' })).toBeVisible();
    expect(screen.getByRole('button', { name: '投票結果をテキスト出力' })).toBeVisible();
    expect(screen.getByText('写真を追加')).toBeVisible();
    expect(screen.getByRole('heading', { name: '参加メンバー' })).toBeVisible();
    expect(screen.getByText('あきさめ')).toBeVisible();
  });

  it('shows three vote types for each photo', async () => {
    sessionStorage.setItem(
      'room-access:room-participant',
      JSON.stringify({ key: 'participant-key', role: 'participant' }),
    );
    localStorage.setItem('participant-name:room-participant', 'あきさめ');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'room-participant',
          title: '投票ルーム',
          expiresAt: '2099-01-01T00:00:00Z',
          role: 'participant',
          participantCount: 1,
          participants: [{ id: 'p1', displayName: 'あきさめ' }],
          photos: [
            {
              id: 'photo-1',
              originalFilename: 'photo.jpg',
              width: 100,
              height: 100,
              sortOrder: 1,
              voteCounts: { favorite: 1, recommendation: 2, unpublishable: 0 },
              votedByMe: { favorite: true, recommendation: false, unpublishable: false },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(<RoomPage roomId="room-participant" />);

    expect(
      await screen.findByRole('button', { name: 'photo.jpgをお気に入りに投票' }),
    ).toHaveTextContent('♥ 1');
    expect(screen.getByRole('button', { name: 'photo.jpgをイチ押しに投票' })).toHaveTextContent(
      'イチ押し 2',
    );
    expect(screen.getByRole('button', { name: 'photo.jpgを掲載不可に投票' })).toHaveTextContent(
      '掲載不可 0',
    );
  });
});
