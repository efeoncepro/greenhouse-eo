# Estimación interna por CLI, sin propuesta

Fuentes monetarias ypuntero: [current.json](../../../../../../data/pricing/v3-operating/current.json). Cuatro escenarios acumulativos porUSD/COP, todoscon`--current`. `totals.cost`es el costo, no `net` (precio depolítica automático).

```bash
pnpm --silent pricing:v3 current show
pnpm --silent pricing:v3 compose workload --input production.workload.json --brief production.brief.json --out NUEVO.dimensioned-brief.json
pnpm --silent pricing:v3 compose quote --current --input with-listening.USD.demand.json --out NUEVO.artifact.json
pnpm --silent pricing:v3 compose assess --input with-listening.USD.artifact.json
pnpm --silent pricing:v3 compose increment --input with-strategy.USD.artifact.json --base production.USD.artifact.json
```

Ejecutar lasrutas dedemanda desdeesta carpeta o pasarlasabsolutas; `production.brief.json` originaldesimulaciónestáreferenciado enelregistro yelbriefderivado estáguardadoaquí. No sobrescribirartefactos:salidas nuevas. Exit3=calculado/enrevisión. Los archivos deartefacto contieneninsumos yprecios internosautomáticos; no seentreganalcomprador ni sepublicancomooferta. No seemitiódocumentoparacliente.

[Interpretación ylímites](../COSTOS-RESTO-ALCANCE-CLI-2026-10-22.md) · [Cifras](cost-summary.json).
