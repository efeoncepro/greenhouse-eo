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

> ⚠️ **Estado al 2026-08-08: catalogo aplicado; falta verificar con sesion de cliente.** El codigo
> esta publicado y desplegado a staging, y la migracion de catalogo ya corrio: `seo_v2` existe con
> sus dos viewCodes y las dos organizaciones habilitadas. La seccion "Rollout" de abajo queda como
> runbook para el proximo entorno — y con una adicion que costo una caida de produccion, lee la nota
> del paso 2.

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
   (`cliente.growth_seo_dashboard`, `cliente.growth_seo_report`), asigna las organizaciones
   preservando tier/metadata y registra denials explicitos por rol. La migracion que le sigue
   (`…-reopen-seo-module-cutover-window`) deja **ambas claves vigentes** durante la ventana: eso es
   deliberado y es lo que evita la caida descrita abajo.

   > `pnpm pg:connect:status` **no aplica nada** — es dry-run, aunque imprima "Migrations complete!".

   > 🔴 **Antes de aplicar una migracion de cutover, mira que clave lee el codigo de CADA runtime.**
   > El 2026-08-08 esta migracion tumbo SEO en produccion durante ~25 minutos: supersede `seo_v1` en
   > el mismo paso en que crea `seo_v2`, y Vercel produccion todavia corria `main`, que pide `seo_v1`.
   > Hay **cinco runtimes con despliegues independientes** (Vercel produccion, Vercel staging y tres
   > Cloud Run); "lo desplegue a develop" no es "lo desplegue". Detalle: `ISSUE-143`.

3. **Verifica que el modulo quedo sembrado:**

   ```sql
   SELECT module_key, view_codes
   FROM greenhouse_client_portal.modules
   WHERE module_key LIKE 'seo_v%';
   ```

   `seo_v2` debe traer los dos view codes. Si devuelve cero filas, la migracion no corrio.

   Y revisa que la ventana este **simetrica** — ambas claves cubriendo las mismas organizaciones:

   ```sql
   SELECT module_key, COUNT(*)
   FROM greenhouse_client_portal.module_assignments
   WHERE module_key LIKE 'seo_v%' AND effective_to IS NULL AND status IN ('active','pilot')
   GROUP BY module_key;
   ```

4. **Verifica con el consumidor real, no con un `SELECT`.** La base es la mitad del contrato; la
   otra mitad es que version de codigo la esta leyendo cada runtime. Para este modulo el consumidor
   real es el canary del provider contra el host de produccion. Un `SELECT` te va a decir exactamente
   lo que el SQL prometia, aunque produccion este caida.

5. **Verifica con una sesion de cliente real** (ver abajo). No lo des por hecho con la sesion de
   operador: el operador ve otras rutas y otro menu.

## Como verificar que quedo bien

Usa la persona agente de cliente, no la de superadmin — el punto es probar el gate, y el superadmin lo
atraviesa por otras razones:

```bash
AGENT_AUTH_EMAIL=agent-client@greenhouse.efeoncepro.org AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs
```

Con esa sesion, revisa tres cosas:

1. **El menu compone SEO.** ⚠️ **Hoy NO lo hace, y no es tu catalogo.** Verificado el 2026-08-08 con
   sesion de Grupo Berel: la ruta responde y muestra datos reales, pero el menu del portal cliente es
   una lista hardcodeada de 7 items donde SEO no esta, y su unico bloque dinamico se alimenta de
   `businessLines`/`serviceModules`, no de `module_assignments`. El resolver canonico existe pero solo
   lo usa un mockup. Mientras eso no se cablee, el cliente llega **por enlace directo** o desde el
   cross-link de su informe AEO. No pierdas tiempo revisando el seed: no es ahi.
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
Primero descarta lo barato: el catalogo (paso 3 del rollout). Pero si el catalogo esta bien, **el
menu del portal cliente no compone modulos**: es una lista hardcodeada en `VerticalMenu.tsx` filtrada
por `canSeeView('cliente.*')`, y su bloque dinamico se alimenta de otro sistema. Cablear el resolver
canonico module-based es una task derivada de TASK-827 pendiente. Hasta entonces, el acceso es por
enlace directo.

**El cliente ve "SEO no esta activo en tu plan" y si lo contrato.**
Casi siempre es la ventana del cutover: su organizacion tiene assignment en una clave y el runtime que
la atiende lee la otra. Revisa `greenhouse_client_portal.module_assignments` filtrando por su
`organization_id` y compara contra `SEO_MODULE_KEYS_READ` en `src/lib/growth/seo/entitlement.ts` —
**de la version desplegada en ESE runtime**, no de tu working tree.

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
- Migracion de catalogo: `migrations/20260808131441444_task-1310-seo-client-view-codes.sql` +
  `migrations/20260808184512073_task-1310-reopen-seo-module-cutover-window.sql` (reabre la ventana y
  hornea el invariante de simetria)
- Incidente del cutover: [`ISSUE-143`](../../issues/resolved/ISSUE-143-seo-module-cutover-expand-contract-collapsed.md)
- Arquitectura: [`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §10.7
