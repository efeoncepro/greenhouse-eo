# Globe Producer — rollout interno y canarios V1

Este runbook promueve el Creative Producer interno sin abrir acceso comercial. La evidencia vive en Greenhouse; el
código, workflows e imágenes viven en `efeonce-globe`.

> **Gate de lifecycle:** mientras `globe_operating_state=hibernated`, este procedimiento no se ejecuta:
> no despierta Cloud SQL, no reanuda schedulers y no dispara canarios facturables. Primero sigue
> [`GLOBE_DEEP_HIBERNATION_RUNBOOK_V1.md`](GLOBE_DEEP_HIBERNATION_RUNBOOK_V1.md), transita
> `hibernated → draining → active`, verifica cada readback y confirma autorización explícita de gasto.
> La documentación y los dry-runs que no requieren runtime pueden continuar sin reactivar Globe.

## Precondiciones

- SHA exacto revisado en `main`; `pnpm check`, `pnpm build`, OpenTofu validate y contratos IaC verdes.
- Rollback baseline capturado para API, web y Jobs.
- Notification channels de alertas definidos; no aceptar el default vacío para rollout operativo.
- Fal key ya existente en Secret Manager y valores de todos los secretos purpose-separated disponibles por el
  canal gobernado, sin imprimirlos ni pasarlos por argumentos, artifacts o tfvars.
- Revisión humana firmada de readiness y políticas de derechos exactas. El audio Seed Audio permanece
  `internal-evaluation-only` y `no-client-delivery` mientras fal no publique una licencia comercial verificable.

## Secuencia obligatoria

1. Ejecutar un bootstrap acotado de Terraform que cree **sólo los containers** de secretos que aún no existan. No
   reemplazar Cloud Run en esta fase: sus referencias a `latest` fallan cerrado mientras un container no tenga versión.
2. Crear por el canal gobernado al menos una versión de cada secreto referenciado por web/API/worker. Incluye los
   dominios independientes de output retrieval, UI delegation, CSRF, credits, library confirmation, library export
   retrieval, model readiness, public share y voice map; private ingest se agrega antes de encender provenance.
3. Aplicar Terraform completo con Jobs, schedulers, BFF, provenance y mutaciones de library apagados.

   🔴 **Un `tofu apply` desde un checkout limpio DESTRUYE el entorno de desarrollo.**
   `development_environment_enabled` tiene default `false` en git y el entorno **vivo** depende de un
   `terraform.tfvars` **gitignoreado**: el plan reporta **`20 to destroy`** con todo en verde. El plan honesto
   es

   ```bash
   tofu plan -var development_environment_enabled=true \
     -var 'development_operator_principal=user:julio.reyes@efeonce.org'
   ```

   y **`0 to destroy` es la condición para aplicar**. El arreglo de fondo —que el estado real de un flag no
   puede vivir en un archivo sin trackear— es de `TASK-1635`. Esta fase crea
   service accounts, IAM DB users, buckets privados, alertas e invocadores; no crea periodicidad activa.
4. Aplicar migraciones `0004…0022` con el workflow serializado y verificar checksum/readback exacto de
   `0022_regional_edit_mask_authority.sql`, sin entradas `legacyUnverified`.
5. Ejecutar los grants exactos de producer-worker y asset-governance con readback. Ninguno puede recibir `DELETE`,
   DDL, ownership, `BYPASSRLS`, `ALL TABLES`, default privileges ni acceso a tablas fuera de su allowlist.
6. Construir API, web, producer-worker y asset-governance desde el mismo SHA; registrar digests inmutables. Ningún
   job se promueve sin workflow guardado que pinnee remote `main`, digest y rollback baseline.
7. Desplegar web/API con callback Fal público estrecho y verificar API IAM-private, raw-body/signature relay,
   audience y replay negativos.
8. Publicar por commands operator-only: tenancy, grants, budget/credits, readiness firmada, políticas de derechos,
   bindings de ruta y circuitos cerrados. No sembrar esas tablas por SQL ad hoc.
9. Provisionar los Jobs y sus schedulers explícitamente pausados (`enable_*_scheduler=true`,
   `*_scheduler_paused=true`), activar primero un workspace canario y disparar ejecuciones one-shot manuales.
   Despausar cada Scheduler sólo después del smoke, métricas y notification channels verdes.
