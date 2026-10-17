# Cierre local: identidad nativa HubSpot y verificación individual Meta

2026-10-17. Pedido del operador: confirmar qué prueba individual permite Meta y conservar el ID
nativo del envío HubSpot sin depender sólo de email/hora. [ADR](../../architecture/GREENHOUSE_HUBSPOT_FORM_RECEIPT_DECISION_V1.md).

## Resultado

- HubSpot: marcador opaco server-side, recibo pendiente junto al intento HTTP y recuperación GET
  independiente. `conversionId` sólo tras un match histórico exacto y único con cobertura completa.
  ID/recibo persistidos con CAS; terminales inmutables. Command interno de opt-in/rollback con CAS
  preserva mapping comercial, versión de fuente y policy publicitaria.
- CLI READ ONLY: muestra ID persistido, incluso source-only; consulta por marcador/ID y conserva
  snapshot del destino. Compatible con la base anterior mediante proyección `to_jsonb` allowlisted.
- Meta: no existe GET documentado de un evento CAPI por UUID. ACK sGTM, stats, procesamiento y
  atribución permanecen separados. [Fuentes y mejora de recibo CAPI propuesta](../../documentation/growth/meta-individual-event-verification.md).
  Esa mejora de CAPI no se implementó en este cambio y no reconstruye un recibo histórico ausente.

## Verificación

262 tests / 14 archivos PASS: CLI/contratos previos, lectores, clasificación, store, adapter,
reconciliación y dispatch. Incluye paginación malformada, IDs nativos distintos del source UUID,
snapshot de mapping, saneamiento PII, CAS, límites, expiración sin GET y schema antes del POST.
TS strict focal con imports canónicos DB/Forms/worker/tests y ESLint de archivos propios PASS.

SQL Up ejecutado dos veces en PostgreSQL 17.5 aislado (PGlite 0.3.14); binding válido, rechazo de
ID verificado ausente/fuente ajena/reemplazo terminal y CAS stale PASS. Sin tocar DB compartida.
El cliente PostgreSQL local carece de binario servidor; se utilizó el motor aislado WASM, no la
base real como entorno de pruebas. SQL está parqueado fuera de `migrations/` hasta su release.

Relectura real con la CLI nueva, full y source-only: `fsub-7d76a9ba-ae79-49a1-a57b-a3bce86ce7c9`
continúa `delivered`, Meta `ack_recorded`, HubSpot form `correlated`, procesamiento Meta `unknown`.
No tiene recibo nativo persistido. No se escribió el candidato anterior como si fuera prueba exacta.

Documentación funcional, manuales, ADR/índice, contexto, handoff, changelog y skills espejo alineados.
Closure check: warning heredado por tamaño del spec Forms (1433 líneas/13 deltas); no se reestructura
el dominio durante esta mejora. Context/handoff/changelog strict PASS. WIP ajeno fuera del commit.

## Activación pendiente

Growth / Integrations: release autorizado, migración con timestamp nuevo, propiedad/campo oculto
nativo, opt-in del destino Performance y revisión activa del worker. Primer envío real autorizado
debe mostrar marcador en `values`, recibo verificado persistido y relectura por `conversionId`.
[Manual de activación](../../manual-de-uso/growth/guardar-identidad-nativa-hubspot.md).
Código local probado no acredita esa activación ni el round-trip en producción.

Plan nativo preparado: portal `48713323`, propiedad `ef_greenhouse_submission_id` string/text,
grupo existente `greenhouse_growth_forms`, Performance form `89652ccf-8393-4361-a650-878982132cfe`:
13 campos conservados + técnico oculto/no requerido como 14º. Identidad/scopes y metadata leídos;
sin crear propiedad, editar formulario, cambiar mapping, enviar lead, publicar GTM o desplegar.

Artefactos privados:
`/Users/jreye/Documents/Meta-Efeonce-Connection/occurrence-marker-2026-10-17/`.
Incluyen plan con hashes/pre-postcondiciones, salidas saneadas y resultado SQL aislado.
