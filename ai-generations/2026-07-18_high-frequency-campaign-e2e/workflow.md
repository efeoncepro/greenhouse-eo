# Flujo profesional de idea a campaña

> El contrato canónico multi-modelo y multi-canal vive en
> `docs/operations/GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md`. Este archivo documenta su
> ejecución concreta en la campaña “Alta frecuencia”.

Este run valida el núcleo visual, pero una operación seria necesita gobernar también estrategia, evidencia, derechos, distribución, medición y aprendizaje. La unidad de producción no es “un prompt”: es un paquete trazable que puede aprobarse, regenerarse, activarse y auditarse. `offline` y `off-branding` son ejes distintos: el primero describe canal; el segundo, presencia de marca.

## Extensión validada: Seedream + GPT Image 2 + Gemini Omni

`Seedream Lite diverge → Seedream Pro desarrolla → humano aprueba anchor → GPT organiza stills → Gemini Omni anima un clean plate → postproducción añade marca/copy/captions → QA digital/print/OOH/motion`

Gemini Omni no sustituye a Seedream ni GPT en stills. Recibe el plate limpio 9:16 y abre el carril temporal.
El primer proof real entregó 3,008 s a 720×1280, H.264 + AAC, con un solo colibrí y sin firma visible.

La matriz final contiene 18 piezas still branded —12 digitales y 6 proofs A2/OOH— más dos hero motion
de 15 s, dos masters de 10 s y dos bumpers de 6 s. Los hero usan el shot Omni aprobado, claims exactos y
una pared determinista de formatos reales; no requirieron inferencia adicional. El clip inicial de 3 s queda clasificado sólo como smoke test técnico,
no como pieza profesional. Los proofs offline no se declaran press-ready hasta recibir ICC, bleed, trim,
sustrato y especificación del proveedor.

La pared de formatos usa tres assets release reales —4:5, 9:16 y 16:9— y vive en el beat `10.2–12.5 s`
de ambos heroes. La EDL completa de la familia 15/10/6 s está en `brief/motion-15s-edl.md`.

## Operating loop

| Fase | Pregunta de control | Evidencia mínima | Gate |
|---|---|---|---|
| 1. Intake | ¿Qué conducta o percepción debe cambiar? | objetivo, audiencia, oferta, claim, canal, owner | brief aprobado |
| 2. Constraints | ¿Qué no puede variar? | brand kit, derechos, copy exacto, formatos, safe zones, riesgos | production contract |
| 3. Divergence | ¿Qué familias visuales compiten? | 3–6 territorios realmente distintos, costo y provenance | shortlist |
| 4. Selection | ¿Cuál explica mejor la promesa? | scorecard y razones de rechazo | una dirección |
| 5. Anchor | ¿Qué imagen fija el sistema? | identidad, paleta, luz, silueta, copy field e invariantes | anchor aprobado |
| 6. Derivation | ¿Cómo cambia por canal sin perder identidad? | handoff por formato, crop contract, topología estrella | plates aprobados |
| 7. Composition | ¿Qué debe ser exacto? | copy, logo, legal, URL y layout determinísticos | masters |
| 8. QA | ¿Es correcto técnica y visualmente? | dimensiones, peso, color, safe zones, legibilidad, anatomía, hashes | PASS/BLOCK |
| 9. Release | ¿Qué recibe media/cliente? | naming, CSV, alt text, contact sheet, package, approvals | creative release |
| 10. Activation | ¿Cómo sabremos si funciona? | audiencia, landing, UTMs, pixel/CAPI, KPI, presupuesto, experiment cells | launch approval |
| 11. Learning | ¿Qué se conserva y qué se reemplaza? | resultados por asset/message/audience, fatigue, decision log | next iteration |

## Model routing validado

- **Seedream 5 Lite — divergir:** tres territorios en paralelo. Conviene para buscar mecanismos visuales y lenguaje antes de pagar refinamiento.
- **Seedream 5 Pro — desarrollar:** una única dirección seleccionada. En este run mejoró material, atmósfera, copy field y coherencia de la estela.
- **GPT Image 2 — derivar:** recompuso el anchor para 3:4→4:5, 9:16 y 16:9→3:1 con restricciones específicas. Cada derivado salió del mismo anchor.
- **Sharp + fontkit — hacer exacto:** trazó copy Poppins, aplicó el logo oficial, hizo crops, color space, compresión, naming y hashes.
- **FFmpeg — cerrar motion sin nueva inferencia:** montó heroes, format wall, end cards, audio, posters y
  exports; los heroes tienen costo generativo incremental USD 0.

No se elige un ganador universal. Se asigna a cada modelo el trabajo en que tiene más valor y se protege el relevo con un contrato.

## Contratos que hacen escalable el sistema

1. **Anchor contract:** ID del sujeto, anatomía, paleta, luz, material, fondo, hook visual y zonas de copy.
2. **Handoff contract:** source hash, rol de la referencia, variables editables, invariantes, prohibiciones, formato y criterio de aceptación.
3. **Format contract:** tamaño de trabajo, release size, crop window, safe zones de plataforma y ubicación del contenido.
4. **Exact-content contract:** copy, logo, URL, legal y tipografía nunca dependen del modelo generativo.
5. **Lineage contract:** request/model/seed cuando exista, prompt, timestamps, usage, costo, hashes y parent asset.
6. **Release contract:** naming, color space, peso máximo, matriz, alt text, QA y aprobación.

