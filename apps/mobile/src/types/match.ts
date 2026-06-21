/**
 * Tipos de dominio para coincidencias (matches).
 *
 * Calcados de los contratos congelados:
 *   - docs/contracts/database-schema.md (tabla `matches`, enum match_status)
 *   - docs/contracts/vision-api.md (compatibility 0–100, componentes del score)
 *   - docs/contracts/mobile-data-access.md (`getMatches`, `setMatchStatus`)
 *
 * Regla de producto: `compatibility` es compatibilidad visual 0–100,
 * NUNCA probabilidad de identidad.
 */

/** match_status — database-schema.md */
export type MatchStatus =
  | 'suggested'
  | 'source_accepted'
  | 'source_rejected'
  | 'confirmed'
  | 'dismissed';

/** Estados que el cliente puede fijar vía `setMatchStatus` (mobile-data-access.md). */
export type SettableMatchStatus = 'source_accepted' | 'source_rejected';

export interface Match {
  id: string;
  sourceReportId: string;
  candidateReportId: string;
  status: MatchStatus;
  /** 0–100. Compatibilidad visual, NO probabilidad de identidad. */
  compatibility: number;
  visualScore?: number;
  geoScore?: number;
  attributeScore?: number;
  temporalScore?: number;
  rank?: number; // 1..3
  createdAt: string; // ISO 8601
}
