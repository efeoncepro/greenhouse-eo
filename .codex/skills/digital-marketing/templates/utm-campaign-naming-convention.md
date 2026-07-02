# UTM & Campaign Naming Convention

> La base del reporting por canal. Un owner, valores controlados. Ver `08`.
> Alinea `utm_campaign` con los `campaign` que espera el tracking plan de `growth-marketing-cro`.

## Reglas globales
- **minúsculas**, sin espacios (usa `-`), sin tildes, sin caracteres especiales.
- **valores controlados** (lista cerrada por parámetro), no free-text.
- **un owner** de la taxonomía; cambios versionados.

## Parámetros
| Parámetro | Qué es | Valores controlados (ejemplos) |
|---|---|---|
| `utm_source` | de dónde viene | `google`, `linkedin`, `meta`, `tiktok`, `newsletter`, `partner-x` |
| `utm_medium` | tipo de canal | `cpc`, `paid-social`, `email`, `organic-social`, `display`, `referral` |
| `utm_campaign` | campaña (slug estable) | `aeo-launch-2026q3`, `always-on-brand` |
| `utm_content` | variante/ubicación | `hook-a`, `carousel-1`, `footer-cta` |
| `utm_term` | keyword (search) | `<keyword>` |

## Convención de nombre de campaña
```
[objetivo]-[producto/tema]-[periodo]
ej: leadgen-aeo-grader-2026q3 · brand-always-on-2026 · abm-tier1-enterprise-2026q3
```

## Ejemplo de URL
```
https://efeoncepro.com/aeo-2/
  ?utm_source=linkedin&utm_medium=paid-social
  &utm_campaign=leadgen-aeo-grader-2026q3&utm_content=hook-a
```

## Checklist
- [ ] Todos los destinos de campaña llevan UTM consistentes
- [ ] Valores dentro de la lista controlada (no free-text)
- [ ] `utm_campaign` matchea el `campaign` del tracking plan de growth
- [ ] Documentado y comunicado al equipo
