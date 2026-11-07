# Motogas — Sistema de Lista de Precios semanal y Legales (reconstrucción)

Fecha del análisis: 2026-11-02. Fuente: OneDrive Efeonce (solo lectura).
Raíz: `/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA`
Abreviaturas de ruta:
- `LP/` = `Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/00. Lista de precios/`
- `ALP/` = `Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/Archivo/0. Lista de precios/`
- `WS/` = `Workspace/Clientes/Motogas/`
- `AM/` = `Alineación/1. Clientes (Interno)/Motogas/Archivo/`
- `PEN/` = `Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/4. Impresiones/Pendones/`

Convención: **[V]** = verificado leyendo el archivo; **[I]** = inferido.

---

## 0. Hallazgos clave (resumen)

1. [V] Hoy la lista semanal es **un set de 10 piezas 1080×1350 (post 4:5)**, numeradas `Lista Precios-1..10.png`, exportadas de UN `.ai` con 10 mesas de trabajo. Mapa fijo de número → local:

| # | Local (cuenta) | Dirección en la pieza | WhatsApp en la pieza | Tipo de layout |
|---|---|---|---|---|
| 1 | Gas Don Julio (DJ) | Los Mares 7503, Pudahuel Sur. | +56972555023 | Matriz 3 marcas × 3 tamaños |
| 2 | Gas Don Julio 2 (DJ2) — portada | Av. María Rozas Velásquez 475 / Quinta Normal | +56931046901 | Portada "Lista de Precios" + logos 3 marcas, sin precios |
| 3 | DJ2 — Lipigas | (sin dirección) | +56931046901 | Tabla 1 marca: 5/11/15/45 Kg + Yale Aluminio |
| 4 | DJ2 — Gasco (en abr-26 era Abastible) | — | +56931046901 | Tabla 1 marca: 5/11/15/45 Kg |
| 5 | DJ2 — Abastible (en abr-26 era Gasco) | — | +56931046901 | Tabla 1 marca: 5/11/15/45 Kg + Yale Aluminio + Yale Fierro |
| 6 | Lipigas Recoleta | Av. Perú 1337 / Recoleta, Santiago | (ninguno) | "Píldoras" por cilindro: 5/11/15/45 kilos + Yale Aluminio (solo Lipigas) |
| 7 | Lipiestación Central — Vecinal | Vecinal 4494 / Estación Central, Santiago | (ninguno) | Píldoras 5/11/15 kilos (solo Lipigas) |
| 8 | Lipiestación Central — Velásquez | 5 de Abril 4021 / Esq General Velasquez, Estación Central, Santiago | (ninguno) | Píldoras 5/11/15/45 kilos + Yale Aluminio |
| 9 | El Rey del Gas — Lo Prado | Neptuno 934, Lo Prado | +56954606758 | Matriz 3 marcas × 3 tamaños, fondo rojo |
| 10 | El Rey del Gas — Cerro Navia | El Pastizal 1518, Cerro Navia | +56966426189 | Igual que #9, fondo naranjo |

2. [V] La carpeta semanal se nombra con la **fecha de término de vigencia** (miércoles): `LP/Agosto 26/` contiene piezas "Vigente hasta el 26/08/26" y se creó el **jueves 20/08/2026**. Ciclo = jueves a miércoles.
3. [V] **No existen "legales" en el sentido de bases/términos.** Lo "legal fijo" por marca es el **pie de condiciones de venta + línea de vigencia** (y en RDG la nota de asterisco). Literales en §4.
4. [V] No se encontró ningún xlsx/docx/correo con precios fuente. [I] Los precios llegan por canal informal (WhatsApp/chat del cliente) y se tipean a mano en el `.ai`.
5. [V] Los `.ai` maestros están guardados **sin contenido PDF** (`pdftotext` devuelve el aviso de Illustrator); los textos solo se pudieron leer de los PNG exportados.

---

## 1. Estructura de la lista por marca/local

