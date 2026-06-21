import { useCallback, useRef, useState } from 'react';

import type {
  CreateReportInput,
  Report,
  ReportLocation,
  ReportType,
} from '../../types/report';
import { reportService, storageService, ServiceError } from './reportService';

export type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

interface FormFields {
  type: ReportType | null;
  title: string;
  description: string;
  species: string;
  color: string;
  size: string;
  breed: string;
}

interface FieldErrors {
  type?: string;
  title?: string;
  location?: string;
}

const INITIAL_FIELDS: FormFields = {
  type: null,
  title: '',
  description: '',
  species: '',
  color: '',
  size: '',
  breed: '',
};

/**
 * Estado y validación del formulario de creación de reporte.
 *
 * La UBICACIÓN no se gestiona aquí (regla "sólo GPS actual"): se inyecta al
 * enviar. En la fase mock viene de `getMockCurrentLocation()`; luego de
 * `getCurrentReportLocation()` (Rol 1). El envío pasa por `reportService`
 * (mock hoy, Supabase después).
 */
export function useCreateReportForm() {
  const [fields, setFields] = useState<FormFields>(INITIAL_FIELDS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const setField = useCallback(
    <K extends keyof FormFields>(key: K, value: FormFields[K]) => {
      setFields((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const validate = useCallback(
    (location: ReportLocation | null): FieldErrors => {
      const next: FieldErrors = {};
      if (!fields.type) next.type = 'Selecciona un tipo de reporte';
      if (!fields.title.trim()) next.title = 'El título es obligatorio';
      if (!location) next.location = 'Falta la ubicación GPS actual';
      return next;
    },
    [fields.type, fields.title],
  );

  const buildInput = useCallback(
    (location: ReportLocation): CreateReportInput => {
      const attributes = {
        ...(fields.color.trim() ? { color: fields.color.trim() } : {}),
        ...(fields.size.trim() ? { size: fields.size.trim() } : {}),
        ...(fields.breed.trim() ? { breed: fields.breed.trim() } : {}),
      };
      return {
        // `type` validado como no-nulo antes de llamar a buildInput.
        type: fields.type as ReportType,
        title: fields.title.trim(),
        description: fields.description.trim() || undefined,
        species: fields.species.trim() || undefined,
        attributes: Object.keys(attributes).length ? attributes : undefined,
        location,
      };
    },
    [fields],
  );

  const submit = useCallback(
    async (location: ReportLocation | null, photoUri: string | null): Promise<Report | null> => {
      if (submittingRef.current) return null; // bloquea doble toque
      const validationErrors = validate(location);
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0 || !location) {
        return null;
      }

      submittingRef.current = true;
      setStatus('submitting');
      setSubmitError(null);
      try {
        const report = await reportService.createReport(buildInput(location));
        if (photoUri) {
          await storageService.uploadReportImage({
            reportId: report.id,
            fileUri: photoUri,
            isPrimary: true,
          });
        }
        setStatus('success');
        return report;
      } catch (error) {
        setStatus('error');
        const msg = error instanceof ServiceError
          ? `[${error.code}] ${error.message}`
          : error instanceof Error
            ? error.message
            : 'No se pudo crear el reporte. Intenta de nuevo.';
        setSubmitError(msg);
        return null;
      } finally {
        submittingRef.current = false;
      }
    },
    [validate, buildInput],
  );

  const reset = useCallback(() => {
    setFields(INITIAL_FIELDS);
    setErrors({});
    setStatus('idle');
    setSubmitError(null);
  }, []);

  return { fields, errors, status, submitError, setField, submit, reset };
}
