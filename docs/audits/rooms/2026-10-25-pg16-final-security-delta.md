# TASK-2069 — delta final de seguridad en PostgreSQL16

Fecha: 2026-10-25. Runtime inspeccionado y probado: `efeonce-rooms@20f9fe9`.
Resultado independiente: **7 pruebas PASS, 0 fallos, 0 skips**, sobre PostgreSQL16 aislado.

## Alcance exacto

Se ejecutaron únicamente los dos archivos añadidos después del corte previamente validado con171
pruebas. No se repitió la suite completa ni se alteró el candidato.

| Archivo                                 | Casos | Evidencia                                                                                                                                                                                                               |
| --------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/domain-command-executor.test.ts` | 3     | Rechazo antes de acceder a persistencia; fallo de transacción redactado, sin retry ni fallback; autoridad persistida fresca, aislamiento de organización y revocación antes del replay                                  |
| `tests/invitation-delivery.test.ts`     | 4     | Cooldown real de reissue; recuperación de pending con la misma request; concurrencia/replay sin nuevo envío; respuesta perdida recuperada por HTTP; actor ajeno, revisión stale, OFF, expiración y revocación denegados |

Los cambios proceden de `41ea1f1` (factory canónica de comandos) y `cac5311` (recuperación de entrega).
El segundo archivo utiliza un issuer sintético local y entrega en memoria: comprobar un solo evento
de entrega en esa fixture **no acredita recepción de un correo real**.

## Entorno y reproducción

- Cluster temporal PostgreSQL16 ya existente: `/tmp/rooms-pg16-ktAkBU`, puerto `55433`.
- Base `rooms_local`, rol de aplicación `rooms_runtime`; migrator local separado para fixtures.
- Verificación previa de destino/engine y permisos negativos: CREATE de base/schema, INSERT de
  bindings/principals, UPDATE de ediciones y DELETE de audit/proofs todos denegados para runtime.
- Credenciales cargadas desde archivo0600 a memoria y entorno del proceso hijo; no se imprimieron ni
  se pasaron como argumentos de shell. La configuración `.local` y PostgreSQL18 de puerto55432 no se
  modificaron.
- Runner temporal: `/tmp/rooms-pg16-final-delta.mjs`, adaptado del harness existente para seleccionar
  exclusivamente los dos archivos. No inicializa, reinicia ni restaura clusters.
- Evidencia local: `/tmp/rooms-pg16-ktAkBU/delta-20f9fe9.log`.

Comando de prueba del proceso hijo, con las URLs locales ya cargadas en su entorno:

```sh
node --conditions=react-server --import tsx --test --test-concurrency=1 \
  tests/domain-command-executor.test.ts tests/invitation-delivery.test.ts
```

Readback del runner:

```json
{ "status": 0, "files": 2, "tests": 7, "pass": 7, "fail": 0, "skipped": 0, "duration_ms": 1013.477667 }
```

El cluster quedó inicialmente encendido e idle; root lo detuvo con pg_ctl después de recoger la evidencia. No hubo consultas cloud, despliegue,
push, envío real, cambios de candidate ni reinicios de PostgreSQL18.

## Límite de la conclusión

La evidencia acumulada es **171 pruebas del corte PG16 anterior + 7 pruebas nuevas del corte20f9fe9**.
No debe describirse como una nueva ejecución única de178 pruebas en PostgreSQL16 ni como certificación
del canary productivo. La suite completa del runtime y la integración real OIDC/OTP conservan sus
evidencias separadas.

- [TASK-2069](../../tasks/in-progress/TASK-2069-rooms-cloud-runtime-controlled-pilot.md).
- [Aislamiento cloud observado](2026-10-25-cloud-isolation.md).
- [ADR del piloto](../../architecture/rooms/EFEONCE_ROOMS_CLOUD_RUNTIME_PILOT_DECISION_V1.md).
