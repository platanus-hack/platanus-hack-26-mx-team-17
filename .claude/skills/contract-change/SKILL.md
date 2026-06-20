---
name: contract-change
description: Analiza un cambio propuesto a un contrato compartido. Identifica consumidores, evalúa migraciones, compatibilidad y riesgos. No implementa nada sin aprobación del equipo.
argument-hint: <contrato> <cambio propuesto>
disable-model-invocation: true
---

# /contract-change

Procedimiento manual para evaluar un cambio a una fuente de verdad compartida en `docs/contracts/`. **Un contrato no se cambia unilateralmente.**

## Contratos cubiertos

- `docs/contracts/database-schema.md`
- `docs/contracts/mobile-data-access.md`
- `docs/contracts/vision-api.md`
- `docs/contracts/realtime-events.md`
- `docs/contracts/auth-deeplinks.md`

## Pasos

1. **Lee el contrato actual** y su `STATUS` (DRAFT o congelado).
2. **Identifica todos los consumidores** del contrato:
   - Cruza con los documentos de `docs/roles/` para saber qué personas lo leen.
   - Busca en el código las firmas, tablas, eventos o endpoints afectados.
3. **Analiza el impacto:**
   - ¿Requiere migración de base de datos? ¿Es retrocompatible?
   - ¿Rompe tipos en `apps/mobile/src/types/`?
   - ¿Afecta RLS, Realtime, deep links o el contrato de la Vision API?
   - Riesgos de integración y orden de despliegue.
4. **Propón el cambio completo**, recordando que todo cambio aprobado exige:
   - Actualizar el documento del contrato.
   - Actualizar tipos.
   - Actualizar migración si aplica.
   - Informar a los módulos consumidores.
5. **Espera aprobación del equipo.** No implementes el cambio en código ni en el documento hasta que se apruebe.

## Restricciones

- No edites el contrato ni el código sin aprobación.
- No hagas commit ni push.
