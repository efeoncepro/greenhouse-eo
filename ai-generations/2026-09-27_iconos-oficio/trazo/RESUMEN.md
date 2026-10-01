# 15 glifos de Trazo candidatos: íconos de oficio de agencia

> **Estado:** candidatos para aprobación del operador (2026-09-27). **Fuera del set**: no se tocó AXIS. El alta a
> `STROKE_GLYPHS` la hace otra persona tras la aprobación (guía `docs/agent-composition/iconography.md` §11, paso 5).

Receta aplicada: grilla 24, margen 2, trazo 1,5, remates y uniones redondos, esfera r 1,75 rellena. Cada uno pasó
`node scripts/icons.mjs check` desde la raíz de AXIS, sin fallas (aire ≥ 0,5, eje dentro del margen, `mode` coherente).

- JSON de cada glifo: `<clave>.json` (formato del ejemplo keynote).
- Hojas de control por glifo: `control/<clave>/` (160 / 64 / 32 / 24 / 20 px, oscuro y papel, + SVG de 48).
- Hoja de familia junto a los 12 aprobados: `control/_familia-con-aprobados.png`; sólo candidatos: `control/_candidatos.png`
  (64, 24 y 20 px, reposo y respuesta).
- Geometría reproducible: `control/_generador.mjs` (curvas, cortes y rotaciones calculadas, no a ojo).

## Tabla

| Clave | Label | Use | Mode | Dónde responde la esfera | Aire 1,5 | Aire 1,75 (20 px) |
| --- | --- | --- | --- | --- | --- | --- |
| correo | Correo | Revenue · email marketing, correo | replace | sella el vértice de la solapa del sobre (la V se corta y la esfera ocupa el vértice) | 0,606 | 0,481 |
| telefono | Teléfono | Área · llamadas, contacto | replace | la onda externa del timbre se vuelve esfera (misma lógica que Medios) | 0,657 | 0,532 |
| calendario | Calendario | Growth · agenda, fechas | replace | el punto del día marcado (último de la segunda fila) | 1,000 | 0,875 |
| reunion | Reunión | Área · reuniones, conversación | complete | dentro del globo del frente: «lo que se dijo» | 2,000 | 1,875 |
| objetivo | Objetivo | Growth · objetivos, metas, KPI | replace | el punto central de la diana | 3,250 | 3,125 |
| presentacion | Presentación | Growth · presentaciones, workshops | complete | sobre la pizarra, el punto que se está presentando (el puntero) | 1,079 | 0,954 |
| contrato | Contrato | Área · contratos, acuerdos | replace | el final de la línea de firma | 0,750 | 0,625 |
| checklist | Checklist | Área · tareas, entregables | complete | donde iría el visto del ítem pendiente (tercera fila) | 1,779 | 1,654 |
| codigo | Código | Engine · desarrollo, código | replace | la barra de `</>` se vuelve esfera: `<•>` | 3,864 | 3,739 |
| base-de-datos | Base de datos | Engine · datos, bases de datos | complete | en la cara superior del cilindro: el dato | 0,747 | 0,622 |
| nube | Nube | Engine · nube, hosting | complete | dentro de la nube | 1,250 | 1,125 |
| integracion | Integración | Revenue · integraciones, conectores | complete | en el hueco entre enchufe y toma: la conexión | 0,699 | 0,574 |
| seguridad | Seguridad | Engine · seguridad, privacidad | replace | el ojo de la cerradura del candado | 2,750 | 2,625 |
| ubicacion | Ubicación | Área · ubicación, oficinas | replace | el ojo del pin (el círculo interior se vuelve esfera) | 4,497 | 4,372 |
| reloj | Reloj | Área · plazos, tiempo | replace | la punta del minutero (a las 12) | 0,750 | 0,625 |

Todos ≥ 0,5 con trazo 1,5. Con 1,75 (20 px), sólo **correo** (0,481) queda bajo 0,5, en el mismo rango que la
keynote de referencia (0,416) y cubierto por la decisión pendiente «aire del Trazo a 20 px».

## Dudas de diseño para el operador

1. **checklist — la esfera puede leerse como viñeta.** La guía dice «la esfera nunca es viñeta» (se refiere a usar la
   esfera en listas de una pieza, pero el parecido existe). Aquí el reposo muestra dos ítems con visto y uno pendiente
   (sólo la línea); en respuesta la esfera cierra el pendiente. Alternativa: `replace` con los tres ítems con visto y el
   tercero convertido en esfera (misma lectura de viñeta). Si se rechaza, propongo sacar la esfera de la columna de
   vistos.
2. **contrato — la línea que termina en esfera puede leerse como deslizador.** Probé una firma ondulada (se lee mejor en
   reposo) pero en respuesta queda «∩ •», peor. Se dejó la línea recta; a 24 px se lee «documento firmado».
3. **integracion — en reposo se lee «desconectado».** Es la lógica del `complete` (la esfera aparece donde la acción se
   resuelve: la conexión), pero el reposo sin esfera muestra dos piezas separadas. Es el glifo más liviano del set a
   20 px (va en diagonal y las mitades son chicas). Alternativa: reposo con las patas entrando en la toma y `replace`
   sin hueco, que no deja lugar a la esfera sin rediseñar el conector.
4. **correo — sello en el vértice de la solapa** en vez del punto de «no leído» en la esquina: la esquina obligaba a
   cortar tres trazos (borde superior, borde derecho y solapa) junto a la esfera. Si se prefiere la lectura «correo
   nuevo», hay que achicar el sobre y deja de llenar su guía.
5. **ubicacion — responde el ojo del pin, no la punta.** La punta con esfera se lee como un cuerpo con cabeza o un ojo de
   cerradura; el ojo del pin en acento es la lectura universal de «estás aquí». Si el operador quiere la punta, el modo
   pasa a `complete` con la esfera bajo el pin (el pin se achica).
6. **calendario — seis puntos de días.** Se leen como textura a 20 px (igual que los dos puntos de Web, pero más).
   Alternativa más limpia: `complete` sin puntos, esfera sola en la cuadrícula vacía; pierde «el día marcado entre
   otros».
7. **presentacion vs keynote candidata.** La keynote del ejemplo (atril con gráfico, «Growth · presentaciones, charlas»)
   es otra candidata fuera del set. Esta es pizarra con trípode y texto; si entran las dos, conviene separar `use`
   (keynote = charlas / escenario; presentación = workshops, pitch en sala).
8. **base-de-datos — óvalos de cuatro arcos circulares.** El muestreador de AXIS (`samplePath`) sólo mide arcos
   circulares (ignora `ry`), así que una elipse real daba aire falso (5,5) y 112 puntos fuera de margen. Los óvalos se
   construyeron con 4 arcos tangentes (r 2 y r 17,03): visualmente iguales a una elipse 8 × 3,25 y medibles. Conviene
   dejar escrito en la guía que el Trazo no usa arcos elípticos.
9. **nube** queda algo baja y ancha frente al set (llena el ancho, no el alto): es la forma natural de una nube; se puede
   subir 0,5 si en la hoja de familia se siente caída.
10. **Líneas asignadas por criterio.** Varias son transversales y se marcaron «Área · …» (teléfono, reunión, contrato,
    checklist, ubicación, reloj). Recordatorio de la guía: la línea del `use` no pinta; el acento lo pone la pieza.
