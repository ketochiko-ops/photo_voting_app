import { describe, expect, it } from 'vitest';
import {
  constantTimeEqual,
  generateAccessKey,
  generateParticipantToken,
  generatePhotoId,
  generateRoomId,
  hashSecret,
} from '../../worker/utils/security';
describe('opaque identifiers', () => {
  it('creates URL-safe unpredictable identifiers with required entropy', () => {
    const values = [
      generateRoomId(),
      generatePhotoId(),
      generateAccessKey(),
      generateParticipantToken(),
    ];
    expect(values[0]).toHaveLength(24);
    expect(values[2].length).toBeGreaterThanOrEqual(43);
    expect(new Set(values).size).toBe(4);
    values.forEach((value) => expect(value).toMatch(/^[\w-]+$/));
  });
  it('stores deterministic hashes rather than secrets', async () => {
    const secret = generateAccessKey(),
      hash = await hashSecret(secret);
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(secret);
    expect(constantTimeEqual(hash, await hashSecret(secret))).toBe(true);
    expect(constantTimeEqual(hash, await hashSecret('wrong'))).toBe(false);
  });
});
