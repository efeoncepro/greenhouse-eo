# Efeonce Marketing Studio — Fuente única de verdad e ingesta de finales (ADR)

> **Status:** `Accepted` (2026-09-26). Implementación y rollout por tasks (TASK-1894, TASK-1899, TASK-1895); nada de
> este ADR está en runtime todavía.
> **Date:** 2026-09-26
> **Deciders:** Julio Reyes (operador). Redacción: Claude.
> **Owner:** Efeonce Marketing Studio (EPIC-049)
> **Scope:** dónde vive la verdad de campañas, piezas, versiones y finales; por qué puertas entra un final a Studio;
> corte de autoridad desde OneDrive/SharePoint; aprobación de versiones.
> **Reversibility:** `two-way-but-slow` — las puertas se apagan por flag y la ingesta desde OneDrive sigue disponible
> como backfill; lo caro de revertir es la costumbre del equipo, no el código.
> **Confidence:** `high` en la dirección; `medium` en límites de tamaño y en la fecha de corte por campaña.
> **Validated as of:** 2026-09-26 (runtime de TASK-1893 y TASK-1896 en producción; bucket, worker y descarga firmada verificados).
> **Complementa:** [`EFEONCE_STUDIO_API_FIRST_DECISION_V1.md`](../EFEONCE_STUDIO_API_FIRST_DECISION_V1.md) (API-first y
> paridad UI → API → MCP, que siguen vigentes). **Reemplaza** la regla transitoria «OneDrive es la fuente y Studio una
> proyección reimportable» de la [arquitectura](EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md) §7 e invariante 9.
> **Programa:** [`EPIC-049`](../../epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md)

## 1. Contexto

El operador preguntó cómo funciona el trabajo diario: las campañas avanzan, y todos los días se agregan piezas,
imágenes, videos y audios nuevos. Hoy (TASK-1893):

- Los finales de Studio son una **proyección reimportable** de la biblioteca «Documentos» del sitio SharePoint
  «Growth Marketing», carpeta `Alineación/5. Contenidos/15. Paid Media`, sincronizada en una Mac como
  `OneDrive-EfeonceGroupSpA/Alineación/…` (drive `b!NCVSY5SdKk298eaCBM4StxDsnjwqVoxDtrUXqCNRhoiBXdKJEFPxTLtaamF9K2pz`,
  sitio `efeonce.sharepoint.com,63522534-9d94-4d2a-bdf1-e68204ce12b7,3c9eec10-562a-438c-b6b5-17a823518688`).
- La ingesta (`pnpm import:catalog` + `pnpm media:ingest`) corre **a mano, desde una sola máquina**, leyendo esa
  carpeta sincronizada.
- `5. Contenidos` contiene mucho más que campañas (evergreen, grilla, blog, ebooks, branding, editables…), y «final»
  se **infiere por la ubicación** del archivo en una carpeta.
- Ya existe todo lo que un final necesita en GCS: bucket privado `efeonce-marketing-studio-originals` direccionado por
  sha256, con versionado y soft delete de 30 días; tabla `studio.media_object`; worker
  `marketing-studio-media-worker` que reacciona a `OBJECT_FINALIZE` → Pub/Sub y genera derivados; descarga por URL
  firmada V4 auditada; derechos por versión.

Lo que falta es decidir **quién manda**: si Studio refleja OneDrive, o si OneDrive es taller y Studio registra.

## 2. Drivers de la decisión

1. **Una sola fuente por dato.** Un final, su versión, sus derechos y su aprobación no pueden vivir en dos lugares.
2. **Ninguna máquina es infraestructura.** Una ingesta que depende de una Mac con OneDrive montado no escala ni sobrevive a vacaciones.
3. **«Final» es una decisión humana, no una carpeta.** Renombrar o mover un archivo no puede crear ni borrar un final.
4. **Full API Parity.** Lo que hace la UI lo hacen la API y los agentes por MCP, con el mismo command.
5. **Integridad verificable.** Toda versión se prueba por su sha256 recalculado sobre los bytes.
6. **Fricción mínima.** Si subir cuesta más que soltar un archivo en OneDrive, el equipo vuelve a OneDrive.

