# Radiografía AEO — Muestra de Trabajo, Educación y Habilitación de Ventas

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
> **Creado:** 2026-07-14 por Claude (TASK-1410)
> **Última actualización:** 2026-07-14
> **Documentación técnica:** [Radiografía AEO — Arquitectura](../../think/radiografia-aeo-architecture.md)
> **Manual de uso:** [Radiografía AEO — Manual](../../think/radiografia-aeo-manual.md)
> **Runtime:** repo `efeonce-think` (**NO** `greenhouse-eo`) → `think.efeoncepro.com/muestras/<slug>-<token>`

---

## Qué es

Una **pieza web de cuatro pantallas** que le entregamos a un cliente o a un prospecto **por enlace**, y que hace algo que un PDF **no puede hacer**: escribe un artículo real para ese cliente y después **lo abre en canal** para mostrar la capa técnica que lo vuelve citable por los motores de respuesta con IA.

No es un mockup. El artículo está escrito de verdad, con fotos licenciadas de verdad, contra un hueco de búsqueda medido de verdad.

## Los DOS trabajos que hace

La pieza nació como muestra de una licitación, pero **no es un anexo de un bid**. Es una **capacidad reutilizable** con dos trabajos distintos, y conviene tenerlos separados porque cambian cómo se usa.

### 1. Educación (cliente y potencial cliente)

**El problema real del mercado hoy:** casi nadie —ni del lado del cliente— entiende qué significa "aparecer en ChatGPT". Se confunde con SEO, o se cree que es magia, o se piensa que basta con escribir más.

La Radiografía **enseña la diferencia sin una sola diapositiva de teoría**: el evaluador *ve* que el schema solo puede marcar contenido **visible**, *ve* que la cápsula de respuesta es un texto concreto y no un truco, y *ve* que cada elemento técnico apunta a un número de su diagnóstico.

> **Es formación disfrazada de demostración.** El cliente sale entendiendo el problema — y entendiendo por qué su equipo actual no lo está resolviendo.

Se puede usar **sin que haya una venta en curso**: con un cliente vigente que quiere entender qué le estamos haciendo, o con un prospecto al que hay que educar antes de que pueda comprar.

### 2. Habilitación de ventas (sales enablement)

**El problema de la venta:** en una licitación o un pitch de contenidos **todas las ofertas dicen lo mismo** ("optimizamos para SEO y AEO"). Las promesas viven como texto en un PDF, idénticas a las del competidor. Nadie **muestra**.

La Radiografía cierra esa distancia. Le da al equipo comercial:

- un **enlace** que se manda antes, durante o después de la reunión;
- una **lámina** para el deck (la 12 del deck de SKY: *"No le describimos el artículo que escribiríamos. **Lo escribimos.**"*);
- algo que **presentar en vivo** —se navega, se toca, responde—;
- y una prueba que el comité **puede verificar por su cuenta** (las fuentes están enlazadas, las licencias son comprobables).

> **El competidor no es la otra agencia: es la indecisión.** La pieza existe para que el comité tenga algo concreto que defender internamente.

## Las cuatro pantallas

| # | Pantalla | Qué hace |
|---|---|---|
| ① | **El hueco** | El resultado de búsqueda real del término: quién ocupa hoy ese espacio y por qué el cliente no está. Es la portada y es el golpe |
| ② | **El artículo** | El artículo completo, a ancho completo, **sin anotaciones**. Acá se LEE. El cliente juzga lo que está comprando |
| ③ | **La radiografía** | La pantalla partida. Tocas un párrafo y ves **qué produce** en la capa de máquina. Es la demostración |
| ④ | **Dónde más vive** | El video, la pieza social y el set de imágenes que nacen del mismo artículo |

Cada pantalla es **una URL propia**: el deck o el correo pueden enlazar directo a la que convenga.

## Cuándo alcanzarla (y cuándo no)

**Sí:**

- Licitación o RFP de contenidos / SEO / AEO.
- Pitch a un prospecto que **no entiende** por qué su blog no aparece en las respuestas con IA.
- Cliente vigente al que hay que **explicarle** el valor de lo que ya está pagando (retención).
- Reunión donde alguien va a preguntar *"¿y esto cómo se ve?"*.

**No:**

- Como lead magnet. **No captura, no pide email, no tiene formulario** — y no debe tenerlo.
- Sin un hueco medido. Si el artículo no salió de un dato (Semrush + el AI Visibility Grader), el panel de evidencia es decorativo y **la pieza miente sobre su propio método**.
- Para un competidor directo de un cliente vigente, sin pensarlo dos veces (ver "lo que no hay que hacer").

## Lo que la hace creíble (y frágil)

La pieza **entera** se apoya en una sola cosa: **no exagera**. Por eso, tres reglas que parecen menores y no lo son:

1. **Cada cifra lleva su fuente y su fecha.** Sin eso, un número es una opinión con dígitos.
2. **La muestra dice también lo que le FALTA.** Si el cliente no tiene un autor con credencial, la pieza lo declara en vez de inventarlo. Decir lo que falta **suma**; simularlo **la destruye**.
3. **Nunca se reclama una táctica que no se aplicó.** Un evaluador técnico que nos pille exagerando destruye, en un minuto, la credibilidad que la pieza vino a construir.

> El valor entero de la Radiografía es **el rigor**. Es lo único que la competencia no puede copiar pegando un logo.

## Quién la opera

| Rol | Qué hace |
|---|---|
| **Comercial** | Manda el enlace, presenta en vivo, toma la lámina para el deck |
| **Growth / AEO** | Elige el hueco (con dato, no con intuición) y escribe el artículo |
| **Operador (humano)** | **Elige el ángulo.** El agente no elige el artículo — es un gate humano |

## Un cliente nuevo NO requiere código

El motor es genérico: **el cliente es un payload** (un archivo JSON), no código. Crear la muestra del siguiente cliente es escribir ese payload. Los pasos están en el [manual](../../think/radiografia-aeo-manual.md).

⚠️ Mientras exista **un solo** cliente cargado, la reutilización del motor es **una hipótesis, no un hecho**. El segundo payload es lo que la comprueba.

## Lo que NO hay que hacer

- **Nunca** prometer "la cajita de FAQ en Google" — Google la restringió en 2023 a gobierno y salud.
- **Nunca** inventar datos para tapar un hueco del cliente.
- **Nunca** compartir el patrón de URL sin el token: es lo único que impide que un cliente adivine la URL de la muestra de otro.
- **Nunca** dejar que la pieza hable de **nuestros** documentos ("nuestra oferta dice…") ni que le narre la interfaz al lector. La muestra **se defiende sola**.

> **Detalle técnico:** los 12 invariantes, el gate de 46 asserts y las razones de cada decisión están en la [arquitectura](../../think/radiografia-aeo-architecture.md). Cómo se crea la muestra de un cliente nuevo, paso a paso, en el [manual](../../think/radiografia-aeo-manual.md). El caso vivo (SKY, licitación Wherex 2026) en [`TASK-1410`](../../tasks/complete/TASK-1410-aeo-article-xray.md).
