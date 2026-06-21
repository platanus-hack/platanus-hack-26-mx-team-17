import { reportTypeColors } from '../../theme/tokens';
import type { ReportStatus, ReportType } from '../../types/report';

/** Etiquetas en español para report_type (database-schema.md). */
export const reportTypeLabels: Record<ReportType, string> = {
  lost: 'Perdido',
  sighting: 'Avistamiento',
  injured: 'Herido',
  abandoned: 'Abandonado',
};

/** Etiquetas en español para report_status (database-schema.md). */
export const reportStatusLabels: Record<ReportStatus, string> = {
  open: 'Abierto',
  possible_match: 'Posible coincidencia',
  tracking: 'En seguimiento',
  rescue_in_progress: 'Rescate en curso',
  resolved: 'Resuelto',
  cancelled: 'Cancelado',
};

export const reportTypeColor = reportTypeColors;

/** Opciones ordenadas para el selector de tipo en el formulario. */
export const reportTypeOptions: { label: string; value: ReportType }[] = [
  { label: reportTypeLabels.lost, value: 'lost' },
  { label: reportTypeLabels.sighting, value: 'sighting' },
  { label: reportTypeLabels.injured, value: 'injured' },
  { label: reportTypeLabels.abandoned, value: 'abandoned' },
];