## 3. Opciones consideradas

### A. Espejar SharePoint/OneDrive con Microsoft Graph (delta queries programadas) — **rechazada como fuente**

| Pros | Contras |
|---|---|
| Cero cambio de hábito: el equipo sigue soltando archivos donde siempre | Studio hereda renombres, archivos sobrescritos y convenciones de carpeta como si fueran hechos |
| Elimina la dependencia de una máquina | «Final» se sigue infiriendo de una ruta; un archivo movido por error desaparece como final |
| Graph expone delta y hashes | `5. Contenidos` mezcla campañas con evergreen, grilla, blog, ebooks, branding y editables: el espejo necesita reglas de exclusión frágiles |
| | Sin actor auditado: nadie «entregó» la pieza, sólo apareció |
| | Derechos y aprobación seguirían sin lugar natural |

Una lectura por Graph puede existir **sólo** como backfill o reconciliación puntual (por ejemplo, detectar finales que
quedaron fuera), nunca como fuente ni como proceso programado de ingesta.

### B. Studio + GCS como fuente única, con puertas explícitas — **aceptada**

| Pros | Contras |
|---|---|
| Un final existe porque una persona lo entregó, con actor, sha256 y derechos | Cambia un hábito: el equipo tiene que subir, no sólo soltar |
| Reutiliza lo ya construido en TASK-1893 (bucket, `media_object`, worker, derivados, descarga) | Necesita subida firmada, CLI y tools de escritura (TASK-1894/1899) |
| Un solo command sirve a CLI, MCP y UI (parity por construcción) | Hasta el corte conviven dos regímenes por campaña |
| Integridad y auditoría nativas | Archivos grandes exigen subida reanudable |

### C. Dejarlo como está (ingesta manual desde una Mac) — **rechazada**

No escala, no audita quién entregó, y deja «final» atado a una carpeta.

## 4. Decisión

### 4.1 Fuente única de verdad

- La base de Studio (`marketing_studio`, schema `studio`) es dueña de campañas, conceptos, piezas, versiones,
  derechos, aprobaciones y evidencia de publicación.
- El bucket privado `efeonce-marketing-studio-originals` (y su par `-staging`) es dueño de los **bytes** de los
  finales: objeto `originals/sha256/<2 primeros hex>/<sha256>`, versionado, soft delete 30 días, nunca sobrescrito.
- **OneDrive/SharePoint pasa a ser el taller del equipo** (editables, borradores, exploración). Un final existe para la
  plataforma **sólo cuando entró a Studio**.

### 4.2 Un command, tres puertas

Un único command de dominio (nombre de trabajo **`createAssetVersion`**, ruta bajo `/api/v1`, tool
`studio.asset.version.create`) crea toda versión, venga de donde venga:

- **Idempotente** por sha256 + `Idempotency-Key`; `If-Match` sobre la `revision` de la pieza para concurrencia.
- Registra el **actor** (la persona) y escribe `audit_event`.
- Exige **derechos mínimos** al subir (al menos el tipo de licencia, `rights_license_kind`).
- Dispara los derivados con el mecanismo existente (`OBJECT_FINALIZE` → Pub/Sub → `marketing-studio-media-worker`).

**Subida en dos pasos.** (1) Se pide una URL firmada V4 de subida, acotada a un solo objeto
`originals/sha256/<2>/<sha256>` y condicionada a que no exista (`ifGenerationMatch=0`); para video grande, sesión
reanudable. Si el sha256 ya está almacenado, no hay subida: se pasa directo al paso 2. (2) El cliente sube los bytes
directo a GCS y confirma. Studio **verifica tamaño, mime (allowlist y firma de bytes) y sha256 recalculado** antes de
crear la versión; si no coinciden, rechaza y el objeto se descarta. Los bytes **nunca** pasan por Vercel ni por MCP.

Puertas:

1. **CLI** `pnpm studio:upload <archivo> …`, usable desde cualquier máquina con credencial de persona.
2. **Tools MCP de escritura** para agentes en Codex y Claude (p. ej. `studio.asset.upload.request` +
   `studio.asset.version.create`), con **clase de scope de escritura propia** y la **identidad delegada de la
   persona**: el actor auditado es la persona, nunca el gateway. El binario nunca viaja dentro de una llamada MCP; el
   agente sube a la URL firmada.
