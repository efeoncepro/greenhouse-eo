# ISSUE-148 — Ni el rol ni el módulo se aplican de punta a punta: la puerta del portal cliente lee uno de los tres insumos que el sistema tiene

> **Tipo:** Hallazgo de arquitectura / autorización (portal cliente)
> **Ambiente:** Producción + staging + local
> **Detectado:** 2026-08-09, al cerrar `TASK-1678`/`1679`/`1680` — surgió de una pregunta del operador: *"¿rol y módulo no son excluyentes? ¿por qué tienen que serlo?"*
> **Estado:** **resuelta 2026-08-10** por `TASK-1685` (decisión (a′)). Ver §Resolución al final.
> **Severidad:** **media** — no hay pérdida de datos ni exposición cross-tenant; lo que hay son controles decorativos y una divergencia menú↔puerta

## Resumen

Rol y módulo **no** son alternativas: son dimensiones ortogonales legítimas. El módulo es un hecho
comercial de la **organización** (qué contrató); el rol es un hecho de la **persona** dentro de ella.
El sistema tiene tablas para las dos.

El problema es que **cada dimensión se aplica en un solo lugar, y ninguna de punta a punta**:

| | Menú | Puerta (`requireViewCodeAccess`) |
|---|---|---|
| Lista base de 6 enlaces cliente | **rol** (`canSeeView` → claim de `role_view_assignments`) | — |
| Ítems compuestos por módulo | **módulo** (`composeNavItemsFromModules`, merge aditivo) | — |
| Vistas base del portal | — | allowlist (3) |
| Todo lo demás | — | **módulo** (`module_assignments`) |

Consecuencia: el rol gatea la visibilidad de 6 enlaces y **nada más**; el módulo gatea la puerta pero
no puede expresar diferencias entre personas de la misma organización. Y **no existe un primitive que
responda "¿esta persona puede ver esta vista?"** — la respuesta vive repartida entre código de menú y
código de guard, cada uno sabiendo la mitad. Ésa es la violación de SSOT que está debajo de todo lo
demás, y es la razón de que nadie notara que hay controles inertes.

## Los tres insumos, y cuál lee la puerta

El sistema tiene **tres** fuentes para esta decisión:

1. `greenhouse_client_portal.module_assignments` — qué contrató la organización.
2. `greenhouse_core.role_view_assignments` — qué concede/niega cada rol.
3. `greenhouse_core.user_view_overrides` — grant/revoke **per-persona**, con `reason` y `expires_at`.

**La puerta lee solo el (1).** Verificado con grep sobre
`src/lib/client-portal/guards/require-view-code-access.ts`: no aparece `authorizedViews`, ni
`canSeeView`, ni `hasAuthorizedViewCode`. Llama únicamente a `hasViewCodeAccess(organizationId, viewCode)`.

De ahí se sigue —deductivamente, sobre hechos verificados— que **un `override_type='revoke'`
per-usuario tampoco cierra la puerta**: los overrides se aplican dentro de
`resolveAuthorizedViewsForUser`, o sea sobre el claim, y el guard nunca lee el claim. El instrumento
**canónico** del repo para "esta persona no debe ver esto" es decorativo en la puerta.

## Medición (2026-08-09, contra PG real)

Cruzando cada usuario cliente activo con cada vista que su organización alcanza por módulo vigente:

- **24 pares** usuario × vista concedidos por el módulo.
- **6 de esos 24 no tienen ningún grant de rol.**

| Vista | Usuarios | Denials de rol | Lectura |
|---|---|---|---|
| `cliente.ai_visibility_report` | 3 reales de Sky Airlines + la persona agente de Berel | **0** | Nadie la negó: nadie la sembró. `TASK-1678` la sacó del claim al invertir el default (era el único viewCode que la medición del Slice 1 predijo que se apagaría). Se sigue viendo **sólo porque el merge aditivo del módulo la repone** en el menú. |
| `cliente.growth_seo_dashboard` | persona agente de Berel | **3** (los tres roles cliente) | **Negada explícitamente a todos los roles** y aun así visible y abierta para cualquier organización con `seo_v2`. |
| `cliente.growth_seo_report` | persona agente de Berel | **3** | Ídem. |

El hueco va en **las dos direcciones**:

- un **denial de rol no cierra la puerta** sobre una vista que el módulo concede;
- un **grant de módulo hace visible** lo que el rol niega, vía el merge aditivo del menú.

### Delta 2026-08-10 — medido: sólo una de las dos direcciones existe, y no es la que este hallazgo enfatiza

Al tomar `TASK-1685` se midió la divergencia menú↔puerta completa, no sólo los pares del módulo:

| Dirección | Pares | Usuarios |
|---|---|---|
| menú **promete** y puerta **niega** (enlace muerto) | **36** | **8 de 8** |
| puerta **abre** y menú **oculta** (alcanzable sólo por URL) | **0** | — |

