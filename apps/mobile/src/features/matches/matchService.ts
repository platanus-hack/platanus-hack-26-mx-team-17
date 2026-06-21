import { supabase } from '../../lib/supabase';
import type { Match, MatchStatus, SettableMatchStatus } from '../../types/match';

export type MatchErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'TIMEOUT'
  | 'NO_IMAGE'
  | 'NETWORK'
  | 'UNKNOWN';

export class MatchError extends Error {
  constructor(
    public code: MatchErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MatchError';
  }
}

interface MatchRow {
  id: string;
  source_report_id: string;
  candidate_report_id: string;
  status: MatchStatus;
  compatibility: number;
  visual_score: number | null;
  geo_score: number | null;
  attribute_score: number | null;
  temporal_score: number | null;
  rank: number | null;
  created_at: string;
}

function mapMatch(row: MatchRow): Match {
  return {
    id: row.id,
    sourceReportId: row.source_report_id,
    candidateReportId: row.candidate_report_id,
    status: row.status,
    compatibility: Number(row.compatibility),
    visualScore: row.visual_score != null ? Number(row.visual_score) : undefined,
    geoScore: row.geo_score != null ? Number(row.geo_score) : undefined,
    attributeScore: row.attribute_score != null ? Number(row.attribute_score) : undefined,
    temporalScore: row.temporal_score != null ? Number(row.temporal_score) : undefined,
    rank: row.rank ?? undefined,
    createdAt: row.created_at,
  };
}

function mapError(error: { code?: string; message: string }): MatchError {
  const msg = error.message;
  if (error.code === 'PGRST116') return new MatchError('NOT_FOUND', 'No encontrado');
  if (msg.includes('JWT') || msg.includes('not authenticated')) {
    return new MatchError('UNAUTHENTICATED', 'Debes iniciar sesión');
  }
  return new MatchError('NETWORK', msg);
}

export const matchService = {
  async getMatches(reportId: string): Promise<Match[]> {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('source_report_id', reportId)
      .order('rank', { ascending: true });

    if (error) throw mapError(error);
    return (data as MatchRow[]).map(mapMatch);
  },

  async setMatchStatus(matchId: string, status: SettableMatchStatus): Promise<Match> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw new MatchError('UNAUTHENTICATED', 'Debes iniciar sesión');

    const { data, error } = await supabase
      .from('matches')
      .update({ status })
      .eq('id', matchId)
      .select()
      .single();

    if (error) throw mapError(error);
    return mapMatch(data as MatchRow);
  },

  async requestReportProcessing(reportId: string): Promise<{ accepted: true }> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new MatchError('UNAUTHENTICATED', 'Debes iniciar sesión para usar la IA');

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new MatchError('UNAUTHENTICATED', 'Sesión expirada, vuelve a iniciar sesión');

    const visionUrl = process.env.EXPO_PUBLIC_VISION_API_URL;
    if (!visionUrl) throw new MatchError('NETWORK', 'Vision API URL no configurada en .env');

    const response = await fetch(`${visionUrl}/v1/reports/${reportId}/process`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ force: false }),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      if (response.status === 401) {
        throw new MatchError('UNAUTHENTICATED', `API rechazó el JWT (401) — verifica SUPABASE_JWT_SECRET en Railway. Respuesta: ${bodyText.slice(0, 120)}`);
      }
      const body = (() => { try { return JSON.parse(bodyText); } catch { return {}; } })() as { error?: { code?: string } };
      const code = body?.error?.code ?? '';
      if (response.status === 409 || code === 'no_primary_image') {
        throw new MatchError('NO_IMAGE', 'El reporte necesita una foto para buscar coincidencias');
      }
      if (response.status === 504 || code === 'timeout') {
        throw new MatchError('TIMEOUT', 'El modelo tardó demasiado, intenta de nuevo');
      }
      throw new MatchError('NETWORK', `Error ${response.status}: ${bodyText.slice(0, 120)}`);
    }

    return { accepted: true };
  },

  subscribeToMatches(reportId: string, callback: (match: Match) => void): () => void {
    const channel = supabase
      .channel(`matches-${reportId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `source_report_id=eq.${reportId}`,
        },
        (payload) => {
          callback(mapMatch(payload.new as MatchRow));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
