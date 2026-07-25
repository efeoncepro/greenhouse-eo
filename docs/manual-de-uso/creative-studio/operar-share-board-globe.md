# Operar el share board de Globe

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-07-25 por Claude (TASK-1558)
> **Ultima actualizacion:** 2026-07-25 por Claude
> **Documentacion funcional:** [Share board — la pieza que ve el cliente](../../documentation/creative-studio/efeonce-globe-share-board-cliente.md)

## Para qué sirve

Para dos cosas: **encender** la versión nueva del share board (el paso que falta hoy), y
**diagnosticar** cuando un cliente reporta que su link no funciona.

## Antes de empezar

- El share board nuevo está **construido y verificado, pero apagado**: `client_app_enabled` está en
  `false`, así que el cliente sigue viendo `public-share-ui.ts`, la versión anterior, que funciona.
- Encenderlo es **un `tofu apply`**, no código.
- Necesitás acceso a `infra/terraform` del repo `efeonce-globe` y un **grant de share real** para
  verificar. Sin el grant no hay verificación posible — y sin verificación no se retira lo viejo.

---

## Encender la versión nueva (el cutover)

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

## Referencias técnicas

- Superficie: `efeonce-globe/apps/studio-client/src/surfaces/share/ShareBoardSurface.tsx`
- Primitives: `apps/studio-client/src/primitives/`
- Flag: `infra/terraform/variables.tf` → `client_app_enabled`
- Decisión: [ADR-014](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md)
- Retiro de lo viejo: [`TASK-1560`](../../tasks/to-do/TASK-1560-globe-legacy-payload-retirement.md)
