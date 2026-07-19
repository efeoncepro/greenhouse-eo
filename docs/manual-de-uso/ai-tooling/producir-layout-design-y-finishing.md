# Producir un set con Layout Design & Finishing

> **Tipo de documento:** Manual de uso operativo
>
> **Estado:** Aplicable a producción creativa out-of-band
>
> **Última actualización:** 2026-07-19
>
> **Documentación funcional:** [Layout Design & Finishing](../../documentation/ai-tooling/layout-design-and-finishing.md)

## Para qué sirve

Usa este procedimiento cuando necesites un set estático premium en varios formatos y quieras controlar con
precisión la composición, la marca y el copy sin renunciar al acabado material de los modelos generativos.

## Procedimiento

1. **Aprueba un anchor.** Registra tesis, identidad, anatomía/producto, paleta, luz, hook, peor crop y owner.
2. **Copia el contrato.** Completa
   `.codex/skills/design-studio/templates/layout-design-contract.yaml` con formatos, grillas, capas, locks,
   executor y gates.
3. **Diseña cada ratio.** Construye `16:9`, `4:5`, `9:16` u otros formatos como composiciones nativas. Revisa
   en thumbnail y tamaño real antes de generar.
4. **Exporta clean plates.** Deben contener sólo sujeto, ambiente, material y luz; sin headline, logo, CTA,
   legal ni texto de prueba.
5. **Elige la mano por delta.** Seedream Pro para material/color/luz/atmósfera; GPT Image 2 para geometría,
   safe zones, escala o reparación protegida. Un pase, un delta.
6. **Compara el finish.** Revisa identidad, safe zone, bordes, artefactos, croma y el objetivo visual. Rechaza
   un finish técnicamente distinto si empeora la dirección.
7. **Planifica y compón determinísticamente.** Ejecuta `pnpm creative:layout ... --mode plan`, corrige inputs y
   checkpoints, y luego usa `--mode compile`. Añade underlay óptico, hook, tipo, logo, CTA y legal desde fuentes
   y activos oficiales. No vuelvas a enviar la pieza compuesta al modelo.
8. **Masteriza.** Ajusta color, contraste, sharpen, dimensiones, compresión, naming y metadatos para cada destino.
9. **Ejecuta QA.** Verifica el 100% del set en contact sheet, thumbnail, tamaño real y crop de plataforma.
10. **Cierra el release.** Registra hashes, lineage, costos, scorecard, aprobador y limitaciones. La activación en
    medios sigue separada.

## Uso del compiler

1. Copia la plantilla Codex o Claude dentro de `brief/` y ajusta `run_root`.
2. Declara un `format` por composición nativa y apunta `finished_plate` al plate ya aceptado.
3. Mantén `human_release: pending` mientras se revisa el contact sheet.
4. Ejecuta:

```bash
pnpm creative:layout -- --contract brief/layout-compiler-v1.yaml --mode plan
pnpm creative:layout -- --contract brief/layout-compiler-v1.yaml --mode compile
pnpm creative:layout -- --contract brief/layout-compiler-v1.yaml --mode check
```

`plan` no exige tener todas las aprobaciones y sirve para descubrir faltantes. `compile` bloquea si anchor,
layout o finishes no están aprobados. `check` valida masters y hashes existentes sin recomponer. Ninguno de los
tres modos llama a un proveedor o consume presupuesto generativo.

Revisa el SVG `*-layout-source.svg` cuando necesites ajustar manualmente capas o relevar la pieza a otra
herramienta. El SVG contiene el plate enlazado y overlays vectoriales; mueve el conjunto junto con sus plates.

## Gate rápido

- [ ] Hay layout contract y grilla por ratio.
- [ ] El modelo recibió clean plates, no anuncios finales.
- [ ] Cada inferencia tiene parent, delta, locks, modelo/endpoint, costo y resultado.
- [ ] El compositor y los activos oficiales están declarados.
- [ ] Headline, logo, CTA, legal y locale son exactos y editables fuera del raster.
- [ ] Contraste, safe zones, thumbnail, tamaño real, naming, peso y dimensiones pasan.
- [ ] Una persona aprobó el set completo.
- [ ] `--mode check` pasa y el manifest no contiene rutas absolutas del operador.

## Troubleshooting

| Problema                                         | Acción                                                                                                                |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| El finish mueve al sujeto o invade el copy field | volver al clean plate; usar GPT para recomponer o una máscara si la región debe protegerse                            |
| El resultado parece “texto pegado sobre foto”    | mejorar underlay, contraste local, escala tipográfica y relación entre hook y plate; no pedir “más premium” al modelo |
| Seedream cambia demasiado                        | reducir el delta, enumerar locks y editar sólo el raster limpio                                                       |
| GPT deja el plate correcto pero frío             | conservar estructura y pasar a Seedream Pro sólo para material/luz/atmósfera                                          |
| Un formato funciona y otro no                    | rehacer el layout del ratio fallido desde el anchor; no derivarlo del formato anterior                                |
| La métrica mejora pero el arte empeora           | manda la revisión visual y el brief; documentar el rechazo                                                            |
| El próximo cambio es copy, logo o export         | detener inferencia y usar el compositor                                                                               |
| `compile` informa `not ready`                    | abrir el plan y aprobar anchor/layout/finish o reponer el input faltante; no saltar el checkpoint                     |
| El nuevo master deriva demasiado del aprobado    | declarar `baseline.output` y reducir `max_normalized_mae`; revisar visualmente antes de aceptar                       |
| Hace falta otro hook gráfico                     | no inyectar SVG libre; extender schema, renderer, fixture y QA del compiler                                           |

## Ejemplo ejecutable

El caso de referencia vive en
[`ai-generations/2026-07-18_high-frequency-campaign-e2e/`](../../../ai-generations/2026-07-18_high-frequency-campaign-e2e/):

```bash
FAL_API_KEY_SECRET_REF=greenhouse-fal-api-key \
GCP_PROJECT=efeonce-group GOOGLE_CLOUD_PROJECT=efeonce-group \
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs \
  ai-generations/2026-07-18_high-frequency-campaign-e2e/scripts/11-finish-layout-design-pilot.ts

node ai-generations/2026-07-18_high-frequency-campaign-e2e/scripts/12-compose-layout-design-pilot.mjs
node ai-generations/2026-07-18_high-frequency-campaign-e2e/scripts/13-qa-layout-design-pilot.mjs
```

El script `11` consume presupuesto. Los scripts `12` y `13` son determinísticos y repetibles sin costo de
modelo.

El compositor reusable reproduce el mismo set sin volver a ejecutar `11`:

```bash
pnpm creative:layout -- \
  --contract ai-generations/2026-07-18_high-frequency-campaign-e2e/brief/layout-compiler-v1.yaml \
  --mode plan
pnpm creative:layout -- \
  --contract ai-generations/2026-07-18_high-frequency-campaign-e2e/brief/layout-compiler-v1.yaml \
  --mode compile
pnpm creative:layout -- \
  --contract ai-generations/2026-07-18_high-frequency-campaign-e2e/brief/layout-compiler-v1.yaml \
  --mode check
```
