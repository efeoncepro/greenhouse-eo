# Plantilla — Bloque de reescritura / artículo

> Crear un único desplegable `✍️ Versión vigente para revisión`, **debajo** de lo que ya exista y
> sin borrar historia. Renombrar las versiones anteriores como `🗂️ Histórico — ...` cuando haga falta
> distinguirlas. Norma: `../modules/03_REDACCION_ARTICULO.md`.
> 🔴 La zona editorial vigente contiene metadatos aprobables, copy público final y las specs visuales
> contextuales obligatorias. Los toggles hermanos de evidencia permanecen fuera de este bloque.

```markdown
# ✍️ Versión vigente para revisión {toggle="true"}

	## Metadatos propuestos
	  ← EN VIÑETAS, NUNCA EN TABLA: la barra vertical parte la fila
	- Title: «...» (NN caracteres)
	- Meta description: «...» (NN caracteres)
	- Slug: «...»
	- H1: «...» (NN caracteres) — no repite el title

	## [Texto completo del artículo]

	[Gancho con micro-escena]
	[Respuesta directa, 40-55 palabras]
	<callout icon="🖼️" color="gray_bg">
		**Banner N1 — [rol contextual]**
		**Composición:** [...] · **Copy de arte:** [...]
		**Formato/carga:** 1408 × 768 px · WebP · menos de 200 KB · hero sin lazy
		**ALT exacto:** [...] · **Archivo:** `[...]`
		**Posición:** después de la respuesta directa, antes de [...]
	</callout>
	[Eje de decisión]
	## [H2 en formato pregunta cuando responde una duda]
	[Definición extractable en la primera frase]
	...
	[Tabla comparativa]
	## Preguntas frecuentes
	### [4-6 preguntas, respuesta directa en la primera línea]
	[BerelTip de Don Bere]
	[Cierre que retoma la escena de apertura + CTA triple]
	[Firma de cierre de la marca]
	[Intercalar del mismo modo N2, N3 y N4 en las secciones que representan]

```

Las fuentes, análisis, decisiones, limitaciones y controles se conservan en toggles hermanos de evidencia;
secretos, credenciales, conversación cruda y operación sensible se guardan en privado. Las fichas N1–N4
permanecen en contexto dentro del artículo y se copian literalmente a sus tareas visuales. **No confundirlas
con notas internas ni agruparlas en un anexo.** Antes de pasar a revisión, sustituir todos los placeholders.

## Antes de cerrar

- [ ] Cada enlace **navegado y verificado**; ninguno 404 ni solo búsqueda
- [ ] Productos a página pública; colores a paleta/artículo o familia; **nunca** a la búsqueda del sitio
- [ ] Anchors descriptivos, **nunca la URL cruda** como texto visible
- [ ] Ningún RGB/HEX y ninguna serie de producto en el cuerpo
- [ ] Temperatura de luz con la fórmula **adjetivo + Kelvin** en **todas** las menciones
- [ ] Nombre completo del producto **una sola vez**, contado incluido el CTA
- [ ] Marca en **primera persona del plural**, lector en tú
- [ ] Cada sección responde solo a la intención prometida por su encabezado
- [ ] Todo bloque reubicado conserva cobertura, tiene encabezado propio y línea puente
- [ ] Remates y frases compactas se entienden en la primera lectura
- [ ] Sin `paleta vigente`, `temporada actual`, `última paleta`, trimestre u otra ancla temporal en cuerpo evergreen
- [ ] Sin lenguaje interno, briefs editoriales, pendientes, QA, CMS/Dev ni mensajes entre agentes en la zona vigente
- [ ] N1–N4 completas, contextuales y en paridad literal con sus tareas visuales
- [ ] Si existe arte producido, ningún campo de su ficha cambió durante la corrección
- [ ] Tablas con encabezados semánticos; cada columna comparativa nombra su producto
- [ ] Si se recomienda un especialista: CTA descriptivo a `/contacto`
- [ ] Si es producto de awareness: diferenciador temprano y render oficial del empaque especificado
- [ ] **Auditoría de voz corrida** contra la lista de fallas típicas (módulo `04`)
- [ ] Releído: sin erratas en nombres de producto ni de color
- [ ] Una sola `Versión vigente para revisión`; las anteriores están rotuladas `Histórico`
- [ ] Desde la raíz de la skill, export fresco validado con `node scripts/client-visible-copy-gate.mjs <export.md>`
- [ ] Readback confirma que todos los hijos conservan tabulador y siguen dentro del toggle
- [ ] Solo después de esos gates, `Estado` del artículo movido a `En revisión`
