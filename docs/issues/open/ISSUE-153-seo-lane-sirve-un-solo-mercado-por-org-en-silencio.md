# ISSUE-153 — El módulo SEO sirve un solo mercado por organización, y elige cuál en silencio

- **Estado:** `open`
- **Detectado:** 2026-08-13, al confirmar con el operador que Efeonce opera en **Chile, México,
  Colombia y Perú**
- **Ambiente:** Producción (lane ecosystem + MCP + readers de superficie)
- **Severidad:** Alta para clientes multi-país — hoy latente porque ninguna org tiene dos targets
- **Dominio:** `growth.seo`
- **Relacionado:** `ISSUE-152` (lo expuso), `TASK-1645` (lane ecosystem), `TASK-1306`/`TASK-1310`
  (superficies), `TASK-1661` (dato de mercado por país)

## Síntoma

El schema **sí** sabe representar un cliente multi-país: `seo_targets` tiene
`UNIQUE (organization_id, root_domain, location_code, language_code)`, o sea un target por mercado
para el mismo dominio.

Los readers **no**. `resolveSeoLaneSubject`
(`src/lib/api-platform/resources/ecosystem-growth-seo.ts:126-134`) resuelve así:

```sql
SELECT seo_target_id
  FROM greenhouse_growth.seo_targets
 WHERE organization_id = $1
   AND status = 'active'
 ORDER BY created_at DESC
 LIMIT 1
```

Con dos mercados activos, la superficie sirve **el target creado más recientemente** y descarta el
resto. No hay error, no hay advertencia, no hay campo en la respuesta que diga qué país se está
mostrando: el consumidor —UI, Nexa, MCP, report cliente— recibe un número de un país y no tiene cómo
saber que existen otros tres.

## Por qué importa ahora

Efeonce opera en **Chile, México, Colombia y Perú**, y es su propio cliente (`EO-ORG-0007`,
dogfooding). Su realidad comercial es exactamente el caso que el read path no sabe expresar. Hoy
tiene **un solo target, en Chile, con cero keywords**, así que el problema está latente y no roto —
pero se activa en cuanto alguien intente medir un segundo país.

El mismo caso aplica a cualquier cliente regional. `ISSUE-152` es un cliente **mono-mercado** con el
país equivocado; esto es distinto y peor: un cliente **multi-mercado** que el producto no puede
describir.

## Consecuencias concretas

- Una org con targets en MX y CL ve sólo uno, y **cuál depende de `created_at`** — un orden de
  creación, no una decisión de producto.
- Reactivar un target pausado **cambia el país que sirve la superficie**, sin que nada lo anuncie.
  (Es justo el riesgo que deja abierto el fix de `ISSUE-152`.)
- El dato de mercado de `TASK-1661` es **por país**: el mismo keyword tiene volumen distinto en cada
  uno. Sin selector de mercado, no hay forma de pedir "el volumen de MX" para una org multi-país.
- El cruce SEO↔AEO y el report cliente heredan la ambigüedad sin declararla.

## Causa raíz

El módulo nació con la suposición implícita **una organización = un mercado**, razonable para el
primer cliente y falsa para el portafolio real. La suposición no está escrita en ningún contrato: vive
en un `LIMIT 1` sin comentario, que es la forma más barata de que nadie la vea.

## Solución propuesta (esbozo, requiere decisión de arquitectura)

No es un fix de una línea; toca el contrato de varias superficies. Esbozo para discutir:

1. **Hacer explícito el mercado en el contrato de lectura.** Toda respuesta del lane declara qué
   `locationCode`/`languageCode` está sirviendo. Barato, inmediato y elimina la ambigüedad silenciosa
   aunque no se resuelva la selección.
2. **Selector de mercado** en el reader (`market` opcional; sin él, un default declarado y visible en
   la respuesta, no un `ORDER BY created_at`).
3. **Degradación honesta cuando hay más de uno**: si la org tiene N targets activos y el consumidor no
   eligió, decirlo (`multiple_markets`) en vez de escoger callado.
4. Decidir si la agregación cross-país tiene sentido de producto o si el mercado es siempre una
   dimensión explícita del análisis. **Nunca** promediar posiciones entre países: son SERPs distintos.

Antes de implementar: `arch-architect`, porque cambia el contrato de lectura de un módulo con cuatro
consumidores ya en producción.

## Verificación al cerrar

- Una org con dos targets activos devuelve un resultado **inequívoco**: o el mercado pedido, o una
  degradación explícita.
- La respuesta declara siempre el mercado servido.
- Existe un test con una org multi-mercado — hoy no hay ninguno, y por eso nada falló.
