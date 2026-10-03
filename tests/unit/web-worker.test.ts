import { describe, expect, it, vi } from 'vitest';
import worker from '../../web';

describe('web Worker', () => {
  it('forwards API requests through the API service binding', async () => {
    const request = new Request('https://photo-voting-web.example/api/rooms');
    const response = new Response(JSON.stringify({ rooms: [] }));
    const fetch = vi.fn().mockResolvedValue(response);

    const result = await worker.fetch(request as never, { API: { fetch } } as never);

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(request);
    expect(result).toBe(response);
  });

  it('returns 503 when a preview has no API service binding', async () => {
    const request = new Request('https://preview.photo-voting-web.example/api/rooms');

    const result = await worker.fetch(request as never, {});

    expect(result.status).toBe(503);
    expect(result.headers.get('cache-control')).toBe('no-store');
    await expect(result.json()).resolves.toEqual({
      error: 'API service is not available in this preview',
    });
  });
});
