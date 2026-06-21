---
name: handoff
description: Prepara la entrega de tu trabajo a otro rol. Revisa git status y diff, corre verificaciones disponibles y resume archivos, contratos, pruebas, riesgos y un commit sugerido. No hace commit ni push.
argument-hint: <rol destinatario 1-4>
disable-model-invocation: true
---

# /handoff

Procedimiento manual para entregar trabajo a otra persona del equipo de forma limpia y reproducible. **No hagas commit ni push.**

## Pasos

1. **Revisa el estado del árbol:**
   - `git status --short --branch`
   - `git diff` (cambios sin stage) y `git diff --staged`
   - `git diff --check` para detectar conflictos de whitespace.
2. **Ejecuta las verificaciones disponibles** según el módulo:
   - TypeScript: `tsc --noEmit` / lint del proyecto móvil.
   - Vision API: pruebas o `python -m pytest` si existen.
   - Cualquier script de verificación documentado en el rol.
   Reporta resultados reales (incluye fallos; no los ocultes).
3. **Verifica que no haya secretos** en el diff (llaves, tokens, contraseñas, service role, `.env`).
4. **Entrega un resumen estructurado:**
   - Archivos modificados y por qué.
   - Contratos tocados y si quedaron `DRAFT` o congelados.
   - Cómo probar en Android / contra servicios públicos.
   - Riesgos abiertos y trabajo pendiente.
   - Si hace falta un nuevo development build.
   - **Commit sugerido** (mensaje propuesto) — pero no lo ejecutes.
5. Si completaste una integración importante, recuerda actualizar `docs/status.md`.

## Restricciones

- No hagas commit ni push.
- No reformatees archivos ajenos al cambio.
- No alteres carpetas del rol destinatario sin coordinación previa.
