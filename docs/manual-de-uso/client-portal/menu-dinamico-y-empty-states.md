# Menu dinamico y empty states del Portal Cliente — operacion

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-13 por Claude (TASK-827)
> **Ultima actualizacion:** 2026-05-13 por Claude
> **Modulo:** Client Portal
> **Rutas en portal:** `/admin/client-portal/catalog`, `/admin/client-portal/organizations/[orgId]/modules`, `/admin/operations`, `/cliente-portal-mockup`
> **Documentacion relacionada:** [Menu dinamico y acceso a modulos](../../documentation/client-portal/menu-dinamico-y-acceso-a-modulos.md), [GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md](../../architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md)

## Para que sirve

Este manual sirve para que **operadores admin de Greenhouse** (account managers, comercial, soporte operativo) operen el portal cliente compositivo:

- Activar / desactivar modulos para clientes
- Verificar que un cliente esta viendo lo correcto
- Diagnosticar empty states o mensajes raros que reporten clientes
- Atender warnings de Sentry relacionados con view registry / role assignments
- Validar visualmente cambios usando el mockup interno

Tambien sirve para **operadores reliability / DevOps** que monitoreen la salud del resolver y reaccionen a alertas.

## Antes de empezar

Necesitas:

- Acceso admin a Greenhouse (`efeonce_admin`).
- Acceso a `/admin/client-portal/` rutas (catalog + organizations).
- Para chequeos contra DB: `pnpm pg:connect:shell` (levanta proxy + abre psql).
- Acceso a Sentry proyecto `javascript-nextjs` para alertas.
- (Opcional) Acceso a `/admin/operations` para reliability signals.

> Si no eres admin de Efeonce: este manual no aplica. Como cliente, simplemente entras al portal y veras lo que tu account manager te configuro. Si crees que falta algo o ves un mensaje raro, escribe a tu AM via el boton "Solicitar acceso" o "Hablar con mi account manager" que aparece en las pantallas.

## Caso 1 — Activar un modulo nuevo para un cliente

Cuando comercial vendio un modulo (bundle base, addon individual, o piloto) a un cliente y necesitas que aparezca en su portal.

1. Entra a `/admin/client-portal/organizations/[orgId]/modules` reemplazando `[orgId]` por el `organization_id` del cliente. (Si no sabes el ID: busca el cliente en `/admin/users` y entra a su organization.)
2. Veras la lista de modulos del catalogo + el estado actual de cada uno para esa organization.
3. Para activar un modulo no asignado: click "Activar". El sistema te pregunta:
   - **`status`**: typicamente `active`. Para piloto/trial: `pilot` (requiere `expires_at`).
   - **`source`**: como llego este modulo. Opciones: `manual_admin` (lo activaste tu manualmente), `commercial_terms_cascade` (vino de un contrato comercial), `lifecycle_case_provision` (cascade automatico desde onboarding).
   - **`source_ref_json`** (opcional): metadata libre con referencia al contrato o ticket.
4. Si el modulo tiene `applicability_scope` distinto al business_line del cliente (ejemplo: activar un modulo de `crm_solutions` a un cliente Globe), el sistema te pide confirmacion adicional. Eso es **override** y queda auditado en la fila con razon obligatoria.
5. Click "Confirmar". El sistema crea la fila en `module_assignments` y emite outbox event `client.portal.module.assignment.created v1`.

**Cuando lo vera el cliente:** la proxima sesion del cliente refleja el cambio. Hay hasta 60 segundos de delay por el cache del resolver. Si necesitas que vea el cambio inmediato (ej. durante una demo en vivo), el cache se invalida automaticamente post-mutation, asi que un refresh del navegador del cliente basta.

**Lo que el cliente vera:** los items del menu correspondientes a los `view_codes` del modulo activado aparecen en su menu izquierdo. Si el modulo es tier `addon`, los items llevan una etiqueta visual "Addon" naranja al lado.

## Caso 2 — Pausar o dar de baja un modulo

Cuando un cliente cancelo un addon, esta en suspensión transitoria, o cierra el contrato.

