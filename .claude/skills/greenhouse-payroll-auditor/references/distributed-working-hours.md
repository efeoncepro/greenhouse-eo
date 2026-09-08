# Distributed Working Hours Reference

Use this reference when a payroll or workforce question converts an Efeonce schedule between Chile, Spain, Colombia, and Nicaragua.

## Evidence Boundary

This is an operational calculation aid, not a contract, attendance record, or legal opinion. A proposed schedule becomes applicable only after People/Payroll confirms the worker classification, contracted weekly hours, governing jurisdiction, meal-break treatment, and any required written amendment.

Do not assume that `full-time` or `part-time` identifies a universal number of hours outside Chile. For Chile, the general ordinary maximum is 42 worked hours per week from 2026-04-26; the special part-time regime covers up to 30 worked hours per week. The ordinary meal break is at least 30 minutes and normally is not worked time unless the parties have agreed otherwise. Verify current interpretation with the Direccion del Trabajo.

## Canonical Timezones

Always calculate from IANA timezone identifiers and an effective date:

| Location | IANA timezone | Chile-summer relationship |
|---|---|---|
| Santiago, Chile | `America/Santiago` | Anchor; UTC-3 during the cited 2026-2027 summer period |
| Mainland Spain | `Europe/Madrid` | Chile +5 hours while Spain is UTC+2; Chile +4 hours while Spain is UTC+1 |
| Colombia | `America/Bogota` | Chile -2 hours |
| Nicaragua | `America/Managua` | Chile -3 hours |
| Canary Islands | `Atlantic/Canary` | One hour earlier than mainland Spain |

For the cited period, Chile advanced its continental official time at midnight after Saturday 2026-09-05 and keeps the advance through the first Saturday of April 2027. Mainland Spain ends daylight-saving time on 2026-10-25 and begins it again on 2027-03-28. Therefore, never encode `Spain = Chile + N` without a date.

## Reference Schedules

These arrangements preserve worked hours after excluding the stated meal break:

| Arrangement | Monday-Thursday in Chile | Friday in Chile | Meal break | Worked hours/week |
|---|---|---|---|---:|
| Full-time, 08:30 start | 08:30-18:15 | 08:30-16:30 | 1 hour daily | 42 |
| Full-time, 09:30 start | 09:30-19:15 | 09:30-17:30 | 1 hour daily | 42 |
| Part-time 30 h, 08:30 start | 08:30-15:30 Monday-Friday | Same | 1 hour daily | 30 |
| Part-time 30 h, 09:30 start | 09:30-16:30 Monday-Friday | Same | 1 hour daily | 30 |
| Part-time 20 h, 08:30 start | 08:30-13:00 Monday-Friday | Same | 30 minutes daily | 20 |
| Part-time 20 h, 09:30 start | 09:30-14:00 Monday-Friday | Same | 30 minutes daily | 20 |

The previously discussed `08:30-18:20` Monday-Thursday plus `08:30-16:30` Friday arrangement produces 42 hours 20 minutes of worked time when one hour of meal break is excluded each day. It is not the 42-hour reference schedule.

## Conversion Matrix: 08:30 Chile Start

### Full-time

| Location/period | Monday-Thursday | Friday |
|---|---|---|
| Chile | 08:30-18:15 | 08:30-16:30 |
| Colombia | 06:30-16:15 | 06:30-14:30 |
| Nicaragua | 05:30-15:15 | 05:30-13:30 |
| Mainland Spain, through 2026-10-24 | 13:30-23:15 | 13:30-21:30 |
| Mainland Spain, 2026-10-25 through 2027-03-27 | 12:30-22:15 | 12:30-20:30 |
| Mainland Spain, 2027-03-28 through the end of Chile summer | 13:30-23:15 | 13:30-21:30 |

### Part-time

| Location/period | 30 worked hours/week | 20 worked hours/week |
|---|---|---|
| Chile | 08:30-15:30 | 08:30-13:00 |
| Colombia | 06:30-13:30 | 06:30-11:00 |
| Nicaragua | 05:30-12:30 | 05:30-10:00 |
| Mainland Spain, through 2026-10-24 | 13:30-20:30 | 13:30-18:00 |
| Mainland Spain, 2026-10-25 through 2027-03-27 | 12:30-19:30 | 12:30-17:00 |
| Mainland Spain, 2027-03-28 through the end of Chile summer | 13:30-20:30 | 13:30-18:00 |

## Conversion Matrix: 09:30 Chile Start

### Full-time

| Location/period | Monday-Thursday | Friday |
|---|---|---|
| Chile | 09:30-19:15 | 09:30-17:30 |
| Colombia | 07:30-17:15 | 07:30-15:30 |
| Nicaragua | 06:30-16:15 | 06:30-14:30 |
| Mainland Spain, through 2026-10-24 | 14:30-00:15 next day | 14:30-22:30 |
| Mainland Spain, 2026-10-25 through 2027-03-27 | 13:30-23:15 | 13:30-21:30 |
| Mainland Spain, 2027-03-28 through the end of Chile summer | 14:30-00:15 next day | 14:30-22:30 |

### Part-time

| Location/period | 30 worked hours/week | 20 worked hours/week |
|---|---|---|
| Chile | 09:30-16:30 | 09:30-14:00 |
| Colombia | 07:30-14:30 | 07:30-12:00 |
| Nicaragua | 06:30-13:30 | 06:30-11:00 |
| Mainland Spain, through 2026-10-24 | 14:30-21:30 | 14:30-19:00 |
| Mainland Spain, 2026-10-25 through 2027-03-27 | 13:30-20:30 | 13:30-18:00 |
| Mainland Spain, 2027-03-28 through the end of Chile summer | 14:30-21:30 | 14:30-19:00 |

## Audit Rules

- Preserve the Chile anchor only when the agreement is explicitly tied to `America/Santiago`; otherwise preserve the worker's contractual local timezone.
- Record the effective date and timezone, not only a wall-clock label such as `08:30 Chile`.
- Recalculate Spain at both daylight-saving boundaries.
- Treat Colombia and Nicaragua as stable only after checking their current official time rules.
- Never count a non-worked meal break toward weekly worked hours.
- Never treat a cross-timezone conversion as approval of the foreign worker's local labor schedule.

## Official Sources Checked 2026-09-08

- Chile ordinary hours: https://www.dt.gob.cl/portal/1628/w3-article-60058.html
- Chile meal breaks: https://www.dt.gob.cl/portal/1628/w3-article-60229.html
- Chile part-time regime: https://www.dt.gob.cl/portal/1628/w3-article-60089.html
- Chile 2026-2029 official-time decree: https://www.bcn.cl/leychile/Navegar?idNorma=1125760&idParte=9969950&idVersion=2026-07-02
- Spain 2026 daylight-saving calendar: https://www.boe.es/buscar/doc.php?id=BOE-A-2022-4026&lang=es
- EU 2027-2031 daylight-saving calendar: https://www.boe.es/doue/2026/1660/Z00001-00001.pdf
- Colombia official time: https://horalegal.inm.gov.co/
- Nicaragua official time: https://webserver2.ineter.gob.ni/tiempo/decreto.html
