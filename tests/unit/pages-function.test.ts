import { describe, expect, it, vi } from 'vitest';
import { onRequest } from '../../functions/api/[[path]]';

describe('Pages API proxy', () => {
  it('forwards the original request through the API service binding', async () => {
    const request = new Request('https://photo-choice.pages.dev/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer secret' },
      body: JSON.stringify({ expiresInDays: 7 }),
    });
    const response = new Response(JSON.stringify({ roomId: 'room-id' }), {
      status: 201,
      headers: { 'cache-control': 'private, no-store' },
    });
    const fetch = vi.fn().mockResolvedValue(response);

    const result = await onRequest({ request, env: { API: { fetch } } } as never);

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(request);
    expect(result).toBe(response);
  });
});
