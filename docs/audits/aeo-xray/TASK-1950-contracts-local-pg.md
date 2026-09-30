# TASK-1950 — contrato y backend: evidencia local

Fecha: 2026-09-30. Alcance: contrato AXIS, distribución generada y core X-Ray en Greenhouse. Esto **no certifica** despliegue, migración productiva ni un enlace cliente vivo.

## Contrato AXIS

Fuente: repo `axis-design-system`, `packages/contracts/src/aeo-xray.ts` y `packages/tokens/src/aeo-xray.ts`.
Contrato `efeonce.aeo-xray@0.1.0`, lifecycle candidate. Distribución propia en Greenhouse `src/lib/axis/aeo-xray`;
archivos generados, sin edición manual. Procedencia y SHA-256 en `provenance.json`.

- Builds de tokens y contracts: pasan.
- Tests específicos: **34/34**. Incluyen composición sin imágenes, referencias ausentes, duplicados, máximo un hero,
  nombres heredados (`constructor`, `__proto__`), rechazo de HTML arbitrario, URLs inseguras, fecha inválida,
  fonts/CSS fuera de contrato y aislamiento de tokens/adapterChecks entre manifests. La extensión aditiva experience conserva
  narrativa original, machine, evidencia/fan-out, átomos y flujo de cuatro pantallas; los negativos detectan pérdida de
  lineage, cifra sin fuente, flow truncado y cobertura sin bloque real. La consistencia de metadata, árbol completo
  de headings, ALT, schema canónico y FAQ se compara contra SEO/bloques/assets únicos; una propuesta custom no se reescribe. Esto es verificación de contrato, no QA del renderer completo.
- Export `--check`: pasa.
- Suite completa de contracts mostró tres fallos fuera de X-Ray: slogan de graphic-line, fixtures manzanitas,
  fixture brochure surface-composition. El checkout ya contenía cambios ajenos en tokens y brand-assets; no se modificaron
  para resolver estos fallos. No se afirma que la suite completa esté verde.

## Backend y SQL

- `core.test.ts`: **9/9**. Token aleatorio/digest, flag OFF sin tocar base, estados expiry/revoke/withdraw/rate,
  hash corrupto/organización inactiva, proyección pública, URL compartida exacta/origen seguro,
  rechazo de autorización de assets antes de insertar edición, rechazo de media pública mutable al emitir,
  draft sin experience permitido pero emisión incompleta409. Fixture SQL complete.json conserva las cuatro etapas originales.
- `local-pg.test.ts`: **1 integración con múltiples aserciones**, verde contra PostgreSQL local 18.6 recién inicializado.
  Usa el pool canónico con configuración explícita y el rol `greenhouse_runtime`, no un mock del SQL.
- Aplica exclusivamente sección Up de la migración `20260930140916208_task-1950-aeo-xray-editions-sharing.sql`.
- Verifica creación, aislamiento entre dos organizaciones, CAS, retries de emisión idempotentes, conflicto de key,
  edición congelada tras actualizar draft, grant digest-only, trigger que rechaza mutación del snapshot,
  revocación y retirada efectivas en el reader y rate bucket que rechaza el tercer consumo con límite dos.
- El ensayo encontró el requisito de permiso UPDATE del `SELECT FOR UPDATE` sobre cases inmutables. Se sustituyó por
  advisory transaction lock scoped a organización/caso; no se amplió el permiso de mutación.
- Reader verifica SHA-256 de serialización canónica (el orden de claves JSONB no cambia la identidad).
- Rate buckets tienen índice por ventana y limpieza de ventanas >24h cuando nace un bucket.
- Cluster detenido en `finally`, datos temporales eliminados. No se aplicó migración a un entorno compartido.

La suite completa del dominio Greenhouse (`pnpm exec vitest run src/lib/aeo-xray`) pasó **22 pruebas**; la integración PG
opt-in quedó omitida en esa corrida y pasó por separado mediante el runner efímero. El intent externo final Pichincha
resolvió ambas piezas con el gate de consistencia; no acredita aprobación visual ni acceso público vivo.

## Reproducción

```sh
node scripts/qa/verify-aeo-xray-distribution.mjs
pnpm exec vitest run src/lib/aeo-xray/core.test.ts
python3 scripts/qa/verify-aeo-xray-local-pg.py
```

El runner local necesita binarios de servidor PostgreSQL; `libpq` solo no basta. Detecta binarios instalados,
no instala servicios. Limpia variables PostgreSQL y `DATABASE_URL`, fuerza loopback/puerto efímero y base
`xray_ephemeral`. El test opt-in exige esos valores para correr.

El verificador de distribución funciona solo con el repo consumidor: compara inventario fijo de siete archivos,
schema/version/source y hashes del manifest local. No necesita red ni checkout hermano. `--dir` permite verificar otra
copia explícita. El export upstream mantiene la prueba de correspondencia contra source; el checker del consumidor
prueba integridad de la copia vendorizada.

## Límites

La autorización de API, subida/lectura de media privada, visuales y flujo cliente completo tienen evidencia separada.
La prueba SQL usa tablas mínimas de organización/capabilities para aislar el dominio. No prueba todas las dependencias de
producción. Paquetes AXIS todavía no publicados como release de esta ampliación. No se creó un grant de cliente real.
