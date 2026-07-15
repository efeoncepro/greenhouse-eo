# Manual de uso — Usar la Radiografía AEO en venta y educación

> **Tipo de documento:** Manual de uso / runbook comercial
> **Version:** 1.0
> **Creado:** 2026-07-15 por Codex
> **Modulo:** Comercial / SEO-AEO / Think
> **Ruta publica:** `think.efeoncepro.com/muestras/<slug>-<token>`
> **Documentacion funcional:** [Radiografía AEO — muestra de trabajo](../../documentation/comercial/radiografia-aeo-muestra-de-trabajo.md)
> **Documentacion tecnica:** [Arquitectura](../../think/radiografia-aeo-architecture.md) · [Manual tecnico](../../think/radiografia-aeo-manual.md)

## Para qué sirve

La Radiografía AEO es la pieza que convierte una conversación abstracta sobre
"aparecer en ChatGPT" en una experiencia verificable. Muestra un artículo real,
creado contra un hueco medido, y deja ver qué produce cada bloque en la capa de
máquina: schema, metadatos, alt text, cápsulas de respuesta, jerarquía y piezas
derivadas.

Tiene dos usos comerciales:

- **Educación:** ayuda a un cliente o prospecto a entender qué significa ser
  recuperable y citable por motores de respuesta, sin una presentación teórica.
- **Sales enablement:** le da a Comercial un enlace, una demo en vivo y una
  lámina defendible para una propuesta, RFP, QBR o conversación de expansión.

No reemplaza al AI Visibility Grader. El **Grader diagnostica** el hueco; la
**Radiografía demuestra** cómo se tapa con contenido visible, estructurado y
citable.

## Cuándo usarla

Úsala cuando necesites que el comprador vea la diferencia entre prometer SEO/AEO
y ejecutar el trabajo:

- Pitch o discovery de servicios SEO/AEO.
- Licitación o RFP de contenidos, blog, SEO, AEO, GEO o presencia digital.
- Follow-up después de enviar un informe del AI Visibility Grader.
- QBR o retención con un cliente vigente que pregunta qué cambia con AEO.
- Conversación interna del comité donde una lámina no basta y hace falta un
  enlace que puedan revisar solos.

No la uses:

- Como lead magnet con formulario. La Radiografía no captura leads.
- Sin un hueco medido. Si no hay dato, la pieza parece una demo decorativa.
- Para prometer rankings, ROI directo, rich snippets o citas garantizadas.
- Para mostrar una muestra de un competidor directo sin validar sensibilidad
  comercial.

## Antes de enviarla

1. Confirma qué hueco explica la muestra: Semrush, Search Console, Grader,
   SERP vivo, benchmark o combinación.
2. Verifica que el enlace sea tokenizado:
   `think.efeoncepro.com/muestras/<slug>-<token>`.
3. Si vas a crear o editar una muestra, trabaja en `efeonce-think`, no en
   `greenhouse-eo`, y corre los gates propios:

```bash
pnpm read:aeo-xray <slug>
pnpm build
pnpm verify:aeo-xray
```

4. Ten listo el siguiente paso comercial: propuesta, diagnóstico, workshop,
   scope SEO/AEO o sample sprint.
5. Decide qué pantalla quieres mostrar primero. Para educación suele funcionar
   empezar en ③; para licitación, empezar en ① o en la lámina que enlaza la
   muestra.

## Demo de 5 minutos

### 1. El hueco

Mensaje: "Antes de escribir, medimos qué espacio no está ocupando la marca."

Qué mostrar: quién aparece hoy, qué pregunta responde el mercado y por qué el
cliente tiene derecho comercial a estar ahí.

Qué no decir: "no aparecen en IA" si no lo mediste con el Grader.

### 2. El artículo

Mensaje: "No le describimos el artículo que escribiríamos. Lo escribimos."

Qué mostrar: la pieza debe poder leerse como artículo, sin depender de
anotaciones técnicas.

Qué no hacer: explicar cada elemento de interfaz. Si tienes que narrar demasiado,
estás usando la pantalla equivocada.

### 3. La radiografía

Mensaje: "El schema solo puede marcar contenido visible. Por eso cada dato de la
derecha corresponde a algo que el lector sí ve a la izquierda."

