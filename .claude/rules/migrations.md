---
paths:
  - "migrations/**"
---

# DB migrations — invariantes (auto-load por path)

Toda migration empieza con `-- Up Migration` exacto; DDL (CREATE/ALTER/INDEX/FUNCTION) **solo** en Up; el marker `-- Down Migration` es **solo** para undo (DROP/ALTER…DROP). **NUNCA** poner CREATE bajo Down (bug class ISSUE-068). **SIEMPRE** incluir un DO block anti pre-up-marker que aborte si el objeto esperado no quedó creado. **NUNCA** editar una migration ya aplicada (forward-fix con migration nueva idempotente). Detalle: CLAUDE.md §"Database — Migration markers".

**Una sola base compartida + seeds reconciliados: el código va PRIMERO (TASK-1306).** Hay UNA instancia Cloud SQL (`greenhouse-pg-dev`) con UNA base (`greenhouse_app`) para dev, staging y producción — una migración aplicada desde local es un cambio productivo inmediato. Y algunas tablas de gobernanza las reconcilia un proceso en runtime contra un catálogo TS: `syncViewRegistryCatalog` (`src/lib/admin/view-access-store.ts`) corre `UPDATE greenhouse_core.view_registry SET active = FALSE WHERE view_code <> ALL($catalogoTS)`, así que **todo `view_code` ausente del catálogo del código EN EJECUCIÓN queda apagado**, aunque una migración lo haya sembrado minutos antes. **NUNCA** aplicar el seed de un `viewCode` nuevo antes de que el código que lo declara esté desplegado en todos los entornos que comparten la base (producción incluida): orden seguro **promover el código → migrar después**. **SIEMPRE** que una fila aparezca `active = false` con `updated_by = 'system'` sin intervención humana, sospechar del reconciliador, no de la migración. Detalle: `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` → §"View Registry — el seed se AUTO-REVIERTE si el código no está desplegado".
