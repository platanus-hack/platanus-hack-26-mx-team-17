import type { Report } from '../../types/report';

/**
 * Datos mock de reportes para la fase de UI sin backend.
 * Se reemplazan por datos reales de Supabase (Rol 2) detrás del mismo
 * `reportService`. Coordenadas en CDMX para que el mapa (Rol 1) tenga contexto.
 */
export const mockReports: Report[] = [
  {
    id: 'rep-001',
    authorId: 'user-ana',
    type: 'lost',
    status: 'open',
    title: 'Luna — perrita café perdida',
    description: 'Mestiza tamaño mediano, collar rojo. Se perdió cerca del parque.',
    species: 'perro',
    attributes: { color: 'café', size: 'mediano', breed: 'mestizo' },
    location: {
      lat: 19.4326,
      lng: -99.1332,
      accuracyM: 12,
      capturedAt: '2026-06-20T17:30:00.000Z',
    },
    isPublic: true,
    createdAt: '2026-06-20T17:31:00.000Z',
    updatedAt: '2026-06-20T17:31:00.000Z',
  },
  {
    id: 'rep-002',
    authorId: 'user-beto',
    type: 'sighting',
    status: 'open',
    title: 'Avistamiento de perrita café',
    description: 'Vi una perrita parecida cerca del metro, asustada.',
    species: 'perro',
    attributes: { color: 'café', size: 'mediano' },
    location: {
      lat: 19.4271,
      lng: -99.1276,
      accuracyM: 18,
      capturedAt: '2026-06-20T18:05:00.000Z',
    },
    isPublic: true,
    createdAt: '2026-06-20T18:06:00.000Z',
    updatedAt: '2026-06-20T18:06:00.000Z',
  },
  {
    id: 'rep-003',
    authorId: 'user-cris',
    type: 'injured',
    status: 'possible_match',
    title: 'Gato herido en la colonia',
    description: 'Gato gris con cojera, necesita atención.',
    species: 'gato',
    attributes: { color: 'gris', size: 'pequeño' },
    location: {
      lat: 19.4401,
      lng: -99.1401,
      accuracyM: 9,
      capturedAt: '2026-06-20T16:10:00.000Z',
    },
    isPublic: true,
    createdAt: '2026-06-20T16:12:00.000Z',
    updatedAt: '2026-06-20T16:40:00.000Z',
  },
];
