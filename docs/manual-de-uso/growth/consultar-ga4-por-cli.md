# Consultar GA4 por CLI (`pnpm ga4:query`)

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-11-05 por Claude (sesión SKY · proyección del blog)
> **Ultima actualizacion:** 2026-11-05 por Claude
> **Documentacion tecnica:** [`scripts/ga4/query.ts`](../../../scripts/ga4/query.ts) · conexión por organización en [conectar-ga4-por-organizacion.md](conectar-ga4-por-organizacion.md)

## Para qué sirve

Hacer consultas de solo lectura a cualquier propiedad GA4 desde la terminal: reportes, embudos, eventos
clave, flujos de datos y metadatos. No usa el OAuth de la app, no baja variables de Vercel y no lee
`.env.local`, PostgreSQL ni Secret Manager.

Autentica con tu sesión local de gcloud (ADC), que impersona la cuenta de servicio de Efeonce
`greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com` con el scope `analytics.readonly`.

Para dashboards o datos que viven en el portal, sigue siendo la conexión GA4 por organización
([conectar-ga4-por-organizacion.md](conectar-ga4-por-organizacion.md)). La CLI es para análisis puntuales
y para preparar informes.

## Antes de empezar

1. Sesión de gcloud vigente: `gcloud auth application-default login`. Si vence, el comando falla al pedir el
   token.
2. Tu usuario necesita el rol **Service Account Token Creator** sobre la cuenta de servicio. Lo otorga una
   persona en la consola de GCP; un agente no se lo puede autoasignar.
3. **La cuenta de servicio tiene que estar agregada como Lector en la propiedad GA4.** Lo hace un administrador
   de esa propiedad en GA4 › Administrar › Acceso a la propiedad › Agregar usuario, con el correo de la cuenta de
   servicio y rol Lector.

Estado al 2026-11-05:

| Propiedad | Id | Alias | Acceso |
| --- | --- | --- | --- |
| efeoncepro.com | 486264460 | `efeoncepro` | Sí |
| efeonce.cl | 347852876 | `efeonce-cl` | Sí |
| SKY web GA4 - Prod | 354430952 | `sky` | **No**: falta que SKY agregue la cuenta de servicio como Lector |

## Paso a paso

**1. Verificar acceso.**

```bash
pnpm ga4:query doctor --property sky
```

Revisa token, nombre de la propiedad y una consulta de prueba. Si falta el acceso, el error dice qué agregar.

**2. Reporte rápido con flags.**

```bash
pnpm ga4:query report --property sky --from 2026-10-01 --to 2026-10-31 --dims yearMonth,country --metrics sessions --filter hostName=blog.skyairline.com --filter sessionDefaultChannelGroup="Organic Search" --out oct.csv
```

- `--dims` y `--metrics` aceptan listas con coma.
- Cada `--filter campo=valor` es una coincidencia exacta y los filtros se combinan con «y».
- Sin `--out`, el CSV sale por pantalla. Con `--format json` sale el JSON crudo.
- La paginación es automática (100.000 filas por página).

**3. Reporte con cuerpo completo** (filtros `inList`, `orderBys`, métricas calculadas, etc.):

```bash
pnpm ga4:query report --property sky --body-file body.json --out salida.json
```

`body.json` es el cuerpo de `runReport` de la Data API v1beta.

**4. Embudo** (Data API v1alpha `runFunnelReport`):

```bash
pnpm ga4:query funnel --property sky --body-file embudo.json --out embudo-resultado.json
```

**5. Configuración de la propiedad.**

```bash
pnpm ga4:query admin --property sky keyEvents
```

Recursos: `property`, `keyEvents`, `dataStreams`, `customDimensions`, `customMetrics`. Todos son lecturas.

**6. Buscar dimensiones o métricas.**

```bash
pnpm ga4:query metadata --property sky --grep purchase
```

**7. Lote de consultas.**

```bash
pnpm ga4:query batch --property sky specs.mjs out/dir
```

`specs.mjs` exporta (o `specs.json` contiene) `[{ name, kind: 'report' | 'funnel' | 'admin', body?, resource? }]`.
Guarda un JSON por consulta, con fecha de captura. Salta las que ya existen, salvo que pases `--force`.

## Qué significan las señales

- `✓ Token por impersonación`: tu gcloud puede actuar como la cuenta de servicio.
- `403 … no tiene acceso a esa propiedad`: la cuenta de servicio no está en esa propiedad GA4. No es un problema
  de gcloud.
- `GA4 400: …`: el cuerpo de la consulta está mal (dimensión inexistente, combinación incompatible). Revisa con
  `metadata`.
- `GA4 no respondió tras 5 intentos`: cuota (429) o error de Google (5xx). Espera y repite.

## Qué no hacer

- No agregar la cuenta de servicio a la propiedad de un cliente sin su autorización: el acceso lo da el
  cliente.
- No usar la CLI para escribir en GA4. Es solo lectura por diseño (scope `analytics.readonly`).
- No versionar salidas con datos de clientes fuera de su expediente.

## Problemas comunes

- **«No se pudo obtener token»**: ADC vencida (`gcloud auth application-default login`) o falta el rol Token
  Creator.
- **El alias no existe**: pasa el id numérico de la propiedad. Los alias viven en `PROPERTY_ALIASES` de
  `scripts/ga4/query.ts`.
- **Cifras distintas al portal de GA4**: revisa zona horaria (`doctor` la muestra), filtros de host y canal, y
  umbrales de datos de GA4.
