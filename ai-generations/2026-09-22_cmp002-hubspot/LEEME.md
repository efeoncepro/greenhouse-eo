# CMP-002 · Plates de las siete piezas (2026-09-22)

Corrida de los plates limpios del carril HubSpot de «Tu IA no conoce tu negocio». **Estado: boceto.**

> 🔴 **No publicar ni pautar.** Las siete llevan el Sprocket de HubSpot, marca registrada de un tercero. El kit
> propio (`ai-generations/2026-09-17_sprocket-3d/`) está autorizado **para bocetos y solicitudes de aprobación**:
> las guías para partners exigen aprobación escrita previa por formulario, con boceto, **7–10 días hábiles**.
> Estas piezas son exactamente ese boceto. Fuentes: `hubspot.com/partners/promotion-guidelines` ·
> `legal.hubspot.com/tm-usage-guidelines`.

## Qué hay acá

- `fichas/KV-0*.json` — una ficha por pieza, **una sola palanca cada una**.
- `prompts/KV-0*.txt` — el prompt **completo emitido** por `pnpm foto:prompt`, no reconstruido a mano.
- `out/*-plate.png` — el plate limpio, sin texto ni capa gráfica.
- `generacion.log` — comando, modelo y costo por pieza.

## Método

1. Copy aprobado por el operador el 22/09 tras seis rondas (ver `CMP-002/conceptos/`).
2. Registro **C · «la respuesta a la vista»** para seis piezas; **KV-03 en A documental**, única excepción.
3. Ficha por pieza con palanca única, reservas con **tono y materia declarados**, límite de sujetos y lecho.
4. Compilado con `pnpm foto:prompt` — **nunca concatenando bloques a mano**.
5. Generado con `gpt-image-2.5-sunburst --quality high`, 1152×1440 nativo, con la vista del kit del sprocket que
   coincide con la cámara de cada toma.

## Las siete

| ID | Palanca | Registro | Vista del sprocket |
|---|---|---|---|
| KV-01 · permisos los firmas tú | `ausencia` | C | tres cuartos izquierda |
| KV-02 · preguntan otra cosa | `escucha` | C | frente héroe |
| KV-03 · cuándo no conviene | `descarte` | **A** | cenital plano |
| KV-04 · el criterio no | `marcado` | C | lateral pronunciado |
| KV-05 · operas como Starter | `luz-motivada` | C | frente héroe |
| KV-06 · ¿y en el resultado? | `instrumento` | C | rodando sobre canto |
| KV-07 · su criterio sí | `pov` | C | tres cuartos izquierda |

## Avisos del compilador, y por qué se dejan

- **Marca registrada (las siete):** correcto y esperado. El aviso viaja con el objeto, no con la memoria de quien
  lo usa. Gobierna el estado boceto de toda la corrida.
- **KV-03 «no declara un MOMENTO»:** correcto que no lo tenga. `descarte` es una palanca sin momento por diseño,
  igual que `ausencia` — el canon lo dice de forma explícita para esa familia.

## Hallazgo: el Sprocket es el acento

El sprocket es naranja `#FF5C35`. Al ir en las siete, **ocupa por sí solo el rol del acento cálido** que el canon
dosifica en 1 de cada 2. No se le suma ningún acento adicional: eso habría puesto dos acentos por pieza. La
variedad se consigue moviendo **tamaño, foco y protagonismo** del sprocket — héroe en KV-05, casi imperceptible y
fuera de foco en KV-02 y KV-03.

## Qué falta después de los plates

1. `pnpm foto:validar <plate> --zona-texto` por pieza, **antes** de componer.
2. **QA del sprocket al 100%**, igual que `pnpm foto:emblema` con el bordado: forma por forma.
3. Capa gráfica con `pnpm foto:componer:cta` + `pnpm foto:cta:gate`, en pareja y en ese orden.
4. Los otros tres ratios, **recompuestos nativos**, nunca recortados.
5. Trámite de aprobación ante HubSpot con estos bocetos.