La segunda dirección es **0** en la práctica: el merge aditivo de `TASK-1675` repone todo ítem de
módulo, así que un denial de rol nunca llega a ocultar lo que el módulo concede. Lo que sí existe es
lo contrario, y es más grande de lo que este hallazgo describe: la **lista base del menú** se gatea
por rol e **ignora el módulo**, así que promete páginas que la puerta niega. ANAM y Greenhouse Demo no
tienen ningún módulo y sus 4 usuarios ven 6 enlaces muertos cada uno; los 3 usuarios reales de Sky
Airlines ven "Ciclos" y "Analytics" muertos. Los 36 terminan en `/home?denied=…`.

Consecuencia para el diseño: arreglar sólo la puerta (la opción (a) tal como estaba redactada) **no**
alcanza el criterio *"lo que el menú muestra y lo que la puerta abre coinciden"*. El primitive tiene
que gobernar también la lista base. Decisión completa en `TASK-1685` §Slice 1.

### Delta 2026-08-10 — la intención de los 9 denials SÍ estaba registrada

La §"Qué intención tenían los 9 denials de rol" de más abajo dice que es inferencia y que hay que
preguntarle a quien los sembró. No hace falta: **está escrita en las propias migraciones**, y son
**dos grupos con intenciones opuestas**. Conflatarlos es lo que hacía la pregunta difícil.

- **6** (`migration:TASK-1310`, `growth_seo_*` × 3 roles) — *"Estos códigos son module-gated.
  Persistir denials explícitos evita que **el fallback del route group** los convierta en visibilidad
  por rol."* No son negación de acceso: son plomería defensiva contra el default permisivo, y ese
  default ya no existe (`TASK-1678` lo invirtió). Bajo el default invertido, `granted=FALSE` y "sin
  fila" son **semánticamente idénticos** para una vista `cliente.*`.
- **3** (`migration:TASK-285`, `client_specialist` pierde `analytics`/`campanas`/`equipo`) —
  *"Differentiates client_specialist from client_executive / client_manager"*, con `revoke_role` en
  `view_access_log`. Eso **sí** era intención de producto per-rol. Hoy no afecta a nadie: no existe
  ningún usuario `client_specialist`-only.

También medido: `user_view_overrides` tiene **0 filas**. El instrumento per-persona nunca se usó, así
que hacer que el `revoke` cierre la puerta es hoy un no-op con delta de acceso exactamente cero.

### El caso que NO es explotable hoy, y por qué conviene saberlo

`cliente.campanas` y `cliente.equipo` están negadas a `client_specialist`, y el bundle
`creative_hub_globe_v1` —asignado a Sky Airlines el 2026-08-09— las declara. Un specialist de SKY
tendría el enlace oculto y la página abierta por URL. **No hay ninguno**: los 3 usuarios activos de SKY
son `client_executive` (verificado). El hueco es **estructural, no explotable** en ese caso concreto.

## Qué intención tenían los 9 denials de rol

Es la pregunta que decide el diseño, y no está respondida. La evidencia disponible sugiere que se
sembraron para **curar el menú** —no para negar acceso— porque:

- su único efecto observable hoy es ocultar enlaces de la lista base;
- son **per-rol**, y una restricción per-rol sobre una vista que el módulo concede tiene el problema
  de que *ganar un rol te quita acceso*;
- nadie notó en meses que no cierran la puerta, lo que es coherente con que nunca se esperara que lo
  hicieran.

Pero es una inferencia, no un registro. Quien seedeó `granted=FALSE` para `growth_seo_*` en los tres
roles tenía **alguna** intención, y no está escrita.

## Por qué esto NO se resuelve poniendo un `AND` en la puerta

Si el guard exigiera módulo **Y** grant de rol, con la puerta ya fail-closed desde `TASK-1678`,
cerraría **los 6 pares medidos** — o sea le cerraría a Sky Airlines una página que **contrató**
(`ai_visibility_v1`) y a Berel la superficie SEO.

Y el problema no es sólo el estado inicial: exigir un **grant** per-rol convierte cada assignment
comercial en un cambio de dos tablas. Eso deriva, y la evidencia está en este mismo repo — el default
permisivo de `role_view_assignments` existía precisamente porque la gente olvida sembrar. Con la puerta
fail-closed, ese olvido deja de ser ruido de gobernanza y pasa a ser **un cliente que pagó y no entra,
en silencio**. Es un modo de fallo peor que el actual.

La asimetría que disuelve la tensión —y que la task derivada debe evaluar— es
**grant vs deny**: un grant per-persona obliga a sembrar en cada assignment; un **deny** per-persona no
obliga a sembrar nada, y expresa la dimensión cuando hace falta. Y per-**persona** en vez de per-rol
evita la paradoja de composición, porque un sujeto singular no acumula.

## Lo que este hallazgo corrige de lo que se escribió el 2026-08-09

Al cerrar `TASK-1678`/`1679`/`1680` se escribió, en varios lugares, que
*"`role_view_assignments` **no** es el carril de una vista `cliente.*`"* y que *"la puerta es el módulo
contratado"*. **Es demasiado fuerte y desorienta**: el carril de rol **sí** gobierna la visibilidad de
los 6 enlaces base, y el framing de "un carril gana" es justamente lo que tapó que ninguna de las dos
dimensiones se aplica completa.

