import { describe, expect, it, vi } from 'vitest';
import { app } from '../../worker/app';

describe('room creation rate limit', () => {
  it('returns 429 before accessing storage when the client exceeds the limit', async () => {
    const limit = vi.fn().mockResolvedValue({ success: false });
    const response = await app.request(
      '/api/rooms',
      {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': '192.0.2.1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Room', retentionDays: 7 }),
      },
      { ROOM_CREATION_RATE_LIMITER: { limit } } as unknown as Parameters<typeof app.request>[2],
    );

    expect(limit).toHaveBeenCalledWith({ key: '192.0.2.1' });
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    await expect(response.json()).resolves.toEqual({ error: 'Too many requests' });
  });
});
