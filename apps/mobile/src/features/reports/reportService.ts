import { supabase } from '../../lib/supabase';
import type {
  CreateReportInput,
  Report,
  ReportAttributes,
  ReportImage,
  ReportStatus,
  ReportType,
} from '../../types/report';
import type { ReportUpdate } from '../../types/reportUpdate';

/** Códigos de error del contrato (mobile-data-access.md). */
export type ServiceErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'NETWORK'
  | 'UNKNOWN';

export class ServiceError extends Error {
  constructor(
    public code: ServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export interface ReportFilter {
  type?: Report['type'];
  status?: Report['status'];
}

export interface UpdateReportStatusInput {
  reportId: string;
  status: ReportStatus;
}

export interface ReportService {
  getPublicReports(filter?: ReportFilter): Promise<Report[]>;
  getReportById(id: string): Promise<Report>;
  createReport(input: CreateReportInput): Promise<Report>;
  updateReportStatus(input: UpdateReportStatusInput): Promise<Report>;
}

export interface UploadImageInput {
  reportId: string;
  fileUri: string;
  isPrimary?: boolean;
}

export interface StorageService {
  uploadReportImage(input: UploadImageInput): Promise<ReportImage>;
  getReportImageUrl(storagePath: string): Promise<string>;
  getPrimaryImage(reportId: string): Promise<ReportImage | null>;
}

// Fila de Postgres en snake_case
interface ReportRow {
  id: string;
  author_id: string;
  type: ReportType;
  status: ReportStatus;
  title: string;
  description: string | null;
  species: string | null;
  attributes: ReportAttributes | null;
  lat: number;
  lng: number;
  location_accuracy_m: number;
  location_captured_at: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface ReportImageRow {
  id: string;
  report_id: string;
  storage_path: string;
  is_primary: boolean;
  width: number | null;
  height: number | null;
}

function mapReport(row: ReportRow): Report {
  return {
    id: row.id,
    authorId: row.author_id,
    type: row.type,
    status: row.status,
    title: row.title,
    description: row.description ?? undefined,
    species: row.species ?? undefined,
    attributes: row.attributes ?? undefined,
    location: {
      lat: row.lat,
      lng: row.lng,
      accuracyM: row.location_accuracy_m,
      capturedAt: row.location_captured_at,
    },
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReportImage(row: ReportImageRow): ReportImage {
  return {
    id: row.id,
    reportId: row.report_id,
    storagePath: row.storage_path,
    isPrimary: row.is_primary,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
  };
}

function mapSupabaseError(error: { code?: string; message: string }): ServiceError {
  const msg = error.message;
  if (error.code === 'PGRST116') {
    return new ServiceError('NOT_FOUND', 'Reporte no encontrado');
  }
  if (error.code === '42501' || msg.includes('RLS')) {
    return new ServiceError('FORBIDDEN', 'Sin permiso para esta operación');
  }
  if (msg.includes('JWT') || msg.includes('not authenticated') || msg.includes('anon')) {
    return new ServiceError('UNAUTHENTICATED', 'Debes iniciar sesión para realizar esta acción');
  }
  return new ServiceError('NETWORK', msg);
}

export const reportService: ReportService = {
  async getPublicReports(filter?: ReportFilter): Promise<Report[]> {
    let query = supabase
      .from('reports')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (filter?.type) query = query.eq('type', filter.type);
    if (filter?.status) query = query.eq('status', filter.status);

    const { data, error } = await query;
    if (error) throw mapSupabaseError(error);
    return (data as ReportRow[]).map(mapReport);
  },

  async getReportById(id: string): Promise<Report> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw mapSupabaseError(error);
    return mapReport(data as ReportRow);
  },

  async updateReportStatus(input: UpdateReportStatusInput): Promise<Report> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new ServiceError('UNAUTHENTICATED', 'Debes iniciar sesión');
    }

    const { data, error } = await supabase
      .from('reports')
      .update({ status: input.status })
      .eq('id', input.reportId)
      .select()
      .single();

    if (error) throw mapSupabaseError(error);
    return mapReport(data as ReportRow);
  },

  async createReport(input: CreateReportInput): Promise<Report> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new ServiceError('UNAUTHENTICATED', 'Debes iniciar sesión para crear un reporte');
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({
        author_id: user.id,
        type: input.type,
        status: 'open',
        title: input.title,
        description: input.description ?? null,
        species: input.species ?? null,
        attributes: input.attributes ?? null,
        lat: input.location.lat,
        lng: input.location.lng,
        location_accuracy_m: input.location.accuracyM,
        location_captured_at: input.location.capturedAt,
        is_public: true,
      })
      .select()
      .single();

    if (error) throw mapSupabaseError(error);
    return mapReport(data as ReportRow);
  },
};

export const storageService: StorageService = {
  async getReportImageUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('report-images')
      .createSignedUrl(storagePath, 3600);
    if (error) throw mapSupabaseError(error);
    return data.signedUrl;
  },