3. **UI de Studio** (TASK-1895), consumidora de los mismos commands.

### 4.3 Inferencia de metadata

CLI y agentes infieren campaña, concepto, formato y número de versión desde la convención canónica de nombre
(`CMP001-02 - <título> - 4x5.png`) y el catálogo, y **sólo preguntan lo que no pueden inferir**. El tipo de licencia es
obligatorio: si no se puede inferir, se pregunta.

### 4.4 La aprobación sigue siendo humana

Una versión nueva entra **pendiente de revisión**. La aprobación la decide una persona en Studio, o la ejecuta un
agente con la identidad delegada de esa persona y confirmación explícita (`dryRun` → `confirm`). Roles que aprueban:
`efeonce_admin`, `efeonce_account`, `efeonce_operations` (capability `marketing_studio.campaign.approve`). Subir
exige la capability `marketing_studio.asset.write` (roles que escriben: los tres anteriores y `designer`, que sube
pero nunca aprueba) y, en la API, un scope de escritura de assets.

### 4.5 Corte de autoridad

- El corte se declara **por campaña y con fecha**: primero las campañas nuevas, después las existentes.
- Desde su fecha de corte, en esa campaña **un final existe sólo si entró a Studio**.
- `pnpm media:ingest` desde OneDrive queda **sólo para backfill de historia** y se retira cuando termine el backfill.
- Una señal **«pieza aprobada sin original en Studio»** hace visibles los huecos.

### 4.6 Lo que no se construye

No se construye un espejo de SharePoint/OneDrive por Microsoft Graph. Está explícitamente fuera del plan.

## 5. Contrato runtime (fuente de verdad)

| Qué | Dónde |
|---|---|
| Metadata, versiones, derechos, aprobación, auditoría | `marketing_studio.studio.*` (`asset`, `asset_version`, `media_object`, `audit_event`; columnas de corte en `campaign` que define TASK-1894) |
| Bytes de finales | `gs://efeonce-marketing-studio-originals/originals/sha256/<2>/<sha256>` (y `-staging`) |
| Command | `createAssetVersion` en `packages/domain` (repo `efeonce-marketing-studio`), registrado en `packages/contracts/src/operations.ts` con su tool de clase `write` |
| Derivados | `marketing-studio-media-worker` (sin cambios de contrato) |
| Capabilities | `marketing_studio.asset.write`, `marketing_studio.campaign.approve` (Greenhouse, sembradas con grant en el mismo PR) |

## 6. Consecuencias

**Positivas.** Un solo lugar donde preguntar si una pieza es final; actor y derechos en cada versión; agentes que
entregan piezas con la misma garantía que una persona; ninguna máquina en el camino crítico; OneDrive queda libre
para trabajar sin miedo a «publicar» por mover un archivo.

**Negativas y riesgos, con su mitigación:**

| Riesgo | Mitigación |
|---|---|
| Adopción: el equipo sigue dejando finales sólo en OneDrive | Fecha de corte por campaña + señal «pieza aprobada sin original en Studio» |
| Fricción al subir | Inferencia por nombre y catálogo; campos obligatorios mínimos |
| Archivos grandes | Subida reanudable directa a GCS; límites de tamaño por tipo |
| Seguridad | URLs firmadas de vida corta y acotadas a un objeto; bucket privado (PAP `enforced`, UBLA); capability de escritura + capability de aprobación; alcance por organización; 404 anti-oráculo |
| Nombre de objeto «ocupado» con bytes que no corresponden al sha256 declarado | Verificación del sha256 recalculado antes de crear la versión; el objeto que no coincide se descarta |
| Rollback | Puertas apagables por flag; el backfill desde OneDrive sigue posible |

**Neutras.** OneDrive conserva editables y borradores; Studio no los indexa.

## 7. Evaluación en cuatro pilares

