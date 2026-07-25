# Operar el share board de Globe

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.2
> **Creado:** 2026-07-25 por Claude (TASK-1558)
> **Ultima actualizacion:** 2026-07-25 por Claude — v1.1 corrigió un error de la v1.0 (decía que el cutover era sólo un `tofu apply`, y el flag no estaba cableado); v1.2 registra el paso 1 escrito y planeado
> **Documentacion funcional:** [Share board — la pieza que ve el cliente](../../documentation/creative-studio/efeonce-globe-share-board-cliente.md)

## Para qué sirve

Para dos cosas: **encender** la versión nueva del share board (el paso que falta hoy), y
**diagnosticar** cuando un cliente reporta que su link no funciona.

## Antes de empezar

- El share board nuevo está **construido y verificado, pero apagado**: el cliente sigue viendo
  `public-share-ui.ts`, la versión anterior, que funciona.
- 🔴 **Encenderlo NO es sólo un `tofu apply`.** La v1.0 de este manual decía que sí, y era **falso**
  — ver §`Por qué el flip solo no hace nada` antes de tocar el flag.
- Necesitás acceso a `infra/terraform` del repo `efeonce-globe`, permiso para disparar
  `deploy-internal.yml`, y un **grant de share real** para verificar. Sin el grant no hay verificación
  posible — y sin verificación no se retira lo viejo.

---

## 🔴 Por qué el flip solo no hace nada (verificado 2026-07-25)

Antes de seguir, tres hechos que hacen que cambiar el flag **no tenga efecto alguno**:

| Hecho | Cómo comprobarlo |
|---|---|
| `client_app_enabled` **no está conectado a ningún recurso** | `grep -rn client_app_enabled infra/terraform/` devuelve **una línea**: su propia declaración |
| El env var **no llega al runtime** | `grep -rn GLOBE_CLIENT_APP_ENABLED infra/` no devuelve nada; el spec del servicio tampoco lo declara |
| **El contenedor vivo es anterior a TASK-1556** | `gcloud run services describe` da la imagen `45235ccb62ca`; `git merge-base --is-ancestor 4bf631e 45235cc` → **falso** |

Consecuencia: cambiar el default a `true` y correr `tofu apply` produce un **plan vacío**. Y aun
aplicándolo, el contenedor que corre no tiene el bundle, no tiene `renderShell` y no lee esa variable.

**El resultado sería `variables.tf` diciendo `default = true`, un commit que dice "prendido", y
producción sirviendo lo de siempre.** Es el modo de falla de `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`: el
registro dice ON, la realidad es OFF. Un flag que se declara prendido sin estarlo es peor que uno
apagado, porque nadie vuelve a mirarlo.

**Cómo se detecta esta clase de error en cualquier flag:** si `grep` del nombre de la variable devuelve
**una sola línea**, esa línea es su declaración y no está cableada a nada. Un flag conectado aparece
al menos dos veces: donde se declara y donde se consume.

## La cadena real, en orden

| # | Paso | Naturaleza |
|---|---|---|
| 1 | **Cablear la variable**: bloque `env` en `cloud_run_services.tf` (recurso `studio_web`) que pase `GLOBE_CLIENT_APP_ENABLED = var.client_app_enabled ? "true" : "false"` | ✅ **escrito y planeado** 2026-07-25 · ⏳ `apply` pendiente — ver abajo |
| 2 | **[`TASK-1562`](../../tasks/to-do/TASK-1562-globe-share-projection-hydration.md)** — hidratar `modelLabel`, `reviewStatus` y `comments`, que hoy `resolveForShare` descarta en silencio | Producto. Ver abajo |
| 3 | **Desplegar** `origin/main` vía `deploy-internal.yml` (`workflow_dispatch`, servicio `globe-studio-internal`, SHA exacto) | Acción de runtime — **requiere autorización explícita** |
| 4 | **Flip + `tofu apply`** con el plan leído | Ahí sí con efecto |
| 5 | **Verificar con grant real** (los 6 puntos de abajo) | |
| 6 | Retirar `public-share-ui.ts` ([`TASK-1560`](../../tasks/to-do/TASK-1560-globe-legacy-payload-retirement.md)) | Después de verificar |

### Estado del paso 1 (2026-07-25)

El cable **está escrito** en `infra/terraform/cloud_run_services.tf`, dentro del `dynamic "env"` del
recurso `studio_web` — sólo ahí: es la capa de render, y la API privada no emite HTML.

