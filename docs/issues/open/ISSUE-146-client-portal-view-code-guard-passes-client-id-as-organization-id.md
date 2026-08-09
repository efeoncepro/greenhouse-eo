# ISSUE-146 — El guard de acceso del portal cliente pasa un `client_id` donde el resolver espera un `organization_id`: deniega siempre, y el síntoma parece correcto

> **Tipo:** Incidente de runtime (portal cliente / autorización)
> **Ambiente:** Producción + staging + local
> **Detectado:** 2026-08-09, documentando `TASK-1675`
> **Estado:** open — causa raíz identificada con evidencia en datos; fix no aplicado
> **Severidad:** **alta** — no abre datos ajenos, pero deja inalcanzables las páginas cliente que dependen del guard, y lo hace de la forma más difícil de detectar: pareciendo el comportamiento correcto

## Resumen

`requireViewCodeAccess` (`src/lib/client-portal/guards/require-view-code-access.ts:63`) hace:

```ts
const organizationId = session.user.clientId
// …
const allowed = await hasViewCodeAccess(organizationId, viewCode)
```

La variable se llama `organizationId`, pero recibe un `clientId`. `hasViewCodeAccess` resuelve
contra `greenhouse_client_portal.module_assignments`, cuya columna de filtro es
`organization_id`. **Son dos espacios de identificadores que no se solapan**, así que la
comparación nunca puede ser verdadera.

## Evidencia (medida contra PG, 2026-08-09)

`greenhouse_serving.session_360`, usuarios `tenant_type='client'`:

| email | `client_id` | `organization_id` |
|---|---|---|
| `agent-berel-client@greenhouse.efeonce.org` | `cli-0863869c-eaac-4630-9bd0-af283c56f7fb` | `org-32333527-02a8-487b-819e-6f76a761777d` |
| `cliente.prueba@efeoncepro.com` | `greenhouse-demo-client` | `org-6c09b3a7-cbab-48a9-869e-61d03d1c6291` |
| `jreysgo@gmail.com` | `hubspot-company-27776076692` | `org-f6aa4e20-9dbb-467a-950d-61e5f085e9b0` |

Los `organization_id` vigentes en `module_assignments` son todos del espacio `org-*`. Ni el prefijo
`cli-*`, ni `greenhouse-demo-client`, ni `hubspot-company-*` pueden matchear.

## Por qué nadie lo vio

Es la parte que vale registrar. El fallo **no produce un error**: produce exactamente el mismo
resultado que un cliente sin el módulo contratado — `redirect('/home?denied=<slug>')` y el empty
state `ModuleNotAssignedEmpty`, que es una pantalla honesta, bien redactada y con su CTA.

Un cliente que no llega a una pantalla ve un mensaje que dice, con toda la calma, que su
organización no tiene ese módulo. Nadie escala un bug contra un mensaje que suena a decisión
comercial.

## Impacto

> **Corrección 2026-08-09 (inventario del carril):** esta issue subestimaba el alcance en **las dos
> direcciones**, y conviene leer la corrección antes que el fix propuesto.
>
> **Hacia abajo:** el fix que propone —cambiar la llave de `clientId` a `organizationId`— desbloquea
> sólo **3** de las 9 páginas: `/proyectos`, `/campanas` y `/equipo`. Son las únicas cuyo viewCode está
> declarado en algún módulo.
>
> **Hacia arriba:** las otras **6** fallan por una causa independiente y siguen cerradas después del
> fix. `hasViewCodeAccess` resuelve con `modules.some(m => m.viewCodes.includes(viewCode))` y no hay
> allowlist transversal, así que un viewCode que ningún módulo declara deniega siempre. Es el caso de
> `/sprints` (`cliente.ciclos`), `/analytics`, `/updates`, `/notifications`, `/settings` y `/reviews`
> —éste último por un desencuentro de strings: el guard pide `cliente.revisiones` y el catálogo de
> módulos gobierna `cliente.reviews`—.
>
> Las dos más caras no son las que uno esperaría: `/notifications` cuelga de la campanita del header
> (la ruta con más click accidental del portal) y `/settings` significa que un cliente no puede entrar
> a su propia configuración de cuenta.
>
> Y hay un orden que importa: **el fail-open del menú está hoy contenido por este fail-closed**.
> Arreglar la llave sin arreglar antes la derivación permisiva del claim abre una ventana en la que el
> cliente ve el ítem *y* entra. Medición completa y orden propuesto en
> `docs/operations/CLIENT_PORTAL_ACCESS_RAIL_INVENTORY_V1.md`.

- Las páginas cliente que TASK-827 migró a este guard (9 rutas) deniegan a **todo** cliente,
  tenga o no el módulo.
- **NO** hay exposición de datos: el fallo es fail-closed. El riesgo es de disponibilidad y de
  diagnóstico, no de seguridad.
- `/growth/seo` y `/growth/seo/report` **no** están afectadas: usan `session.user.organizationId`
  con su propio estado honesto para el caso sin organización, no este guard. Por eso `TASK-1310`
  y `TASK-1675` se verificaron en runtime sin toparse con esto.

## Relación con TASK-1675

Es el mismo bug class por la puerta de al lado. `TASK-1675` cerró el corte entre los dos carriles
de verdad **en el menú** (leía `role_view_assignments` mientras el gate leía `module_assignments`).
Esta issue es el mismo desencuentro **dentro del gate**: lee la tabla correcta con la llave
equivocada.

Vale la pena leer las dos juntas: un módulo contratado necesitaba que el menú lo mostrara *y* que
el guard lo dejara pasar. Lo primero ya está; lo segundo no.

## Fix propuesto

1. **Usar `session.user.organizationId`** en el guard, que es la llave que el resolver espera.
   Antes de cambiarlo, resolver la pregunta que abre el punto 2.
2. **`session.user.organizationId` es best-effort y nullable.** Sale de `session_360` por el puente
   `spaces` (activo) → `organizations` (activa); no hay backfill ni reliability signal, y el carril
   de fallback BigQuery ni siquiera selecciona la columna. Cambiar el guard sin cubrir esto mueve el
   fallo de "deniega a todos" a "deniega a los que no tienen la columna poblada" — mejor, pero sigue
   siendo silencioso. El fix completo necesita, además del cambio de llave, una señal que detecte
   usuarios cliente activos sin `organization_id` resuelto (espejo de
   `identity.workforce.unlinked_internal_user`).
3. **Test de contrato que fije los espacios de ID.** El bug es un `string` pasado a un `string`: TS
   no lo puede atrapar. O se tipan los identificadores (`ClientId` / `OrganizationId` como branded
   types) o hay un test que ejercite el guard con una sesión real y falle si deniega a una
   organización que sí tiene el módulo. La segunda es más barata; la primera cierra la clase entera.

## Verificación al resolver

- Con la persona `agent-berel-client@greenhouse.efeonce.org` (Grupo Berel, módulo SEO vigente), una
  página cliente que use el guard debe **abrir**, no redirigir.
- Con una persona cliente sin el módulo, debe seguir redirigiendo al empty state — el fail-closed
  no se toca.
- La señal nueva debe reportar cero para el estado esperado, y >0 si aparece un cliente activo sin
  `organization_id` resuelto.

## Relacionado

- `TASK-827` — introdujo el guard (`requireViewCodeAccess`, Slice 4).
- `TASK-1675` — cerró el corte equivalente en el menú; el hallazgo salió de documentarla.
- `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §12.2 documenta el guard con `organizationId`, o sea que
  la spec y el código ya divergían.
