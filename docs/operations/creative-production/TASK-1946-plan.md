# TASK-1946 — plan de ejecución SKY

Parte del goal multimarcas/multipersona confirmado por Julio. SKY es el primer sistema independiente;
el motor neutral sigue en TASK-1945. Task-hook ejecutado en `develop`, sin subagentes ni worktrees.

1. Capturar inventario Figma y cerrar aliases, conservando IDs y digest de snapshot.
2. Preparar tres paquetes candidatos SKY con versiones exactas y procedencia del SVG oficial.
3. Validar el ZIP Metric aportado por Julio; mantener binarios fuera de repositorios y publicar sólo metadata.
4. Probar integridad, contrato y builds deterministas; registrar disponibilidad local y rollout remoto pendiente.

Implementación local: `/Users/jreye/Documents/sky-brand-system`. Build y cuatro pruebas pasan.
Evidencia: `sky-airline/PACKAGE_CANDIDATE_EVIDENCE.md` y `sky-airline/font-provenance.json`.
Distribución privada, referencia web, fotografía, composición y wrappers operativos son unidades siguientes.
