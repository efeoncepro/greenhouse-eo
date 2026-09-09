# TASK-1856 — dirección visual inicial

Modo repo-native-benchmark. Fuentes: DESIGN.md, catálogo de primitives y EPIC-046. Diseño aún no sellado.

| Alternativa | Lectura / densidad | Móvil | Evaluación |
|---|---|---|---|
| Grilla homogénea | Muchos bloques iguales compiten por atención | Scroll largo | Descartada: no prioriza la acción |
| Cola compacta | Pendientes primero, poco contexto | Lista eficiente | Útil dentro del detalle, insuficiente como experiencia completa |
| Ficha de servicio/objeto | Evidencia, estado, responsable y siguiente paso | Una columna con jerarquía | Hipótesis seleccionada; verificar first fold |

La firma visual es la relación entre período, estado y acción, sin fondos semafóricos, rails de color ni
cards decorativas. Surface dominante, encabezado fuera del plano y elementos rich-ready adaptables.
Todos los tokens vienen de AXIS/MUI; no nuevos valores HEX/px/fonts. Cambiar estados conserva jerarquía.
La dirección se aprueba al verificar primer fold desktop/390px con fixtures y dossier premium; no basta
este documento para UI ready yes.
