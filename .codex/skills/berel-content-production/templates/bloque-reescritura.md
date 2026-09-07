# Plantilla — Bloque de reescritura / artículo

> Crear un único desplegable `✍️ Versión vigente para revisión`, **debajo** de lo que ya exista y
> sin borrar historia. Renombrar las versiones anteriores como `🗂️ Histórico — ...` cuando haga falta
> distinguirlas. Norma: `../modules/03_REDACCION_ARTICULO.md`.
> 🔴 La zona vigente contiene solo metadatos aprobables y copy público final.

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

```

La procedencia, el mapa de banners, ALT/archivo/medidas, schema, decisiones y pendientes se guardan en
una tarea o documento privado de Efeonce. **No agregarlos debajo, dentro de otro toggle o como comentario**
en la página compartida. Antes de pasar a revisión, sustituir todos los placeholders de esta plantilla.

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
- [ ] Sin lenguaje interno, briefs, pendientes, QA, CMS/Dev ni mensajes entre agentes en toda la página compartida
- [ ] Tablas con encabezados semánticos; cada columna comparativa nombra su producto
- [ ] Si se recomienda un especialista: CTA descriptivo a `/contacto`
- [ ] Si es producto de awareness: diferenciador temprano y render oficial del empaque especificado
- [ ] **Auditoría de voz corrida** contra la lista de fallas típicas (módulo `04`)
- [ ] Releído: sin erratas en nombres de producto ni de color
- [ ] Una sola `Versión vigente para revisión`; las anteriores están rotuladas `Histórico`
- [ ] Desde la raíz de la skill, export fresco validado con `node scripts/client-visible-copy-gate.mjs <export.md>`
- [ ] Readback confirma que todos los hijos conservan tabulador y siguen dentro del toggle
- [ ] Solo después de esos gates, `Estado` del artículo movido a `En revisión`
