# Manual — Habilitar y verificar el portal SEO del cliente

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-08 por Claude (TASK-1310)
> **Ultima actualizacion:** 2026-08-08 por Claude (TASK-1310)
> **Modulo:** Growth / SEO (Search Visibility 360) — superficie **cliente**
> **Rutas en portal:** `/growth/seo` (dashboard) · `/growth/seo/report` (informe, con `?print=1` para imprimir)
> **Documentacion relacionada:** [doc funcional del modulo](../../documentation/growth/modulo-seo-search-visibility-360.md) · [asignar el modulo SEO a una organizacion](asignar-modulo-seo-organizacion.md) · [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)

## Para que sirve

Para que un cliente entre a su propio portal y vea **su** lectura de visibilidad en buscadores, sin
datos de nadie mas y sin la densidad del cockpit interno. Es la contraparte cliente de las cuatro
pantallas del operador (`/admin/growth/seo/*`): mismo motor, distinta profundidad.

Este manual cubre: como habilitarlo para una organizacion, que ve el cliente, como verificar que
quedo bien, y que hacer cuando no aparece.

> ⚠️ **Estado al 2026-08-08: construido, pendiente de rollout.** El codigo esta en `develop` pero la
> migracion de catalogo **no esta aplicada**. Hasta que se aplique, las rutas responden si las abres
> directo, pero el portal **no las compone en el menu**. La seccion "Rollout" de abajo tiene el orden
> exacto; no la saltes.

## Antes de empezar

Necesitas, en este orden:

1. **La organizacion con el modulo SEO asignado.** Si no lo tiene, primero corre
   [asignar el modulo SEO a una organizacion](asignar-modulo-seo-organizacion.md). Requiere un rol con
   `growth.seo.entitlement.manage` (solo `EFEONCE_ADMIN` o `EFEONCE_ACCOUNT`).
2. **Datos que mostrar.** La superficie no inventa: si la organizacion no tiene serie de Search
   Console ni capturas de ranking, el cliente vera estados vacios explicados, no un tablero en cero.
   Verifica primero con el cockpit interno `/admin/growth/seo`.
3. **Acceso SQL** si vas a aplicar o verificar la migracion (`pnpm pg:connect:shell`).

## Que ve el cliente

Un navegador de **tres secciones** en `/growth/seo`:

| Seccion | Que responde |
|---|---|
| **Resumen** | Como le va en busqueda hoy: la lectura dominante en una frase, la metrica principal y las senales que la acompanan. |
| **Evolucion** | Como se movio en el tiempo, con la **cobertura declarada** — cuantos dias del periodo tienen medicion real. Un hueco corta la linea; nunca se rellena con cero. |
| **Quadrant** | El cruce con AEO: donde esta su marca en el eje de busqueda clasica contra el de motores de respuesta. |

Y un **informe** en `/growth/seo/report` que puede leer en pantalla o imprimir/guardar como PDF
(`?print=1` cambia el render a la variante de adjunto).

**Lo que NO ve, por construccion:** costos de proveedor, cupos consumidos, tier comercial, ni datos de
otras organizaciones. Hay un test que falla si algo interno se filtra al informe — si tocas el modelo
del artefacto, ese test es el que te avisa.

## Rollout (una sola vez, en este orden)

El orden importa: la migracion siembra filas de catalogo que el codigo desplegado tiene que saber leer.

1. **Publica el codigo** (`git push` a `develop`) y espera el deploy de staging.
2. **Aplica la migracion de catalogo:**

   ```bash
   pnpm pg:connect:migrate
   ```

   Crea el modulo `seo_v2` con los dos `view_codes` de cliente
   (`cliente.growth_seo_dashboard`, `cliente.growth_seo_report`), supersede las asignaciones activas de
   `seo_v1` y registra denials explicitos por rol.

   > `pnpm pg:connect:status` **no aplica nada** — es dry-run, aunque imprima "Migrations complete!".

3. **Verifica que el modulo quedo sembrado:**

   ```sql
   SELECT module_key, view_codes
   FROM greenhouse_core.modules
   WHERE module_key = 'seo_v2';
   ```

   Debe devolver los dos view codes. Si devuelve cero filas, la migracion no corrio.

