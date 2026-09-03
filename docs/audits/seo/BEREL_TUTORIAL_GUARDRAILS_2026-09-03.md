# Berel — prevención de regresiones en tutoriales, 2026-09-03

## Alcance y autoridad

El operador pidió incorporar los huecos detectados al corregir tutoriales y N29. Es una mejora
documental de la skill, no otra reescritura de artículos ni un cambio a Drupal, assets o Notion.
La Wiki sigue siendo fuente viva; estos aprendizajes operativos no se presentan como una nueva
sincronización integral o aprobación del cliente.

Canon de ejecución: [módulo 13](../../../.codex/skills/berel-content-production/modules/13_FORMATO_TUTORIAL_HIBRIDO.md).
Evidencia técnica: [módulo 12 §3](../../../.codex/skills/berel-content-production/modules/12_DATOS_VERIFICADOS_DEL_CATALOGO.md).
Instrumento de revisión: [control técnico](../../../.codex/skills/berel-content-production/templates/control-tecnico-tutorial.md).

## Casos contrastados contra las instrucciones revisadas

Revisión manual de decisiones y contradicciones, no evaluación con otro agente ni ejecución real
de un nuevo tutorial. Los gates mecánicos prueban formato/paridad, no exactitud técnica ni desempeño
futuro del agente. Cada nueva pieza debe completar el control con fuentes y readback propios.

| Caso de regresión | Decisión exigida por la skill revisada | Dueño |
|---|---|---|
| Cuatro títulos, sin mezcla/dilución/esperas | Localizar cada operación necesaria dentro de los macropasos; bloquear lo esencial no resuelto | Módulo 13 + control |
| Sellador automático para cualquier material | Identificar soporte y sistema; no inventar una operación para llenar el template | Módulo 13 |
| Campo de repintado vacío en CMS, PDF con intervalo | Leer Wiki/página/PDF de la variante; citar el dato y condiciones confirmados | Módulo 12 §3 |
| Tacto 1 h tratado como repintado o permiso para cocinar | Mantener condiciones distintas; N29 tiene mínimo 2 h entre manos, no plazo de reocupación | Módulo 12 §3.1 |
| Berelex en el título, cifras y envase de Berelinte debajo | Revisar cuerpo, tablas, FAQ, ALT, PNG, tareas y pares sociales | Módulo 13 |
| Página dice 20 años y PDF 15 | Excluir ese claim hasta resolverlo; no bloquear datos coincidentes | Módulo 12 §3.1 |
| Cuatro colores del catálogo asumidos compatibles | Confirmar fórmula en las bases de la variante, no sólo existencia del tono | Módulo 12 §3.1 |
| Rendimiento a dos manos multiplicado otra vez por dos | Calcular una vez; no garantizar sobrante ni una compra universal de 4 L | Módulo 12 |
| Corrección de cocina usada para rehacer originales o todos los tutoriales | Mantener alcance autorizado; conservar originales y texto no afectado | Módulo 13 |
| Tutorial de patio legítimamente nombra Berelinte | Mantener esa referencia de formato; no aplicar reemplazo global | Módulo 13 |
| Ficha actualizada interpretada como arte ya corregido | Contrastar asset; mantener pendiente explícito de distribución | Módulo 13 + control |
| Cifra de lavabilidad del artículo copiada automáticamente a redes | Aplicar regla del canal: no ciclos de lavado en piezas sociales | Módulos 09/12/13 |

## Estado editorial del caso que originó la corrección

En la operación anterior de esta sesión se releyeron N29, la tarea de fotos, N2 y la tarea principal
después de guardar. Se conservaron historia, propiedades, metadatos, colores, cuatro pasos y cuatro
fotos; ALT del paso 3 y ficha N2 quedaron conciliados con el tutorial. Artes de Frame.io y copies
sociales continuaron pendientes. No hubo publicación Drupal. Esta auditoría no vuelve a certificar
el estado live ni amplía esa corrección.

## Cierre documental

- Técnica: módulos 12/13, antipatrones y fuentes de la skill.
- Funcional/manual: preflight, revisión de dependencias y control rellenable en el mismo bundle.
- Copias Codex/Claude byte-idénticas bajo el gate existente; no se crea un validador textual que
  pretenda demostrar calidad del artículo.
- Gobierno: corrección local reversible bajo el router documental vigente; no cambia fuente de
  verdad, autonomía, APIs, esquema ni arquitectura. No requiere una nueva ADR de plataforma.
- Notion Playbook no se modificó en este turno. Guardado de la skill, commit, push, artes y
  publicación se reportan por separado.
