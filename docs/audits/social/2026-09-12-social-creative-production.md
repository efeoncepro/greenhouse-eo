# Producción creativa social: skill y prueba Día de Muertos

Fecha: 2026-09-12. Encargo del operador: ampliar la capacidad de idea, desarrollo, dirección visual,
conectores, flujos multistep, logos/tipografías y product placement; aplicarla al ejemplo existente.

## Resultado y alcance

Actualización local de `social-media-studio` en Codex y Claude. Entrada:
[módulo 11](../../../.codex/skills/social-media-studio/modules/11_TRENDJACKING_CREATIVE_PRODUCTION.md),
[conectores](../../../.codex/skills/social-media-studio/references/social-production-connectors.md),
[plantilla](../../../.codex/skills/social-media-studio/templates/social-creative-production.md) y
[casos de evaluación](../../../.codex/skills/social-media-studio/references/creative-review-cases.md).
El guard existente `pnpm skills:mirrors` incorpora este bundle completo para detectar divergencia futura.

La prueba estática se entregó como `proof-only`. No hay publicación, programación ni aprobación humana
inferida. No se certifica aquí capacidad de performance de trendjacking, video ni generación por todos los
conectores. La ocasión cultural es una **seasonality**, sin afirmación de tendencia activa.

## Diagnóstico y decisiones

| Defecto del proceso anterior | Corrección incorporada |
|---|---|
| Saltar de concepto a prompt | oportunidad → rutas por mecanismo → layout/brand pack antes de generar |
| Tratar «premium» como estilo suficiente | convertir intención en cámara, gesto, material, luz, foco y lectura |
| Maquetar encima de cualquier foto | reservar espacio real y regiones protegidas; recomponer plate cuando falta |
| Nombre de fuente en CSS tomado como prueba | fuente real → instancia de ejes → glifos/trazados → raster revisado |
| Firma superpuesta llamada product placement | separar firma editorial de logo proyectado sobre soporte físico |
| Más herramientas como sinónimo de calidad | elegir por defecto pendiente, con locks, críticas y stop condition |
| Catálogos/controladores antiguos | discovery por superficie y distinguir catálogo, schema, job y output |
| Checklist usado como aprobación | separar QA técnica, crítica del agente, revisión humana y resultado de audiencia |

Se preservó el WIP previo: la incorporación de Bricolage y las reglas existentes sobre objetos rituales no se
revirtieron. Se retiró el supuesto universal de 24–72 horas de vida de un trend y se volvió explícita la
limitación de muestra en lugar de inventar observaciones para cumplir una cuota.

## Prueba aplicada: La silla que guarda un lugar

**Brief fijado:** audiencia mexicana de nivel medio-alto, 9:16, tono cinematográfico; copy «HAY AUSENCIAS QUE
SE SIENTAN.», Bricolage dominante y logo blanco oficial. El operador retiró «Día de Muertos» como descriptor;
se conserva esa decisión. Poppins no se fuerza porque no existe texto de apoyo necesario.

**Mecanismo:** ausencia/literalización. La silla vacía vuelve física una ausencia; la persona prepara un lugar.
El oficio demostrado es dirección de arte y narrativa visual. La afinidad de audiencia/atribución a Efeonce es
una hipótesis creativa: no se midió recuerdo de marca ni intención de compartir.

Tratamientos evaluados: mantener la firma editorial del baseline; integrar la marca en una libreta; convertir
la silla en soporte de marca. Se produjo la libreta y se descartó marcar la silla por distraer del vacío central.
Se compararon dos layouts del mismo copy: tres renglones con pausa e indentación, y apertura + palabra dominante.
Se seleccionó el segundo por separar mejor texto y ofrenda; no porque haya una prueba de performance.

### Cadena real

1. Motor nativo, edición desde el clean plate existente: recomposición del campo de texto y libreta de trabajo
   sin marca en la parte frontal de la mesa, separada de alimentos y ofrenda.
2. Inspección: el soporte salió cortado por el borde derecho. Segundo pase localizado para mostrar la cubierta
   completa. Se conservó el concepto y se revisó el resto de la escena; no se afirma igualdad pixel a pixel.
3. Composición local: Bricolage real a trazados con fontkit; blanco oficial de `public/branding/logo-negative.svg`
   proyectado mediante homografía sobre la cubierta. Un solo logo, sin recuadro azul ni texto generado.
4. Dos layouts determinísticos → comparación → selección `compacta` → export 1080 × 1920 y revisión 390 px.
5. Contraste bajo glifos, bounds/safe envelope, copy, dimensiones y hashes; apertura ≥11.40:1, titular ≥6.12:1,
   logo ≥10.72:1 bajo el método del script. No equivale a certificación WCAG de Instagram.

El input generativo es 941 × 1672; export usa resize moderado a 1080 × 1920. No se hizo upscale generativo:
no había una necesidad visible de inventar microdetalle. El motor nativo no expone aquí su modelo interno.
Higgsfield se verificó por lectura de recomendaciones/schema; Magnific por herramientas y catálogo TTI,
sin ejecutar generación/upscale en esos conectores.

