# Rotación de llaves de firma Efeonce Auth

Dueño: Platform / Identity. TASK-1828/1833. Procedimiento preparado2026-10-25;
el scheduler automático y su ensayo están pendientes. Se reutilizan el registry y CLI existentes,
sin un segundo almacén de llaves ni llave privada exportable.

## Precondiciones

- `auth-server` y su base son compartidos por staging/producción. Una rotación cloud afecta a ambos.
- Leer `signing_keys` y `signing_key_events` por perfil autorizado y JWKS público. Registrar kid/estado/fechas,
  versión KMS e identidad del operador; son metadata, nunca material privado.
- Confirmar exactamente una active, KMS ENABLED y permiso de firma del runtime. Preparar rollback y canary
  que firma/verifica sin imprimir el token. Revisar consumers y sus cachés JWKS.
- La identidad que ejecuta `--register` o la rotación manual necesita permiso KMS `useToSign` sobre
  la versión candidata para el preflight local; una falla de ese permiso detiene la activación.
- La configuración pública `AUTH_SERVER_KMS_KEY` procede de `services/auth-server/deploy.sh`; credenciales
  PG/ADC por loaders canónicos: la CLI carga `loadGreenhouseToolEnv` y perfil `ops`. `--status` sólo necesita la conexión PG y no debe crear un cliente KMS.
- No usar `--force` en rotación rutinaria ni asumir que estar ENABLED significa que no quedan tokens vigentes.

## Secuencia manual supervisada

1. `pnpm auth-server:rotate-key -- --status`: conservar el kid anterior y las fechas.
2. El command nuevo sin argumentos crea una versión sólo con baseline verificada, 90 días cumplidos,
   ningún `retiring` y ledger disponible. Persiste la intención antes de llamar a KMS; si se pierde
   la respuesta, detiene la operación para reconciliación, sin otro create. Para recuperación manual
   de una versión **ya inventariada**, `--register <version>` comprueba firma/verificación y la
   activa; no usarlo como modo de omitir el ledger de una rotación rutinaria. Guardar metadata y eventos.
3. Verificar que JWKS publica ambas, que el registry tiene una sola active y que una firma nueva se verifica
   con la nueva llave; demostrar también que un token sintético vigente previo conserva verificación.
4. Esperar al menos `SIGNING_KEY_MIN_OVERLAP_MS` (una hora) **desde retiring_at** y el TTL máximo vigente más
   margen/cachés. No retirar si hay consumidores desconocidos o se amplió un TTL sin revisar este contrato.
5. `pnpm auth-server:rotate-key -- --retire <kid-anterior>`: exige retiring y solapamiento cumplido; leer el
   evento append-only y comprobar que JWKS deja de publicar el kid tras vencer las cachés.
6. Deshabilitar sólo la versión KMS retirada y verificada, identificada desde el registry. No destruirla.
   Confirmar que emisión, JWKS y consumers siguen funcionando y documentar tiempos efectivos.
   Deshabilitar impide volver a firmar con esa versión, pero sigue contando como versión activa para
   [facturación de Cloud KMS](https://cloud.google.com/kms/pricing); no usar este paso como control de costo.

## Job aislado aceptado, rollout pendiente (2026-10-29)

`ops-auth-key-rotate` no se encontró en el readback del 25-10. El texto histórico de TASK-1833 proponía
Scheduler OIDC → `ops-worker`; la [decisión aceptada](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md#architecture-decision-2026-10-28--mantenimiento-aislado-de-llaves-task-1833)
lo reemplaza por un Job dedicado con Scheduler OAuth → Jobs API, flag OFF, dry-run ON y Scheduler PAUSED de inicio.
No montar privilegios de administración KMS en `ops-worker`, el portal o el issuer público por inferencia
de este runbook. Hay candidato local de Job y migración, sin aplicar en cloud ni ejecutar. El
[README del Job](../../../services/auth-key-maintenance/README.md) enumera los grants, baseline y readbacks.
El comando sin argumentos de `pnpm auth-server:rotate-key` usa el ledger del candidato local y exige
baseline verificada + 90 días; `--register` sigue siendo recuperación manual supervisada de una versión
KMS existente. Un `create_uncertain` bloquea nuevas creaciones hasta reconciliación auditada.

El primer ensayo debe comprobar emisión del **issuer**, no sólo firma con la SA del Job; tras activar
una candidata, retirar/disable permanecen manuales. Un scheduler se activaría sólo después del ensayo
y recuperación verificados. La señal
`auth.keys.rotation_overdue` ayuda a detectar atraso pero no demuestra que se rotó.

## Fallos y recuperación

- Fallo antes del registro: la active anterior sigue siendo autoridad; inventariar la nueva versión sin borrar
  evidencia y recuperar la misma operación. No repetir a ciegas el comando de creación.
- Fallo después de activar: conservar ambas publicadas y diagnosticar firma/IAM/JWKS. No retirar la anterior
  para que el estado parezca limpio. La CLI puede registrar una versión existente; una retired no se reactiva.
- Metadata/JWKS inconsistente: bloquear la retirada, reparar publicación/configuración y volver a verificar.
- En compromiso real, seguir [incidente](auth-server-incident.md): rotación normal y revocación de autoridad
  son mecanismos distintos. No ejecutar el ensayo destructivo sobre usuarios reales.
