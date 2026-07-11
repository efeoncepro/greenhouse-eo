# Manual de uso — Construir una licitación paso a paso

> **Tipo de documento:** Manual de uso (runbook operativo)
> **Versión:** 1.1
> **Creado:** 2026-07-11 por Claude (con Julio Reyes)
> **Última actualización:** 2026-07-11 por Claude
> **Documentación funcional:** `docs/documentation/comercial/construccion-de-licitaciones.md`
> **Método canónico (skill):** `greenhouse-public-private-tenders` → `bid-construction-playbook.md`

## Para qué sirve

Guía operativa para **armar una propuesta de licitación** (pública o privada / RFP-RFQ) de principio a fin, con Claude o Codex asistiendo. Al terminar tienes: oferta técnica, oferta económica, matriz de cumplimiento y el paquete listo para que **una persona** lo suba a la plataforma.

## Antes de empezar

- Ubica la carpeta de la licitación (por ejemplo, en OneDrive `Comercial/Licitaciones/<Cliente>/`).
- Ten a mano las **bases** (documento del cliente) y, si existe, la planilla económica exigida.
- Define quién es el operador humano que **presentará** la oferta (el agente no la sube).

## Paso a paso

### 1. Leer las bases y resumirlas
- Pídele al agente que lea las bases completas y te devuelva: objeto, **calendario** (fecha de entrega y cierre de consultas), requisitos para participar, criterios de evaluación, **SLA y penalidades**, plazo del contrato, garantías y comisiones, y **formato** de entrega (PDF/planilla/plataforma).
- Revisa inconsistencias (fechas que chocan). Si el plazo de consultas sigue abierto, evalúa preguntar.

### 2. Chequear admisibilidad (puerta #1)
- Corre la **matriz de cumplimiento**: cada requisito → ¿lo cumplimos? → dónde. Separa **obligatorio (excluyente)** de lo que solo **puntúa**.
- Marca lo que falta (declaraciones, planilla, garantía, validez de la oferta).
- **Si falta un obligatorio y no se puede resolver a tiempo → no se presenta.**

### 3. Decidir si conviene (bid / no-bid)
- Confirma que encaja con lo que Efeonce ofrece y define el **ángulo** (¿cliente existente?, ¿qué diferenciadores usar o evitar?).
- Las decisiones sensibles (usar o no un resultado/caso, tono político) las define **el operador**.

### 4. Traer contexto y diferenciadores
- El agente carga el contexto de negocio de Efeonce y propone los **diferenciadores para esta licitación** con **casos reales** (no cifras inventadas).
- Tú confirmas cuáles se usan.

### 5. Definir alcance con criterio experto
- Para el servicio pedido, el agente **invoca las skills de dominio** (por ejemplo contenido y SEO para un blog) y propone alcance, volumen y metodología fundamentados.
- El agente **analiza con datos el activo real del cliente** (su blog/sitio actual, con herramientas como fetch, Semrush y el AI Visibility Grader) para calibrar el mix (contenido nuevo vs. optimizar lo existente) y para llegar con **diagnóstico, no con un pitch genérico**. También detecta el stack del cliente (p. ej. WordPress) como posible diferenciador.
- Y **benchmarkea a la competencia directa del cliente** (¿tienen el mismo activo?, ¿quién va adelante?, ¿dónde está la batalla directa?, ¿hay una carrera que nadie ganó aún, como la visibilidad en IA?) — eso vuelve la propuesta un argumento competitivo, no solo una lista de entregables.
- Tú ajustas volumen/tramos.

### 6. Diseñar el equipo (squad)
- El agente arma el **squad**: roles, seniority, % dedicación, jerarquía y sinergias. De cara al cliente van **roles + seniority, sin nombres** (salvo que autorices nombres con consentimiento).
- Se guarda un **blueprint interno** con el mapeo a nómina para trazar el costo.

### 7. Calcular el precio
- El agente levanta el **costo real del equipo** desde la nómina de Greenhouse y arma un precio **cost-plus** con margen.
- Revisa y confirma: **margen objetivo**, **precio lista** y **piso de negociación** (bajo el cual no se baja). En licitación privada, se prioriza el valor, no solo el costo.
- Regla: **si el margen no da con un precio competitivo, no se presenta.**