### Artefactos locales de exploración

Directorio: `.captures/concepts/dia-de-muertos-social-v5/` (ignorado por Git; disponible en este checkout).

- `compacta.png` / `compacta-390.png`: prueba seleccionada y vista móvil.
- `compacta.svg`: composición con texto vectorial y capa de logo proyectada.
- `editorial.png` / `comparativa.png`: alternativa y comparación.
- `clean-plate.png`, `logo-projected.png`: capas.
- `compose.mjs`, `verify.mjs`, `composition.json`, `qa.json`: reproducción, fuente, geometría y evidencia.

Fuentes de generación: imágenes `exec-a1c52aca-ec08-42b2-8bbf-e1ab013dc865.png` y
`exec-40c8c603-1a68-4394-a9d3-2adf03f94415.png` del directorio de imágenes generadas de esta tarea
`01a095fb-9416-7da3-8e76-2f62524cbae4`. Conservar los originales. Los prompts completos quedan en la tarea;
el expediente registra las operaciones y sus límites.

La composición exploratoria no amplía el Campaign Layout Compiler V1. Se verificó que su contrato actual
no expone ejes variables por línea ni homografía de marca; no se falsificaron approvals para usarlo.
No se creó otro compositor de producción.

## Arquitectura y documentación

Contrato de capas/manos ya vigente:
[Multimodal Campaign Production](../../operations/GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md) y
[Campaign Layout Compiler](../../architecture/GREENHOUSE_CAMPAIGN_LAYOUT_COMPILER_V1.md).
Carga bajo demanda y espejos: [ADR de contexto](../../architecture/GREENHOUSE_AGENT_CONTEXT_ROUTER_DECISION_V1.md).
Este cambio desarrolla el oficio de una skill dentro de esas fronteras; no crea runtime, provider, permiso,
ledger, fuente de verdad o aprobación nueva. No requiere ADR adicional. Las extensiones futuras de runtime
o compiler deben pasar su propio análisis.

## Validación y siguiente evaluación

- Verificación real de la composición con `verify.mjs`, master y preview móvil abiertos.
- Paridad completa con `pnpm skills:mirrors`; sintaxis del guard y `git diff --check`.
- QA y cierre documental se ejecutan sobre archivos propios; el detector general también ve WIP de UI/secrets
  ajeno, que no pertenece a esta actualización documental.
- Los escenarios de reacción B2B, producto y video de la referencia son pruebas de transferencia pendientes,
  no ejecuciones exitosas. La aprobación visual del operador y el desempeño de audiencia siguen pendientes.

Fuentes: [investigación aplicada](../../../.codex/skills/social-media-studio/references/trend-production-sources.md).

## Corrección del operador: placement v5 rechazado y prueba v6

La revisión técnica de v5 NO verificó adecuación visual: el operador rechazó el logo por alargamiento y
acabado pegado. Sus métricas anteriores son sólo comprobaciones de archivo, no aceptación del placement.
Causa: coordenadas UV con ancho/alto arbitrarios y tratamiento superficial sin materialización.

V6 usa el plate limpio y el PNG del logo oficial como referencias del motor nativo. Se solicitó foil blanco
con bajorrelieve poco profundo, contacto, grano y luz coherentes, preservando la escena. No se usó Higgsfield
ni Magnific para generar esta versión. Resultado:
`/Users/jreye/.codex/generated_images/01a095fb-9416-7da3-8e76-2f62524cbae4/exec-07e42e0e-1e2a-42a1-9d4d-a25d8487670a.png`.

Se incorporó después el overlay `compacta-type.svg` con glifos Bricolage reales de v5, sin volver a proyectar
el logo. Archivos locales en `.captures/concepts/dia-de-muertos-social-v6/`: `material-plate.png`, `final.png`,
`mobile.png` y `detalle-marca.png`. Final 1080×1920, sRGB. Inspeccionados móvil y detalle: se observa borde
oscuro de profundidad y marca integrada en cubierta. La generación no garantiza identidad vectorial;
la aprobación del operador sigue pendiente. No se añadió el descriptor Día de Muertos.

El nuevo canon de oficio es `social-media-studio/references/brand-in-scene.md`, con fuentes primarias Adobe
sobre Vanishing Point, displacement, decal y material de logo en Substance. Distingue material 3D,
composición fotográfica completa y edición generativa guiada; invalida la regla universal de añadir toda
marca después del modelo. El texto editorial conserva composición determinística.

## Ampliación de doctrina y ejecución entre agentes

Solicitud posterior del operador: incorporar el desarrollo conceptual completo a todos los docs/skills
pertinentes y usar subagentes. Tres subagentes trabajaron con ownership de archivos `.codex` separado:
canon social; marca/dirección; routing/conectores/pipeline. El agente principal integró routers, protocolo,
diseño, studios adyacentes, espejo `.claude` y cierre. No se crearon worktrees ni se hicieron commits.

### Dueños actualizados

