# Manual — Habilitar y verificar el portal SEO del cliente

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.2
> **Creado:** 2026-08-08 por Claude (TASK-1310)
> **Ultima actualizacion:** 2026-08-09 por Claude (el menu del portal cliente ya compone modulos: SEO aparece solo)
> **Modulo:** Growth / SEO (Search Visibility 360) — superficie **cliente**
> **Rutas en portal:** `/growth/seo` (dashboard) · `/growth/seo/report` (informe, con `?print=1` para imprimir)
> **Documentacion relacionada:** [doc funcional del modulo](../../documentation/growth/modulo-seo-search-visibility-360.md) · [asignar el modulo SEO a una organizacion](asignar-modulo-seo-organizacion.md) · [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)

## Para que sirve

Para que un cliente entre a su propio portal y vea **su** lectura de visibilidad en buscadores, sin
datos de nadie mas y sin la densidad del cockpit interno. Es la contraparte cliente de las cuatro
pantallas del operador (`/admin/growth/seo/*`): mismo motor, distinta profundidad.

Este manual cubre: como habilitarlo para una organizacion, que ve el cliente, como verificar que
quedo bien, y que hacer cuando no aparece.

> ⚠️ **Estado al 2026-08-09: catalogo aplicado y codigo en produccion.** `seo_v2` existe con sus dos
> viewCodes y las dos organizaciones habilitadas, y desde el release `49f86c98cda6` el runtime **lee y
> escribe solo `seo_v2`** (TASK-1677 Slice 1: `SEO_MODULE_KEYS_READ = ['seo_v2']`, la ventana de
> dual-read ya no existe en codigo). La superficie cliente quedo verificada con sesion de Grupo Berel
> el 2026-08-08 — ver "Como verificar que quedo bien".
>
> 🔴 **El cutover NO esta terminado: los datos siguen abiertos.** Los assignments `seo_v1` siguen
> vigentes en la base; la migracion que los supersede tiene dueño (`TASK-1677` Slice 2) y todavia no
> se aplico. Consecuencia practica para este manual: **toda alta nueva se escribe con `seo_v2`**. Un
> assignment creado bajo `seo_v1` hoy queda en la base y **no existe para el runtime** — la
> organizacion veria "SEO no esta activo en tu plan" sin ningun error visible.
>
> La seccion "Rollout" de abajo queda como runbook para el proximo entorno — y con una adicion que
> costo una caida de produccion, lee la nota del paso 2.

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

   > **Al 2026-08-09 esa ventana esta cerrada del lado del codigo** (lee solo `seo_v2`) y abierta del
   > lado de los datos. En un entorno nuevo, esto se traduce en una sola regla: la migracion de
   > catalogo tiene que haber corrido **antes** de que el runtime atienda trafico, porque ya no hay
   > clave vieja de respaldo.

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

   Y revisa la cobertura por clave:

   ```sql
   SELECT module_key, COUNT(*)
   FROM greenhouse_client_portal.module_assignments
   WHERE module_key LIKE 'seo_v%' AND effective_to IS NULL AND status IN ('active','pilot')
   GROUP BY module_key;
   ```

   Que esperar segun la fase: mientras el codigo tenia dual-read, la ventana debia estar
   **simetrica** (ambas claves cubriendo las mismas organizaciones). Desde 2026-08-09 el codigo lee
   solo `seo_v2`, asi que lo que hay que verificar es mas simple y mas duro: **`seo_v2` cubre a todas
   las organizaciones que deben tener SEO**. Una fila `seo_v1` de mas ya no rompe nada; una `seo_v2`
   de menos apaga el modulo para esa organizacion.

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
AGENT_AUTH_EMAIL=agent-client@greenhouse.efeonce.org AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs
```

> **El dominio es `efeonce.org`, no `efeoncepro.org`** — con el segundo el endpoint responde
> `404 No tenant user found`. Corregido el 2026-08-12 después de que fallara en vivo; la lista
> canónica de personas agente vive en `CLAUDE.md` §Agent Auth.
>
> ⚠️ **Y esa persona NO sirve para verificar ESTE módulo.** `agent-client@greenhouse.efeonce.org`
> es la persona cliente genérica y no pertenece a la organización que tiene el módulo SEO
> contratado, así que `/growth/seo` le responde su card de bloqueo — que es el gate funcionando,
> no un defecto. Para verificar la superficie con datos hay que usar un usuario cliente **de la
> organización contratada**. Mientras no exista una persona agente de esa organización, la
> verificación visual determinista se hace con el arnés de fixture (`/growth/seo/mockup`) y la
> verificación del gate con dato real queda como paso manual.

Con esa sesion, revisa tres cosas:

1. **El enlace de SEO aparece solo en el menu del cliente** — desde el 2026-08-09 no hay que cablear
   nada. El menu del portal cliente ya compone los enlaces de los modulos contratados desde la misma
   fuente que gatea cada pantalla, asi que una organizacion con `seo_v2` vigente ve su enlace de SEO en
   la zona de arriba del menu. Se ve en la **siguiente carga completa** del portal (recargar la pagina
   o volver a entrar; moverse entre pantallas no recalcula el menu) y puede tardar hasta cerca de un
   minuto.

   > Antes de esa fecha el menu era una lista fija donde SEO no estaba, y el cliente llegaba solo por
   > enlace directo. Si encuentras ese texto en otro documento, esta desactualizado.

   **El informe (`/growth/seo/report`) no tiene enlace propio y eso es correcto:** es una pantalla hija
   que se abre con el boton "Ver informe" del encabezado del panel SEO.

   Si el enlace no aparece con el modulo vigente, no revises el seed ni los grants por rol —
   [Diagnosticar un modulo que no aparece en el menu](../client-portal/diagnosticar-modulo-no-visible-en-menu.md)
   tiene el paso a paso.
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
- **No crees assignments nuevos bajo `seo_v1`.** El codigo dejo de leer esa clave el 2026-08-09; la
  fila quedaria en la base sin efecto en runtime, y el sintoma seria un cliente que "contrato SEO" y
  ve el estado de no contratado. La clave de escritura es `seo_v2` (`SEO_MODULE_KEY`).
- **No uses la persona agente superadmin para validar el gate.** Atraviesa por otras razones y te
  daria un falso verde.
- **No agregues secciones nuevas al navegador cliente dentro de esta task.** La cuarta seccion
  (Auditoria) tiene su propia task reservada; sumarla aca reinicia la verificacion de la ultima milla.

## Problemas comunes

**La ruta responde pero no aparece en el menu.**
Desde el 2026-08-09 esto ya **no** es lo esperado: el menu compone los enlaces de los modulos
contratados desde la misma fuente que gatea la pantalla. Las dos causas probables, en orden:

1. **El cliente no ha hecho una carga completa.** El menu se calcula al entrar al portal; moverse entre
   pantallas no lo recalcula. Pidele que recargue o vuelva a entrar, y dale hasta cerca de un minuto si
   acabas de asignar el modulo.
2. **La asignacion no esta vigente para el runtime.** Revisa que exista bajo `seo_v2` (no `seo_v1`), sin
   fecha de fin de vigencia y sin vencimiento pasado.

Si con las dos descartadas el enlace sigue sin aparecer, es un caso de plataforma:
[Diagnosticar un modulo que no aparece en el menu](../client-portal/diagnosticar-modulo-no-visible-en-menu.md).
El informe SEO es la excepcion legitima: es pantalla hija y por diseno no tiene enlace propio.

**El cliente ve "SEO no esta activo en tu plan" y si lo contrato.**
Ojo: esto NO se arregla tocando `role_view_assignments` — la page se gatea por `module_assignment`,
no por viewCode. La causa mas comun es de clave: **la organizacion tiene assignment bajo `seo_v1` y
no bajo `seo_v2`**, que es la unica que el codigo lee desde 2026-08-09. Revisa
`greenhouse_client_portal.module_assignments` filtrando por su `organization_id`; si solo aparece
`seo_v1`, el arreglo es crear el assignment `seo_v2` (manual de asignacion), **nunca** reabrir la
lectura de la clave vieja. Y compara siempre contra `SEO_MODULE_KEYS_READ` en
`src/lib/growth/seo/entitlement.ts` **de la version desplegada en ESE runtime**, no de tu working
tree: hay cinco runtimes con despliegues independientes.

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
