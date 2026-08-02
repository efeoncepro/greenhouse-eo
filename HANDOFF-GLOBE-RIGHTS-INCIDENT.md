# Incidente Globe — rights policy tie · traspaso para sesión nueva

**Estado:** Globe no genera nada. Causa raíz identificada y verificada. Fix listo, sin ejecutar.
**Fecha:** 2026-08-02

## Qué hacer al arrancar

Ejecuta los tres comandos de la sección "Fix" en orden, esperando cada run. Después verifica
(sección "Verificación"). La regla `Bash(gh workflow run:*)` ya está en `.claude/settings.local.json`.

## Causa raíz

`generated_rights_policies` tiene **dos versiones de la misma policy con `valid_from` idéntico**
(`2026-07-22T00:00:00.000Z`) en tres rutas. El resolver desplegado (`eae839b`, confirmado dentro del
SHA productivo `b062d6f`) hace ganar al `valid_from` más nuevo y **falla cerrado ante un empate** →
`generated_rights_policy_not_authorized`.

```
ref/motion/loop-v1   policyVersion=producer-rights-v1  +  policyVersion=v1   ← empate
ref/still/rrss-v1    policyVersion=producer-rights-v1  +  policyVersion=v1   ← empate
ref/voice/tts-v1     policyVersion=producer-rights-v1  +  policyVersion=v1   ← empate
ref/video/motion-v1  sin empate  → ÚNICA RUTA QUE FUNCIONÓ (último éxito hoy 07:48 UTC)
```

Origen del empate: el seed `producer-canary-*-2026-07` se corrió dos veces (recordedAt 07-22T20:07
y 07-23T10:59) con el mismo `validFrom`.

**Cero cobro en todos los fallos.** El gate niega antes de `budget.verify()`; `attempts: []`,
`spentCredits: 0`. Verificado por reader, no asumido.

## Fix — romper el empate (append-only, no borra nada, no inventa derechos)

Republicar la MISMA atestación con `validFrom` de hoy. `providerTermsRef`, `providerTermsDigest` y
`restrictions` van exactamente como están hoy.

```bash
gh workflow run globe-operator-lane.yml --repo efeoncepro/efeonce-globe -f mode=publish-rights -f lane=auto-lane -f target_sha=5afebd26c7a8d86daf3a32d44bc242335507027c -f payload='{"policyId":"producer-canary-video-2026-07","policyVersion":"producer-rights-v2-dedupe","route":"ref/motion/loop-v1","providerId":"fal","modelId":"seedance-2.0","modelVersion":"2.0","purpose":"production","appliesTo":"generated","providerTermsRef":"evidence:scripts/evidence/producer-canary-seedance-2-terms.json","providerTermsDigest":"sha256:8691144cdce0600c165df9008616f9d0b1ac09fff5f25f4f0964a24d6fb42aa1","restrictions":["human-rights-review-required","no-originality-warranty","third-party-rights-review-required"],"validDays":365}'
```

```bash
gh workflow run globe-operator-lane.yml --repo efeoncepro/efeonce-globe -f mode=publish-rights -f lane=auto-lane -f target_sha=5afebd26c7a8d86daf3a32d44bc242335507027c -f payload='{"policyId":"producer-canary-image-2026-07","policyVersion":"producer-rights-v2-dedupe","route":"ref/still/rrss-v1","providerId":"fal","modelId":"seedream-5-pro","modelVersion":"v5-pro","purpose":"production","appliesTo":"generated","providerTermsRef":"evidence:scripts/evidence/producer-canary-seedream-5-pro-terms.json","providerTermsDigest":"sha256:22af03cd42730350f8c98c8c59664eeb7acc6d309c1d553096a3172c5abf9534","restrictions":["human-rights-review-required","no-originality-warranty","third-party-rights-review-required"],"validDays":365}'
```