- **Pausar** (suspension temporal, el cliente puede reactivarlo): click "Pausar" en el modulo. El cliente deja de ver los items en su menu pero el assignment sigue en la base. Si pausas por mas de N dias, el reliability signal `client_portal.assignment.pilot_expired_not_actioned` (TASK-829) alerta.
- **Dar de baja (churn)** (terminacion definitiva): click "Dar de baja". Confirmacion typing-confirm requerida. El assignment queda como `churned` con timestamp; el cliente deja de ver los items en su menu inmediatamente.

> Detalle tecnico: [src/lib/client-portal/commands/](../../../src/lib/client-portal/commands/) — 5 commands canonicos atomicos con audit log + outbox events.

## Caso 3 — Verificar que un cliente esta viendo lo correcto

Si un cliente reporta "no veo X" o "veo cosas que no compre":

1. Entra a `/admin/client-portal/organizations/[orgId]/modules` y verifica que modulos tiene activos. Si la lista no matchea su contrato, falta activar / sobra dar de baja.
2. Si la lista esta correcta pero el cliente sigue reportando: verifica que no este logueado con otra organization (algunos clientes son contacto de varias). Pidele que cierre sesion y vuelva a entrar.
3. Si sigue sin verlo: revisa que la pagina especifica que el cliente quiere ver tenga su `view_code` en algun modulo activo del cliente. El mapping `module → view_codes[]` lo ves en el catalogo (`/admin/client-portal/catalog`).
4. Verifica que el `view_code` este en `greenhouse_core.role_view_assignments` para el role del cliente. Si NO esta, hay un gap de gobernanza (ver Caso 5 abajo).

**Atajo SQL para diagnosticar (read-only):**

```sql
-- En psql via pnpm pg:connect:shell
SELECT ma.module_key, ma.status, ma.source, m.view_codes, m.applicability_scope, m.tier
FROM greenhouse_client_portal.module_assignments ma
JOIN greenhouse_client_portal.modules m USING (module_key)
WHERE ma.organization_id = '<orgId>'
  AND ma.effective_to IS NULL
ORDER BY m.applicability_scope, m.tier;
```

Esa query muestra exactamente que modulos esta consumiendo el resolver para esa organization. Lo que ves ahi es lo que el cliente ve.

## Caso 4 — Un cliente reporta un mensaje raro

El cliente comparte una captura o describe un mensaje. Identificalo entre estos 5 escenarios canonicos:

| Lo que reporta | Que significa | Que hacer |
|---|---|---|
| "Bienvenido a Greenhouse. Tu cuenta esta activada. Tu account manager esta configurando tus accesos." | Es cliente recien activado sin ningun modulo asignado. Estado valido durante onboarding (horas/dias). | Si el cliente acaba de firmar: activa los modulos del contrato y avisa. Si lleva > 14 dias: revisa por que el cascade automatico no corrio. |
| "Brand Intelligence aun no esta activo en tu cuenta. Brand Intelligence es un addon disponible para planes Globe..." (o similar para otro modulo) | El cliente intento entrar a una ruta cuyo modulo NO tiene activo. Funciono el page guard. | Si segun su contrato deberia tenerlo: activa el modulo. Si no: el mensaje es correcto, el cliente entendio que el modulo es addon. |
| "Portal en modo degradado. Algunos modulos no estan disponibles temporalmente." | El resolver tuvo un problema parcial. Algunos modulos resolvieron, otros no. | Revisa `/admin/operations` subsystem `Identity & Access` por errores recientes. Si persiste: ver Caso 6 abajo. |
| "Algo salio mal de nuestro lado. Te llevamos al inicio mientras lo resolvemos." | El resolver fallo completo (ej. base de datos no responde). | Es un alerta operativa. Sentry domain=client_portal debe tener detalles. Escalar a DevOps si el incidente dura > 5 minutos. |
| El cliente NO ve un item que SI tiene en contrato | Problema de gobernanza / configuracion. | Caso 3 arriba. |

## Caso 5 — Sentry alerta `role_view_fallback_used`

