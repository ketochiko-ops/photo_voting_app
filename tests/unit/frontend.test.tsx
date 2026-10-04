// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '../../src/pages/HomePage';
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
});
