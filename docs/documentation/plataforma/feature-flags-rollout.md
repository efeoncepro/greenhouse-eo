# Feature Flags y Rollouts Graduales — Como Greenhouse activa features sin redeployar

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-04 por agente (TASK-780)
> **Ultima actualizacion:** 2026-05-04
> **Documentacion tecnica:** [GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md](../../architecture/GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md)

---

## Que es esta plataforma

Greenhouse usa **feature flags** para activar variantes de la interfaz (por ejemplo, "home V2 con KPI cards" vs "home legacy") sin tener que volver a desplegar el portal. Las flags son banderas que viven en una tabla de Postgres y que el portal consulta antes de decidir que mostrarle a cada usuario.

Antes de esta plataforma, las flags eran variables de entorno (env vars) que se seteaban manualmente en Vercel. Cambiar una flag requeria editar la configuracion en Vercel y esperar a que se redeployara el portal. Eso significaba:

- No se podia probar una feature solo con un cliente piloto.
- Si una feature rompia algo, no habia forma rapida de apagarla para un solo usuario afectado.
- Cada feature nueva acumulaba env vars en Vercel.
- Diferencias entre staging y produccion eran invisibles hasta que alguien las miraba con lupa.

El incidente que detono esta solucion: el 2026-05-04 staging mostraba la home V2 nueva y produccion mostraba la home legacy vieja. Ambas con el mismo codigo. La diferencia era una env var que existia solo en staging.

---

## Que problema resuelve

Tres problemas concretos:

### 1. Activar una feature gradualmente

Antes habia que decidir "encendido para todos" o "apagado para todos". Ahora se puede:

- **Activarla para un solo cliente piloto** (ej. Sky Airlines mientras los demas siguen con la version anterior).
- **Activarla para un rol especifico** (ej. solo administradores ven el experimento).
- **Activarla para un usuario** (ej. el equipo de QA prueba antes que el resto).

### 2. Apagar algo roto en segundos

Si una feature nueva tiene un bug, antes habia que hacer un redeploy de emergencia para volver atras (5-15 min). Ahora se puede apagarla con una sola query SQL o un POST al endpoint admin. Cambio efectivo en menos de 30 segundos sin tocar el deploy.

### 3. Detectar drift automaticamente

El sistema misma se vigila: si la flag de Postgres dice "encendido" pero la env var dice "apagado" (puede pasar durante una transicion), aparece una alerta en el panel de **Reliability** del Admin Center. Si demasiados usuarios optan por la version anterior (mas del 5%), tambien alerta — eso significa que la nueva version tiene una regresion de UX.

---

## Como funciona desde el lado del usuario

El usuario no ve nada raro. Cuando entra a `/home`:

1. El portal consulta la tabla de flags en Postgres.
2. Decide en menos de 1 milisegundo que variante mostrarle.
3. Si la base de datos esta caida por un minuto, el portal usa una "red de seguridad" (el valor de la env var) para no quedar bloqueado.
4. Si todo falla, muestra la version legacy (la mas estable, la que esta probada hace meses).

El usuario tambien tiene control: puede ir a Configuracion y marcar "prefiero la version anterior". Esa preferencia personal sobreescribe la decision global.

---

## Como funciona desde el lado del operador

### Activar una feature globalmente

Via SQL:

```sql
INSERT INTO greenhouse_serving.home_rollout_flags
  (flag_key, scope_type, scope_id, enabled, reason)
VALUES
  ('home_v2_shell', 'global', NULL, TRUE, 'Activamos V2 en produccion');
```

Via endpoint admin (preferido):

```bash
curl -X POST https://greenhouse.efeoncepro.com/api/admin/home/rollout-flags \
  -H 'Cookie: __Secure-next-auth.session-token=...' \
  -d '{"flagKey":"home_v2_shell","scopeType":"global","scopeId":null,"enabled":true,"reason":"Cutover V2"}'
```

### Probar solo con un cliente

```sql
-- Encender V2 para Sky, todo el resto sigue en legacy
INSERT INTO greenhouse_serving.home_rollout_flags VALUES
  (DEFAULT, 'home_v2_shell', 'tenant', '<id-de-sky>', TRUE,
   'Piloto Sky', NOW(), NOW())
ON CONFLICT DO UPDATE SET enabled = TRUE;
```

### Apagar para un usuario que reporto un bug

```sql
-- Rollback inmediato para usuario X
INSERT INTO greenhouse_serving.home_rollout_flags VALUES
  (DEFAULT, 'home_v2_shell', 'user', '<user-id>', FALSE,
   'Bug X reportado, vuelve a legacy', NOW(), NOW())
ON CONFLICT DO UPDATE SET enabled = FALSE;
```

El cambio se ve en maximo 30 segundos. No hace falta redeploy.

### Ver el estado actual

```sql
SELECT flag_key, scope_type, scope_id, enabled, reason
FROM greenhouse_serving.home_rollout_flags
ORDER BY scope_type, scope_id;
```

