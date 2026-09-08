# Efeonce Distributed Working Hours Reference V1

## Estado

- **Tipo:** referencia operativa de calculo
- **Version:** 1.0
- **Fecha de verificacion:** 2026-09-08
- **Owner:** People / Payroll
- **No autoriza:** cambios contractuales, asistencia, remuneraciones ni cumplimiento laboral extranjero

## Contrato de calculo

Las conversiones de horarios distribuidos deben recibir:

```text
source timezone IANA + local date + local start/end + meal-break duration + contracted worked hours
```

La salida debe conservar la fecha local de destino y marcar cuando el termino cae al dia siguiente. No se permite persistir una diferencia fija entre paises si cualquiera de las zonas usa horario estacional.

## Periodos verificados

| Zona | Periodo | Offset |
|---|---|---:|
| `America/Santiago` | 2026-09-06 hasta el primer sabado de abril de 2027 | UTC-3 |
| `Europe/Madrid` | hasta 2026-10-24 | UTC+2 |
| `Europe/Madrid` | 2026-10-25 a 2027-03-27 | UTC+1 |
| `Europe/Madrid` | desde 2027-03-28 | UTC+2 |
| `America/Bogota` | todo el periodo verificado | UTC-5 |
| `America/Managua` | todo el periodo verificado | UTC-6 |

Aysen y Magallanes no siguieron el cambio continental citado. Canarias usa `Atlantic/Canary`, una hora menos que España peninsular.

## Matrices canonicas

Las matrices completas, horas semanales y tratamiento de colacion viven en:

- documentacion funcional: `docs/documentation/hr/jornadas-y-horarios-distribuidos.md`;
- manual: `docs/manual-de-uso/hr/convertir-horarios-equipo-distribuido.md`;
- skill: `.codex/skills/greenhouse-payroll-auditor/references/distributed-working-hours.md` y su espejo `.claude`.

## Fuentes oficiales

- Direccion del Trabajo, limite de 42 horas: https://www.dt.gob.cl/portal/1628/w3-article-60058.html
- Direccion del Trabajo, colacion: https://www.dt.gob.cl/portal/1628/w3-article-60229.html
- Direccion del Trabajo, jornada parcial: https://www.dt.gob.cl/portal/1628/w3-article-60089.html
- Biblioteca del Congreso Nacional, Decreto 98/2026 sobre hora oficial: https://www.bcn.cl/leychile/Navegar?idNorma=1125760&idParte=9969950&idVersion=2026-07-02
- BOE, calendario español 2022-2026: https://www.boe.es/buscar/doc.php?id=BOE-A-2022-4026&lang=es
- Diario Oficial de la UE, calendario 2027-2031: https://www.boe.es/doue/2026/1660/Z00001-00001.pdf
- Instituto Nacional de Metrologia de Colombia: https://horalegal.inm.gov.co/
- INETER, hora oficial de Nicaragua: https://webserver2.ineter.gob.ni/tiempo/decreto.html

## Cambio y revision

People/Payroll debe volver a validar esta referencia cuando:

- cambie la jornada maxima chilena;
- cambie la duracion o imputabilidad de la colacion pactada;
- Chile, España, Colombia o Nicaragua modifiquen su hora oficial;
- se agregue otro pais o zona;
- se adopte formalmente una de las alternativas como politica contractual.
