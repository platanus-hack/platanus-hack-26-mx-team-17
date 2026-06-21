export interface ReportUpdate {
  id: string;
  reportId: string;
  authorId?: string;
  kind: string;
  body?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
