# Issue Tracker

Pipeline de incidentes operativos del portal.

## Convención

- Los issues usan `ISSUE-###` como ID estable.
- Los archivos viven en `docs/issues/{open,resolved}/`.
- Un issue se mueve a `resolved/` cuando se confirma la solución en el ambiente afectado.
- A diferencia de las tasks (`TASK-###`), los issues son reactivos: documentan un problema encontrado en runtime, no trabajo planificado.

## Estados

- `open`: incidente detectado, en diagnóstico o pendiente de solución.
- `resolved`: solución aplicada y verificada en el ambiente afectado.

## Plantilla

```markdown
# ISSUE-### — Título breve

## Ambiente
production | staging | preview

## Detectado
Fecha, canal de detección (Slack alert, Sentry, Admin Center, usuario)

## Síntoma
Qué se observa desde fuera.

## Causa raíz
Qué lo provoca a nivel técnico.

## Impacto
Qué funcionalidad está afectada y para quién.

## Solución
Qué se hizo o hay que hacer para resolverlo.

## Verificación
Cómo confirmar que se resolvió.

## Estado
open | resolved

## Relacionado
Tasks, docs de arquitectura, o commits relacionados.
```

## Siguiente ID disponible

`ISSUE-002`

## Open

(ninguno activo)

## Resolved

| ID | Título | Ambiente | Detectado | Resuelto | Causa |
|----|--------|----------|-----------|----------|-------|
| `ISSUE-001` | [SSL bad certificate en webhook-dispatch](resolved/ISSUE-001-ssl-bad-certificate-production.md) | production | 2026-03-30 | 2026-03-30 | `GREENHOUSE_POSTGRES_IP_TYPE` faltante en production |