Qué mostrar: pasa el cursor o toca un bloque: cápsula de respuesta, meta
description, ImageObject, alt, H2, FAQ o enlaces. La clave es que el comprador
vea la relación productor → capa de máquina.

Qué no decir: "esto garantiza que ChatGPT nos cite". El argumento honesto es:
"esto aumenta la recuperabilidad y la citabilidad porque el pasaje existe, está
estructurado y se puede verificar".

### 4. Dónde más vive

Mensaje: "El artículo no muere como una URL. Produce piezas para video, social,
imágenes y distribución."

Qué mostrar: atomización conectada al artículo, no una lista genérica de canales.

Qué no hacer: convertirlo en promesa de volumen infinito. La atomización sirve si
mantiene fuente, intención y trazabilidad.

## Cómo mandarla por correo o chat

Usa un envío corto y concreto. Ejemplo:

```text
Te dejo una muestra viva de cómo abordamos AEO.

Primero muestra el hueco medido; después el artículo completo; y en la tercera
pantalla puedes tocar cada bloque para ver qué lee una máquina y por qué eso
importa para ser citado.

No es un mockup ni una lámina: es la pieza funcionando.
```

Si viene después de un Grader:

```text
El informe mide dónde la marca todavía no está siendo citada. Esta Radiografía
muestra cómo convertir uno de esos huecos en contenido visible, estructurado y
reutilizable.
```

## Uso en Proposal Studio y licitaciones

Cuando la Radiografía entra a una propuesta:

- Regístrala como evidencia `client_facing` si el enlace puede viajar al comité.
- No registres como `client_facing` el diagnóstico interno, el piso de precio,
  el squad blueprint ni el razonamiento de margen.
- En el deck, úsala como showcase de trabajo: URL viva + captura o lámina de
  contexto. La pieza interactiva siempre vale más que un PNG aislado.
- Conecta explícitamente la cadena: Grader mide → Radiografía demuestra →
  propuesta define alcance → servicio opera.

## Objeciones frecuentes

**"Esto es solo una página bonita."**
No. La belleza ayuda a que se lea, pero el valor está en el acoplamiento: cada
bloque visible produce una señal de recuperación o una pieza de distribución.

**"¿Entonces garantizan aparecer en ChatGPT?"**
No. Nadie honesto garantiza una cita de un motor externo. Lo que sí hacemos es
construir los pasajes, entidades, estructura y fuentes que vuelven a la marca
recuperable y citable.

**"¿Esto reemplaza el SEO?"**
No. AEO extiende SEO. Sin rastreabilidad, contenido útil, entidad y autoridad,
la capa de respuesta no tiene de dónde sostenerse.

**"¿Por qué no basta con poner schema?"**
Porque el schema no inventa contenido. Marca contenido visible. Si el dato no
existe en la página, marcarlo es falso o frágil.

**"¿Esto lo hizo IA?"**
Puede haber asistencia, pero el punto no es la herramienta. El valor está en el
criterio: elegir el hueco correcto, escribir una respuesta útil, sostenerla con
fuentes y estructurarla sin exagerar.

## Qué no decir nunca

- "Garantizamos ranking" o "garantizamos cita".
- "Esto activa el rich snippet de FAQ" como promesa general.
- "La IA ya no los ve" sin haberlo medido.
- "El ROI de AEO es X" si no viene de datos del cliente y una metodología clara.
- "Podemos hacer cientos de estos" si no está scopeado, costeado y gobernado.

## Próximo paso

Después de mostrar la Radiografía, el cierre no es "¿te gustó?". El cierre es
elegir el movimiento operativo:

- diagnóstico SEO/AEO completo;
- sample sprint sobre un hueco prioritario;
- refresh de contenido existente;
- producción de cluster;
- propuesta de retainer;
- QBR con plan de mejora y medición.

## Referencias

- [Radiografía AEO — documentación funcional](../../documentation/comercial/radiografia-aeo-muestra-de-trabajo.md)
- [Radiografía AEO — arquitectura](../../think/radiografia-aeo-architecture.md)
- [Radiografía AEO — manual tecnico](../../think/radiografia-aeo-manual.md)
- [AI Visibility Grader](../../documentation/growth/ai-visibility-grader.md)
- [Construir una licitación paso a paso](construir-una-licitacion.md)
