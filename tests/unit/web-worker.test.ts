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
});
