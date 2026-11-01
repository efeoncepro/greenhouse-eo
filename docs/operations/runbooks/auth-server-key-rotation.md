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
- La configuración pública `AUTH_SERVER_KMS_KEY` procede de `services/auth-server/deploy.sh`; credenciales
  PG/ADC por loaders canónicos: la CLI carga `loadGreenhouseToolEnv` y perfil `ops`. `--status` sólo necesita la conexión PG y no debe crear un cliente KMS.
- No usar `--force` en rotación rutinaria ni asumir que estar ENABLED significa que no quedan tokens vigentes.

## Secuencia manual existente

1. `pnpm auth-server:rotate-key -- --status`: conservar el kid anterior y las fechas.
2. Con identidad autorizada y configuración completa, `pnpm auth-server:rotate-key`: crea una versión KMS,
   registra/activa la nueva y pasa la anterior a retiring. Guardar metadata y eventos de transición.
3. Verificar que JWKS publica ambas, que el registry tiene una sola active y que una firma nueva se verifica
   con la nueva llave; demostrar también que un token sintético vigente previo conserva verificación.
4. Esperar al menos `SIGNING_KEY_MIN_OVERLAP_MS` (una hora) **desde retiring_at** y el TTL máximo vigente más
   margen/cachés. No retirar si hay consumidores desconocidos o se amplió un TTL sin revisar este contrato.
5. `pnpm auth-server:rotate-key -- --retire <kid-anterior>`: exige retiring y solapamiento cumplido; leer el
   evento append-only y comprobar que JWKS deja de publicar el kid tras vencer las cachés.
6. Deshabilitar sólo la versión KMS retirada y verificada, identificada desde el registry. No destruirla.
   Confirmar que emisión, JWKS y consumers siguen funcionando y documentar tiempos efectivos.

## Automatización pendiente

`ops-auth-key-rotate` no se encontró en el readback25Oct. El contrato previsto es SchedulerOIDC → ops-worker
con flagOFF y jobPAUSED iniciales, antigüedad >80d, exclusión mutua e idempotencia durable de ventana,
creación/registro/verificación y retirada separada tras solapamiento. No montar privilegios de administración
KMS en el issuer público. Reintentos después de fallo deben recuperar la misma operación/version sin crear
versiones indefinidas ni activar una llave cuya firma no se verificó. Esta descripción **no es implementación**.

El scheduler se activa sólo después del ensayo y rotación manual verificados. La señal
`auth.keys.rotation_overdue` ayuda a detectar atraso pero no demuestra que se rotó.

## Fallos y recuperación

- Fallo antes del registro: la active anterior sigue siendo autoridad; inventariar la nueva versión sin borrar
  evidencia y recuperar la misma operación. No repetir a ciegas el comando de creación.
- Fallo después de activar: conservar ambas publicadas y diagnosticar firma/IAM/JWKS. No retirar la anterior
  para que el estado parezca limpio. La CLI puede registrar una versión existente; una retired no se reactiva.
- Metadata/JWKS inconsistente: bloquear la retirada, reparar publicación/configuración y volver a verificar.
- En compromiso real, seguir [incidente](auth-server-incident.md): rotación normal y revocación de autoridad
  son mecanismos distintos. No ejecutar el ensayo destructivo sobre usuarios reales.
