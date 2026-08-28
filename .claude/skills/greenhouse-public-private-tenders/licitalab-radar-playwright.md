# Radar LicitaLAB con Playwright + MCP + HubSpot

Usa este companion cuando el operador pida descubrir **licitaciones públicas** desde la interfaz autenticada de
LicitaLAB, analizarlas con su MCP y convertir sólo las seleccionadas en pipeline comercial.

## Alcance de la fuente

**LicitaLAB ve licitaciones públicas solamente.** En este flujo no es un agregador de RFP/RFQ privados ni un
reemplazo de Wherex, SAP Ariba, Coupa u otros portales corporativos. Toda fila descubierta en LicitaLAB conserva:

- `origin='public_tender'` al promoverla a `Proposal`;
- naturaleza `public_opportunity` en el radar canónico;
- organismo comprador público, código externo y enlace/evidencia de la fuente pública;
- bases y anexos oficiales como autoridad de admisibilidad, alcance, fechas y evaluación.

Las modalidades, tipos de procedimiento o países que exponga LicitaLAB siguen siendo contratación pública. Nunca
reclasifiques una oportunidad de LicitaLAB como `private_rfp` por el nombre, por una etiqueta de “cotización” o por
el mecanismo de compra. El radar privado se opera por sus propios companions y fuentes.

## Contrato del flujo

```text
Playwright autenticado (discovery público de códigos)
        ↓ reporte local protegido
LicitaLAB MCP (ficha → documentos → preguntas evidence-first)
        ↓ screening + admisibilidad + delivery + margen
confirmación humana de candidata
        ↓
public_opportunity / Proposal canónicos
        ↓ propuesta exacta de cambios CRM
confirmación humana de write
        ↓
HubSpot company + deal + asociación + readback
```

Playwright no reemplaza al MCP ni decide el fit. El MCP no descubre el listado general ni escribe en HubSpot. El
score de LicitaLAB es una señal de priorización, nunca un GO. Ninguno de los dos carriles aporta oportunidades
privadas.

## Autenticación local

El runner prefiere reutilizar la sesión del perfil aislado. Si expiró, usa la credencial local:

```bash
pnpm licitalab:radar:setup
pnpm licitalab:radar
```

El setup solicita correo y clave en una terminal interactiva y oculta la clave. Guarda la credencial únicamente en
`.auth/licitalab-auth-credentials.json`, con permisos `0600`; Chrome conserva su sesión en
`.auth/licitalab-auth-profile`. Ambos permanecen ignorados por Git. Nunca copies credenciales, cookies, tokens o
storage state al chat, logs, documentación o commits.

La sesión web `app.licitalab.cl` y el OAuth del MCP son autoridades distintas. Ver una no demuestra que la otra esté
vigente.

## Ejecución

```bash
pnpm licitalab:radar -- --check-only
pnpm licitalab:radar -- --view recommended --max-opportunities 50
pnpm licitalab:radar -- --view all --max-opportunities 200
pnpm licitalab:radar -- --force-login
```

El reporte público queda bajo `.auth/licitalab-radar-reports/`, con permisos `0600`, y contiene código, título,
score, organismo comprador, región, monto y cierre visibles. El runner:

- no crea ni modifica filtros o vistas;
- no descarta, recomienda o abre negocios;
- no descarga adjuntos;
- no participa ni presenta ofertas;
- no crea empresas ni deals en HubSpot.

## Análisis de candidatas

Para cada código que parezca relevante:

1. `findOpportunityTool`: confirma ficha, estado, comprador, monto y fechas.
2. `listOpportunityDocumentsTool`: inventaría bases y anexos.
3. `getOpportunityDocumentTool`: consulta admisibilidad, alcance, evaluación, garantías, pagos, experiencia y
   riesgos; exige archivo/página y respeta `ok | partial | indexing | empty | unsupported | error`.
4. Evalúa fit contra catálogo vigente, capacidad de delivery y loaded cost. Si falta evidencia, deja
   `sin evidencia suficiente`; si falta margen, corresponde `NO-BID`.
5. Presenta al operador candidatas priorizadas, condicionadas y no-bid. No promociones todas las filas del radar.

## Handoff a HubSpot

El alta CRM ocurre sólo después de que el operador seleccione una candidata:

1. Resuelve o crea primero la organización/organismo comprador mediante el writer canónico; nunca una identidad
   paralela ni una empresa privada ficticia para representar al organismo.