### 1.1 Productos (formatos de cilindro) [V]
- Distribuidoras (marcas de gas) vendidas: **Gasco, Abastible, Lipigas** (locales "multimarcas": DJ, DJ2, RDG). Lipigas Recoleta y Lipiestación venden **solo Lipigas**.
- Formatos: **5 Kg, 11 Kg, 15 Kg, 45 Kg, Yale Aluminio, Yale Fierro** (Yale Fierro solo aparece en Abastible de DJ2). No hay catalítico, vehicular ni granel. No hay "con envase": SAC RDG: "no vendemos cilindros con envase incluido" (`WS/SAC/Preguntas Rey del Gas.docx`).
- Es **recarga** (Recoleta/Lipiestación lo rotulan "Recarga de 5 kilos", etc.).
- Matriz de formatos por local:

| Local | Gasco | Abastible | Lipigas |
|---|---|---|---|
| DJ (#1) | 5/11/15 | 5/11/15 | 5/11/15 |
| DJ2 (#3–5) | 5/11/15/45 | 5/11/15/45/Yale Al/Yale Fierro | 5/11/15/45/Yale Al |
| Lipigas Recoleta (#6) | — | — | 5/11/15/45/Yale Al |
| Lipiestación Vecinal (#7) | — | — | 5/11/15 |
| Lipiestación Velásquez (#8) | — | — | 5/11/15/45/Yale Al |
| RDG Lo Prado y Cerro Navia (#9–10) | 5/11/15 | 5/11/15 | 5/11/15 |

  (SAC RDG: "no vendemos cilindros de 45 kilos. Nuestros formatos de venta son de 5, 11 y 15 kilos.")

### 1.2 Canal [V]
- **Solo retiro en local/bodega, sin despacho** (todas). No hay columnas de "a domicilio vs retiro".

### 1.3 Formato de precio [V]
- `$` + punto de miles, sin decimales, sin "CLP": `$11.900`, `$67.900`.
- RDG 2026 a veces tipea con espacio: `$ 12.000`, `$ 25.000` (inconsistencia tipográfica, no regla).
- Unidad: DJ/DJ2 `5Kg` (K mayúscula, g minúscula); RDG `5KG`; Recoleta/Lipiestación "Recarga de 5 kilos"; pendones `5kg`.

### 1.4 Marca de promoción [V]
- DJ/DJ2: celda roja con "- Promo -" sobre el precio en bold.
- RDG: celda con "P R O M O" espaciado + asterisco `*` tras el precio + nota inferior "Números con (*) estan en OFERTA" + 2 cintillos superiores ("Lipigas 15KG: $X" / "Abastible 15KG: $Y" o un claim de temporada).
- Recoleta/Lipiestación: palabra "PROMO" sobre la píldora + píldora en degradado verde (la normal es azul).
- Patrón: la promo casi siempre es **15 Kg** (y en Recoleta nov-2025 también 45 kg).

### 1.5 Vigencia [V]
- DJ, DJ2, RDG: `Vigente hasta el DD/MM/AA` (DJ y DJ2 arriba o abajo; RDG dentro de la tabla).
- Recoleta, Lipiestación: `Precios válidos hasta el` / `DD de Mes de AAAA` (mes con mayúscula inicial: "26 de Agosto de 2026").
- Histórico 2024 (RDG): `PRECIOS VIGENTES DESDE EL 18/01/2024 HASTA EL 24/01/2024`; story: `Válidos desde el Jueves 25 al Miércoles 31 de Enero 2024`.

### 1.6 Medios de pago / contacto [V]
- Listas: "SÓLO EFECTIVO" (DJ, DJ2, RDG). Recoleta/Lipiestación no declaran medio de pago en la lista.
- Piezas "Método de pago" (Primavera 2024, `WS/Metodo de pago Primavera 2024/`): transferencia a **Motogas SPA, RUT 77.130.996-8**:
  - RDG: Banco de Chile, cta. cte. 8210371601, admin@motogas.cl, Tlf +56 9 5460 6758.
  - Lipigas Estación Central (Vecinal 4494): BCI, cta. cte. 89781325, admin@motogas.cl, +56 977822525.
  - Gas Don Julio: Banco de Santander, cta. cte. 91159961, gasdonjulio1@gmail.com, +56 9 7255 5023.
- Contradicción a resolver con cliente: listas dicen "SÓLO EFECTIVO"; SAC RDG y story 2024 dicen "efectivo y transferencia"; impresos DJ dicen "SOLO EFECTIVO Y TRANSFERENCIA"; pendones 2025 "NO TENEMOS PAGO CON TARJETAS".
- Horario (SAC RDG / flyer DJ): L–S 10:00–20:00; domingos y festivos 10:00–15:00.

---

## 2. Precios observados (CLP) [V]

P = marcado como promo. Celdas `Gasco / Abastible / Lipigas` en tamaños 5 / 11 / 15.

### 2.1 Gas Don Julio (#1, Pudahuel)
| Vigente hasta | Gasco 5/11/15 | Abastible 5/11/15 | Lipigas 5/11/15 | Fuente |
|---|---|---|---|---|
| 26/11/25 | 11.000 / 16.200 / 23.000P | 11.000 / 16.500 / 24.500 | 10.900 / 16.000 / 19.900P | `ALP/LISTA SEM 18-11/DON JULIO/DJ_ListaPrecios.png` |
| 15/04/26 | 11.500 / 15.900 / 21.500P | 11.500 / 16.000 / 21.900P | 10.900 / 15.500 / 20.500P | `ALP/LISTA DE PRECIOS 09-04-26/Lista Precios (Actualizar Grafica)-1.png` |
| 05/08/26 | 12.900 / 17.900 / 23.000 | 13.000 / 18.000 / 24.000 | 11.900 / 16.900 / 20.900P | `LP/Gs don Julio/Lista Precios-1.png` |
| 12/08/26 | 12.900 / 17.900 / 24.500 | 13.000 / 18.000 / 24.500 | 11.900 / 16.900 / 20.900P | `LP/Agosto 12/Lista Precios-1.png` |
| 26/08/26 | idem 12/08 | idem | idem | `LP/Agosto 26/Don Julio/Lista Precios-1.png` |

### 2.2 Gas Don Julio 2 (#3–5, Quinta Normal) — 5/11/15/45/Yale Al/Yale Fierro
| Vigente hasta | Lipigas | Abastible | Gasco | Fuente |
|---|---|---|---|---|
| 19/11/25 | 10.900 / 16.000 / 19.900P / 69.900 / Al 26.000 | 11.000 / 16.000 / 24.500 / 73.000 / Al 26.000 / Fe 26.000 | 11.000 / 16.200 / 23.000P / 73.000 | `ALP/LISTA SEM 13-11/DON JULIO 2/DJ2_ListaPrecios-2,3,4.png` |
| 15/04/26 | 10.900 / 15.500 / 20.500P / 68.900 / Al 23.000 | 11.500 / 16.000 / 21.900P / 72.000 / 26.000 / 26.000 | 11.500 / 15.900 / 21.500P / 71.000 | `ALP/LISTA DE PRECIOS 09-04-26/...-3,4,5.png` |
| 19/08/26 | — | 13.000 / 18.000 / 24.500 / 84.000 / 26.000 / 26.000 | — | `LP/Agosto 19/Lista Precios-5.png` |
| 26/08/26 | 11.900 / 16.900 / 20.900P / 72.000 / Al 24.900 | 13.000 / 18.000 / 24.500 / 84.000 / 26.000 / 26.000 | 12.900 / 17.900 / 24.500 / 76.000 | `LP/Agosto 26/Don Julio 2/Lista Precios-3,4,5.png` |

### 2.3 El Rey del Gas (#9 Lo Prado, #10 Cerro Navia — mismos precios)
| Vigente hasta | Gasco | Abastible | Lipigas | Cintillos | Fuente |
|---|---|---|---|---|---|
| 24/01/24 | 9.900 / 14.900 / 21.900 | 9.900 / 16.900 / 22.900 | 9.900 / 15.900 / 17.900 PROMOCIÓN | — | `WS/ENERO/VERANO_lista.png` |
| 31/01/24 (story) | 9.900 / 15.900 / 21.900 | 9.900 / 16.900 / 22.900 | 8.900 / 13.900 / 15.900 PROMOCIÓN | "NUEVOS PRECIOS" | `WS/ENERO/PROMO LIPIGAS/HISTORIAS/PROMO_Mesa de trabajo 1 copia 4.png` |
| 26/11/25 (solo Lo Prado) | 10.900 / 15.900 / 23.900 | 10.900 / 15.900 / 24.000 | 9.900 / 14.900 / 17.900P* | "Lipigas 15KG: $17.900" + "Primavera de descuentos" | `ALP/LISTA SEM 18-11/REY DEL GAS/RDG_ListaPrecios.png` |
| 15/04/26 | 11.500 / 16.500 / 22.900P* | 11.500 / 16.500 / 21.900P* | 10.000 / 16.000 / 19.900P* | "Lipigas 15KG: $19.900" + "Abastible 15KG $21.900" | `ALP/LISTA DE PRECIOS 09-04-26/...-9,10.png` |
| 12/08/26 y 26/08/26 | 13.000 / 18.000 / 25.000 | 12.000 / 18.000 / 24.000 | 11.900 / 16.900 / 20.900P* | "Lipigas 15KG: $20.900" + "Abastible 15KG $24.000" | `LP/Agosto 12/Lista Precios-9.png`, `LP/Agosto 26/Rey del gs/Lista Precios-9,10.png` |

### 2.4 Lipigas Recoleta (#6) — 5 / 11 / 15 / 45 / Yale Aluminio
| Vigente hasta | Precios | Fuente |
|---|---|---|
| 13/11/2024 | 10.000 / 15.900 / 19.900 / 69.900 / 25.500 | `AM/Lipigas Recoleta/RRSS/07-13-NOVIEMBRE_lista.png` |
| 26/11/2025 | 9.900 / 15.900 / 19.900P / 63.800P / 25.900 | `ALP/LISTA SEM 18-11/RECOLETA/Recoletas_ListaPrecios.png` |
| 15/04/2026 | 10.500 / 16.000 / 21.900 / 66.900 / 27.500 | `ALP/LISTA DE PRECIOS 09-04-26/...-6.png` |
| 12/08 y 26/08/2026 | 11.000 / 17.000 / 21.900P / 67.900 / 27.900 | `LP/Agosto 12/Lista Precios-6.png`, `LP/Agosto 26/Lipigas/Lista Precios-6.png` |

### 2.5 Lipiestación Central
| Local | Vigente hasta | Precios | Fuente |
|---|---|---|---|
| Vecinal 4494 (5/11/15) | 15/04/2026 | 11.500 / 17.000 / 23.000 | `ALP/LISTA DE PRECIOS 09-04-26/...-7.png` |
| Vecinal 4494 | 26/08/2026 | 11.900 / 16.900 / 22.900P | `LP/Agosto 26/Lipiestacion/Lista Precios-7.png` |
| Velásquez (5/11/15/45/Yale Al) | 15/04/2026 | 11.500 / 17.000 / 23.000 / 66.900 / 27.500 | `...-8.png` |
| Velásquez | 12/08 y 26/08/2026 | 11.900 / 16.900 / 22.900P / 67.900 / 27.900 | `LP/Agosto 12/Lista Precios-8.png`, `LP/Agosto 26/Lipiestacion/Lista Precios-8.png` |

Lecturas útiles:
- [V] Entre la semana al 05/08 y al 12/08/26 solo cambiaron en DJ Gasco 15 (23.000→24.500) y Abastible 15 (24.000→24.500). Entre 12/08 y 26/08 no cambió ningún precio leído: solo la fecha.
- [V] Lipigas 15 es el mismo precio promo en DJ, DJ2 y RDG la misma semana ($20.900); Lipigas Recoleta y Lipiestación tienen su propia escala (más alta).
- [I] Hay una "tabla madre" por zona: (a) multimarcas DJ/DJ2/RDG comparten Lipigas; (b) Recoleta y Lipiestación Velásquez comparten 45 kg y Yale. Los precios Gasco/Abastible sí difieren entre DJ y RDG.

---

## 3. Qué cambia semana a semana y qué es fijo

| Elemento | Frecuencia | Evidencia |
|---|---|---|
| Fecha "Vigente hasta" | Cada semana (todas las piezas) | [V] Ag12/Ag19/Ag26 idénticos salvo fecha; tamaños PNG casi iguales (±0,1%) |
| Precios | Cuando el cliente los cambia (no siempre semanal) | [V] §2 |
| Celda promo (qué tamaño/marca) | Ocasional | [V] abr-26 promo en las 3 marcas 15 kg; ago-26 solo Lipigas |
| Cintillos RDG ("Lipigas 15KG"/"Abastible 15KG") | Con la promo | [V] |
| Temporada (fondo, props, vestuario mascota, color DJ) | ~cada 3 meses + hitos (Fiestas Patrias, Navidad) | [V] Primavera nov-25 (flores, colibrí, mariposas), Otoño abr-26 (hojas, bellota, piñas, calabaza), Invierno ago-26 (copos, gorro/bufanda, monito de nieve) |
| Orden de las piezas 4/5 DJ2 (Gasco/Abastible) | Raro | [V] cambió entre abr-26 y ago-26 |
| Layout, logos, dirección, teléfono, pie de condiciones | Fijo | [V] |
| Locales en el set | Raro | [V] nov-25: 9 mesas (1 RDG); desde abr-26: 10 (se suma RDG Cerro Navia) |

Masters de temporada [V]: `ALP/Lista Precios (Primavera).ai`, `ALP/Lista Precios Invierno_Carpeta/Lista Precios Invierno.ai` (Informe: 1080×1350 px, RGB sRGB; fuentes Metropolis (Regular/SemiBold/ExtraBold/Black) + Poppins (Medium/Bold/Black/Italics); enlaces a cilindros `Lipigas 5/11/15/45 Kg.png`, `Lipigas Yale Al.png`), `ALP/Lista Precios (Fiestas Patrias)_Editable/`, `ALP/LISTA DE PRECIOS 09-04-26/Lista Precios (Actualizar Grafica)-N.png` (otoño 2026). Nombres de mesas en el `.ai` Invierno [V, extraídos del bloque privado de Illustrator]: `DJ_ListaPrecios`, `DJ2_ListaPrecios-1..4`, `LE_ListaPrecios`, `Recoletas_ListaPrecios`, `LEVelazquez_ListaPrecios`, `RDG_ListaPrecios`.

---

## 4. "Legales" — textos literales por marca y contexto [V]

> No hay bases legales, stock limitado ni "hasta agotar stock" en ninguna pieza de lista. El texto fijo es condición de venta + vigencia.

### 4.1 Lista de precios (posts 2025–2026)
| Marca | Texto literal (pie / vigencia / notas) | Fuente |
|---|---|---|
| Gas Don Julio | `SÓLO EFECTIVO \| RETIRO EN BODEGA \| [ícono WhatsApp] +56972555023` · `Vigente hasta el 26/08/26` (fecha en bold) · dirección `Los Mares 7503, Pudahuel Sur.` | `LP/Agosto 26/Don Julio/Lista Precios-1.png` |
| Gas Don Julio 2 | `SÓLO EFECTIVO \| RETIRO EN BODEGA \| [WA] +56931046901` · `Vigente hasta el 26/08/26` · portada: `Av. María Rozas Velásquez 475` / `Quinta Normal` | `LP/Agosto 26/Don Julio 2/Lista Precios-2..5.png` |
| El Rey del Gas Lo Prado | `SÓLO EFECTIVO \|  Retiro en bodega \|  [WA]  +56954606758` · `Números con (*) estan en OFERTA` (sic, sin tilde) · `Vigente hasta el 26/08/26` · `Neptuno 934, Lo Prado` | `LP/Agosto 26/Rey del gs/Lista Precios-9.png` |
| El Rey del Gas Cerro Navia | igual a Lo Prado con `+56966426189` y `El Pastizal 1518, Cerro Navia` | `.../Lista Precios-10.png` |
| Lipigas Recoleta | `Precios válidos hasta el` / `26 de Agosto de 2026` · `Todas las semanas tenemos distintas promociones.` · `Av. Perú 1337` / `Recoleta, Santiago` · titular `Encuentra los mejores precios aquí` | `LP/Agosto 26/Lipigas/Lista Precios-6.png` |
| Lipiestación Vecinal | igual a Recoleta con `Vecinal 4494` / `Estación Central, Santiago` | `.../Lipiestacion/Lista Precios-7.png` |
| Lipiestación Velásquez | igual con `5 de Abril 4021` / `Esq General Velasquez, Estación Central, Santiago` | `.../Lipiestacion/Lista Precios-8.png` |

Diferencias exactas entre marcas:
- Multimarcas (DJ/DJ2/RDG) llevan pie de pago+retiro+WhatsApp; Lipigas Recoleta/Lipiestación **no** llevan pago, retiro ni teléfono, pero sí "Todas las semanas tenemos distintas promociones."
- Formato de fecha: DD/MM/AA (multimarcas) vs "DD de Mes de AAAA" (Lipigas propias).
- RDG en mayúsculas/minúsculas mixtas ("Retiro en bodega"), DJ/DJ2 todo en mayúsculas bold dentro de cápsula azul.
- Solo RDG usa asterisco y la nota "Números con (*) estan en OFERTA".

### 4.2 Promo (post/story)
- RDG Summer Sale ene-2024: `SÓLO EFECTIVO | RETIRO EN BODEGA | [WA] +56954606758` · `¡TENEMOS PROMO!` · `LIPIGAS 15KG $17.900` · `PRECIOS VIGENTE` / `DESDE EL 18/01/2024` / `HASTA EL 24/01/2024` (sic "VIGENTE"). `WS/ENERO/VERANO_promo.png`
- RDG story ene-2024: `Válidos desde el Jueves 25 al Miércoles 31 de Enero 2024` · `EFECTIVO Y TRANSFERENCIA | RETIRO EN BODEGA | [WA] +56954606758`.
- RDG 2021 Flash Sale: `PRECIOS VIGENTES DESDE EL 10/06/2021 HASTA EL 16/06/2021` · `(OFERTA)` · `SÓLO EFECTIVO | RETIRO EN BODEGA | [WA] +56954606758`. `AM/Rey del Gas/VIEJOS/lista-promo-lipigas-05.png`

### 4.3 Pendones (impresión, oct-2025) — legal común a Lipiestación, Don Julio y Gas Noviciado
`SÓLO VENTA EN EFECTIVO, NO TENEMOS PAGO CON TARJETAS,` / `SÓLO RETIRO EN LOCAL, NO REALIZAMOS ENVÍOS A DOMICILIO.`
Fuentes: `PEN/Lipiestacion_Pendon-Promocion.pdf`, `PEN/Lipiestacion_Pendon-Precios1.pdf`, `PEN/DonJulio_Pendon-Promocion.pdf`, `PEN/GasNoviciado_Pendon-Promocion.pdf`. (Títulos: `PROMOCIÓN` / `CARGA 15KG` / `CARGA 15KG LIPIGAS`; precios en pizarra negra en blanco para escribir a mano).

### 4.4 Impresos Don Julio / Oferta del día
- `SOLO EFECTIVO Y TRANSFERENCIA - RETIRO EN LOCAL` (`AM/Gas Don Julio/Impresos/GDJ2/1x2mts.pdf`, flyer DJ).
- `OFERTA VÁLIDA __/__` · `SOLO POR HOY` (`AM/Gas Don Julio/Impresos/GDJ2/paloma.pdf`).

### 4.5 Descuento / cupón (histórico 2019–2020)
- RDG: `CUPONAZO Válido hasta al 31/12/2019` · `$500` · `Descuento sobre precio normal, por la compra de Carga de Gas Licuado` · `GASCO - ABASTIBLE - LIPIGAS` · `Descuento válido mostrando en tu Smartphone o Tablet` (`AM/Rey del Gas/VIEJOS/CUPON.pdf`).
- Lipigas Estación Central: `$500 LECVER2020` · `Válido hasta al 31/01/2020` · `Descuento no acumulable, válido sobre precio normal, mostrando en tu Smartphone o Tablet` (`WS/Cuenta Gas Archivo/Lipiestacion/VIEJO/cupon.pdf`).

### 4.6 Medio de pago — ver §1.6 (literal: "N° de Cta: Motogas SPA Banco de Chile / Rut: 77.130.996-8 / Cuenta corriente: 8210371601 / Mail: admin@motogas.cl").

### 4.7 Evergreen contacto RDG (2026)
`SÓLO EFECTIVO | RETIRO EN BODEGA | [WA] LO PRADO: +56 9 5460 6758 – CERRO NAVIA: +56 9 6642 6189` (`Produccion Grafica/3. Evergreen/05_Evergreen Verano/V1/MG_Evergreen_Verano_RDG_CONTACTO.jpg`).

---

## 5. Formatos de salida y adaptación de temporada

[V]
- Lista semanal actual: **1080×1350 px (4:5)**, PNG, 10 piezas. Archivo nov-2025 mezcla 1080×1350 y 1081×1351 (bleed de 1 px).
- Story: 1080×1920 (9:16) — usado en 2024 (RDG "Nuevos precios").
- Histórico: 2250×2250 (1:1, 2021–abr-2024) y 2250×2813 (4:5 @2x, Recoleta 2024).
- Método de pago: 1080×1080 (RDG) / 1080×1350.
- Pendones: 75×120 cm vertical (2126×3402 pt), 120×75 cm horizontal, Gas Noviciado 100×200 cm.

Adaptación de temporada [V+I]: la tabla, tipografía y pie no se mueven; cambian fondo/textura, props 3D alrededor de la mascota, vestuario de la mascota y, en DJ, el color de bloque (amarillo-verde primavera/otoño → azul invierno con borde de papel rasgado). En Recoleta/Lipiestación solo cambian los props de esquina (flores/hojas/copos). En RDG cambian props y el cintillo derecho (claim de temporada, ej. "Primavera de descuentos", o el precio Abastible). [I] El diseñador duplica el `.ai` de la temporada anterior y reemplaza la capa de decoración.

---

## 6. Proceso inferido

- [V] Carpeta de trabajo vigente `LP/` con subcarpetas por semana nombradas con mes + día de término (`Agosto 12`, `Agosto 19`, `Agosto 26`); en `Agosto 26` ya separado por local (`Don Julio`, `Don Julio 2`, `Lipigas`, `Lipiestacion`, `Rey del gs`); carpetas sueltas por local (`Gs don Julio`, `Rey del gas`…) = semana al 05/08 (creadas jue 30/07).
- [V] Archivo histórico `ALP/` con convenciones distintas: `LISTA SEM 13-11` (fecha de inicio de vigencia, nov-2025, prefijos `DJ_`, `DJ2_`, `LE_`, `LEVelazquez_`, `Recoletas_`, `RDG_`) y `LISTA DE PRECIOS 09-04-26` (fecha del jueves). Antes (2023–2024, `WS/`): `DDMM_Lista.png` / `DDMM_Promo.png` (ej. `1117_Lista.png` = días 11 al 17).
- [V] Export se hace jueves por la mañana (mtime 09:19–13:11 los jueves).
- [V] No hay xlsx/docx/correo de precios en las carpetas revisadas (`Paid Media/Metas Cuentas Gas.xlsx` solo tiene métricas RRSS).
- [I] Flujo: el cliente (Motogas) envía precios por WhatsApp el miércoles/jueves → diseñador edita 10 mesas del `.ai` de temporada → exporta "Exportar para pantallas" (`Lista Precios-N.png`) → carpeta de la semana → publicación en 4 cuentas (RDG, DJ, Lipiestación, Recoleta según grilla mensual `2. Grilla Diseño/`).
- [I] Gas Noviciado (pendones oct-2025) y Lipivecino (carpetas 2023–2024) son locales que hoy no tienen lista semanal en el set.

---

## 7. Esquema JSON propuesto

```json
{
  "$schema": "motogas.price-list.v1",
  "week": {
    "validFrom": "2026-08-20",
    "validUntil": "2026-08-26",
    "folderName": "Agosto 26",
    "season": "invierno"
  },
  "brands": {
    "gasco": "GASCO", "abastible": "ABASTIBLE", "lipigas": "LIPIGAS"
  },
  "formats": ["5kg", "11kg", "15kg", "45kg", "yale_aluminio", "yale_fierro"],
  "stores": [
    {
      "id": "rdg-lo-prado",
      "artboard": 9,
      "account": "rey-del-gas",
      "displayName": "El Rey del Gas",
      "address": "Neptuno 934, Lo Prado",
      "whatsapp": "+56954606758",
      "layout": "matrix-3x3-rdg",
      "variant": "rojo",
      "legalProfile": "rdg-lista",
      "ribbons": [
        { "label": "Lipigas 15KG:", "ref": "lipigas.15kg" },
        { "label": "Abastible 15KG", "ref": "abastible.15kg" }
      ],
      "prices": {
        "gasco":     { "5kg": 13000, "11kg": 18000, "15kg": 25000 },
        "abastible": { "5kg": 12000, "11kg": 18000, "15kg": 24000 },
        "lipigas":   { "5kg": 11900, "11kg": 16900, "15kg": { "value": 20900, "promo": true } }
      }
    },
    {
      "id": "lipigas-recoleta",
      "artboard": 6,
      "account": "lipigas-recoleta",
      "displayName": "Lipigas Recoleta",
      "address": "Av. Perú 1337",
      "addressLine2": "Recoleta, Santiago",
      "whatsapp": null,
      "layout": "pills-lipigas",
      "legalProfile": "lipigas-propia-lista",
      "prices": {
        "lipigas": { "5kg": 11000, "11kg": 17000, "15kg": { "value": 21900, "promo": true },
                     "45kg": 67900, "yale_aluminio": 27900 }
      }
    }
  ],
  "legalProfiles": {
    "multimarca-lista": {
      "footer": "SÓLO EFECTIVO | RETIRO EN BODEGA | {whatsappIcon} {whatsapp}",
      "validity": "Vigente hasta el {validUntil:DD/MM/YY}"
    },
    "rdg-lista": {
      "footer": "SÓLO EFECTIVO |  Retiro en bodega |  {whatsappIcon}  {whatsapp}",
      "validity": "Vigente hasta el {validUntil:DD/MM/YY}",
      "promoNote": "Números con (*) estan en OFERTA"
    },
    "lipigas-propia-lista": {
      "validity": "Precios válidos hasta el\n{validUntil:D 'de' Mmmm 'de' YYYY}",
      "tagline": "Todas las semanas tenemos distintas promociones."
    },
    "pendon": {
      "footer": "SÓLO VENTA EN EFECTIVO, NO TENEMOS PAGO CON TARJETAS,\nSÓLO RETIRO EN LOCAL, NO REALIZAMOS ENVÍOS A DOMICILIO."
    }
  },
  "render": {
    "outputs": [{ "id": "post", "w": 1080, "h": 1350 }, { "id": "story", "w": 1080, "h": 1920 }],
    "fileName": "Lista Precios-{artboard}.png",
    "folder": "00. Lista de precios/{folderName}/{account}"
  }
}
```

Reglas de validación sugeridas: precio entero CLP múltiplo de 100; render `$` + separador de miles `.`; `validUntil` = miércoles y `validFrom` = jueves anterior; un `promo:true` en RDG añade `*`; en Recoleta/Lipiestación cambia píldora a verde + "PROMO"; en DJ/DJ2 celda roja "- Promo -". Mantener la tabla de formatos por local (§1.1) como catálogo para que no aparezcan celdas inexistentes (ej. 45 kg en RDG).

---

## 8. Pendientes / dudas para el cliente
1. Confirmar medio de pago real (lista dice solo efectivo; SAC/impresos aceptan transferencia).
2. ¿Hay texto legal formal exigido por Lipigas para locales con su marca (Recoleta/Lipiestación)? No se encontró ninguno.
3. Fuente de precios: pedir que llegue en planilla estructurada (local × marca × formato).
4. Gas Noviciado y Lipivecino: ¿entran al set semanal?
5. Typo heredado "estan" (sin tilde) en RDG y "PRECIOS VIGENTE" en 2024: decidir si se corrige en la plantilla.
