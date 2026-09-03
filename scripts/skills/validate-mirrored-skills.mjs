#!/usr/bin/env node
/**
 * Fails when a versioned Codex/Claude skill mirror drifts.
 *
 * Keep the manifest intentionally small: an entry means the two complete bundles
 * are a shared contract, not merely similarly named skills.
 */
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const repo = resolve(new URL('../..', import.meta.url).pathname)
/*
 * `greenhouse-globe` entra el 2026-08-03: los dos bundles ya se venían manteniendo a mano y byte a
 * byte, sin nada que lo verificara. Un espejo que nadie valida diverge en silencio — es la misma
 * clase de drift invisible de ISSUE-126, donde una dependencia cambió de contenido sin que ninguna
 * versión lo delatara y la reconciliación falló dos días con su scheduler en verde.
 */

const mirroredSkills = [
  {
    // La skill de release declara "Paridad obligatoria entre agentes" en su propio texto, y hasta
    // 2026-08-29 NADA lo verificaba: no estaba en este allowlist. Una afirmación sin mecanismo es
    // exactamente lo que un espejo divergente aprovecha — dos agentes promoviendo a producción con
    // reglas distintas. Va en `shared-files` porque el lado Codex tiene un `agents/openai.yaml` que
    // el lado Claude no consume; todo lo demás, `SKILL.md` incluido, debe ser idéntico.
    id: 'greenhouse-production-release',
    mode: 'shared-files',
    agentLocal: ['agents/openai.yaml'],
    codex: '.codex/skills/greenhouse-production-release',
    claude: '.claude/skills/greenhouse-production-release',
  },
  {
    // Data Studio se opera por UI y cambia con frecuencia. Codex y Claude deben compartir el mismo
    // catálogo, límites de autorización y protocolo browser para no editar un reporte con dos reglas.
    id: 'google-data-studio',
    mode: 'byte-identical',
    codex: '.codex/skills/google-data-studio',
    claude: '.claude/skills/google-data-studio',
  },
  {
    /*
     * `mcp-craft` entra el 2026-09-02 junto con la skill. Es el OFICIO domain-free del que
     * `efeonce-mcp-platform` es consumer: si los dos bundles divergen, Codex y Claude diseñan
     * superficies MCP con reglas distintas y el drift aparece en el contrato publicado, no en el
     * repo. Va byte-identical porque no tiene archivos locales por agente.
     */
    id: 'mcp-craft',
    mode: 'byte-identical',
    codex: '.codex/skills/mcp-craft',
    claude: '.claude/skills/mcp-craft',
  },
  {
    id: 'efeonce-mcp-platform',
    mode: 'byte-identical',
    codex: '.codex/skills/efeonce-mcp-platform',
    claude: '.claude/skills/efeonce-mcp-platform',
  },
  {
    id: 'greenhouse-globe',
    mode: 'byte-identical',
    codex: '.codex/skills/greenhouse-globe',
    claude: '.claude/skills/greenhouse-globe',
  },
  {
    id: 'greenhouse-globe-model-fleet',
    mode: 'byte-identical',
    codex: '.codex/skills/greenhouse-globe-model-fleet',
    claude: '.claude/skills/greenhouse-globe-model-fleet',
  },
  {
    // La operación de imágenes comparte código, modelos y restricciones de formato. Una divergencia
    // entre agentes puede convertir una capacidad preview del proveedor en un fallback deprecated.
    id: 'greenhouse-ai-image-generator',
    mode: 'byte-identical',
    codex: '.codex/skills/greenhouse-ai-image-generator',
    claude: '.claude/skills/greenhouse-ai-image-generator',
  },
  {
    // Resend es infraestructura de correo compartida: un invariante que divirja entre agentes
    // termina en que uno de los dos vuelve a activar el tracking sobre enlaces con credencial.
    id: 'resend-email-platform',
    mode: 'byte-identical',
    codex: '.codex/skills/resend-email-platform',
    claude: '.claude/skills/resend-email-platform',
  },
  {
    // Templates, delivery y visuales de email son un solo contrato compartido. El espejo evita que
    // un agente reactive un generador legacy o use GPT Image 1.5 como fallback de transparencia.
    id: 'greenhouse-email',
    mode: 'byte-identical',
    codex: '.codex/skills/greenhouse-email',
    claude: '.claude/skills/greenhouse-email',
  },
  {
    // El espejo existía y NADIE lo validaba: al 2026-08-20 llevaba dos actualizaciones de atraso.
    // La versión de Codex seguía declarando que la cuota de recuperación de acceso era
    // "cross-channel" cuando el código la aplica POR CANAL — así que un agente que entrara por
    // Codex le habría dicho al operador que reenviar un correo apagaba también el enlace temporal,
    // escondiéndole la única salida que le quedaba a un candidato sin acceso a su prueba.
    // La divergencia de una skill de dominio no es cosmética: es dos agentes operando el mismo
    // proceso de contratación con reglas distintas sobre una persona real.
    id: 'greenhouse-talent-people-operator',
    mode: 'byte-identical',
    codex: '.codex/skills/greenhouse-talent-people-operator',
    claude: '.claude/skills/greenhouse-talent-people-operator',
  },
  {
    /*
     * Las dos SEO entran el 2026-08-25 tras reconciliarlas a mano. Estuvieron divergiendo en
     * silencio: `seo-aeo` ni siquiera tenia copia `.claude` versionada — vivia fuera de git — y la
     * copia que un agente cargaba estaba MAS VIEJA que la versionada, sin nada que lo delatara.
     * `seo-aeo-practice` era peor: la copia `.codex` afirmaba que el AEO de un cliente real iba
     * regalado cuando esta contratado y pagado, asi que un agente razonaba sobre un alcance
     * comercial falso. Un espejo que nadie valida diverge en silencio, y en una skill comercial
     * el drift no es cosmetico: se le cobra mal a un cliente.
     */
    id: 'seo-aeo',
    mode: 'byte-identical',
    codex: '.codex/skills/seo-aeo',
    claude: '.claude/skills/seo-aeo',
  },
  {
    id: 'seo-aeo-practice',
    mode: 'byte-identical',
    codex: '.codex/skills/seo-aeo-practice',
    claude: '.claude/skills/seo-aeo-practice',
  },
  {
    /*
     * DataForSEO comparte el SKILL entre agentes, pero conserva los dossiers del proveedor en un solo
     * árbol canónico `.claude/references` para evitar duplicarlos. Hasta 2026-09-01 esa paridad era sólo
     * prosa: los dos SKILL podían divergir y Codex además recibía pointers relativos que no resolvían.
     * `shared-files` protege el cuerpo común y hace nominales —no por patrón— las excepciones one-sided.
     */
    id: 'dataforseo-operator',
    mode: 'shared-files',
    agentLocal: [
      'agents/openai.yaml',
      'references/00-fundamentos.md',
      'references/01-serp.md',
      'references/02-labs.md',
      'references/03-backlinks.md',
      'references/04-onpage.md',
      'references/05-keywords-domain-analytics.md',
      'references/06-resto-catalogo.md',
      'references/07-contrato-greenhouse.md',
      'references/08-ai-optimization.md',
      'references/09-editorial-mining.md',
    ],
    codex: '.codex/skills/dataforseo-operator',
    claude: '.claude/skills/dataforseo-operator',
  },
  {
    /*
     * Entra el 2026-08-25: los dos bundles existian desde julio y NADIE los validaba, asi que ya
     * habian divergido en cuatro archivos sin que ningun gate lo delatara. La copia `.claude`
     * mandaba a una skill de Claude a leer `.codex/skills/seo-aeo/references/...` (el arbol del
     * OTRO agente), y la copia `.codex` apuntaba el canon de content-to-capability a
     * `../../docs/`, que resuelve a `.codex/docs/` y NO EXISTE. Un pointer roto en una skill de
     * ejecucion no se cae con error: el agente sigue sin el canon y produce el entregable igual.
     * Se reconcilio a mano (frontmatter completo + pointer repo-root a docs/ + pointers a
     * seo-aeo en forma relativa, que resuelve correcto desde AMBAS copias) antes de registrarla.
     */
    id: 'content-marketing-studio',
    mode: 'byte-identical',
    codex: '.codex/skills/content-marketing-studio',
    claude: '.claude/skills/content-marketing-studio',
  },
  {
    /*
     * Entra el 2026-08-25, el mismo dia que nace. Es una skill de CLIENTE: transcribe el proceso de
     * produccion editorial que Berel y Efeonce acordaron y que hasta hoy solo vivia en el Notion del
     * cliente. Un espejo que diverge aca no es cosmetico: los dos agentes producirian el articulo de
     * un cliente real con reglas distintas sobre su voz, sus enlaces, sus claims de producto y su
     * licencia de imagen — y el entregable sale con el nombre de Efeonce. Ademas declara conflictos
     * abiertos entre documentos del cliente que NINGUN agente debe resolver por su cuenta: si una
     * copia pierde esa advertencia, ese agente elige en silencio.
     */
    id: 'berel-content-production',
    mode: 'byte-identical',
    codex: '.codex/skills/berel-content-production',
    claude: '.claude/skills/berel-content-production',
  },
  {
    // LicitaLAB expone evidencia comercial y documental sobre licitaciones reales. Si Codex y Claude
    // divergen en tools, estados RAG o límites read-only, uno puede declarar bases leídas cuando siguen
    // indexando o tratar una primera página como historial completo. El bundle debe ser uno solo.
    id: 'greenhouse-public-private-tenders',
    mode: 'byte-identical',
    codex: '.codex/skills/greenhouse-public-private-tenders',
    claude: '.claude/skills/greenhouse-public-private-tenders',
  },
  {
    /*
     * Entra el 2026-08-25 tras reconciliarla a mano. Los dos bundles ya existian y nadie los
     * validaba: la unica divergencia era el frontmatter de `SKILL.md`, y era la que mas duele —
     * la copia `.codex` conservaba una `description` de una linea, sin `user-invocable` ni
     * `argument-hint`, sin el router de speaker (voz institucional Efeonce vs voz autoral de
     * Julio Reyes) y sin ninguno de los triggers. Un frontmatter pobre no falla con error: la
     * skill simplemente NO SE CARGA cuando el operador pide "headline", "storytelling" o "voz
     * de Julio", asi que un agente que entrara por Codex escribia copy firmado sin el sistema
     * de voz del autor y sin saber que existia. Se adopto el frontmatter completo de `.claude`
     * (el resto de los 30 archivos ya era byte-identico).
     */
    id: 'copywriting',
    mode: 'byte-identical',
    codex: '.codex/skills/copywriting',
    claude: '.claude/skills/copywriting',
  },
  {
    // El contrato CRM combina operación segura y venta consultiva. Los dos agentes deben
    // conservar los mismos límites de producto, claims de partnership y gates de mutación.
    id: 'salesforce-crm-practice',
    mode: 'byte-identical',
    codex: '.codex/skills/salesforce-crm-practice',
    claude: '.claude/skills/salesforce-crm-practice',
  },
  {
    // Engagement sigue siendo un producto vigente y puede coexistir con Next. El espejo evita
    // que un agente lo trate como legacy o convierta una recomendación comercial en una mutación.
    id: 'salesforce-marketing-cloud-engagement',
    mode: 'byte-identical',
    codex: '.codex/skills/salesforce-marketing-cloud-engagement',
    claude: '.claude/skills/salesforce-marketing-cloud-engagement',
  },
  {
    // Marketing Cloud Next cambia rápido y depende de Data 360, consentimiento y ediciones.
    // Un único bundle compartido protege el release ledger y los claims de disponibilidad.
    id: 'salesforce-marketing-cloud-next',
    mode: 'byte-identical',
    codex: '.codex/skills/salesforce-marketing-cloud-next',
    claude: '.claude/skills/salesforce-marketing-cloud-next',
  },
]

