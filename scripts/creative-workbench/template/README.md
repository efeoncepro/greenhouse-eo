# Creative Workbench

El taller del equipo creativo de Efeonce: diseño, redacción, fotografía de marca y producción con IA
para **Efeonce, Berel y SKY**, con Claude y Codex como compañeros de trabajo.

> Este repo está gobernado desde `efeoncepro/greenhouse-eo`. Las reglas de trabajo están en
> [AGENTS.md](AGENTS.md): léelo una vez, completo.

## Primer día

1. **Accesos.** Pide a Julio que te sume. Necesita tu usuario de GitHub y tu cuenta Google
   `@efeonce.org`, y te asigna los clientes con los que trabajas y si generas con IA.
2. **Herramientas.** Instala Node 24, [GitHub CLI](https://cli.github.com) y
   [Google Cloud CLI](https://cloud.google.com/sdk/docs/install). Luego:

   ```bash
   corepack enable
   gh auth login
   gh auth refresh -s read:packages
   gcloud auth login
   gcloud auth application-default login
   ```

3. **Repo.**

   ```bash
   gh repo clone efeoncepro/creative-workbench
   cd creative-workbench
   pnpm instalar
   pnpm doctor
   ```

   `pnpm doctor` crea tu `.env.local` y te dice qué falta, con el arreglo de cada cosa.

4. **Referencias de marca** (sólo si harás fotografía de marca Efeonce): `pnpm assets:pull`.

5. Abre la carpeta con Claude Code o Codex y pídele lo que necesitas. El agente ya conoce las reglas
   y las skills.

## Día a día

```bash
git checkout -b pieza/berel-banner-otono
pnpm pieza:nueva berel banner-otono
# … produces con el agente; las salidas quedan en projects/berel/banner-otono/salidas/
pnpm pieza:subir projects/berel/banner-otono
pnpm gates
git add projects/berel/banner-otono && git commit -m "berel: banner otoño"
git push -u origin pieza/berel-banner-otono
gh pr create --fill
```

## Qué puedes y qué no

- **Puedes:** crear y editar todo dentro de `projects/`, generar con IA a través de los CLIs, subir
  entregables de tus clientes y proponer cambios por issue.
- **No puedes (y el repo lo impide):** editar skills, CLIs, docs o reglas; ver llaves de proveedores;
  borrar assets de los buckets; empujar directo a `main`; publicar hacia un cliente o red social.

¿Falta una skill, una referencia o un brand pack? Abre un issue.
