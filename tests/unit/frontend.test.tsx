// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HomePage } from '../../src/pages/HomePage';
describe('home', () => {
  it('opens room creation with seven days selected', async () => {
    render(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: '写真選定ルームを作成' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByLabelText('保存期間')).toHaveValue('7');
  });
});