### 8. Redactar la oferta técnica
- El agente redacta la propuesta hacia lo que evalúan las bases y le da un **pase de estilo** (claro, persuasivo, sin humo, en es-CL).
- Revísala. Puedes pedir abrirla en el navegador o exportarla a Word/PDF para leerla cómoda.

### 8-bis. Presentar el diagnóstico de visibilidad en IA (si el servicio es de contenido/SEO)
- Si se corrió el **AI Visibility Grader** (paso 5), pídele al agente que lo presente en la propuesta con tres capas: **números concretos** (¿la IA conoce la marca?, ¿el blog del cliente aparece como fuente?, ¿quién lidera la categoría?), **el enlace vivo** al informe del cliente, y **la escalera 5-Be** (Ser encontrada / legible / correcta / accionable / intrínseca) con los **valores reales** del cliente y qué significa cada uno.
- **Importante para el agente:** el informe completo (con tono y categoría) lo genera el **worker** al encolar el run; **no** se debe puntuar ni publicar el informe "a mano" (sale sin tono ni categoría). Los valores de la escalera se toman del informe publicado, no se inventan.

### 9. Armar la económica y el paquete
- El agente crea la **planilla económica** (en el formato exigido; si no hay, diseña una limpia) con el precio confirmado.
- Se re-corre la **matriz de cumplimiento** (todos los obligatorios ✅) y se **exporta a PDF** la técnica + la económica.

### 9.5. Revisión crítica antes de cerrar (pídela siempre)
Antes de dar por lista la propuesta, pide al agente una **revisión con tres miradas**:
- **Comercial:** ¿convence al comité, baja el miedo a decidir (plan de primeros 90 días, quick win), conecta con el negocio del cliente y el precio va en tramos?
- **Equipo:** ¿el squad es real (sin roles clave sin persona) y hay capacidad libre para cumplir el SLA?
- **Finanzas:** ¿el precio cubre el costo real del equipo y aguanta la inflación/tipo de cambio si el contrato es a varios años sin reajuste?

Si las tres no pasan, la propuesta no está lista.

### 10. Presentar (lo haces tú)
- **Tú subes** la oferta a la plataforma y guardas el comprobante. El agente **no** la sube ni la firma.
- Confirma las declaraciones sensibles (por ejemplo, "sin demandas contra el cliente") antes de enviar.

## Qué significan los estados de la matriz de cumplimiento

- ✅ **Cumplido** — el requisito está cubierto y con evidencia.
- ⏳ **Pendiente** — falta completarlo (declararlo, adjuntarlo, construirlo).
- ⚠️ **A costear/atención** — impacta el precio o requiere decisión.
- ⛔ **Falta / bloqueante** — obligatorio no resuelto: revisar antes de avanzar.

## Qué NO hacer

- **No** dejar que el agente **suba o firme** la oferta: eso lo hace una persona.
- **No** presentar sin cerrar todos los requisitos **obligatorios**.
- **No** cotizar bajo el costo real del equipo ni bajar del piso de negociación.
- **No** usar cifras o casos inventados; solo casos reales y citables.
- **No** improvisar el alcance ni el equipo: se fundan con las skills de dominio.
- **No** afirmar un negativo sin medirlo (ej. "no aparece en la IA"): se corre el grader real primero. Afirmar un negativo falso en una propuesta es grave.
- **No** presentar que "la IA cita fuentes creíbles" como si citara al cliente: son cosas distintas. El dato fuerte es si el dominio del propio cliente aparece entre las fuentes.
- **No** puntuar ni publicar el informe del grader "a mano": el informe completo (con tono y categoría) lo arma el worker al encolar el run.

## Problemas comunes

- **"El cliente no entregó planilla económica."** Efeonce diseña una planilla limpia con ítems, condiciones de pago y notas.
- **"Las fechas de las bases se contradicen."** Si el plazo de consultas está abierto, se consulta; si ya venció, se asume con criterio y se deja el supuesto explícito en la oferta.
- **"No aparece todo el equipo en la nómina."** Los roles faltantes se costean como estimación (`[EST]`) hasta asignar el equipo definitivo.

## Referencias técnicas

- Método canónico (10 fases + qué skill en cada una): skill `greenhouse-public-private-tenders` → `bid-construction-playbook.md`.
- Documentación funcional: `docs/documentation/comercial/construccion-de-licitaciones.md`.
- Diseño de squads: skill `greenhouse-talent-people-operator` → `references/client-squad-design.md`.