Verificado antes de proponer el apply:

```
tofu fmt -check   → limpio
tofu validate     → Success! The configuration is valid.
tofu plan         → Plan: 0 to add, 1 to change, 0 to destroy
                    google_cloud_run_v2_service.studio_web will be updated in-place
                    + env { name = "GLOBE_CLIENT_APP_ENABLED", value = "false" }
```

Cumple las dos condiciones que este runbook exige: **cero destroy, cero replace**, y ningún otro
recurso en el diff — o sea que tampoco hay drift pendiente de otra sesión.

✅ **Aplicado y commiteado** (`efeonce-globe` `2074a76`). El apply escribió
`GLOBE_CLIENT_APP_ENABLED=false` — hizo que la palanca exista, sin prenderla — en la revisión `00069`,
con la misma imagen.

## ✅ CUTOVER COMPLETADO — 2026-07-25

La cadena se ejecutó completa y **en este orden**, que es el que importa:

| # | Qué | Evidencia |
|---|---|---|
| 1 | Cablear el flag | `efeonce-globe` `2074a76` · plan `0 add, 1 change, 0 destroy` · revisión `00069` con el flag en `false` |
| 2 | `TASK-1562` — hidratar la proyección | `efeonce-globe` `85dac33` · studio-web 264/264 · monorepo verde |
| 3 | Desplegar | `deploy-internal.yml` run `30156720661` · imagen `85dac33b03b1` · revisión `00070` · **share board todavía legacy con el flag OFF**, o sea el strangler verificado en vivo |
| 4 | Flip a `true` | plan `0 add, 1 change, 0 destroy`, sin replace · revisión `00071` |
| 5 | Verificar en vivo | 3 anchos, axe 0 violations, cero fuga, `scrollWidth <= clientWidth` incluso a 320 |
| 6 | Retirar `public-share-ui.ts` | ⏳ **bloqueado a propósito** — ver abajo |

**El único punto del runbook que quedó sin verificar es el estado `ready` con un grant real.** Crear uno
exige sesión interna en el Producer sobre un output existente, y no es alcanzable headless. Por eso el
paso 6 sigue bloqueado: ADR-014 exige cobertura equivalente en runtime antes de retirar lo viejo, y esa
cobertura es exactamente el estado que falta.

**Rollback**, si algo aparece: `default = false` en `variables.tf` + `tofu apply`. <10 min, y vuelve
`public-share-ui.ts` intacto porque no se retiró.

### Por qué `TASK-1562` va ANTES del cutover

Sin ella, el board nuevo muestra tres filas **"Sin dato"** y **"Todavía no hay comentarios"** en todo
share real, porque el proyector descarta esos tres hechos. El board viejo simplemente **omite** esas
filas cuando no hay valor.

O sea que el cutover, tal como está hoy, le cambiaría al cliente *"sin panel"* por *"panel con tres
huecos declarados"*. **Es más honesto y se ve peor** — y ésta es la única superficie que ve alguien de
afuera de Efeonce. `TASK-1562` es esfuerzo bajo y convierte el cutover en una mejora en vez de un
cambio de estética.

---

## Encender la versión nueva (el cutover)

> Ejecutá esto **sólo después** de los pasos 1-3 de la cadena de arriba. Antes de eso no tiene efecto.

### 1. Cambiar el default en `variables.tf`

El valor vive en `infra/terraform/variables.tf`, **no en `terraform.tfvars`**. Eso es deliberado:
`terraform.tfvars` está gitignoreado, y un flag cuyo estado real vive en un archivo sin trackear es
estado efímero mejor disfrazado — el próximo `apply` de otra persona lo revertiría en silencio.

```hcl
variable "client_app_enabled" {
  # Prendido YYYY-MM-DD tras verificar el plan: <resumen del plan>.
  default = true
}
```

Dejá el comentario con la fecha y el resumen del plan, igual que hizo `assets_cdn_enabled`. Es lo que
permite reconstruir por qué está prendido sin ir al historial.

### 2. Planear y **leer** el plan

```bash
cd infra/terraform
tofu init
tofu plan -out tfplan
```

**Leelo antes de aplicar.** Lo que tiene que dar:

- **Cero `destroy`, cero `replace`.** Si aparece alguno, **parar** — este flag no destruye nada.
- **Cero Cloud Run en el diff.** La identidad de los servicios no se toca; un replace ahí rompe todo
  lo que cuelga de ella.

### 3. Aplicar

```bash
tofu apply tfplan
```

