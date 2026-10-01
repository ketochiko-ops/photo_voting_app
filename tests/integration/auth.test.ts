import { describe, expect, it } from 'vitest';
import { authenticateRoom } from '../../worker/services/authService';
import { generateAccessKey, hashSecret } from '../../worker/utils/security';
const base = {
  id: 'room',
  title: 'Room',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 60000).toISOString(),
  status: 'active' as const,
};
describe('room authorization integration', () => {
  it('does not distinguish a missing room from a wrong key', async () => {
    const key = generateAccessKey(),
      room = {
        ...base,
        participant_key_hash: await hashSecret(key),
        admin_key_hash: await hashSecret(generateAccessKey()),
      };
    expect(await authenticateRoom(room, 'wrong')).toBeNull();
    expect(await authenticateRoom(null, key)).toBeNull();
  });
  it('does not allow participant credentials on admin endpoints', async () => {
    const key = generateAccessKey(),
      room = {
        ...base,
        participant_key_hash: await hashSecret(key),
        admin_key_hash: await hashSecret(generateAccessKey()),
      };
    expect(await authenticateRoom(room, key)).toBe('participant');
    expect(await authenticateRoom(room, key, 'admin')).toBeNull();
  });
  it('rejects expired rooms', async () => {
    const key = generateAccessKey(),
      room = {
        ...base,
        expires_at: new Date(0).toISOString(),
        participant_key_hash: await hashSecret(key),
        admin_key_hash: await hashSecret(generateAccessKey()),
      };
    expect(await authenticateRoom(room, key)).toBeNull();
  });
});
