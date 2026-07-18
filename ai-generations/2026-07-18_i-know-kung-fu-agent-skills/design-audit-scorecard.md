# Auditoría visual — infografías I Know Kung Fu

- **Visual auditado:** KFU-V01, KFU-V02 y KFU-V03; cinco SVG de entrega y sus previews contextuales.
- **Contra qué brief:** `contracts.md` y sistema editorial de infografías Efeonce.
- **Fecha / auditor:** 2026-07-18 · Codex, con `design-studio` + `content-marketing-studio`.

## 1. Rúbrica

| # | Dimensión | Puntaje | Evidencia |
|---|---|---:|---|
| 1 | Brand-fit | 5/5 | Shell, paleta, Poppins y firma Efeonce consistentes sin dominar el contenido. |
| 2 | Claridad de concepto | 5/5 | Cada pieza expresa una relación distinta y se comprende fuera del artículo. |
| 3 | Jerarquía | 5/5 | Título → relación principal → conclusión; un solo nivel primario por pieza. |
| 4 | Color | 5/5 | Navy estructura, azul diferencia y naranja marca método o decisión. |
| 5 | Tipografía / legibilidad | 5/5 | Poppins en paths; labels y lockups críticos pasan límites explícitos de ocupación. |
| 6 | Composición | 5/5 | Ejes claros, conectores detrás del texto y espacio negativo protegido. |
| 7 | Reproducibilidad cross-format | 5/5 | V01 y V02 tienen art direction desktop/móvil; V03 conserva safe zone 4:5. |
| 8 | Accesibilidad / contraste | 4/5 | Contraste alto y texto íntegro; falta todavía QA en el DOM público después de integrar. |
| 9 | Originalidad | 4/5 | Arquetipos semánticos propios y sin estética IA genérica; lenguaje deliberadamente sobrio. |
| 10 | Craft | 5/5 | SVG autónomos, XML válido, cero texto vivo, contornos y bounding boxes verificados. |

**TOTAL: 48 / 50**

## 2. Semáforo

**Veredicto: 🟢 Aprobar producción visual.** La integración en WordPress y el QA público continúan pendientes.

## 3. Hallazgos y resolución

| Prioridad | Dimensión | Problema observado | Resolución aplicada |
|---|---|---|---|
| P0 | Tipografía | La cápsula V01 desktop tenía 2,8 px de aire por lado. | Ancho aumentado de 490 a 620; ocupación final bajo 82%. |
| P1 | Tipografía / composición | OBSERVAR, EJECUTAR y EMPAQUETAR quedaban demasiado próximos al borde de sus círculos. | Diámetro aumentado de 136 a 164 y escala de EMPAQUETAR reequilibrada. |
| P1 | Reproducibilidad | Las descripciones largas del loop móvil se acercaban demasiado al margen derecho. | Quiebres de línea editoriales y reducción leve de los títulos secundarios. |
| P2 | Gobernanza | El QA geométrico no impedía por sí solo una ocupación óptica excesiva. | Nuevo gate `typography-fit-report.json`, bloqueante durante el build. |

## 4. Próximo paso

- **Decisión:** aprobar los masters visuales.
- **Qué se reaudita:** tamaño real, ALT, caption y selección responsive cuando se integren en WordPress.
