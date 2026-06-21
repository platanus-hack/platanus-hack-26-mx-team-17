export type TrackingStatus = 'active' | 'paused' | 'finished' | 'cancelled';

export interface TrackingSession {
  id: string;
  reportId: string;
  rescuerId: string;
  status: TrackingStatus;
  lastLat?: number;
  lastLng?: number;
  lastPointAt?: string;
  startedAt: string;
  endedAt?: string;
}

export interface TrackingUpdate {
  sessionId: string;
  status: TrackingStatus;
  lastLat?: number;
  lastLng?: number;
  lastPointAt?: string;
}
