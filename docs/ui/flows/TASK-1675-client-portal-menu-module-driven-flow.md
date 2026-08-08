# Flow — TASK-1675 · Del módulo contratado al ítem visible en el portal del cliente

> **Tipo:** Flow contract (cross-surface: operador → base de datos → chrome del portal cliente)
> **Task:** `docs/tasks/to-do/TASK-1675-client-portal-menu-module-driven.md`
> **Wireframe:** `docs/ui/wireframes/TASK-1675-client-portal-menu-module-driven.md`
> **Creado:** 2026-08-08 por Claude
> **Estado:** diseño — `UI ready: no`

## 0. Identidad del flujo

- Flow type: `multi-surface` (superficie de operador → command gobernado → chrome del portal cliente)
- Primary primitives: `resolveClientPortalModulesForOrganization`, `composeNavItemsFromModules`, `MenuItem` Vuexy
- Actores: **operador** (Account/Admin que contrata el módulo) y **usuario cliente** (que lo consume)

Este flujo no empieza en una pantalla del cliente: empieza cuando un operador habilita un módulo. Lo
que esta task arregla es el último tramo, que hoy está cortado.

## 1. El flujo completo, y dónde está roto

```
  OPERADOR                                    CLIENTE
  ────────                                    ───────

  /admin/client-portal/organizations/[id]/modules
        │
        │  enableClientPortalModule()
        │  (tx única: INSERT + audit + outbox
        │   + invalidación de cache del resolver)
        ▼
  greenhouse_client_portal.module_assignments
        │
        ├──────────────────────────┐
        │                          │
        ▼                          ▼
  GATE DE LA PÁGINA          MENÚ DEL PORTAL
  (server-side, per-org)     (chrome)
        │                          │
        │  ✅ funciona hoy          │  🔴 CORTADO HOY
        │                          │
        ▼                          ▼
  /growth/seo renderiza      el ítem nunca aparece
  con datos reales           (lista hardcodeada +
                              canSeeView por rol)
```

**El corte es de fuente de verdad:** el gate lee `module_assignments`; el menú lee
`session.user.authorizedViews`, que se deriva de `role_view_assignments` y **nunca** de módulos. Dos
carriles paralelos que nunca se tocan. Esta task conecta el segundo al primero.

**Consecuencia observable, medida el 2026-08-08:** Grupo Berel tiene SEO contratado, la pantalla
muestra su posición media 1.5 con 31 keywords medidas, y **no hay forma de llegar** salvo escribiendo
la URL.

## 2. Nodos

| Nodo | Superficie | Responsabilidad | Estado |
|---|---|---|---|
| **N1** | `/admin/client-portal/organizations/[id]/modules` | El operador habilita/pausa/expira el módulo por command gobernado | ✅ existe |
| **N2** | `module_assignments` | SSOT de qué organización tiene qué módulo | ✅ existe |
| **N3** | `layout.tsx` (server) | Resuelve los módulos de la org de la sesión y compone los ítems | 🔴 **esta task** |
| **N4** | `VerticalMenu` (client) | Hace merge aditivo de los ítems sobre la lista base | 🔴 **esta task** |
| **N5** | `/growth/seo` | Gate real per-org + superficie | ✅ existe |
| **N6** | `/growth/seo/report` | Ruta hija, alcanzable por CTA del header | ✅ existe |

## 3. Recorrido feliz

1. El operador habilita el módulo en **N1**. El command escribe **N2** e invalida el cache del resolver (TTL 60 s).
2. El usuario cliente carga cualquier ruta del portal. **N3** detecta `tenantType==='client' && organizationId`, resuelve sus módulos y compone `ClientNavItem[]`.
3. **N4** suma los ítems a la lista base y renderiza. **Sin loading**: llegan en el mismo payload RSC que el shell.
4. El cliente ve `SEO` en su menú, hace click y aterriza en **N5**, donde el gate per-org lo autoriza de verdad.
5. Desde el header de **N5**, el CTA "Ver informe" lleva a **N6**. El informe **no** es ítem de menú.

**Latencia percibida:** cero. Es la razón de elegir props sobre fetch.