Si emerge un warning en Sentry con el mensaje `role_view_fallback_used` y tag `domain=identity`:

**Que significa:** alguien agrego un `view_code` nuevo al `VIEW_REGISTRY` (en codigo TS) sin sembrar los grants correspondientes en `role_view_assignments` (en base de datos). El fallback heuristico del sistema esta resolviendo el acceso correctamente (no es un bug funcional), pero la telemetria avisa porque la gobernanza esta incompleta.

**Que NO hacer:** no desactivar el warning, no parchear el fallback. La telemetria ES el detector y debe quedar viva.

**Que hacer:** crear una migration de seed canonical que registre el `view_code` en `greenhouse_core.view_registry` + grants en `role_view_assignments` para todos los roles que deban acceder. Pattern documentado en `CLAUDE.md` seccion "View Registry Governance Pattern (TASK-827)".

Ejemplo: si emerge `role_view_fallback_used` con tags `viewCode=cliente.nueva_capacidad, roleCode=client_executive`:

1. Identifica el view code y los roles afectados (Sentry tags lo dicen).
2. `pnpm migrate:create task-XXX-seed-cliente-nueva-capacidad`
3. En la migration: INSERT en `view_registry` + INSERT en `role_view_assignments` con `granted=TRUE` para cada role × view_code afectado (ON CONFLICT DO UPDATE).
4. `pnpm pg:connect:migrate` para aplicar live a staging.
5. Cuando promueva a produccion, el warning desaparece.

**Referencia operacional:** la migration que cerro el incident TASK-827 (commit `2fd8a60c`): `migrations/20260513134828199_task-827-seed-client-portal-view-registry.sql`. 44 filas (11 view_codes × 4 roles).

## Caso 6 — Resolver caido o degradado en produccion

Si `/admin/operations` reporta `client_portal.composition.resolver_failure_rate` con estado distinto a `ok` o `unknown`, o emergen errores recurrentes en Sentry con `domain=client_portal`:

1. Confirma con `pnpm pg:doctor` que la base de datos `greenhouse-pg-dev` (staging) o produccion responde.
2. Si la base esta bien: revisa logs de Vercel functions buscando errores en `src/lib/client-portal/readers/native/module-resolver.ts`.
3. Si la base esta caida: escala a DevOps. Mientras tanto, los clientes veran el banner "Portal en modo degradado" o "Algo salio mal" — comportamiento canonico, NO panico.
4. El cache del resolver TTL 60s ayuda a absorber un outage corto: los clientes que ya estaban navegando siguen funcionando con datos cacheados.

> Detalle: el reliability signal V1.0 esta como scaffold (returns `unknown`); cuando TASK-829 cierre con el telemetry adapter real, el signal mostrara porcentaje real de fallas.

## Caso 7 — Validar visualmente un cambio de UI antes de impactar clientes reales

El mockup interno `/cliente-portal-mockup` te permite ver los 5 estados canonicos del portal cliente lado a lado, sin necesidad de provisionar clientes reales.

1. Entra a `/cliente-portal-mockup` con tu sesion admin.
2. Veras 4 fixtures del menu (Globe full, Wave standard, Globe + addon, Zero state) + los 3 components de empty state (denied, zero, degraded).
3. Es ruta server-side que NO toca la base de datos — los fixtures son mock data tipada.
4. Util para: validar cambios visuales de copy/microcopy antes de mergear, mostrar a comercial como se vera un cliente con cierto plan, onboarding de devs nuevos en el patron.

## Caso 8 — Operador admin necesita acceder a una superficie cliente para soporte

Como admin de Efeonce, puedes entrar a CUALQUIER ruta cliente para hacer soporte legitimo (ver lo que el cliente ve, diagnosticar reportes). El page guard tiene un bypass canonico para internal admins.

**Limitacion canonical V1.0:** no hay un "context switcher" que te muestre la vista del cliente X como si fueras el. Lo que ves es tu propia vista admin con acceso a la ruta. Si necesitas reproducir exactamente lo que ve un cliente especifico: pidele que comparta su pantalla, o usa el mockup.

