# Operar el worker privado de medios de Rooms

El Job `rooms-media-worker` está desplegado en `efeonce-group`, región `us-east4`. Una ejecución reclama
como máximo un trabajo de la cola y termina. No existe scheduler ni proceso continuo. La aplicación
web conserva medios, invitaciones y acceso first-party desactivados.

## Estado comprobado

- Imagen fijada por digest; CPU 1, memoria 1Gi, timeout 240 segundos, cero reintentos y paralelismo 1.
- SA exclusiva sin claves; acceso al secreto de su rol SQL únicamente.
- Rol `rooms_media_worker`: máximo dos conexiones, sin privilegios altos y con writes por tabla/columna.
- Siete migraciones y 25 tablas en `rooms_production`. La instancia compartida conserva backup y PITR.
- Una ejecución con cola vacía y otra con un PNG físico terminaron correctamente; la segunda produjo dos WebP. [Canary real y cierre OFF](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md).

Evidencias: [Job](../../audits/rooms/2026-10-26-media-worker-deployment.json),
[base de datos](../../audits/rooms/2026-10-26-media-database-infra.json),
[almacenamiento y permisos](../../audits/rooms/2026-10-26-media-storage-infra.json).

## Consultar

```sh
gcloud run jobs describe rooms-media-worker --project=efeonce-group --region=us-east4
gcloud run jobs executions list --job=rooms-media-worker --project=efeonce-group --region=us-east4 --limit=5
```

Usar el perfil Google Cloud autorizado y comprobar proyecto, SA, imagen y configuración antes de ejecutar.
Los recibos públicos no incluyen secretos, tokens ni identificadores personales del operador.

## Ejecución finita autorizada

```sh
gcloud run jobs execute rooms-media-worker --project=efeonce-group --region=us-east4 --wait
```

Cada ejecución puede producir costo. `processed:false` acredita cola vacía; `processed:true` sólo indica
que se atendió un candidato: comprobar el estado final del asset y sus derivados antes de declararlo listo.
No repetir automáticamente una ejecución incierta. Revisar ejecución, lease y estado SQL antes de reintentar.
El timeout puede dejar una lease pendiente de vencimiento; el fencing impide confirmar un resultado obsoleto.

## Base de datos y configuración

El script `scripts/rooms/provision-cloud-media-database.ts` usa el perfil admin canónico para crear el rol,
y el migrador propio de Rooms para su schema. Por defecto es un plan de lectura; `--apply` exige autorización
y verifica hashes de las siete migraciones. Usa ADC del operador y refs de Secret Manager; nunca recibe
contraseñas en SQL ni argumentos. No inicializa otra vez la contraseña de un rol existente.

Las variables GCS del proyecto Vercel están preparadas para el próximo deploy. No se reconstruyó la
aplicación por este bloque. [Configuración](../../audits/rooms/2026-10-26-media-vercel-configuration.json).

La transferencia y el canary conjunto con Efeonce ID ya se comprobaron con un archivo físico y el único
correo autorizado; no repetir ese envío por inferencia. Antes de activar medios de forma general faltan
el consumidor frontend y una decisión explícita sobre el disparo del Job. No activar un scheduler,
`--loop`, flags web ni envío de correos por el solo hecho de tener infraestructura lista.