10. Ejecutar `pnpm producer:canary` en dry-run. 🟢 **El dry-run es de COSTO CERO** y ya valida readiness, route,
    circuito, derechos y estimate de **las tres** modalidades: es el primer diagnóstico ante cualquier duda de
    disponibilidad, no el último recurso.

    ```bash
    export GLOBE_CANARY_BASE_URL=<url del api>
    export GLOBE_CANARY_WORKSPACE_ID=greenhouse-org:efeonce
    export GLOBE_CANARY_RUN_LABEL=<etiqueta de la corrida>
    export GLOBE_CANARY_ID_TOKEN=$(gcloud auth print-identity-token \
      --impersonate-service-account=greenhouse-globe-caller@efeonce-globe.iam.gserviceaccount.com \
      --audiences=$GLOBE_CANARY_BASE_URL --include-email)

    pnpm producer:canary                                               # dry-run, 0 créditos
    pnpm producer:canary --execute --approve=image:N,video:N,audio:N   # ~32 créditos
    ```

    ⚠️ `--execute` **exige las tres modalidades**: menos de tres aborta con
    `producer_canary_three_approvals_required`, así que no existe un canary barato de una sola. Y
    `GLOBE_CANARY_RUN_LABEL` se valida **sólo** en la rama `--execute` — un dry-run verde no prueba que el
    execute vaya a arrancar.

    🔴 **Nunca escribas una expresión de cron literal dentro de un comentario de bloque de un script.** Su
    barra-asterisco cierra el comentario y el entrypoint deja de parsear: el canary estuvo roto un día entero
    con `pnpm check` VERDE, porque la suite importa la librería y no el script. El guard que parsea todos los
    `scripts/*.mjs` existe por eso.

    ⚠️ **Presupuesto y paciencia.** El CLI exige las **tres** aprobaciones y corre las tres modalidades
    (~32 créditos); no se puede acotar a una sin editar la librería. Su paciencia es de **45 min**, deliberadamente
    holgada sobre la latencia real (~7,9 min desde que el cron de Asset Governance corre cada minuto; eran
    ~20-25 con `*/5`, y con ese cron el canary abortaba a los 20 min sobre corridas sanas). **Un canary cuya
    paciencia queda por debajo de la latencia real enseña a leer «timeout» como normal**, que es exactamente
    cómo un cuelgue de verdad pasa desapercibido — revísala cuando cambie una cadencia. Debe publicar `ready: true`, migration mínima `0022`, estimates
   vigentes y cero command de
   gasto.
11. Ejecutar tres approvals separados y exactos: imagen 1× estándar, video 4 s/720p/sin audio y audio MP3/44.1 kHz
    interno. El arnés debe usar catálogo → estimate → prepare → execute → reader durable → descriptor/retrieval.
12. Repetir la operación desde el browser autenticado por el BFF same-origin: la UI debe emitir los mismos command IDs
    y readers canónicos, con workspace delegado y CSRF válidos. El canario HTTP directo no reemplaza esta prueba.
13. Verificar hashes, MIME, byte size, governance terminal y reproducción/rendering dentro de la UI. Capturar GVC
    1440, 390 px, teclado y reduced motion con los assets reales, incluidos Frames, Movimiento, Cambiar voz y Traducir.

## Rollback

Detener Scheduler y poner flags OFF antes de mover tráfico. Ejecutar rollback compare-and-set sólo contra la
revisión/digest capturada; preservar migrations, jobs, quarantined assets y evidencia. No borrar outputs para
simular recuperación. Confirmar que API/web vuelven al baseline y que ninguna cola continúa reclamándose.

## Cierre

Registrar SHA, digests, revisiones, migrations, commands/correlation IDs sanitizados, créditos estimados/gastados,
hashes de outputs, resultado de governance y capturas. `TASK-1505` sólo puede cerrar cuando los tres assets se ven y
operan en la UI por el mismo camino de commands/readers.

Estado live y gaps: [GLOBE_RUNTIME_HANDOFF.md](GLOBE_RUNTIME_HANDOFF.md). Triage de alertas:
[GLOBE_PRODUCER_ALERT_TRIAGE_V1.md](GLOBE_PRODUCER_ALERT_TRIAGE_V1.md).