const filesIn = root => {
  if (!existsSync(root)) return null

  const visit = directory =>
    readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) return visit(path)

      return entry.isFile() ? [relative(root, path)] : []
    })

  return visit(root).sort()
}

const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const failures = []

for (const manifest of mirroredSkills) {
  const { id, mode, codex, claude } = manifest

  if (mode !== 'byte-identical' && mode !== 'shared-files') {
    failures.push(`${id}: unsupported mirror mode '${mode}'`)
    continue
  }

  const codexRoot = join(repo, codex)
  const claudeRoot = join(repo, claude)
  const codexFiles = filesIn(codexRoot)
  const claudeFiles = filesIn(claudeRoot)

  if (!codexFiles || !claudeFiles) {
    failures.push(`${id}: mirror directory missing`)
    continue
  }

  /*
   * `shared-files` existe para skills cuyo bundle DIFIERE de forma legítima entre agentes
   * (por ejemplo un `agents/openai.yaml` que sólo el lado Codex consume), pero cuyo contenido
   * compartido igual tiene que ser idéntico.
   *
   * 🔴 La exención es NOMINAL, nunca por patrón: cada archivo agent-local se declara en
   * `agentLocal`. Un archivo nuevo que diverja SIGUE fallando — que es el punto. Sin esto la
   * única alternativa era dejar la skill fuera del validador, y ahí su "paridad obligatoria"
   * queda siendo una afirmación en prosa que nada verifica.
   */
  const agentLocal = new Set(mode === 'shared-files' ? (manifest.agentLocal ?? []) : [])

  const paths = [...new Set([...codexFiles, ...claudeFiles])].sort()

  for (const path of paths) {
    if (!codexFiles.includes(path) || !claudeFiles.includes(path)) {
      if (agentLocal.has(path)) continue

      failures.push(`${id}: ${path} exists in only one mirror`)
      continue
    }

    if (digest(join(codexRoot, path)) !== digest(join(claudeRoot, path))) {
      failures.push(`${id}: ${path} content differs`)
    }
  }
}

if (failures.length) {
  console.error(`✗ Mirrored skill drift (${failures.length})`)
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`✓ Mirrored skills are identical: ${mirroredSkills.map(({ id }) => id).join(', ')}`)
