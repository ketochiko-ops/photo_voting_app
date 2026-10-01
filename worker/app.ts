import { Hono, type Context } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import type { CreatedRoom, RetentionDays } from '../shared/types';
import { retentionDays } from '../shared/types';
import { RoomRepository } from './repositories/roomRepository';
import { authenticateRoom } from './services/authService';
import { cleanupRoom } from './services/cleanupService';
import type { Env, PhotoRow } from './types';
import { createResultsCsv } from './utils/domain';
import { sanitizeImage, validateImage, type SupportedMime } from './utils/image';
import {
  generateAccessKey,
  generatePhotoId,
  generateRoomId,
  hashSecret,
  readBearer,
} from './utils/security';

type Variables = { role: 'participant' | 'admin' };
export const app = new Hono<{ Bindings: Env; Variables: Variables }>();
app.use(
  '*',
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
    referrerPolicy: 'no-referrer',
  }),
);
app.use('/api/*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store, private');
});
const genericAuthError = (c: Context<{ Bindings: Env; Variables: Variables }>) =>
  c.json({ error: 'Access denied' }, 404);
function validTitle(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 100;
}
async function voteCount(db: D1Database, roomId: string, photoId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) count FROM votes WHERE room_id=? AND photo_id=?')
    .bind(roomId, photoId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

app.post('/api/rooms', async (c) => {
  const body = await c.req.json<{ title?: unknown; retentionDays?: unknown }>().catch(() => ({}));
  if (!validTitle(body.title) || !retentionDays.includes(body.retentionDays as RetentionDays))
    return c.json({ error: 'Invalid request' }, 400);
  const roomId = generateRoomId(),
    participantAccessKey = generateAccessKey(),
    adminKey = generateAccessKey();
  const now = new Date(),
    expiresAt = new Date(now.getTime() + (body.retentionDays as number) * 86_400_000);
  await new RoomRepository(c.env.DB).create({
    id: roomId,
    title: body.title.trim(),
    participant_key_hash: await hashSecret(participantAccessKey),
    admin_key_hash: await hashSecret(adminKey),
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'active',
  });
  return c.json(
    {
      roomId,
      participantAccessKey,
      adminKey,
      expiresAt: expiresAt.toISOString(),
    } satisfies CreatedRoom,
    201,
  );
});
async function auth(c: Context<{ Bindings: Env; Variables: Variables }>, required?: 'admin') {
  const room = await new RoomRepository(c.env.DB).find(c.req.param('roomId'));
  const role = await authenticateRoom(room, readBearer(c.req.header('Authorization')), required);
  return { room, role };
}
app.get('/api/rooms/:roomId', async (c) => {
  const { room, role } = await auth(c);
  if (!room || !role) return genericAuthError(c);
  const repo = new RoomRepository(c.env.DB),
    photos = await repo.photos(room.id),
    participantCount = await repo.participantCount(room.id);
  const voteCounts = await c.env.DB.prepare(
    'SELECT photo_id, COUNT(*) count FROM votes WHERE room_id=? GROUP BY photo_id',
  )
    .bind(room.id)
    .all<{ photo_id: string; count: number }>();
  const countsByPhoto = new Map(voteCounts.results.map((vote) => [vote.photo_id, vote.count]));
  const participantToken = c.req.header('X-Participant-Token');
  let myVotes = new Set<string>();
  if (participantToken) {
    const participant = await c.env.DB.prepare(
      'SELECT id FROM participants WHERE room_id=? AND participant_token_hash=?',
    )
      .bind(room.id, await hashSecret(participantToken))
      .first<{ id: string }>();
    if (participant) {
      const selected = await c.env.DB.prepare(
        'SELECT photo_id FROM votes WHERE room_id=? AND participant_id=?',
      )
        .bind(room.id, participant.id)
        .all<{ photo_id: string }>();
      myVotes = new Set(selected.results.map((vote) => vote.photo_id));
    }
  }
  return c.json({
    id: room.id,
    title: room.title,
    expiresAt: room.expires_at,
    role,
    participantCount,
    photos: photos.map((p) => ({
      id: p.id,
      originalFilename: p.original_filename,
      width: p.width,
      height: p.height,
      sortOrder: p.sort_order,
      voteCount: countsByPhoto.get(p.id) ?? 0,
      votedByMe: myVotes.has(p.id),
    })),
  });
});
app.post('/api/rooms/:roomId/participants', async (c) => {
  const { room, role } = await auth(c);
  if (!room || !role) return genericAuthError(c);
  const body = await c.req
    .json<{ displayName?: unknown; participantToken?: unknown }>()
    .catch(() => ({}));
  if (
    !validTitle(body.displayName) ||
    typeof body.participantToken !== 'string' ||
    body.participantToken.length < 40
  )
    return c.json({ error: 'Invalid request' }, 400);
  const tokenHash = await hashSecret(body.participantToken);
  let existing = await c.env.DB.prepare(
    'SELECT id FROM participants WHERE room_id=? AND participant_token_hash=?',
  )
    .bind(room.id, tokenHash)
    .first<{ id: string }>();
  if (!existing) {
    existing = { id: generatePhotoId() };
    await c.env.DB.prepare(
      'INSERT INTO participants(id,room_id,display_name,participant_token_hash,created_at) VALUES(?,?,?,?,?)',
    )
      .bind(existing.id, room.id, body.displayName.trim(), tokenHash, new Date().toISOString())
      .run();
  }
  return c.json({ participantId: existing.id }, 201);
});
app.post('/api/rooms/:roomId/photos', async (c) => {
  const { room, role } = await auth(c, 'admin');
  if (!room || !role) return genericAuthError(c);
  const form = await c.req.formData();
  const file = form.get('photo');
  if (!(file instanceof File)) return c.json({ error: 'Invalid request' }, 400);
  const uploadedBytes = new Uint8Array(await file.arrayBuffer());
  let bytes: Uint8Array;
  let mime: SupportedMime;
  try {
    mime = validateImage(uploadedBytes, file.type, Number(c.env.MAX_PHOTO_BYTES) || undefined);
    bytes = sanitizeImage(uploadedBytes, mime);
  } catch {
    return c.json({ error: 'Invalid image' }, 400);
  }
  const count = await c.env.DB.prepare(
    'SELECT COUNT(*) count, COALESCE(SUM(byte_size),0) bytes FROM photos WHERE room_id=?',
  )
    .bind(room.id)
    .first<{ count: number; bytes: number }>();
  if (
    (count?.count ?? 0) >= Number(c.env.MAX_PHOTOS_PER_ROOM ?? 200) ||
    (count?.bytes ?? 0) + bytes.length > Number(c.env.MAX_ROOM_BYTES ?? 1073741824)
  )
    return c.json({ error: 'Room limit reached' }, 413);
  const id = generatePhotoId(),
    objectKey = `rooms/${room.id}/${id}.jpg`,
    order = (count?.count ?? 0) + 1;
  await c.env.PHOTOS.put(objectKey, bytes, {
    httpMetadata: { contentType: mime, cacheControl: 'private, no-store' },
  });
  await c.env.DB.prepare(
    'INSERT INTO photos(id,room_id,object_key,original_filename,width,height,byte_size,sort_order,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
  )
    .bind(
      id,
      room.id,
      objectKey,
      file.name.slice(0, 255),
      Number(form.get('width')) || 0,
      Number(form.get('height')) || 0,
      bytes.length,
      order,
      new Date().toISOString(),
    )
    .run();
  return c.json({ id }, 201);
});
app.get('/api/rooms/:roomId/photos/:photoId/content', async (c) => {
  const { room, role } = await auth(c);
  if (!room || !role) return genericAuthError(c);
  const photo = await c.env.DB.prepare('SELECT * FROM photos WHERE id=? AND room_id=?')
    .bind(c.req.param('photoId'), room.id)
    .first<PhotoRow>();
  if (!photo) return genericAuthError(c);
  const object = await c.env.PHOTOS.get(photo.object_key);
  if (!object) return genericAuthError(c);
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'image/jpeg',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
app.put('/api/rooms/:roomId/photos/:photoId/vote', async (c) => {
  const { room, role } = await auth(c);
  if (!room || !role) return genericAuthError(c);
  const body = await c.req.json<{ participantToken?: string }>().catch(() => ({}));
  if (!body.participantToken) return genericAuthError(c);
  const participant = await c.env.DB.prepare(
    'SELECT id FROM participants WHERE room_id=? AND participant_token_hash=?',
  )
    .bind(room.id, await hashSecret(body.participantToken))
    .first<{ id: string }>();
  const photo = await c.env.DB.prepare('SELECT id FROM photos WHERE room_id=? AND id=?')
    .bind(room.id, c.req.param('photoId'))
    .first<{ id: string }>();
  if (!participant || !photo) return genericAuthError(c);
  const existing = await c.env.DB.prepare(
    'SELECT 1 present FROM votes WHERE photo_id=? AND participant_id=?',
  )
    .bind(photo.id, participant.id)
    .first();
  if (existing) {
    await c.env.DB.prepare('DELETE FROM votes WHERE photo_id=? AND participant_id=?')
      .bind(photo.id, participant.id)
      .run();
    const count = await voteCount(c.env.DB, room.id, photo.id);
    return c.json({ voted: false, voteCount: count });
  }
  await c.env.DB.prepare(
    'INSERT INTO votes(room_id,photo_id,participant_id,created_at) VALUES(?,?,?,?)',
  )
    .bind(room.id, photo.id, participant.id, new Date().toISOString())
    .run();
  const count = await voteCount(c.env.DB, room.id, photo.id);
  return c.json({ voted: true, voteCount: count });
});
app.get('/api/rooms/:roomId/admin/results.csv', async (c) => {
  const { room, role } = await auth(c, 'admin');
  if (!room || !role) return genericAuthError(c);
  const repo = new RoomRepository(c.env.DB),
    photos = await repo.photos(room.id),
    participants = await repo.participantCount(room.id);
  const counts = await c.env.DB.prepare(
    'SELECT photo_id,COUNT(*) count FROM votes WHERE room_id=? GROUP BY photo_id',
  )
    .bind(room.id)
    .all<{ photo_id: string; count: number }>();
  const byId = new Map(counts.results.map((v) => [v.photo_id, v.count]));
  const csv = createResultsCsv(
    photos.map((p) => ({
      id: p.id,
      originalFilename: p.original_filename,
      width: p.width,
      height: p.height,
      sortOrder: p.sort_order,
      voteCount: byId.get(p.id) ?? 0,
      votedByMe: false,
    })),
    participants,
  );
  return c.text(csv, 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="results.csv"',
  });
});
app.delete('/api/rooms/:roomId', async (c) => {
  const { room, role } = await auth(c, 'admin');
  if (!room || !role) return genericAuthError(c);
  await cleanupRoom(c.env.DB, c.env.PHOTOS, room.id);
  return c.body(null, 204);
});
app.notFound((c) => c.json({ error: 'Not found' }, 404));
