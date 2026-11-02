---
name: motogas-graphic-line
description: >-
  SOLO para Motogas (cuentas de gas en Santiago: El Rey del Gas, Gas Don Julio, Lipigas Recoleta y
  Lipiestación). Línea gráfica de sus marcas y biblia de sus tres personajes: el Rey del Gas (2D
  vectorial), Gasfield de Gas Don Julio (3D satinado) y el Perrito Lipigas (peluche fotográfico de
  Lipigas, usado como franquiciado). Cárgala para generar cualquier pose nueva de esos personajes,
  revisar una pose, o producir piezas de esas cuentas (lista de precios del jueves, horario,
  ubicación, mesa de ayuda, temporadas). NUNCA aplicar a Efeonce («La órbita», AXIS), Berel, SKY ni
  otro cliente, ni reglas de esos clientes a Motogas.
type: skill
user-invocable: true
argument-hint: '[personaje y pose, o pieza Motogas a producir o revisar]'
---

# Motogas — Línea gráfica y personajes

> **Skill de cliente, exclusiva de Motogas.** Motogas SpA opera locales de recarga de gas con retiro en
> bodega y sin despacho. Efeonce diseña sus redes hace años. Esta skill es viva: cada pieza que se
> resuelva bien deja aquí su receta, y cada trampa nueva queda en la sección de lecciones de su archivo.

## 1. Qué cargar según la tarea

| Tarea | Cargar |
|---|---|
| Pose nueva de un personaje, o revisar una | [`references/personajes.md`](references/personajes.md) (la biblia) |
| Cualquier pieza de las cuentas | [`references/marcas.md`](references/marcas.md) + el análisis completo (abajo) |

## 2. Los tres personajes, en una línea

| Personaje | Marca | Técnica | Hoja aprobada |
|---|---|---|---|
| **El Rey del Gas** | El Rey del Gas | 2D vectorial, 4 colores planos, contorno grueso | 10 poses en SVG (2026-11-02) |
| **Gasfield** | Gas Don Julio | 3D tipo juguete, acabado **satinado** | 10 vistas y poses (2026-11-02) |
| **Perrito Lipigas** | Lipigas Recoleta (y Lipiestación) | Foto de peluche realista | 9 poses (2026-11-02) |

Los tres fueron aprobados por Efeonce el 2 de noviembre de 2026; **falta la aprobación del cliente** (y, en el
Perrito, la de Lipigas, que es dueño del personaje).

## 3. Dónde vive cada cosa

- **Entregables aprobados (OneDrive):**
  `Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/1. Recursos Graficos/Personajes/`
  — una carpeta por personaje con `v01/`, más `_Referencias para generar/<personaje>/` con exactamente las
  imágenes que se pasan al modelo.
- **Briefs** (bloques de prompt probados): [`briefs/`](briefs/).
- **Scripts** de postproceso (vectorizar, grabar la placa, recortar, limpiar bordes): [`scripts/`](scripts/).
- **Análisis de la línea gráfica** (marcas, locales, lista de precios, legales, temporadas):
  `ai-generations/2026-11-02_motogas-linea-grafica/MOTOGAS_LINEA_GRAFICA_V1.md` + `anexos/` (local, datos de
  cliente, sin commitear).
- **Canvas** `Motogas — Línea gráfica`: https://claude.ai/artifact/SNjhz4rYK1zCSoYBMcpSvR (tableros de las tres
  hojas de modelo, plantillas y pendientes).

## 4. Reglas que no se negocian

1. **El personaje sale de su referencia, nunca de memoria.** Toda pose nueva se edita desde las imágenes de
   `_Referencias para generar/`, con el brief del personaje entero (no resumido).
2. **Una pose nueva no cambia el personaje.** Si la pose pide algo que contradice un invariante, gana el invariante.
3. **Las marcas se componen, no se dibujan.** El logo de la placa del Perrito sale del archivo oficial
   (`assets/lipigas/`); el modelo nunca lo dibuja.
4. **Edita, no regeneres.** Para cambiar material, fondo o un detalle, edita la imagen aprobada.
5. **Paridad ×4 marcas:** toda campaña o temporada sale para las cuatro cuentas con el mismo concepto.
6. **Clave OpenAI:** la generación operada por agente paga con `--openai-key personal`.