| Pilar | Evaluación |
|---|---|
| Seguridad | Ningún binario por MCP ni por Vercel; URL firmada por objeto y de vida corta; escritura y aprobación separadas; persona como actor auditado; anti-oráculo por organización |
| Robustez | Idempotencia por sha256 + `Idempotency-Key`; `If-Match`; sha256 recalculado; `ifGenerationMatch=0`; allowlist de mime por extensión y firma |
| Resiliencia | Subida reanudable; worker con reintentos y DLQ existentes; puertas apagables; backfill desde OneDrive como red de seguridad |
| Escalabilidad | Bytes directo a GCS (sin cuello en funciones web); deduplicación por contenido; derivados asíncronos en Cloud Run |

## 8. Invariantes para agentes

- **NUNCA** inferir «final» por la carpeta de OneDrive/SharePoint en que está un archivo.
- **NUNCA** pasar binarios dentro de una llamada MCP ni a través de una función web: los bytes van directo a GCS por URL firmada.
- **NUNCA** crear una versión sin sha256 recalculado sobre los bytes y coincidente con el declarado.
- **NUNCA** aprobar sin una persona: un agente aprueba sólo con la identidad delegada de esa persona y confirmación explícita.
- **NUNCA** registrar al gateway o a un agente como actor de una escritura; el actor es la persona.
- **NUNCA** construir un espejo programado de SharePoint/OneDrive por Graph; una lectura por Graph sólo sirve para backfill o reconciliación puntual.
- **NUNCA** usar `media:ingest` desde OneDrive para una campaña después de su fecha de corte.
- **SIEMPRE** el mismo command (`createAssetVersion`) para CLI, MCP y UI.
- **SIEMPRE** derechos mínimos (tipo de licencia) al subir.
- **SIEMPRE** preguntar sólo lo que no se puede inferir del nombre canónico y del catálogo.

## 9. Mapa de implementación

| Task | Qué entrega |
|---|---|
| TASK-1893 (complete) | Bucket de originales, `media_object`, worker de derivados, descarga firmada: la base sobre la que se construye |
| TASK-1894 | Command `createAssetVersion`, URL firmada de subida, CLI `studio:upload`, derechos al subir, corte por campaña y señal |
| TASK-1899 | Tools MCP de subida y aprobación, clase de scope de escritura, identidad delegada, `dryRun` → `confirm` |
| TASK-1895 | UI de subida, revisión y aprobación, consumidora de los mismos commands |

Espejo por Graph: **no planificado**.

## 10. Rollback

Apagar las puertas por flag (CLI, tools y UI dejan de aceptar subidas); revocar el scope de escritura de assets a
todo `api_client`; volver una campaña a régimen OneDrive revirtiendo su corte y usando `media:ingest` como backfill.
Los objetos ya almacenados no se borran (versionado + soft delete).

## 11. Preguntas abiertas (deliberadamente no decididas aquí)

1. **Fecha de corte por campaña** — la fija el operador campaña por campaña.
2. **Límites de tamaño** por tipo (imagen, video, audio, PDF) y umbral para exigir subida reanudable.
3. **Dónde se recalcula el sha256** de archivos grandes (función web con límite vs. worker con confirmación
   asíncrona). No negociable: ninguna versión existe con un sha256 declarado y no recalculado.
4. **Limpieza de subidas sin confirmar** (objeto en el bucket sin `media_object`): plazo y mecanismo.
5. **Si las salidas de Globe entran por la misma puerta** (tool de subida con identidad delegada) o por una
   integración propia.

## 12. Revisar cuando

- La adopción, medida por la señal «pieza aprobada sin original en Studio», no baje tras dos campañas cortadas.
- Aparezca un volumen de video que haga inviable la subida firmada desde equipos del equipo.
- Studio se abra a clientes externos que entreguen piezas (cambia el modelo de derechos y de actor).

## 13. Referencias

- [Arquitectura de Marketing Studio](EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md) §7 y §7.2
- [ADR API-first de Studio](../EFEONCE_STUDIO_API_FIRST_DECISION_V1.md)
- [TASK-1893](../../tasks/complete/TASK-1893-marketing-studio-original-asset-store-media-worker.md) · TASK-1894 · TASK-1895 · TASK-1899 (en `docs/tasks/to-do/`)
- [Runtime handoff](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md) §Originales y worker