## Qué faltaba considerar y queda incorporado

### Estrategia y evidencia

- definir objetivo, audiencia, etapa de funnel y oferta antes de producir volumen;
- separar una propuesta de servicio de una promesa cuantificada;
- mantener un registro de claims y evidencia; en este test no se inventaron cifras;
- distinguir “creative-ready” de “ready to launch”.

### Derechos, seguridad y marca

- confirmar derechos de logo, fuentes, referencias y likeness;
- registrar términos/licencia comercial vigentes de cada proveedor;
- no enviar datos sensibles ni material de cliente a un modelo sin un path autorizado;
- fijar retención, región de procesamiento y política de borrado si la campaña contiene material reservado;
- hacer revisión humana de anatomía, estereotipos, brand safety y usos sensibles.

### Operación y confiabilidad

- usar un source of truth para el brief y un ID estable por campaña/message/format/version;
- separar work files, masters y release files;
- idempotencia: composición y QA deben repetirse sin volver a pagar generación;
- retries acotados, budgets, rate limits, timeouts y fallback explícito, nunca silencioso;
- topología estrella desde el anchor para limitar drift y permitir regeneración parcial;
- guardar source hashes, no URLs efímeras ni secretos.

### Diseño para canal

- validar specs oficiales el día de producción;
- reservar UI-safe zones, no sólo respetar el aspect ratio;
- evaluar a tamaño real y thumbnail, no sólo en el master;
- contemplar versiones con/sin copy, localización y copy expansion;
- generar alt text y verificar legibilidad/contraste;
- evitar que una adaptación mecánica recorte el sujeto o haga irrelevante el hook.

### Release y medición

- preparar naming, matriz de assets, owner, approval y changelog;
- definir landing, UTMs, conversion event, pixel/CAPI, KPI primario y guardrails;
- diseñar celdas que aíslen variables: message × visual × audience, sin cambiar todo a la vez;
- medir hook/CTR/CVR/CPA y fatiga por asset; archivar el aprendizaje junto al anchor;
- no escalar spend sólo porque el set se ve consistente.

## Prueba ejecutada

| Medida | Resultado |
|---|---:|
| Llamadas generativas release | 9: 7 still + 2 clean masters motion |
| Llamadas generativas experimento | 10: release + 1 probe técnico excluido |
| Territorios | 3 |
| Anchor | 1 |
| Source plates | 3 |
| Piezas still release | 18 |
| Piezas motion release | 6 |
| QA técnica | PASS |
| Assets dentro de su budget por canal | 18/18 still + 6/6 motion |
| Fallbacks invocados | 0; Seedance quedó planificado sólo si Omni fallaba fidelidad espacial/temporal |
| Costo generativo del release | USD 2.9650 |
| Costo total del experimento, incluido probe 3 s | USD 3.3550 |
| Costo incremental de heroes 15 s | USD 0.0000 |
| Package V3 SHA-256 | `13a84dbbffd9be389c2304fbc5360c3410cd5d91b2a45e5b14ae372e2322d24b` |

La primera composición no pasó directamente a release. La revisión humana detectó copy sobre el ala y elementos fuera de la zona segura 9:16. La segunda composición corrigió ambos problemas y recién entonces pasó QA. Esto confirma que un pipeline profesional requiere render + inspección, no sólo validación de esquema.

La extensión a 15 s validó otra regla: cuando la toma ya contiene la verdad visual, duración profesional
no significa pedir al modelo un clip más largo. El hero se construyó como arco de cinco beats: motion,
beneficio, sistema, demostración multi-formato y resolución. El audio necesitó compresión y normalización
medida; el primer limiter dejó inter-sample peaks y fue reemplazado antes del PASS.

Los seis MP4 tienen loudness y peak medidos. Sólo los heroes comparten target −16 LUFS; masters y bumpers
conservan audio de referencia (`−19.0…−30.7 LUFS`) y requieren mezcla/escucha humana por canal antes de
traffic. Esta diferencia es deliberadamente visible en QA y no se oculta como un PASS vacío.

## Rationale de fallback motion

Seedance reference-to-video era la ruta de contingencia si Gemini Omni introducía clones, cambiaba la
identidad del colibrí, rompía el set o no entregaba continuidad utilizable. Omni era la primera mano porque
el anchor de esta campaña es una escena visual flexible —sin practical, copy o logo exacto dentro del plate—
y sus dos clean masters pasaron revisión temporal. Por eso Seedance no se invocó; no hubo fallback silencioso,
ni costo asociado. Si el gate hubiese fallado, la autoridad de reapertura era dirección creativa y el gasto
Seedance requería una aprobación nueva.

## Siguiente prueba recomendada

Para pasar de demostración a sistema de producción:

1. producir una campaña real con audiencia/offer/landing definidas;
2. crear dos anchors deliberadamente distintos, no sólo tres mensajes sobre uno;
3. diseñar una matriz de experimentación donde sólo cambie una variable por celda;
4. activar con spend controlado y recuperar rendimiento por asset ID;
5. convertir el ganador en una familia localizable y medir consistencia, costo marginal y fatigue.