---

## La regla de precedencia

Cuando hay multiples flags que aplican a un mismo usuario, gana la mas especifica:

1. Si hay una fila para ese usuario → manda la del usuario.
2. Si no, pero hay una para su rol → manda la del rol.
3. Si no, pero hay una para su tenant → manda la del tenant.
4. Si no, pero hay una global → manda la global.
5. Si no hay ninguna → la feature esta apagada (default conservador).

---

## Que se vigila automaticamente

En el Admin Center, modulo **Smart Home Surface**, aparece la señal `home.rollout.drift`. Esta señal monitorea tres cosas:

1. **Falta la fila global**: alguien borro la fila base, hay que recrearla.
2. **Postgres y env var no coinciden**: hay riesgo de que un fallback rinda variante distinta a la esperada.
3. **Mas de 5% de usuarios eligio legacy**: regresion UX en la version nueva.

Estado normal: `severity=ok`. Cualquier alerta requiere intervencion del operador.

---

## Que NO va a esta plataforma

No todas las flags van aqui. Estas plataformas estan separadas a proposito:

- **Crons criticos / async-critical paths**: viven en `vercel.json` o Cloud Scheduler. No se pueden flag-ear dinamicamente.
- **Flags fiscales**: cambios de calculo contable requieren migracion + cutover formal, nunca un toggle dinamico.
- **Secrets**: pasan por GCP Secret Manager.

---

## Como agregar una flag nueva

Cuando emerge una variante de UI nueva (por ejemplo `home_v3_shell` o `dashboard_experimental`):

1. Migracion que extiende el `CHECK` constraint de `flag_key` para aceptar el nombre nuevo.
2. Agregar el nombre al type `HomeRolloutFlagKey` en TypeScript.
3. Agregar tests que cubran la nueva variante.
4. Considerar admin UI eventualmente (hoy se gestiona por SQL o curl).

Esto fuerza que cada flag nueva quede registrada en una migracion explicita — evita typos silenciosos.

---

## Como se quita una flag legacy

Cuando una variante nueva queda como default permanente (por ejemplo, V2 reemplaza completamente a legacy despues de 30 dias estables):

1. Verificar que `home.rollout.drift` haya estado en `severity=ok` 30 dias seguidos.
2. Verificar que los errores Sentry de `home_version=v2` sean iguales o menores a los de `legacy`.
3. Crear TASK derivada para el cutover: borra el codigo legacy, borra la env var, simplifica el page.
4. Outbox event `home.v2_rollout_completed` para auditoria.

Nunca se hace silencioso. Siempre via TASK con review.

---

## Que pasa si Postgres se cae

Si la base de datos primaria deja de responder, el resolver no rompe la pagina. Hace lo siguiente:

1. Intenta leer Postgres → falla.
2. Intenta leer la env var `HOME_V2_ENABLED` como red de seguridad.
3. Si la env var dice `true`, renderiza V2.
4. Si la env var dice `false` o no esta seteada, renderiza legacy (default conservador, "fail closed").

La home nunca queda en estado roto.

---

## Comparacion con el sistema de bloques

Hay otra tabla relacionada: `home_block_flags` (creada por TASK-696). Esa controla **kill-switches por bloque dentro de la home V2** — por ejemplo, apagar el bloque "Pulse Strip" sin apagar todo el shell V2.

| Tabla | Que controla | Cuando se usa |
|---|---|---|
| `home_rollout_flags` | Variante de shell completa (V2 vs legacy) | Activar / desactivar la home nueva globalmente o por cliente |
| `home_block_flags` | Bloque individual dentro del shell | Apagar un bloque especifico que tiene un bug sin tirar todo |

Las dos tablas existen a proposito. Mezclarlas habria mezclado responsabilidades de dueños distintos (UI vs plataforma).

---

## Trade-offs honestos

- **Cache de 30 segundos**: cualquier cambio se ve en maximo 30 segundos. Para rollback de emergencia inmediato (p0) habria que invalidar el cache manualmente — es un edge case raro.
- **Una sola instancia de Postgres**: si Cloud SQL primary se cae, dependemos de la env var de Vercel como red de seguridad. Aceptable mientras la SLA de Cloud SQL se mantenga > 99.9%.
- **Threshold opt-out 5%**: conservador. Si llega a `error`, hay que investigar regresion UX, no descartar como ruido.

---

> **Detalle tecnico:** Para entender el contrato API, los CHECK constraints, el resolver TS y los tests, ver [GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md](../../architecture/GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md). Codigo fuente:
>
> - Migration: `migrations/20260504102323120_task-780-home-rollout-flags.sql`
> - Resolver: `src/lib/home/rollout-flags.ts`
> - Mutations: `src/lib/home/rollout-flags-store.ts`
> - Endpoint admin: `src/app/api/admin/home/rollout-flags/route.ts`
> - Reliability signal: `src/lib/reliability/queries/home-rollout-drift.ts`
