export interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  ROOM_CREATION_RATE_LIMITER: RateLimit;
  MAX_PHOTOS_PER_ROOM?: string;
  MAX_PHOTO_BYTES?: string;
  MAX_ROOM_BYTES?: string;
}
export interface RoomRow {
  id: string;
  title: string;
  participant_key_hash: string;
  admin_key_hash: string;
  created_at: string;
  expires_at: string;
  status: 'active' | 'deleting';
}
export interface PhotoRow {
  id: string;
  room_id: string;
  object_key: string;
  original_filename: string;
  width: number;
  height: number;
  byte_size: number;
  sort_order: number;
  created_at: string;
}
