# Edit Decision List — Alta frecuencia · hero 15 s

| Campo | Valor |
|---|---|
| Pieza | Hero de campaña · 15 s |
| Basado en | `motion-15s-animatic-shotlist.md` |
| Track | Audio nativo Omni reeditado como ambience; sin música externa |
| Estado | Fine cut determinista |

## Estructura

- **Gancho 0–1 s:** el colibrí ya está en movimiento; no abre con logo.
- **Desarrollo 1–7,2 s:** la estela muestra velocidad, color y precisión.
- **Aceleración 7,2–10,2 s:** dos claims exactos en cortes de 1,5 s.
- **Clímax 10,2–12,5 s:** tres formatos reales convergen en una sola pared visual.
- **Cierre 12,5–15 s:** end card exacto con URL.

## Tabla EDL

| # | Fuente | In | Out | Dur. | Transición | Razón |
|---|---|---:|---:|---:|---|---|
| 1 | clean Omni | 00:00.0 | 00:07.2 | 7.2 s | apertura directa | Poner el mejor movimiento primero. |
| 2 | M02 still | 00:07.2 | 00:08.7 | 1.5 s | cut | Cambia de emoción a beneficio. |
| 3 | M03 still | 00:08.7 | 00:10.2 | 1.5 s | cut | Sube de volumen a sistema. |
| 4 | format wall | 00:10.2 | 00:12.5 | 2.3 s | cut + entradas laterales | Demostración visual de escala. |
| 5 | M01 end card | 00:12.5 | 00:15.0 | 2.5 s | cut | Freno final y lectura. |

Los cortes fuertes caen en `07.2`, `08.7`, `10.2` y `12.5`. No se usan transiciones de plugin ni
dissolves decorativos. La dirección del colibrí y la estela se conserva en los dos aspectos.

## EDL de la familia temporal

| Variante | 9:16 | 16:9 | Estructura |
|---|---:|---:|---|
| Hero | 15,0 s | 15,0 s | 7,2 s motion + 1,5 s M02 + 1,5 s M03 + 2,3 s format wall + 2,5 s end card |
| Master | 10,0 s | 10,0 s | 8,0 s clean motion + 2,0 s end card deterministico; crossfade de 0,4 s dentro del total |
| Bumper | 6,0 s | 6,0 s | 4,0 s clean motion + 2,0 s end card deterministico; crossfade de 0,4 s dentro del total |

Las seis duraciones se verifican contra los MP4 de release con tolerancia de 0,05 s. El hero reutiliza
el clean shot aprobado y los stills de release; su format wall contiene piezas reales 4:5, 9:16 y 16:9.
