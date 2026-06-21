import type { CreateReportInput, Report } from '../../types/report';
import { mockReports } from './mocks';

/**
 * Capa de acceso a datos de reportes.
 *
 * La interfaz es espejo de las firmas congeladas en
 * docs/contracts/mobile-data-access.md (sección "Reportes"). Los componentes
 * visuales NUNCA llaman a Supabase: hablan con este servicio.
 *
 * Esta es la implementación MOCK (sin backend). Rol 2 sustituye la
 * implementación por Supabase detrás de la misma interfaz `ReportService`,
 * sin que la UI cambie.
 */

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

export interface ReportService {
  getPublicReports(filter?: ReportFilter): Promise<Report[]>;
  getReportById(id: string): Promise<Report>;
  createReport(input: CreateReportInput): Promise<Report>;
}

const MOCK_DELAY_MS = 600;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Genera un id pseudo-único sólo para la fase mock. */
function mockId(): string {
  return `rep-${Math.random().toString(36).slice(2, 10)}`;
}

export const reportService: ReportService = {
  async getPublicReports(filter?: ReportFilter): Promise<Report[]> {
    await delay(MOCK_DELAY_MS);
    let result = mockReports;
    if (filter?.type) result = result.filter((r) => r.type === filter.type);
    if (filter?.status) result = result.filter((r) => r.status === filter.status);
    return result;
  },

  async getReportById(id: string): Promise<Report> {
    await delay(MOCK_DELAY_MS);
    const report = mockReports.find((r) => r.id === id);
    if (!report) {
      throw new ServiceError('NOT_FOUND', 'Reporte no encontrado');
    }
    return report;
  },

  async createReport(input: CreateReportInput): Promise<Report> {
    await delay(MOCK_DELAY_MS);

    // Validación mínima local (el backend real revalida + RLS).
    if (!input.title.trim()) {
      throw new ServiceError('VALIDATION', 'El título es obligatorio');
    }
    if (!input.location) {
      throw new ServiceError('VALIDATION', 'Falta la ubicación GPS actual');
    }

    const now = new Date().toISOString();
    const created: Report = {
      id: mockId(),
      authorId: 'mock-user',
      type: input.type,
      status: 'open',
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      species: input.species?.trim() || undefined,
      attributes: input.attributes,
      location: input.location,
      isPublic: true,
      createdAt: now,
      updatedAt: now,
    };
    return created;
  },
};