```bash
gh workflow run globe-operator-lane.yml --repo efeoncepro/efeonce-globe -f mode=publish-rights -f lane=auto-lane -f target_sha=5afebd26c7a8d86daf3a32d44bc242335507027c -f payload='{"policyId":"producer-canary-audio-2026-07","policyVersion":"producer-rights-v2-dedupe","route":"ref/voice/tts-v1","providerId":"fal","modelId":"elevenlabs-tts-multilingual-v2","modelVersion":"v2","purpose":"production","appliesTo":"generated","providerTermsRef":"evidence:scripts/evidence/producer-canary-elevenlabs-tts-multilingual-v2-terms.json","providerTermsDigest":"sha256:d3e999250791e2b890c1671f54823926c9ec82caacce9714546ae6339f3dd777","restrictions":["human-rights-review-required","internal-evaluation-only","no-client-delivery","no-deceptive-impersonation","no-originality-warranty","third-party-rights-review-required","voice-consent-required"],"validDays":365}'
```

## Verificación

1. Enumerar policies y confirmar que cada ruta tiene una `validFrom` estrictamente más nueva:

```bash
gh workflow run globe-operator-lane.yml --repo efeoncepro/efeonce-globe -f mode=policy-list -f lane=caller -f target_sha=5afebd26c7a8d86daf3a32d44bc242335507027c -f payload='{"limit":100}'
```

2. Generar en la UI autenticada (Chrome del operador): `https://globe.efeoncepro.com/producer`.
   Video → modo `Crear` (Seedance) y pestaña Imagen → `Crear` (Seedream). Confirmar que aparece card
   + loader, y que la pieza llega a `candidate_ready`.

3. Confirmar cobro único por generación leyendo `globe.lab.experiment.get` con el `experimentId`
   (`spentCredits`, `attempts`). Los readers se llaman desde la consola del navegador vía
   `POST /v1/readers` con el envelope
   `{schemaVersion:'1', apiVersion:'v1', reader, correlationId, workspaceSelection, query}` y headers
   `x-globe-csrf-token` (de `GET /v1/session`), `x-globe-workspace-id`, `x-globe-correlation-id`.

## Lo que NO es el arreglo de fondo

Esto restaura servicio. El defecto estructural sigue abierto y necesita task propia:

1. **Contratos incompatibles escritura/lectura.** `fa286db` hace que promover con una atestación
   corregida publique una SEGUNDA policy en el mismo scope (su test afirma `published.length === 2`),
   mientras `resolveExact` falla cerrado ante multiplicidad. El sistema crea por diseño el estado que
   su lector rechaza. Cada re-atestación mata su ruta; el TTL de 365d garantiza el solapamiento.
   Arreglo real: `superseded_by` explícito, o acotar `expires_at` de la anterior en la misma tx.
2. **Fallo pre-run invisible en la UI.** El feed proyecta *runs*; un experimento negado por el compiler
   nunca llega a ser run, así que no hay card, ni loader, ni error. El usuario ve "Solicitud enviada"
   y silencio. Contrato correcto: todo estado terminal de experimento se proyecta con su motivo.
3. **Cero señal de outage.** Nadie supo en 10h que el sistema no producía nada. Falta señal de
   reliability sobre tasa de éxito en ventana, steady != 0.
4. **No se pueden enumerar atestaciones de model-rights** por el carril gobernado: `globe.model-rights.list`
   existe en la API y el `auto-lane` tiene la capability, pero el modo no está expuesto en
   `scripts/globe-operator-lane.mjs`. Sin esa vista, este problema es invisible.

## Contexto adicional

- TASK-1633 fases 1-2 cerradas y verificadas: `47c0585`, `db8686e`, `b062d6f`, `e5385a4`, `5afebd2`,
  todos con `pnpm check` exit 0 (hasta 1.482 tests) verificado en copia aislada.
- Omni (`ref/motion/reference-v1`) lleva fallando desde el 31-jul; hoy `62337b4` la activó
  (`governed_omni_enabled: false → true`) y expuso la ambigüedad preexistente.
- Quedan 2 callsites de `createGeminiOmniTransport` con API key en `apps/studio-web/src/app.ts:4173,4175`.
  El `editTransport` tiene justificación (Generative Language rechaza OAuth); la generación simple no.
