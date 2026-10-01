export const retentionDays = [1, 3, 7, 14, 30] as const;
export type RetentionDays = (typeof retentionDays)[number];
export type Role = 'participant' | 'admin';
export interface PhotoSummary {
  id: string;
  originalFilename: string;
  width: number;
  height: number;
  sortOrder: number;
  voteCount: number;
  votedByMe: boolean;
}
export interface RoomView {
  id: string;
  title: string;
  expiresAt: string;
  role: Role;
  participantCount: number;
  photos: PhotoSummary[];
}
export interface CreatedRoom {
  roomId: string;
  participantAccessKey: string;
  adminKey: string;
  expiresAt: string;
}