Docs afectados por ese framing: `project_context.md`, `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §12.2,
`GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` §8.2, los dos companions de
`agent-invariants/` y los docs funcionales/manuales del portal cliente. La corrección precisa es parte
de `TASK-1685`, para que quede en el mismo cambio que la decisión y no antes.

## Verificación al resolver

- Existe **un** primitive que responde "¿esta persona puede ver esta vista?", y tanto el menú como la
  puerta lo consumen.
- Lo que el menú muestra y lo que la puerta abre **coinciden**, con una señal de divergencia en steady 0.
- Un `user_view_overrides` con `override_type='revoke'` cierra la puerta, no sólo oculta el enlace.
- Ningún cliente pierde una superficie que su organización contrató.
- Los 9 denials de rol quedaron retirados o convertidos, con la intención escrita.

## Resolución (2026-08-10, `TASK-1685`)

**Decisión: (a′).** Un solo primitive puro responde la pregunta, y lo consumen los cuatro caminos que
antes decidían por su cuenta — el page guard, la lista base del menú, el ⌘K y los layouts de ruta:

```
acceso = interna ∨ ( ¬revocadaParaLaPersona ∧ ( vistaBase ∨ móduloDeLaOrgLaDeclara ) )
```

`src/lib/client-portal/visibility/`. Es puro porque el guard corre en el servidor pero el menú y el ⌘K
son Client Components; los insumos se resuelven **una vez** en `(dashboard)/layout.tsx`, así que menú y
puerta no sólo comparten función: comparten insumos.

**Lo que la medición cambió respecto de lo escrito arriba** (los dos Deltas del 2026-08-10 lo detallan):
la divergencia viva eran **36 enlaces muertos** en la dirección "el menú promete y la puerta niega", con
**0** en la dirección que este hallazgo enfatizaba; y la intención de los 9 denials **estaba registrada**
en sus migraciones. Consecuencia de diseño: la opción (a) tal como se planteó no alcanzaba, porque
arreglaba la puerta —que ya coincidía— y dejaba los 36 intactos.

**Un hueco que este hallazgo no vio.** Los layouts de `/proyectos`, `/campanas`, `/sprints` y
`/notifications` gateaban por el carril de rol, y **`/proyectos/[id]`, `/campanas/[campaignId]`,
`/sprints/[id]` y `/notifications/preferences` no tienen guard propio**: ese layout era su única puerta.
Un cliente cuyo rol concedía la vista pero cuya organización no tenía el módulo alcanzaba el detalle por
URL, aunque el listado le estuviera negado. Lo encontró el lint nuevo, no la lectura manual.

### Verificación (contra PG real, antes y después)

| | Antes | Después |
|---|---|---|
| Pares usuario × vista contratados | 24 | **24** — ningún cliente perdió una superficie |
| Enlaces que el menú ofrece y la puerta niega | **36** (8 de 8 usuarios) | **0** |
| Alcanzables sólo por URL | 0 | 0 |
| Un `revoke` per-persona cierra la puerta | no | **sí** |
| Superficies que ningún módulo vende | no medido | **2** (`cliente.ciclos`, `cliente.analytics`) |

Las 2 últimas no son una regresión: antes eran enlaces muertos y ahora simplemente no se muestran.
Nadie podía abrirlas en ninguno de los dos estados. La señal las nombra en vez de esconderlas, y su
remediación es declararlas en el módulo que las venda o retirarlas del catálogo de navegación.

Script repetible: `scripts/identity/client-portal-visibility-baseline.ts` (deriva los conteos del mismo
estado que lee el motor; no fija ningún literal esperado).

### Contra la lista de "Verificación al resolver"

- ✅ Existe **un** primitive y tanto el menú como la puerta lo consumen — más el ⌘K y los layouts.
- ✅ Menú y puerta coinciden, con señal `identity.client_portal.menu_gate_divergence`.
- ✅ Un `revoke` cierra la puerta, no sólo oculta el enlace.
- ✅ Ningún cliente perdió una superficie contratada (24 pares intactos).
- ✅ Los 9 denials quedaron retirados en efecto —el carril de rol ya no gobierna `cliente.*`— con la
  intención escrita. Las filas **no** se borran: la tabla es append-only.

## Relacionado

- `TASK-1685` — la decisión de diseño y su implementación. **No implementar sin esa decisión.**
- `TASK-1678` — invirtió el default del carril de rol para `client`; su §Slice 5 decidió que el denial
  de rol no vence entre roles. Esa decisión sigue siendo defendible, pero **el razonamiento con que se
  cerró** descansaba en que "para las 18 que importan el gate es el módulo", sin verificar que la
  puerta ignora el rol.
- `TASK-1679` — el page guard; es el archivo donde vive el hueco.
- `TASK-1680` — cerró el lint del carril viejo; no toca este hallazgo.
- `docs/operations/CLIENT_PORTAL_ACCESS_RAIL_INVENTORY_V1.md` — la medición original del carril, que no
  cubrió la dirección menú↔puerta.