4. **Verifica con una sesion de cliente real** (ver abajo). No lo des por hecho con la sesion de
   operador: el operador ve otras rutas y otro menu.

## Como verificar que quedo bien

Usa la persona agente de cliente, no la de superadmin — el punto es probar el gate, y el superadmin lo
atraviesa por otras razones:

```bash
AGENT_AUTH_EMAIL=agent-client@greenhouse.efeoncepro.org AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs
```

Con esa sesion, revisa tres cosas:

1. **El menu compone SEO.** Debe aparecer bajo `Inicio`. Si la ruta responde pero el menu no la
   muestra, el problema es el catalogo (paso 2 del rollout), no el codigo.
2. **El dashboard carga con datos de esa organizacion y de ninguna otra.** Compara el numero principal
   contra el cockpit interno de la misma org.
3. **El informe imprime.** Abre `/growth/seo/report?print=1` y confirma que el layout cambia a la
   variante de adjunto (sin navegacion, con la procedencia de los datos visible).

## Que significan los estados que puede ver el cliente

| Lo que ve | Que significa | Que hacer |
|---|---|---|
| "SEO no esta activo en tu plan" | La organizacion no tiene el modulo asignado. | Es el estado correcto, no un error. Si deberia tenerlo, corre el manual de asignacion. |
| Seccion con dato faltante marcado como **sin dato** | No hay medicion para ese periodo. | Nada en la UI: revisa la conexion de Search Console o la captura de rankings de esa org. |
| Quadrant diciendo que "falta la mitad IA" | La org tiene lectura SEO pero no tiene run de AEO reportable. | Corre el grader AEO para esa org, o explicale al cliente que el eje IA todavia no esta medido. |
| Linea de evolucion con huecos | Hay dias sin medicion en el periodo. | Es honesto, no un bug. La cobertura declarada arriba del grafico dice cuantos dias hay. |

## Que no hacer

- **No abras el modulo por rol.** El acceso es **per-organizacion** (`module_assignment`), nunca
  `role_code`. Dar el viewCode a un rol cliente completo expondria SEO a organizaciones que no lo
  contrataron.
- **No edites `view_codes` de `seo_v1` in-place.** `modules.*` es append-only y el CHECK lo rechaza;
  por eso existe `seo_v2`.
- **No uses la persona agente superadmin para validar el gate.** Atraviesa por otras razones y te
  daria un falso verde.
- **No agregues secciones nuevas al navegador cliente dentro de esta task.** La cuarta seccion
  (Auditoria) tiene su propia task reservada; sumarla aca reinicia la verificacion de la ultima milla.

## Problemas comunes

**La ruta responde pero no aparece en el menu.**
El catalogo no tiene las filas. Verifica el paso 2 del rollout con el SELECT sobre
`greenhouse_core.modules`.

**El cliente ve "SEO no esta activo en tu plan" y si lo contrato.**
Su organizacion tiene el assignment sobre `seo_v1` pero la migracion no lo supersedio a `seo_v2`, o el
assignment quedo revocado. Revisa `greenhouse_core.module_assignments` filtrando por su
`organization_id`.

**El dashboard carga vacio en todas las secciones.**
No es la superficie: es que esa org no tiene datos. Confirma en `/admin/growth/seo` con la misma org
antes de tocar nada del portal cliente.

**El informe se ve igual con y sin `?print=1`.**
El parametro no llego al render. Confirma que la URL lo lleva y que no hay un redirect intermedio que
lo borre.

## Referencias tecnicas

- Vistas: `src/views/greenhouse/growth/seo/client/`
- Artefacto del informe: `src/components/growth/seo/report-artifact/` (render adapter del
  `ReportArtifactModel` compartido con AEO — no lo forkea)
- Gate de entitlement: `src/lib/growth/seo/entitlement.ts`
- Migracion de catalogo: `migrations/20260808131441444_task-1310-seo-client-view-codes.sql`
- Arquitectura: [`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §10.7
