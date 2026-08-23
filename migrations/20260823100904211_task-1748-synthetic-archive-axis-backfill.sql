-- Up Migration

-- ╔══════════════════════════════════════════════════════════════════════════════════════════╗
-- ║  NO-OP DELIBERADO. Esta migración se registró SIN EJECUTAR NADA. Léelo antes de tocarla.  ║
-- ╚══════════════════════════════════════════════════════════════════════════════════════════╝
--
-- QUÉ PASÓ (2026-08-23). El cuerpo se copió desde `docs/tasks/pending-migrations/` cortando las dos
-- primeras líneas para quitar el encabezado de aviso de esa carpeta. En el archivo anterior de la
-- cadena ese encabezado ocupaba dos líneas y el corte era correcto; en ÉSTE, la línea 1 era el
-- marker `-- Up Migration`. El corte se lo comió.
--
-- Sin ese marker, `node-pg-migrate` interpreta la sección Up como VACÍA: registra la migración en
-- `public.pgmigrations` y no ejecuta una sola sentencia. Es el bug class documentado en CLAUDE.md
-- (§Database — Migration markers) y en `ISSUE-068`, y falla **en silencio**: el log dice
-- «Migrations complete!» y el readback posterior es idéntico al previo.
--
-- POR QUÉ QUEDA COMO NO-OP EN VEZ DE CORREGIRSE EN SITIO. La fila ya está en `pgmigrations`, así que
-- este archivo NO se vuelve a ejecutar acá — corregirlo en sitio dejaría un entorno nuevo aplicando
-- el backfill dos veces (una por este archivo, otra por su reintento), y el guard del segundo
-- abortaría la cadena entera. Forward fix, que es lo que CLAUDE.md prescribe para una migración ya
-- registrada: el cuerpo real vive en la migración inmediatamente posterior,
-- `*_task-1748-synthetic-archive-axis-backfill-retry`.
--
-- NO borrar este archivo: su fila en `pgmigrations` existe, y un entorno nuevo necesita algo válido
-- que aplicar en su lugar dentro de la cadena.

SELECT 'TASK-1748: no-op registrado por marker perdido; el backfill real vive en la migracion siguiente' AS notice;

-- Down Migration

SELECT 'TASK-1748 no-op: nada que revertir' AS notice;
