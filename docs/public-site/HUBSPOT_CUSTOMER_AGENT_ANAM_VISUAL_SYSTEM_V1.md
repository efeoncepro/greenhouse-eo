# Sistema visual editorial — Customer Agent de ANAM

> **Estado:** sistema producido localmente; hero/OG opacos y tres diagramas con canvas transparente en variantes desktop/móvil × light/dark.
> **Versión:** 1.0.
> **Fecha:** 2026-07-17.
> **Artículo:** [draft privado v4](./HUBSPOT_CUSTOMER_AGENT_ANAM_ARTICLE_DRAFT_V4.md).
> **Aprobación cliente:** [confirmada; registro interno](./HUBSPOT_CUSTOMER_AGENT_ANAM_APPROVAL_RECORD_V1.md).
> **Manifest:** [HUBSPOT_CUSTOMER_AGENT_ANAM_VISUAL_ASSET_MANIFEST_V1.json](./HUBSPOT_CUSTOMER_AGENT_ANAM_VISUAL_ASSET_MANIFEST_V1.json).
> **Regla:** ningún activo debe insinuar que el agente está activo, operativo o resolviendo conversaciones reales.

## Decisión

La pieza tendrá una portada conceptual y tres diagramas determinísticos dentro del cuerpo. El sistema funciona sin
logotipo de ANAM ni capturas del portal. Esos elementos sólo pueden incorporarse si el cliente autoriza por separado
el uso exacto.

La secuencia visual acompaña la pregunta que va resolviendo el artículo:

1. una conversación visible depende de decisiones que el cliente no ve;
2. la autonomía se ordena en cuatro zonas;
3. las 23 fuentes necesitan gobierno antes de convertirse en una respuesta;
4. una capacidad documentada o configurada todavía puede no estar operativa.

No se genera una imagen por sección. Las listas de límites, preguntas de transferencia y checklist final permanecen
en HTML para conservar accesibilidad, indexación y capacidad de copia.

## Concepto visual maestro

**Concepto:** *La conversación visible y la frontera que la sostiene*.

- **Motivo recurrente:** una línea de conversación que avanza por nodos de conocimiento, aclaración y preparación,
  y cambia de dueño al cruzar una frontera humana.
- **Medio:** portada conceptual sin interfaz; diagramas SVG determinísticos para texto, conteos, relaciones y
  estados.
- **Composición:** una conclusión por activo, sin simular pantallas de HubSpot.
- **Continuidad con el artículo 1:** conserva la idea de capas y estados de evidencia, pero cambia la gramática desde
  gráficos superpuestos hacia recorrido conversacional y cambio de responsabilidad.
- **Skin contextual:** Efeonce gobierna la firma. Un acento coral/naranja puede reconocer el contexto HubSpot, pero
  no domina la paleta ni se convierte en marca de la serie.
- **Invariantes:** conocimiento a la izquierda, responsabilidad humana claramente identificable, conectores detrás
  del texto, estados verificables y límites visibles.
- **Prohibiciones:** robots, cerebros luminosos, humanoides, globos de chat genéricos, pantallas inventadas, métricas
  de resolución, promesas 24/7, flujos que terminan siempre en automatización y cualquier logotipo generado por IA.

## Política de marca y permisos

- Usar sólo wordmarks oficiales de Efeonce desde `public/branding/`, compuestos de forma determinística.
- El wordmark Efeonce firma; no reemplaza el argumento ni invade el diagrama.
- El logo de ANAM se omite por defecto. Si se autoriza, identifica el caso y permanece separado de Efeonce.
- HubSpot puede nombrarse en texto editorial; no se reconstruye ni deforma su marca dentro de una ilustración.
- No se usan capturas del portal salvo autorización sobre el recorte final exacto y control de confidencialidad.
- Ningún dato sensible de facturación puede aparecer en imagen, metadata, filename, caption o descripción.

## Visual job map

### ANAM-CA-V01 — Portada y Open Graph

- **Slot:** featured y OG; no se repite dentro del cuerpo.
- **Contexto:** instala la tensión antes del lead.
- **Función:** mostrar en tres segundos que responder es sólo la capa visible; debajo existen conocimiento, límites
  y un cambio de responsabilidad.
- **Concepto:** una línea de conversación atraviesa una constelación ordenada de fuentes, pasa por una zona de
  aclaración y se detiene ante una frontera donde la continuidad cambia de agente a persona.
- **No es:** interfaz real, chatbot, árbol de decisión, evidencia de actividad ni promesa de resolución.
- **Tratamiento:** escena editorial vectorial determinística, opaca para conservar el skin contextual en featured y social.
- **Composición:** master `16:9` con foco dentro de safe area central `1:1`; espacio negativo para crops y chrome del
  tema.