### 4. Verificar con un grant REAL

Esto no es opcional ni se puede sustituir con el canary. El canary corre contra un servidor de prueba;
lo que estás verificando acá es el camino completo con un permiso de verdad.

Abrí un link de share vigente y confirmá, **en este orden**:

| # | Qué verificar | Por qué |
|---|---|---|
| 1 | La pieza carga y se ve | Lo básico |
| 2 | El permiso **desapareció de la barra de direcciones** | Si sigue ahí, una captura de pantalla regala el acceso |
| 3 | Los datos y comentarios aparecen | El camino de datos funciona |
| 4 | En el HTML servido **no hay** slug de proveedor, `house`, costo, margen, ni "Producer" | El contrato de audiencia |
| 5 | En un teléfono (390px) no hay scroll horizontal | Donde más se abre un link compartido |
| 6 | Un link **vencido** dice que venció, y **no ofrece Reintentar** | Reintentar donde no sirve esconde la acción real |

Si cualquiera falla → **volver atrás** (abajo) y reportar. No se sigue adelante con uno rojo.

### 5. Recién después, retirar lo viejo

`public-share-ui.ts` y su rama de render se retiran **después** del flip verificado, nunca antes. Es
regla dura de ADR-014: no se retira una superficie vieja hasta que su reemplazo tenga cobertura
equivalente **en runtime**, no en tests.

Ese retiro pertenece a [`TASK-1560`](../../tasks/to-do/TASK-1560-globe-legacy-payload-retirement.md).

---

## Volver atrás

```hcl
default = false   # en variables.tf
```

```bash
tofu plan -out tfplan && tofu apply tfplan
```

Menos de 10 minutos, y el cliente vuelve a la pantalla anterior sin pasos intermedios. Por eso el
cutover es de bajo riesgo: **el camino viejo sigue vivo hasta que se retire explícitamente.**

---

## Diagnóstico: "el cliente dice que su link no anda"

Preguntá **qué ve exactamente**. Cada mensaje apunta a una causa distinta, y ésa es la razón de que
sean mensajes distintos y no un error genérico:

| Lo que ve el cliente | Qué pasó | Qué hacer |
|---|---|---|
| Que el link **venció** | El share tiene vencimiento y pasó | Emitir uno nuevo. Reintentar no sirve, por eso no se ofrece |
| Que **ya no está disponible** | El share fue revocado | Decisión deliberada de alguien; confirmar antes de reemitir |
| Los datos **sí**, la pieza **no** | El archivo no cargó; los datos sí | Reintentar. Si persiste, revisar el camino de medios |
| Un error con **Reintentar** | Algo se cayó | Reintentar. Si persiste, escalar |
| **Página en blanco** | Ni datos ni mensaje | **Anómalo** — no es un estado previsto. Escalar con el link |

La última fila es la importante: los cinco estados anteriores son diseñados. Una página en blanco no
está en el diseño, así que si aparece es un bug y hay que reportarlo con el link.

## Qué NO hacer

- **NUNCA** retirar `public-share-ui.ts` antes de verificar el flip con un grant real. Si el camino
  nuevo falla y el viejo ya no existe, el cliente se queda sin nada.
- **NUNCA** poner el valor del flag en `terraform.tfvars`. Está gitignoreado: el próximo `apply` de
  otra persona lo revierte sin que nadie se entere.
- **NUNCA** aplicar un plan con `destroy` o `replace` sin leerlo. Este flag no destruye nada; si el
  plan dice lo contrario, hay otra cosa mezclada en el diff.
- **NUNCA** mostrar en esta superficie el proveedor, el costo o el margen. Es la única pantalla que
  ve alguien de afuera de Efeonce.
- **NUNCA** ofrecer Reintentar en un estado donde reintentar no cambia nada.
- **NUNCA** declarar un flag "prendido" sin confirmar que llega al runtime **y** que la imagen
  desplegada contiene el código que lo lee. `tofu apply` verde con plan vacío no es evidencia de nada.

## Referencias técnicas

- Superficie: `efeonce-globe/apps/studio-client/src/surfaces/share/ShareBoardSurface.tsx`
- Primitives: `apps/studio-client/src/primitives/`
- Flag: `infra/terraform/variables.tf` → `client_app_enabled`
- Decisión: [ADR-014](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md)
- Retiro de lo viejo: [`TASK-1560`](../../tasks/to-do/TASK-1560-globe-legacy-payload-retirement.md)
