---
name: start-task
description: Arranca una tarea de un rol del equipo. Revisa rama, CLAUDE.md, status, documento de rol y contratos, inspecciona el código y entrega un plan corto antes de tocar archivos.
argument-hint: <número-de-rol 1-4> <descripción de la tarea>
disable-model-invocation: true
---

# /start-task

Procedimiento manual para iniciar una tarea con el contexto correcto. **No modifiques archivos hasta recibir aprobación explícita.**

## Pasos

1. **Confirma la rama.** Ejecuta `git status --short --branch`. La rama debe corresponder al rol:
   - Rol 1 → `feat/mapbox-gps`
   - Rol 2 → `feat/auth-chat-supabase`
   - Rol 3 → `feat/vision-api`
   - Rol 4 → `feat/reports-integration-release`
   Si no coincide, detente y avisa antes de continuar.
2. **Lee el contexto base:**
   - `CLAUDE.md`
   - `docs/status.md`
   - `docs/roles/0<N>-*.md` (el rol indicado)
   - Los contratos que ese rol declara como lectura obligatoria.
3. **Inspecciona el código existente** en las rutas bajo responsabilidad del rol. No abras carpetas de otros sin justificarlo.
4. **Detecta conflictos** con módulos ajenos y contratos en estado `DRAFT` (no implementes lógica dependiente sobre un contrato sin congelar).
5. **Entrega un plan corto** que incluya:
   - Objetivo de la tarea en una frase.
   - Lista exacta de archivos a crear o modificar.
   - Contratos involucrados y su estado.
   - Riesgos y posibles conflictos con otras personas.
6. **Espera aprobación.** No edites código hasta que el usuario apruebe el plan.

## Restricciones

- No hagas commit ni push.
- No reformatees archivos ajenos.
- No instales dependencias salvo que el plan aprobado lo indique.
