> **En el Creative Workbench, lee esto primero.** Esta skill viene de Greenhouse y menciona estos
> comandos: {{comandos}}. En el Workbench la producción la gobierna su harness (ver `AGENTS.md` del
> repo) y esos comandos pueden estar desactivados: si uno responde «retirado» o el guardarraíl lo
> bloquea, **no busques rodeos** (otro script, `tsx scripts/...`, una API directa). Usa la equivalencia:
>
> | La skill dice                                                          | En el Workbench                                                                                                                                                              |
> | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | `pnpm ai:image`, `ai:fal`, `ai:omni`, `ai:image:rmbg`                  | La IA pasa por el broker privado: `pnpm marca:producir` con un job del pack de la marca. Sólo para marcas admitidas (`clients/brands.json` en estado `ready`).               |
> | `pnpm foto:*` (fotografía de marca Efeonce)                            | Si Efeonce no está admitida en `clients/brands.json`, todavía no se puede hacer aquí: díselo a la persona y que lo pida por issue. No lo reproduzcas con otras herramientas. |
> | `pnpm foto:componer`, `foto:componer:cta` (texto y firma sobre imagen) | `pnpm marca:componer` o `pnpm marca:disenar`, para marcas admitidas.                                                                                                         |
> | `pnpm assets:pull`                                                     | `pnpm marca:instalar <cliente>`.                                                                                                                                             |
>
> Lo demás de la skill sigue valiendo: el criterio, cómo elegir modelo, cómo juzgar el resultado y
> qué no hacer. Sólo cambia con qué comando se ejecuta. Si una equivalencia no existe, dilo en vez de
> improvisar. _(Nota agregada por `creative:sync` desde greenhouse-eo; no se edita aquí.)_