2. Busca company y deal por RUT/nombre del organismo, título y código externo.
3. Lee pipelines, stages, owners y propiedades vigentes desde HubSpot.
4. Muestra la tabla exacta de writes propuestos y solicita confirmación explícita.
5. Tras confirmar, crea o actualiza company/deal y su asociación por el bridge/MCP canónico.
6. Relee IDs, propiedades y asociación. Una respuesta HTTP verde sin readback no prueba el estado final.

La oportunidad pública sigue el ADR de ownership: discovery es un espejo re-sincronizable; el estado del bid vive en
`Proposal`. La promoción a `origin='public_tender'` es human-gated y referencia `publicOpportunityId`. HubSpot es la
proyección CRM del lifecycle, no la fuente de documentos ni del score.

### Contrato de promoción a HubSpot

Antes de cada operación relee esquema, pipelines, stages y opciones live del portal Efeonce. Snapshot observado el
2026-08-28 en portal `48713323`:

| Propiedad                               | Semántica                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id_de_licitacion`                      | Código externo exacto. Es la clave funcional del proceso, pero HubSpot no la marca unique.     |
| `ficha_de_licitacion`                   | URL directa de LicitaLAB para abrir la ficha/postulación.                                      |
| `fecha_de_cierre_de_licitacion`         | Deadline oficial de presentación, convertido desde la timezone de la fuente.                   |
| `closedate`                             | Fecha esperada de resolución/cierre comercial; nunca se copia desde el deadline.               |
| `modalidad_de_venta`                    | `Licitación` o `Compra ágil`, según el procedimiento público observado.                        |
| `dealtype`                              | `newbusiness` o `existingbusiness`, según la relación vigente con la cuenta.                   |
| `pipeline_bucket`                       | `Core Pipeline`, `Strategic Bets` u `Opportunistic / Administrative`.                          |
| `pipeline` / `dealstage`                | Pipeline y etapa live; no los deduzcas desde documentación histórica.                          |
| `gh_idempotency_key` / `gh_deal_origin` | Control técnico de retries y origen; el bridge debe admitir el carril público antes de usarlo. |

`closedate` y `fecha_de_cierre_de_licitacion` representan hechos distintos. En el snapshot, 97 de 99 deals con
enlace LicitaLAB caían en días diferentes; una coincidencia histórica no autoriza a acoplarlos.

#### Deduplicación y resolución de identidad

1. Normaliza código y país en una llave estable, por ejemplo
   `hubspot-public-tender:CL:1082957-26-LE26`; no alteres el valor visible de `id_de_licitacion`.
2. Busca el deal por `id_de_licitacion` exacto y por `gh_idempotency_key`:
   - uno → reutiliza/actualiza;
   - más de uno → bloquea y presenta los duplicados;
   - cero → continúa con la resolución de Company.
3. Resuelve primero Organization/Party por el RUT/RUC/NIT entregado por LicitaLAB MCP y luego Company mediante
   `gh_commercial_party_id`. El snapshot no mostró una propiedad RUT/Tax ID de Company; no inventes otra identidad.
4. Como fallback de discovery, combina nombre legal exacto y dominio institucional específico. `gob.cl` o
   `www.gob.cl` son dominios genéricos y nunca bastan para fusionar organismos.
5. Si hay una Company, reutilízala. Si hay varias plausibles, detén el write. Si no hay ninguna, muestra la creación
   propuesta y espera confirmación.
6. Asocia contactos sólo cuando exista una persona real verificable. Nunca crees “Contacto Licitación” u otra
   persona ficticia para llenar el campo.

#### Clasificación Core / Bet

La relación con la cuenta tiene precedencia sobre el canal:

```text
¿La Company es cliente vigente / el deal es existingbusiness?
├─ sí  → pipeline_bucket = Core Pipeline
└─ no
   ├─ modalidad_de_venta = Licitación → Strategic Bets
   └─ modalidad_de_venta = Compra ágil → policy_required