- **Derivados previstos:** featured WebP `1600×900`; OG JPEG `1440×757`; vertical `1080×1350` sólo si se aprueba
  distribución social.
- **ALT preliminar:** `Una conversación avanza entre fuentes de conocimiento y cambia de responsable al llegar a una decisión humana.`
- **Caption:** no aplica como featured; el sentido debe sostenerse con título, ALT y composición.
- **Descartar si:** parece una pantalla de producto, una automatización sin límites o una conversación ya operativa.

### ANAM-CA-V02 — Anatomía de una conversación mixta

- **Slot:** diagrama principal dentro del cuerpo y fuente de carrusel/slide.
- **Ubicación:** después de la definición de la frontera y antes de las cinco preguntas para evaluar transferencia.
- **Función:** demostrar, sobre una consulta concreta, cómo el sistema separa intenciones, conserva contexto y cambia
  de responsable sin pedirle al cliente que reinicie la conversación.
- **Contenido exacto:**
  - consulta mixta: `cotizar agua potable + corregir una factura anterior`;
  - `Cotización → aclarar`: pedir matriz, norma y servicio sin prometer precio ni fecha final;
  - `Factura → preparar`: explicar lo documentado y reunir la referencia sin corregir ni confirmar una refacturación;
  - `Memoria + handoff`: empresa, servicio, referencia y resumen útil;
  - `Persona → decidir`: revisar la factura, confirmar la acción y asumir el compromiso.
- **No es:** conversación real, transcripción, embudo, secuencia obligatoria ni evidencia de que el handoff esté activo.
- **Tratamiento:** SVG determinístico con canvas exterior transparente, composición horizontal para desktop/tablet,
  vertical para móvil y variantes light/dark deliberadas.
- **ALT preliminar:** `Una consulta combina cotización y facturación: el agente aclara la primera, prepara la segunda y transfiere la decisión a una persona con empresa, servicio, referencia y resumen.`
- **Caption:** `Un buen handoff conserva el contexto y cambia la responsabilidad sin obligar al cliente a empezar de nuevo.`
- **Descartar si:** parece un chat real, convierte la preparación en una acción ejecutada o presenta lo humano como falla.

### ANAM-CA-V03 — Arquitectura gobernada de 23 fuentes

- **Slot:** diagrama de cuerpo.
- **Ubicación:** después del inventario de 6 archivos y 17 respuestas cortas.
- **Función:** mostrar que el valor no está en el conteo, sino en la ruta gobernada desde la fuente hasta la conducta.
- **Contenido exacto:** `6 archivos privados + 17 respuestas cortas = 23 fuentes en uso` → cuatro controles
  formulados como preguntas (`propósito · vigencia · responsable · contradicciones`) → contrato de respuesta
  (`responder · preguntar · transferir`).
- **Aclaración visible:** `356 registros técnicos` pertenecen al catálogo; no son 356 fuentes, servicios ni promesas
  de disponibilidad.
- **No es:** mapa de carpetas, inventario de documentos públicos ni diagrama de entrenamiento del modelo.
- **Tratamiento:** SVG determinístico con canvas exterior transparente y variantes desktop/móvil × light/dark;
  nodos de fuente convergen en una capa de gobierno antes de llegar a las conductas.
- **ALT preliminar:** `Veintitrés fuentes —seis archivos privados y diecisiete respuestas cortas— pasan por cuatro controles antes de responder, preguntar o transferir; 356 registros técnicos no equivalen a servicios disponibles.`
- **Caption:** `Las fuentes sólo se vuelven conocimiento útil cuando tienen propósito, vigencia, responsable y reglas para resolver contradicciones.`
- **Descartar si:** las 23 fuentes fluyen directamente a una respuesta sin mostrar gobierno o si los 356 registros
  parecen capacidades activas.

### ANAM-CA-V04 — Cadena de evidencia y punto de interrupción

- **Slot:** diagrama de cuerpo y derivado social.
- **Ubicación:** junto a la tabla que distingue documentado, elegible, configurado, probado y operativo.
- **Función:** separar la evidencia disponible, la evidencia de prueba, la dependencia que interrumpe el recorrido y
  lo que todavía debe observarse en operación real.
- **Contenido exacto:** `documentado` → `elegible en el portal` → `configurado` → `probado en vista previa` →
  `verificado en operación real`, enriquecido con `39 escenarios diseñados`, `≥24 recuperables` y `35 turnos o
  ejecuciones`; la dependencia administrativa de facturación funciona como interruptor antes de runtime.
