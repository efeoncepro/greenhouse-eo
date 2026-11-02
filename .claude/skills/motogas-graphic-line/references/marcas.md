# Marcas, locales y sistema común de Motogas

> Resumen operativo del análisis del 2026-11-02 (`ai-generations/2026-11-02_motogas-linea-grafica/MOTOGAS_LINEA_GRAFICA_V1.md`
> y sus 6 anexos, con rutas de cada pieza de referencia). Si algo aquí y una pieza aprobada difieren, se revisa con el
> equipo antes de producir. Las recetas de cada tipo de pieza se agregan aquí a medida que se resuelven.

## 1. Lo vigente vive en OneDrive

`Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/`: `2. Grilla Diseño/<mes>/` (grilla mensual),
`3. Evergreen/<temporada>/` (fijos: horario, ubicación, contacto/mesa de ayuda), `00. Lista de precios/<mes día>/`
(lista del jueves) y `1. Recursos Graficos/` (logos, fuentes, personajes, el mini manual `MotoGas-LineaGrafica.ai`).
`Workspace/` y `Archivo/` son histórico.

## 2. Registro de locales (fuente única)

| Id | Marca | Dirección | WhatsApp | N.º en la lista |
|---|---|---|---|---|
| `rdg-lo-prado` | El Rey del Gas | Neptuno 934, Lo Prado | +56 9 5460 6758 | 9 (rojo) |
| `rdg-cerro-navia` | El Rey del Gas | El Pastizal 1518 con Mapocho Sur, Cerro Navia | +56 9 6642 6189 | 10 (naranjo) |
| `dj-pudahuel` | Gas Don Julio | Los Mares 7503, Pudahuel Sur | +56 9 7255 5023 | 1 |
| `dj2-quinta-normal` | Gas Don Julio 2 | Av. María Rozas Velásquez 475, Quinta Normal | +56 9 3104 6901 | 2–5 |
| `lipi-recoleta` | Lipigas Recoleta | Av. Perú 1337, Recoleta | +56 9 8247 7870 | 6 |
| `lipiest-vecinal` | Lipiestación Central | Vecinal 4494, Estación Central | +56 9 8640 9812 | 7 |
| `lipiest-velasquez` | Lipiestación Central | 5 de Abril 4021, esq. General Velásquez, Estación Central | ídem | 8 |
| `gas-noviciado` | Gas Noviciado | sin dato | sin dato | — |

Horario común: lunes a sábado 10:00–20:00; domingos y festivos 10:00–15:00 (con horarios especiales de feriado).
El registro editable vive en el canvas (`project/locales.json`). **Medio de pago:** las listas dicen «SÓLO EFECTIVO»
pero hay piezas con transferencia: decisión abierta con el cliente.

## 3. Fichas por marca (lo esencial)

**El Rey del Gas.** Logo «EL / REY DEL GAS» serif en versalitas con filete. Paleta: amarillo→naranja, ámbar
`#FFAA00`, café `#5C2A00`, rojo `#FF1B00`; línea nueva (desde oct-2025): tela gris `#E6E7E8` con rayos, paneles rojo
`#DF1500` y mostaza `#FEAC10`, flechas ▶◀. Tipos: Poppins (línea nueva), Metropolis, Komika Axis (titulares cómicos).
Personaje 2D junto a un cilindro Lipigas 3D; megáfono 3D «¡Tenemos descuentos!»; CTA «Corre a ver nuestros precios
bajos y ¡APROVECHA AHORA!».

**Gas Don Julio (y Don Julio 2).** Logo «GAS / Don Julio» navy con contorno rojo + «MULTIMARCAS»; Don Julio 2 con «2»
amarillo y bandera de Venezuela. Paleta: navy `#163459`, rojo `#B40904`, chartreuse `#CEC805`, gris `#E8E8E8`. Poppins.
Papel con semitono, borde rasgado navy, brochazo chartreuse, cinta roja «TENEMOS DCTOS». Gasfield se disfraza por temporada.

**Lipigas Recoleta y Lipiestación.** Identidad Lipigas (franquicia): navy `#002989`, amarillo `#FFD400`, degradado
`#CBC100 → #6D9F27 → #0E7960`, el símbolo de dos óvalos, la familia de cilindros amarillos. Poppins y Metropolis Black.
El Perrito Lipigas aparece en Recoleta. Diferencias entre los dos locales: panel de horario (celeste en Lipiestación,
lima en Recoleta), contenido local y paisaje de la pantalla del teléfono.

## 4. Sistema común

- Formato principal 4:5, 1080×1350. Además story, 1:1, 16:9, portada de Facebook, pendones e impresos.
- Píldora de condiciones: «SÓLO EFECTIVO | RETIRO EN BODEGA | [WhatsApp] +56…».
- Objetos 3D tipo plastilina, luz suave, tintados en la paleta de la marca.
- **Paridad ×4 marcas** en toda campaña, temporada y efeméride.
- Tono: tuteo, chileno coloquial y cercano.
- Tipos de pieza: lista de precios (jueves) · fijos evergreen (Horario, Ubicación, Contacto/Mesa de ayuda) ·
  efeméride · grilla por pilares · promo · pendón.

## 5. Legales por contexto

| Perfil | Texto |
|---|---|
| Lista multimarca (Don Julio 1 y 2) | `SÓLO EFECTIVO \| RETIRO EN BODEGA \| [WA] {whatsapp}` + `Vigente hasta el {DD/MM/AA}` |
| Lista Rey del Gas | `SÓLO EFECTIVO \| Retiro en bodega \| [WA] {whatsapp}` + `Números con (*) estan en OFERTA` (sic) + `Vigente hasta el {DD/MM/AA}` |
| Lista Lipi | `Precios válidos hasta el {D de Mes de AAAA}` + `Todas las semanas tenemos distintas promociones.` |
| Contacto evergreen Rey del Gas | `SÓLO EFECTIVO \| RETIRO EN BODEGA \| [WA] LO PRADO: +56 9 5460 6758 – CERRO NAVIA: +56 9 6642 6189` |
| Pendón | `SÓLO VENTA EN EFECTIVO, NO TENEMOS PAGO CON TARJETAS,` / `SÓLO RETIRO EN LOCAL, NO REALIZAMOS ENVÍOS A DOMICILIO.` |

## 6. Temporadas

Calendario: ene–feb Verano · mar–may Otoño · jun Mundial (cuando corresponda) e Invierno · jul–ago Invierno · sep
Fiestas Patrias y Primavera · oct Primavera y Halloween · dic Navidad veraniega y Verano. Se pueden apilar.
Receta: congelar logo, datos, precios, teléfonos, legal y CTA; sumar 3 a 6 objetos del set (2 arriba, 1–2 a los
costados, 1 al pie); vestuario solo en Gasfield; el Rey del Gas solo cambia la corona (Santa, chupalla).

## 7. Errores que hay que impedir

Datos cruzados entre locales (sello, teléfono o vigencia de otro local), años equivocados, erratas heredadas
(«CHINELIDAD», «DOMIGOS», «estan»), restos de la temporada anterior, nieve en Fiestas Patrias, fotos de repartidor
(el negocio no despacha).

## 8. Recetas de piezas

_Pendiente: se agregan a medida que se resuelven._ El Rey del Gas tiene un kit de mundo (v01, sin revisar) y el mapa
de sus piezas en [`mundo-rey-del-gas.md`](mundo-rey-del-gas.md) §3; Horario, Ubicación y Mesa de ayuda se construyen desde ahí.
