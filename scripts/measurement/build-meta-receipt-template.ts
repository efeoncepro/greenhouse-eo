/** Offline-only compiler. Never authenticates, contacts GTM or publishes a workspace. */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const META_TEMPLATE_UPSTREAM_SHA256 = '4a6cc4e087789ac5d3e04acb4bd80d863a002fd0d4f7b523c1e342073caae057'
const fixture = new URL('./fixtures/meta-template-a575edb.tpl', import.meta.url)
const helper = new URL('./meta-receipt-callback.js', import.meta.url)
const str = (string: string) => ({ type: 1, string })
const bool = (boolean: boolean) => ({ type: 8, boolean })
const param = (key: string, value: unknown) => ({ key, value })
const rows = (names: string[]) => ({ type: 2, listItem: names.map(name => ({ type: 3, mapKey: [str('headerName')], mapValue: [str(name)] })) })
const permission = (publicId: string, params: unknown[] = []) => ({ instance: { key: { publicId, versionId: '1' }, param: params }, clientAnnotations: { isEditedByUser: true }, isRequired: true })

function replaceOnce(source: string, from: string, to: string): string {
  if (source.split(from).length !== 2) throw new Error('meta_receipt_patch_anchor_mismatch')

  return source.replace(from, () => to)
}

export function buildMetaReceiptTemplate(source = readFileSync(fixture, 'utf8')) {
  if (createHash('sha256').update(source).digest('hex') !== META_TEMPLATE_UPSTREAM_SHA256)
    throw new Error('meta_receipt_upstream_digest_mismatch')
  let output = replaceOnce(source, '// Sandbox Javascript imports', readFileSync(helper, 'utf8') + '\n// Sandbox Javascript imports')

  output = replaceOnce(output, '(statusCode, headers, response) => {',
    '(statusCode, headers, response) => {\n      captureEfeonceMetaReceipt(eventRequest, statusCode, response);')

  const changeSection = (name: string, next: string, modify: (value: any[]) => any[]) => {
    const before = output.split(name + '\n')[1]?.split(next)[0]

    if (!before) throw new Error('meta_receipt_template_section_missing')
    output = replaceOnce(output, before, '\n' + JSON.stringify(modify(JSON.parse(before)), null, 2) + '\n\n')
  }

  changeSection('___TEMPLATE_PARAMETERS___', '___SANDBOXED_JS_FOR_SERVER___', parameters => [
    ...parameters, { type: 'CHECKBOX', name: 'captureEfeonceReceipt', checkboxText: 'Capture receipt for authenticated Efeonce backend Lead only', simpleValueType: true, defaultValue: false },
  ])
  changeSection('___SERVER_PERMISSIONS___', '___TESTS___', permissions => [
    ...permissions, permission('read_container_data'),
    permission('read_request', [param('requestAccess', str('specific')), param('pathAllowed', bool(true)),
      param('headersAllowed', bool(true)), param('headerAccess', str('specific')),
      param('headerWhitelist', rows(['x-efeonce-meta-attempt', 'x-efeonce-meta-attempt-number']))]),
    permission('access_response', [param('writeResponseAccess', str('specific')), param('writeHeadersAllowed', bool(true)),
      param('writeHeaderAccess', str('specific')), param('writeHeaderWhitelist', rows(['x-efeonce-meta-receipt']))]),
  ])

  return { templateData: output, manifest: { contract: 'meta-receipt-template.v1', upstreamSha256: META_TEMPLATE_UPSTREAM_SHA256,
    outputSha256: createHash('sha256').update(output).digest('hex'), captureDefault: false, published: false, networkUsed: false } }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)

  if (args.length !== 2 || args[0] !== '--out') throw new Error('usage: build-meta-receipt-template --out /private/new-template.tpl')
  const built = buildMetaReceiptTemplate()

  writeFileSync(args[1], built.templateData, { mode: 0o600, flag: 'wx' })
  process.stdout.write(JSON.stringify(built.manifest) + '\n')
}