- **Estado ANAM al corte:** llega a `probado en vista previa, con limitaciones`; `verificado en operación real = no`.
- **No es:** roadmap temporal, progreso automático ni score de éxito.
- **Tratamiento:** SVG determinístico con canvas exterior transparente y variantes desktop/móvil × light/dark.
  Evitar semáforo rojo/verde; diferenciar evidencia disponible, limitada y no obtenida sin convertirlo en juicio moral.
- **ALT preliminar:** `La evidencia llega desde documentación y configuración hasta pruebas en vista previa; una dependencia administrativa de facturación interrumpe la verificación de conversaciones nuevas, resolución, handoff y medición en operación real.`
- **Caption:** `Una configuración visible no demuestra que una conversación nueva pueda entrar, resolverse, transferirse y medirse.`
- **Descartar si:** el recorrido parece completado, minimiza el bloqueo o usa “24/7” como resultado.

## Capturas y activos opcionales

No se necesita una captura para que el artículo funcione. Si ANAM autoriza su uso, sólo se considerará una imagen
que demuestre configuración o estado y agregue algo que los diagramas no puedan expresar. Debe:

1. trabajar sobre una copia, nunca sobre la evidencia canónica;
2. eliminar navegación, usuarios, IDs, mensajes, cifras y datos sensibles;
3. conservar suficiente contexto para no inducir una lectura falsa;
4. recibir aprobación explícita de ANAM sobre el recorte final;
5. declarar que es una captura real, recortada y fechada.

Si no supera esos gates, se omite. No se reemplaza por una pantalla generada.

## Contrato de integración responsive y theme

Los tres diagramas de cuerpo se sirven mediante un único `<picture>` por `conceptId`, con este orden:

1. dark + móvil hasta `860px`;
2. light + móvil hasta `860px`;
3. dark + desktop;
4. `img` fallback light + desktop.

No se insertan dos imágenes ocultando una con CSS. Las cuatro variantes comparten ALT, caption y semántica; sólo
cambian art direction y tratamiento cromático. El alpha exterior deja actuar al fondo real del tema. El hero y el
OG permanecen opacos porque necesitan una composición cromática estable fuera del artículo.

## Alcance aprobado y límites operativos

- El caso y el uso editorial del nombre ANAM están aprobados; no se requiere un nuevo envío al cliente.
- No se utiliza logotipo de ANAM ni captura de su portal.
- La producción local está autorizada y completa.
- Los activos se integraron en Media Library y en el post privado `251432`; este paso no publica el artículo.
- Publicación o promoción pública requieren la autorización humana propia del runbook, no una nueva aprobación de ANAM.

## Producción técnica ejecutada

1. Se congelaron copy y relaciones por `conceptId`.
2. `ANAM-CA-V02–V04` se produjeron como SVG accesibles con cuatro variantes cada uno: desktop/móvil × light/dark.
3. El lienzo exterior de los diagramas es transparente; el hero/OG conserva fondo opaco.
4. Se renderizaron 13 PNG masters desde los SVG y 14 derivados de entrega: 12 WebP de cuerpo, un WebP featured y un JPEG OG.
5. Las variantes se inspeccionaron a resolución original sobre fondos `#FFFFFF` y `#111013`.
6. El alpha se verificó en PNG y WebP (`hasAlpha=true`, rango `0–255`).
7. Rutas, dimensiones, pesos y hashes viven en el manifest y en `ai-generations/2026-07-17_anam-customer-agent/build-report.json`.

## Gate actual

| Gate | Estado | Motivo |
|---|---|---|
| Verdad editorial | PASS | Los conceptos respetan hechos y límites del draft v4 |
| Función contextual | PASS | Cada activo responde una necesidad de comprensión distinta |
| Sistema visual | PASS | Concepto, branding híbrido y contratos responsive/theme verificados |
| Permiso del caso | PASS | ANAM ya aprobó el caso y su uso editorial |
| Logo y capturas | NOT REQUESTED | No son necesarios para producir la versión conceptual |
| Producción de masters | PASS | 13 masters; 12 variantes de cuerpo con transparencia real |
| Media/CMS | PASS | 14 attachments canónicos; portada, OG y tres `<picture>` integrados en el post privado `251432` |
| Render privado | CONDITIONAL PASS | Fixture filtrado por WordPress pasó desktop/móvil × light/dark; falta revisar el template Ohio con sesión autenticada |
| Verificación pública | PENDING | Sólo aplica después de una publicación autorizada |

**Estado honesto:** producción, Media Library, integración privada y readback estructural completos. El artículo
sigue privado y `noindex`; la revisión autenticada del template Ohio y cualquier verificación pública permanecen
pendientes. El estado del Customer Agent no cambia: configurado y probado en vista previa, no verificado en
operación real al corte.
