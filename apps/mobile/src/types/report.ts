/**
 * Tipos de dominio para reportes.
 *
 * Calcados de los contratos congelados:
 *   - docs/contracts/database-schema.md  (tabla `reports`, `report_images`, enums)
 *   - docs/contracts/mobile-data-access.md (firmas `createReport`, `getPublicReports`, ...)
 *
 * Convención: el dominio móvil usa camelCase (consistente con los ejemplos de
 * salida del contrato de acceso a datos: `storagePath`, `isPrimary`, ...).
 * El mapeo desde las columnas snake_case de Postgres ocurre en la capa de
 * servicio (Rol 2). NO inventar campos fuera del contrato.
 */

/** report_type — database-schema.md */
export type ReportType = 'lost' | 'sighting' | 'injured' | 'abandoned';

/** report_status — database-schema.md */
export type ReportStatus =
  | 'open'
  | 'possible_match'
  | 'tracking'
  | 'rescue_in_progress'
  | 'resolved'
  | 'cancelled';

/**
 * Ubicación de un reporte. SÓLO GPS actual (regla de producto):
 * nunca se elige, edita ni arrastra manualmente.
 * Origen previsto: `getCurrentReportLocation()` (Rol 1 / tracking).
 */
export interface ReportLocation {
  lat: number;
  lng: number;
  accuracyM: number;
  capturedAt: string; // ISO 8601
}

/**
 * Atributos declarados del animal (columna `attributes` jsonb).
 * Alimentan el componente "attributes" del score de la Vision API.
 */
export interface ReportAttributes {
  color?: string;
  size?: string; // p. ej. pequeño / mediano / grande
  breed?: string; // raza estimada
}

export interface Report {
  id: string;
  authorId: string;
  type: ReportType;
  status: ReportStatus;
  title: string;
  description?: string;
  species?: string; // p. ej. perro, gato
  attributes?: ReportAttributes;
  location: ReportLocation;
  isPublic: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Entrada para crear un reporte — espejo exacto de `createReport(input)`
 * en mobile-data-access.md. `location` es SÓLO GPS actual.
 */
export interface CreateReportInput {
  type: ReportType;
  title: string;
  description?: string;
  species?: string;
  attributes?: ReportAttributes;
  location: ReportLocation;
}

/** report_images — database-schema.md / `uploadReportImage` output */
export interface ReportImage {
  id: string;
  reportId: string;
  storagePath: string;
  isPrimary: boolean;
  width?: number;
  height?: number;
}
