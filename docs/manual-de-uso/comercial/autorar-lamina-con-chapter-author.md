# Autorar una lámina de propuesta con el chapter-author

> **Tipo de documento:** Manual de uso / runbook
> **Versión:** 1.0
> **Creado:** 2026-07-16 por Claude (TASK-1415)
> **Última actualización:** 2026-07-16 por Claude
> **Documentación funcional:** [motor-chapter-authors.md](../../documentation/comercial/motor-chapter-authors.md)
> **Documentación técnica:** [GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md §5-ter](../../architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md)

## Para qué sirve

Generar el contenido de las láminas de **diagnóstico** de una propuesta (la de hechos-titular
y la de la escalera de madurez) desde un run real del AI Visibility Grader, con un agente que
redacta y un humano que confirma — en vez de escribir los slots a mano en el `deck-plan.json`.

Hoy se opera **por script local** (no hay superficie en el portal ni en Nexa todavía; esa capa
es un follow-up declarado). El usuario de este manual es el operador comercial/técnico que
arma un deck.

## Antes de empezar

1. **Proxy PG activo**: `pnpm pg:connect` (el mapper lee el run del Grader desde Postgres).
2. **Un run del Grader terminado** para la marca (su código público, p. ej. `EO-GRUN-00046`).
   Si la marca no tiene run, primero se corre el Grader (ver
   [cómo correr el AI Visibility Grader](../growth/)).
3. **Flag encendido para la corrida**: `TENDER_CHAPTER_AUTHOR_ENABLED=true` como variable de
   entorno del comando (default OFF — apagado, el propose rechaza con mensaje claro).
4. **Credencial Anthropic resolvible** (`ANTHROPIC_API_KEY` o el secret ref canónico
   `greenhouse-anthropic-api-key` vía ADC).

## Paso a paso (diagnóstico, corrida de referencia)

El script canónico es `scripts/commercial/_sanity-diagnostico-chapter-author.ts`. Para otro
cliente/run, se copia y ajustan `RUN_PUBLIC_ID`, `brandName`, `publicReportUrl` y los
`operatorFacts`.

```bash
ANTHROPIC_API_KEY="$(gcloud secrets versions access latest \
  --secret=greenhouse-anthropic-api-key --project=efeonce-group)" \
TENDER_CHAPTER_AUTHOR_ENABLED=true \
GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME= \
npx tsx --env-file=.env.local --require ./scripts/lib/server-only-shim.cjs \
  scripts/commercial/_sanity-diagnostico-chapter-author.ts <carpeta-de-salida>
```

Qué hace, en orden:

1. Resuelve el run por su código público y lee el reporte con el reader canónico.
2. Deriva los **hechos** (mapper puro): peldaños, hechos-titular, contexto — cada uno con su
   `evidenceRef` al run.
3. **Propose**: el LLM redacta el framing (títulos, narrativa, cuerpos) sobre esos hechos.
4. Imprime el framing propuesto — **léelo**: ese es el contenido que estás confirmando.
5. **Confirm** (actor member) → ensambla los slots inyectando cifras/fuentes desde los hechos.
6. Renderiza con el composer: 2 PNG + 1 PDF en la carpeta de salida.

### Hechos externos del operador (p. ej. Semrush)

Si la lámina necesita un dato que NO sale del Grader (tráfico orgánico, benchmark externo),
se agrega en `operatorFacts` **con su fuente**:

```ts
operatorFacts: [{
  factId: 'goal.organic-traffic',
  label: 'Visitas orgánicas mensuales del blog',
  value: '~40.000',
  evidenceRef: 'Semrush · database CL · 2026-07-11'
}]
```

Sin `evidenceRef`, el motor lo rechaza. El agente jamás produce ni altera estos datos.

## Qué significan los rechazos (no son bugs)

| Mensaje | Qué pasó | Qué hacer |
|---|---|---|
| `cifra sin hecho que la respalde` | El LLM escribió un número que no está en los hechos | Nada: el retry automático (máx. 2) lo corrige; si persiste, revisa si falta un hecho legítimo en el mapper/operatorFacts |
| `link sin hecho que lo respalde` | El LLM inventó una URL | Igual que arriba — los links entran como hechos (p. ej. `publicReportUrl`) |
| `excede el contrato de la lámina` | El texto no cabe en el slot (overflow se rechaza, nunca se trunca) | El retry lo acorta; si agota reintentos, vuelve a correr |
| `El chapter-author está apagado` | Flag OFF | Exporta `TENDER_CHAPTER_AUTHOR_ENABLED=true` para la corrida |
| `no tiene dato para el peldaño` | El run no midió ese eje (p. ej. sin readiness) | El diagnóstico no se autora con peldaños sin medir: corre un run completo |
| `La confirmación del capítulo es HUMANA` | Se intentó confirmar sin actor member | La confirmación es de una persona, siempre |

## Qué no hacer

- **No editar los fixtures golden** (`__tests__/fixtures/`) para "hacer pasar" un eval.
- **No tocar el prompt/schema de un author** sin correr su eval
  (`pnpm vitest run src/lib/commercial/tenders/proposals/authoring`).
- **No declarar `template`** en las láminas: el catálogo elige la plantilla.
- **No enviar el PDF renderizado al cliente sin revisión humana del frame** — el confirm es
  el gate, y el deck completo sigue el flujo gobernado del Studio.

## Problemas comunes

- `Anthropic no está configurado` → resuelve la key como en el comando de arriba (la
  `GOOGLE_APPLICATION_CREDENTIALS_JSON` multilínea de `.env.local` rompe `--env-file`; el
  comando la vacía y usa ADC).
- `Greenhouse Postgres is not configured` / timeout → falta el proxy (`pnpm pg:connect`) o no
  vaciaste `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` (con ella seteada, el connector
  ignora el proxy local).

## Referencias técnicas

- Motor: `src/lib/commercial/tenders/proposals/authoring/chapter-author.ts`
- Author de diagnóstico: `authoring/diagnostico-chapter-author.ts` + `authoring/diagnostico-facts.ts`
- Evals (el gate del prompt): `authoring/__tests__/*-eval.test.ts`
- Crear un author nuevo: skill `greenhouse-public-private-tenders` → `proposal-studio-runtime.md`
  (costura "Un chapter-author nuevo")