- `SOCIAL_CREATIVE_AGENT_EXECUTION_V1.md`: entrada por intención, inputs faltantes, autonomía, estados y cierre.
- Social módulo 11 + `social-opportunity-playbook`: clasificación, oportunidad, investigación, idea, QA y métricas.
- `brand-in-scene` + overlay estacional: papel/atribución, identidad/material, rutas y criterios por formato.
- Social módulo 10/conectores/tooling + pipeline multimodal: elección por operación, límites de evidencia y
  separación de marca física/editorial. No se añadieron enums ni capacidades al compiler.
- Design módulos 03/13 e image-generator: ejecución visual y tipografía con alcance consistente.
- Brand/Copy/Content/Design entrypoints: derivación al canon sin duplicar sus reglas.
- AGENTS/CLAUDE/manifest JSON y project_context: descubrimiento explícito por solicitudes del usuario.
- DESIGN/tokens: firma reconocible no equivale a objeto corporativo obligatorio; contrato UI sin cambios.

### Revisión de aplicación: seis escenarios

Un subagente revisó el protocolo y las skills con seis pedidos, sin renders, gastos ni mutaciones externas.
Esta es evidencia de interpretación documental; no ejecución independiente del cliente Claude ni prueba de audiencia.

| Pedido | Respuesta esperada contrastada |
|---|---|
| Story café «mañana invierno», logo adjunto, sin fecha | recuperar mercado/fecha, clasificar seasonality, producir dentro del encargo sin importar branding Efeonce |
| Polémica para clínica «hazlo viral», sin fuentes | identificar detonante, no inventar conversación ni garantía; verificar claims si se introducen |
| Sólo corregir bordado con concepto/copy aprobados | delta localizado, reference pack, preservar decisiones y comparar material/identidad |
| Tres conceptos por Óscar sin ganadores | tres mecanismos, base sin resultados futuros; no render no pedido |
| Trend para LinkedIn en dos semanas | vigencia futura desconocida, argumento profesional, alternativa evergreen explícita y sin monitor inferido |
| «Publica» con destino ambiguo | recuperar destino; preguntar sólo lo indispensable, no repetir autorización ya dada; readback real |

La revisión detectó y motivó correcciones: producción condicionada al encargo; aprobación de un activo no
acredita reconocimiento; descriptor retirado no se reintroduce; datos temporales críticos explícitos;
verificación sectorial proporcional; duraciones ilustrativas no convertidas en expiración universal.

### Decisión de documentación

Se desarrolla el ADR existente `GREENHOUSE_AGENT_CONTEXT_ROUTER_DECISION_V1` y las fronteras del contrato
multimodal. No hay decisión nueva de runtime, permisos, datos, compiler ni autonomía. No se actualiza el
catálogo comercial/Notion: no se cambió oferta, calendario, aprobación de campaña ni publicación. No se
instalan plugins ni se presenta discovery como producción comprobada. El histórico archivado permanece intacto.

### Validación de esta ampliación

- `pnpm skills:mirrors`: pasó; bundle social completo e image-generator/copy/content bajo gate.
- Paridad explícita adicional: entrypoint Brand y módulos Design 03/13 iguales. Se preservan diferencias
  previas de los entrypoints Design propias de cada agente; ambos reciben la misma derivación social.
- 267 destinos de enlaces relativos comprobados en archivos Markdown activos cambiados: ninguno ausente.
  No se verificaron anchors; los shards históricos inmutables se excluyeron de esa corrección.
- `pnpm claude-md check`: pasó presupuesto y auditoría de no pérdida, cero huérfanos.
- `node --check scripts/skills/validate-mirrored-skills.mjs` y `git diff --check`: pasaron.
- `pnpm qa:gates --changed --agent codex --docs -- <scope>`: revisión advisory de docs; no certifica criterio.
- `pnpm ops:lint --changed`: sin errores; informa 14 advertencias de paridad epic/children en archivos ajenos
  a este cambio. No se alteró esa taxonomía para silenciarlas.
- `pnpm docs:closure-check`: pasó, con advertencia heurística de UI por DESIGN/tokens; no hay cambio de UI
  ejecutable ni corresponde captura GVC/client changelog por esta documentación de producción creativa.
- El `quick_validate.py` genérico no pasó: rechaza `argument-hint` y `user-invocable`, campos preexistentes
  del bundle compartido soportados por las convenciones Claude locales. No se retiraron para lograr verde.
  Se comprobaron por separado YAML, nombres y límites de descriptions modificadas en 12 entrypoints.
  Descriptions largas preexistentes de skills adyacentes no se presentan como validadas por el helper genérico.
- El primer context-check detectó Handoff sobre presupuesto; se acortó el puntero propio preservando evidencia
  en este documento. El cierre exige repetir el context-check después de esta última edición documental.

Estado del trabajo: actualización documental y de skills completa, sin rollout requerido. La revisión de
escenarios es limitada: no se ejecutó el harness Claude, no se probó generación en todos los conectores ni se
midió audiencia. La prueba visual v6 mantiene su estado independiente de revisión del operador.