## 4. Recorridos no felices

| Caso | Qué ocurre | Por qué así |
|---|---|---|
| Cliente **sin** el módulo | No ve el ítem. Su menú es idéntico al de hoy. | Es el aislamiento per-org. Ni cartel ni upsell en el chrome. |
| Cliente sin organización | No ve el ítem. Si entra por URL, **N5** muestra "No encontramos una organización para esta vista". | Verificado el 2026-08-08 con la persona `agent-client`. |
| **Colaborador interno puro** | Menú intacto. | ⚠️ Cae en la misma rama del componente (`!isInternalPortalUser`), así que el merge **debe** ser aditivo. Reemplazar la lista lo dejaría sin menú. |
| Resolver falla (PG caído) | `catch → []` → menú de hoy. Error a Sentry. | Fail-open. Un fallo del resolver **no puede** tumbar el layout raíz: es todo el dashboard, internos incluidos. |
| Módulo pausado/expirado | El ítem desaparece en la siguiente carga dura. | El resolver filtra por `effective_to IS NULL` + `status IN ('active','pilot')`. |
| ViewCode sin descriptor | El ítem se descarta en silencio. | Filtro defensivo ya existente en el composer. |

**Staleness aceptada y declarada:** habilitar un módulo se ve en la siguiente **carga dura**, no en
navegación SPA (el layout `(dashboard)` no se re-renderiza dentro del mismo segmento). Es aceptable
porque hoy el estado es "nunca se ve", y porque habilitar un módulo es una acción comercial de baja
frecuencia, no una interacción de sesión.

## 5. Fronteras que el flujo no cruza

- **El menú no autoriza.** Es visibilidad. El acceso lo decide el gate server-side de cada page contra `module_assignments`. Un bug en el menú no abre datos ajenos — a lo sumo esconde u ofrece un enlace que después deniega con un estado honesto.
- **El chrome no cambia.** Estilos, orden, colapsado y hover son de TASK-1388.
- **`role_view_assignments` no se toca.** Es append-only y gobierna otra cosa (rol → vista). Este flujo vive en el carril de módulos.
- **Los assignments no se escriben acá.** Sólo se leen. Escribirlos es de los commands de **N1**.

## 6. Contrato de navegación

| Ruta | Rol en el flujo | Cómo se alcanza |
|---|---|---|
| `/growth/seo` | Dashboard del módulo | **Ítem de menú** (lo que esta task habilita) |
| `/growth/seo/report` | Artefacto derivado | CTA "Ver informe" en el header del dashboard |

`route-reachability-manifest.ts` debe pasar a describir esto. Hoy declara `/growth/seo` con
`parent:'/home', via:'inline-link'` — **un enlace que no existe**. El gate da `0 orphans` porque
verifica que la ruta esté *declarada*, no que el enlace declarado *exista*; por eso el manifest pudo
mentir sin que nada se quejara.

## 7. Verificación del flujo

| Nodo | Cómo se prueba |
|---|---|
| N3 guard | Test: con `tenantType='efeonce_internal'` no se invoca el resolver |
| N3 fail-open | Test: resolver que lanza → `[]` → menú de hoy |
| N4 merge | Test: con `clientNavItems=[]` el menú es byte-idéntico al actual |
| N4 dedup | Test: un módulo que declara una ruta ya presente no duplica el ítem |
| N1→N4 e2e | GVC con dos personas: con módulo (ítem presente) y sin módulo (ausente) |
| N5/N6 | Ya cubierto por TASK-1310 |

## 8. Relación con otras tasks

- **TASK-1310** — su criterio de alcanzabilidad por nav cliente depende de esta task. Mientras tanto, su manifest declara un enlace inexistente.
- **TASK-1388** — nav interno; declara el cliente como follow-up. Toca el mismo archivo: quien entre segundo rebasa.
- **TASK-1674** (reservada) — la 4.ª sección del portal cliente SEO hereda este cableado sin trabajo extra.
- **ISSUE-143** — la ventana `seo_v1`/`seo_v2` sigue abierta a propósito; el contract es de TASK-1310, no de ésta.
