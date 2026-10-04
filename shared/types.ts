export const retentionDays = [1, 3, 7, 14, 30] as const;
export type RetentionDays = (typeof retentionDays)[number];
export type Role = 'participant' | 'admin';
export const voteTypes = ['favorite', 'recommendation', 'unpublishable'] as const;
export type VoteType = (typeof voteTypes)[number];
export type VoteState = Record<VoteType, number>;
export type MyVoteState = Record<VoteType, boolean>;
export interface ParticipantSummary {
  id: string;
  displayName: string;
}
export interface PhotoSummary {
  id: string;
  originalFilename: string;
  width: number;
  height: number;
  sortOrder: number;
  voteCounts: VoteState;
  votedByMe: MyVoteState;
}
export interface RoomView {
  id: string;
  title: string;
  expiresAt: string;
  role: Role;
  participantCount: number;
  participants: ParticipantSummary[];
  photos: PhotoSummary[];
}
export interface CreatedRoom {
  roomId: string;
  participantAccessKey: string;
  adminKey: string;
  expiresAt: string;
}