  async getPrimaryImage(reportId: string): Promise<ReportImage | null> {
    const { data, error } = await supabase
      .from('report_images')
      .select('*')
      .eq('report_id', reportId)
      .eq('is_primary', true)
      .maybeSingle();

    if (error) throw mapSupabaseError(error);
    if (!data) return null;

    const row = data as {
      id: string;
      report_id: string;
      storage_path: string;
      is_primary: boolean;
      width: number | null;
      height: number | null;
    };
    return {
      id: row.id,
      reportId: row.report_id,
      storagePath: row.storage_path,
      isPrimary: row.is_primary,
      width: row.width ?? undefined,
      height: row.height ?? undefined,
    };
  },

  async uploadReportImage(input: UploadImageInput): Promise<ReportImage> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new ServiceError('UNAUTHENTICATED', 'Debes iniciar sesión para subir imágenes');
    }

    const ext = input.fileUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${Date.now()}.${ext}`;
    const storagePath = `${input.reportId}/${fileName}`;
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

    // Subir directo al REST API de Supabase Storage con FormData nativo
    // (el JS client tiene un bug de Blob en Hermes/React Native)
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    const formData = new FormData();
    // React Native / Hermes: el objeto { uri, name, type } es la forma nativa de adjuntar archivos.
    // La clave vacía '' no está soportada — se usa 'file'.
    formData.append('file', { uri: input.fileUri, name: fileName, type: contentType } as unknown as File);

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/report-images/${storagePath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ''}`,
          'x-upsert': 'false',
        },
        body: formData,
      },
    );

    const uploadError = uploadRes.ok ? null : { message: `Upload failed: ${uploadRes.status}` };

    if (uploadError) throw mapSupabaseError(uploadError);

    const { data, error } = await supabase
      .from('report_images')
      .insert({
        report_id: input.reportId,
        storage_path: storagePath,
        is_primary: input.isPrimary ?? true,
      })
      .select()
      .single();

    if (error) throw mapSupabaseError(error);
    return mapReportImage(data as ReportImageRow);
  },
};

// ---------------------------------------------------------------------------
// Realtime y actualizaciones de reporte
// ---------------------------------------------------------------------------

interface ReportUpdateRow {
  id: string;
  report_id: string;
  author_id: string | null;
  kind: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function mapReportUpdate(row: ReportUpdateRow): ReportUpdate {
  return {
    id: row.id,
    reportId: row.report_id,
    authorId: row.author_id ?? undefined,
    kind: row.kind,
    body: row.body ?? undefined,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
  };
}

export const realtimeService = {
  subscribeToReports(callback: (report: Report) => void): () => void {
    const channel = supabase
      .channel('public-reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports', filter: 'is_public=eq.true' },
        (payload) => {
          callback(mapReport(payload.new as ReportRow));
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  },

  async getReportUpdates(reportId: string): Promise<ReportUpdate[]> {
    const { data, error } = await supabase
      .from('report_updates')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });

    if (error) throw mapSupabaseError(error);
    return (data as ReportUpdateRow[]).map(mapReportUpdate);
  },

  subscribeToReportUpdates(
    reportId: string,
    callback: (update: ReportUpdate) => void,
  ): () => void {
    const channel = supabase
      .channel(`report-updates-${reportId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'report_updates',
          filter: `report_id=eq.${reportId}`,
        },
        (payload) => {
          callback(mapReportUpdate(payload.new as ReportUpdateRow));
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  },
};
