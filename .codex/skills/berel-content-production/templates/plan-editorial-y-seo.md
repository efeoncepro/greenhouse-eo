# Plantilla — 🧭 Plan editorial y SEO (Modalidad B)

> Plantilla para el toggle de evidencia que permanece en la página del artículo del Content Hub y prueba el
> trabajo previo a una pieza nueva. Es visible para Berel: escribir conclusiones, fuentes, limitaciones y
> decisiones profesionales; nunca prompts, credenciales, chain-of-thought, secretos ni conversación cruda.
> Norma: `../modules/01_CICLO_MENSUAL.md` (Fases B1-B4).
> *No es burocracia: es lo que evita escribir mil cuatrocientas palabras alrededor de un ángulo
> equivocado.*

```markdown
# 🧭 Plan editorial y SEO {toggle="true"}

	## 1. Brief de origen
	- Qué pidió el cliente, CON SUS PALABRAS: «...»  (fuente: Teams, <fecha>)
	- Material recibido: [fichas técnicas / presentaciones / catálogos]  (fuente: SharePoint)
	- Material prometido y NO entregado: [...]
	- Referencia compartida por el equipo: [...]

	## 2. El ángulo
	- ¿Por qué esto es un artículo y no una ficha de producto? → [...]
	- Problema del lector que el producto resuelve: [...]
	- Por qué se descartó el enfoque de ficha: [...]
		- Limitación evidente del producto y alternativa que se le ofrece al lector: [...]
		- ¿Es producto nuevo/de awareness?: [sí/no] · diferenciador central: [...] · render oficial: [fuente/pendiente]

	## 3. Arquitectura SEO
	- Keyword principal: «...» — intención: [...] — rol en el artículo: [title / H2 / FAQ / ALT]
	- Secundarias (3-4), cada una con intención y rol: [...]
	  (jerarquía marcada como ESTIMACIÓN mientras no haya herramienta de datos)
	  ← metadatos EN VIÑETAS, nunca en tabla
	- Title: «...» (NN car.)   · Slug: «...»  → verificado que NO colisiona con nada publicado
	- Meta description: «...» (NN car.)  · H1: «...» (NN car.) — no repite el title
	- Mapa de encabezados: una línea por H2 explicando qué resuelve
	- Longitud objetivo: [...] palabras
	- Dosis del producto: entra al [NN]% del texto y ocupa [NN]% del total.
	  Se nombra primero la CATEGORÍA y después el PRODUCTO. Nunca al revés.

	## 4. Datos verificados
	| Dato | Valor | Fuente | Verificado en vivo |
	|---|---|---|---|
	  ← lo que NO esté en esta tabla NO entra al artículo

		[callout ⚠️ Discrepancias entre fuentes]
		- [fuente A dice X · fuente B dice Y] → reportado al cliente, NO entra al texto

	## 5. Plan de enlazado en dos direcciones
	- Salientes: [...]
	- ENTRANTES (el paso que se olvida): desde [artículo publicado] en [sección] → este artículo
	  ← un artículo nuevo nace huérfano

	## 6. Handoff al CMS
	- Formato que pide el cliente: [...]
	- Recordatorio: el CMS antepone la marca al title; hay que invertirlo a `NoTitle | Pinturas Berel`
```

## Toggle hermano — Research

Va junto al plan, en la misma página, y se escribe **antes** del plan: el plan no recicla research de otra pieza
(módulo 14, § Research con tres fuentes; caso Umbral Vivo, 2026-11-04). Orden aceptado de la página:
`🧭 Plan editorial y SEO` · `📈 Research` · `✍️ Versión vigente para revisión V1` · `📣 Derivados sociales`
(si hay propuesta) · `🗒️ Notas internas de producción` (módulo 01).

```markdown
# 📈 Research {toggle="true"}

	## Fuentes
	- Search Console berel.com (MEDIDO): ventana <fechas>, serie desde 2026-07-31
	- Semrush base mx (ESTIMADO): <fecha de consulta>
	- DataForSEO SERP Google MX móvil, profundidad 20, con AI Overview (OBSERVADO): <fecha>, <N> consultas
	## Demanda medida
	- Consultas e impresiones de GSC que el artículo puede responder, y si hoy alguna página las atiende
	## Demanda estimada
	- Volumen, KD e intención por keyword candidata
	## Competencia observada
	- Quién ocupa la SERP (Berel, Comex, Sherwin-Williams, plataformas) y a quién cita el AI Overview
	## Artículos vecinos
	- Piezas publicadas leídas en vivo desde sitemap-articulos.xml y riesgo de canibalización
	## Arquitectura de palabras clave
	- Principal y secundarias, con la fuente de cada cifra
	## Implicaciones
	- Qué decide el research sobre el ángulo, y qué descarta (por ejemplo, una keyword estacional sin demanda)
	## Límites
	- Lo que no se midió, cifras estimadas, fecha de caducidad de la captura
```

## Distribución social antes de producir derivados

Incorporar [matriz de distribución social](matriz-distribucion-social.md) dentro del plan.
Evaluar cuatro opciones; registrar Producir / No aplica / Pendiente, fuentes, ángulo, recursos,
CTA, señal y gates. No crear tareas por defecto ni cambiar formatos/cuotas/fórmulas.

## Antes de escribir una sola línea

- [ ] Número reservado en el bloque mensual completo e identidad del artículo comprobada (módulo 16)

- [ ] Brief buscado en Teams y material en SharePoint **antes** de proponer nada
- [ ] Research nuevo con las tres fuentes (GSC MEDIDO · Semrush mx ESTIMADO · DataForSEO OBSERVADO) y artículos vecinos leídos en vivo, documentado en `📈 Research`
- [ ] Si el artículo conecta con una promoción: ángulo evergreen, un párrafo removible sin fechas ni talento, y nota de retiro en Notas internas (módulo 03)
- [ ] Justificado por escrito por qué es artículo y no ficha
- [ ] Slug verificado contra lo ya publicado
- [ ] Tabla de datos cerrada, con discrepancias anotadas y reportadas
- [ ] Ningún claim sin respaldo documental
- [ ] Si es awareness: diferenciador al frente, sin `Guía [Producto]` por defecto y render oficial previsto
- [ ] Datos faltantes fuera del cuerpo y registrados en evidencia trazable, o en privado si son sensibles
- [ ] Plan de enlaces entrantes hecho
- [ ] Fila del Content Hub renombrada si traía "(por desarrollar)"
- [ ] Toggle conservado como hermano del artículo; ningún bloque de análisis se mezcló con la narrativa final