```

Una licitación de un cliente existente continúa siendo Core. Una licitación pública o privada de una cuenta nueva
es Strategic Bet. El bucket de Compra Ágil nueva no está decidido: nunca uses el histórico como sustituto de esa
decisión. `pipeline_bucket` es distinto de `pipeline`; en el snapshot live, los 99 deals LicitaLAB estaban en el
pipeline `default`, aunque sus buckets variaban.

#### Pipeline y etapa inicial

La oportunidad no entra a HubSpot sólo por aparecer en el radar. Se crea después de selección humana, GO y
admisibilidad básica en `Pipeline de ventas` (`pipeline='default'`) y `Calificado para comprar`
(`dealstage='qualifiedtobuy'`, probabilidad live 25%). No uses `Cita programada` como default: una licitación no
implica una reunión comercial y ese valor falsea el estado. `HubSpot Shared Selling Pipeline` pertenece a
co-selling/deal registration y no recibe licitaciones Efeonce.

| Etapa                      | `dealstage`             | Uso en licitaciones                                                 |
| -------------------------- | ----------------------- | ------------------------------------------------------------------- |
| Cita programada            | `appointmentscheduled`  | No usar por default.                                                |
| Calificado para comprar    | `qualifiedtobuy`        | Alta después de GO, selección y admisibilidad básica.               |
| Presentación de soluciones | `presentationscheduled` | Oferta técnica en elaboración o presentación planificada.           |
| Sample Sprint / Validación | `1356915244`            | Sólo cuando las bases solicitan muestra, demo, piloto o validación. |
| Precios y terminos         | `decisionmakerboughtin` | Oferta económica y condiciones terminadas.                          |
| Listo para firma           | `contractsent`          | Adjudicada; espera contrato, orden de compra o formalización.       |
| Cierre ganado              | `closedwon`             | Adjudicación formalizada o aceptada.                                |
| Cierre perdido             | `closedlost`            | No adjudicada, inadmisible, retirada o vencida después del GO.      |

Snapshot live del 2026-08-28: los 99 deals con enlace LicitaLAB estaban en `default`; 95 en `closedlost`, 3 en
`closedwon`, 1 en `appointmentscheduled` y ninguno en las etapas intermedias. Ese histórico no define el workflow:
la regla nueva parte en `qualifiedtobuy` y avanza según evidencia del bid.

#### Propose → confirm → write → readback

La propuesta de cambios debe mostrar Company/Contact/Deal existentes, IDs, valores actuales y valores nuevos. Tras
la confirmación:

1. upsert Company canónica, sólo si falta;
2. upsert deal idempotente con ID, ficha, ambas fechas, modalidad, `dealtype`, bucket, pipeline/stage, owner, monto y
   moneda;
3. asegura Deal ↔ Company;
4. cuando corresponda, asegura Contact ↔ Company y Contact ↔ Deal;
5. relee el deal y cada asociación. Un create 2xx sin readback no cierra el flujo.

#### Estado del bridge observado

El `POST /deals` actual ya deduplica por `gh_idempotency_key`, exige una Company y asegura Deal ↔ Company más un
contacto opcional. Sin embargo, el contrato vigente sólo admite `origin='greenhouse_quote_builder'` y no acepta
`id_de_licitacion`, `ficha_de_licitacion`, `fecha_de_cierre_de_licitacion`, `modalidad_de_venta` ni
`pipeline_bucket`; tampoco crea/resuelve Company o asegura Contact ↔ Company. Esto es una brecha a implementar, no
una capacidad shipped. Hasta extender bridge + contrato + cliente + tests + readback live, usa este bloque como
contrato objetivo y no como autorización para escribir por un bypass.

El snapshot de calidad es evidencia fechada, no invariante: 129 deals tenían ID de licitación; 99 enlazaban a
LicitaLAB; no aparecieron IDs duplicados normalizados; 86 de esos 99 no tenían contactos asociados. Repite el audit
antes de migrar, corregir o automatizar.

## Fallos y recuperación

| Señal                         | Acción                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Login visible                 | Ejecuta `licitalab:radar:setup`; no pidas pegar la clave en código o documentos.                |
| Desafío adicional             | Resuélvelo en el Chrome visible del perfil aislado; no intentes saltarlo.                       |
| Cero códigos detectados       | La UI cambió o la vista está vacía; calibra selectores y separa fallo técnico de ausencia real. |
| MCP `indexing`/`partial`      | Reintenta y conserva documentos pendientes; no cierres fit como si hubieras leído todo.         |
| Duplicado CRM posible         | Detén el write, busca por código/comprador y presenta candidatos al operador.                   |
| Falta de margen/admisibilidad | No promociones el bid aunque el score de LicitaLAB sea alto.                                    |

## Verificación mínima

```bash
node --test scripts/__tests__/licitalab-radar.test.mjs
pnpm licitalab:radar -- --check-only
pnpm licitalab:radar -- --view recommended --max-opportunities 20
```

El canary es exitoso cuando el runner autentica, abre `/search`, detecta códigos reales, crea un reporte local
protegido y no ejecuta ningún write.