## Que NO hacer

- **No agregues view_codes a `VIEW_REGISTRY` sin migration acompañante.** El warning de Sentry te va a perseguir. Pattern canonical en `CLAUDE.md` seccion "View Registry Governance Pattern".
- **No desactives la telemetria `role_view_fallback_used`.** Es load-bearing como detector de gobernanza pendiente.
- **No parches el fallback heuristico** (`roleCanAccessViewFallback` en `src/lib/admin/view-access-store.ts`). Funciona como diseñado.
- **No actives modulos a clientes que no los compraron.** Cada activacion queda auditada con tu usuario; revenue leak.
- **No borres filas de `role_view_assignments` con SQL directo.** Pattern canonical es append-only con `granted=FALSE` (la down migration de TASK-827 lo hace asi).
- **No edites la migration original** si descubres que falta un view_code o un role grant. Crea una NUEVA migration con INSERT ON CONFLICT DO UPDATE.

## Problemas comunes

| Sintoma | Causa probable | Solucion |
|---|---|---|
| Cliente reporta menu vacio post-onboarding | No se activaron los modulos del contrato | Caso 1 arriba |
| Cliente ve item pero al click va a una pagina vacia | Modulo declara un view_code cuya pagina todavia no esta materializada (forward-looking) | Es esperado V1.0. Task derivada V1.1 `client-portal-pages-placeholder-materialization` crea las pages reales |
| Sentry burst de `role_view_fallback_used` post deploy | Alguien agrego view_codes nuevos sin migration de seed | Caso 5 arriba |
| Boton "Solicitar acceso" envia a `support@efeoncepro.com` en vez del account manager del cliente | V1.0 usa fallback hardcoded. Task derivada V1.1 `account-manager-email-canonical-resolver` lo arregla | Funcional: el support team rutea el email al AM correcto manualmente |
| Cliente reporta que NO ve un addon que compro recien | Cache resolver hasta 60s | Pidele refresh; si persiste, verifica que el assignment se creo (Caso 3) |
| Lint warning `no-untokenized-business-line-branching` en CI | Alguien agrego nuevo branching legacy `session.user.businessLines` en surface UI | Refactorea a consumir el resolver. Task derivada V1.1 `client-portal-legacy-branching-sweep` cerrara el sweep masivo |

## Referencias tecnicas

- Helper canonico page guard: [src/lib/client-portal/guards/require-view-code-access.ts](../../../src/lib/client-portal/guards/require-view-code-access.ts)
- Resolver canonico: [src/lib/client-portal/readers/native/module-resolver.ts](../../../src/lib/client-portal/readers/native/module-resolver.ts)
- Menu builder: [src/lib/client-portal/composition/menu-builder.ts](../../../src/lib/client-portal/composition/menu-builder.ts)
- Empty state components: [src/views/greenhouse/client-portal/empty-states/](../../../src/views/greenhouse/client-portal/empty-states/)
- Microcopy: [src/lib/copy/client-portal.ts](../../../src/lib/copy/client-portal.ts) (`GH_CLIENT_PORTAL_COMPOSITION` export)
- Parity test view_codes: [src/lib/client-portal/view-codes/parity.ts](../../../src/lib/client-portal/view-codes/parity.ts)
- Reliability signal scaffold: [src/lib/reliability/queries/client-portal-resolver-failure-rate.ts](../../../src/lib/reliability/queries/client-portal-resolver-failure-rate.ts)
- Migration seed canonical (incident fix): [migrations/20260513134828199_task-827-seed-client-portal-view-registry.sql](../../../migrations/20260513134828199_task-827-seed-client-portal-view-registry.sql)
- Spec arquitectonica completa: [GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md](../../architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md)
- Spec task: [TASK-827 spec](../../tasks/complete/TASK-827-client-portal-composition-layer-ui.md)
- Regla canonica view registry governance: [CLAUDE.md](../../../CLAUDE.md) seccion "View Registry Governance Pattern (TASK-827)"
