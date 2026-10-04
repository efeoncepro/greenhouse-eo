/** Local package/consumer proof. Explicit checkout argument; never alters pins, forms or hosts. */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import assert from 'node:assert/strict'

import { build } from 'esbuild'
import { JSDOM } from 'jsdom'

if (!process.argv[2])
  throw new Error('Usage: node scripts/verify-growth-axis-inputs.mjs /absolute/path/to/axis-design-system')

const root = process.cwd(),
  axis = resolve(process.argv[2]),
  temp = await mkdtemp(resolve(tmpdir(), 'growth-axis-input-'))

try {
  const bundle = resolve(temp, 'proof.mjs')

  await build({
    stdin: {
      contents: `
    export {FormRenderer} from ${JSON.stringify(resolve(root, 'src/growth-forms-renderer/renderer.ts'))};
    export {staticContractFixture} from ${JSON.stringify(resolve(root, 'src/growth-forms-renderer/fixtures.ts'))};
    export {createAxisGrowthInputFactory} from ${JSON.stringify(resolve(root, 'src/growth-forms-renderer/input-behavior-adapter.ts'))};
    export * from ${JSON.stringify(resolve(axis, 'packages/primitives/dist/input-behavior.js'))};
    export * from ${JSON.stringify(resolve(axis, 'packages/primitives/dist/input-phone.js'))};
  `,
      resolveDir: root
    },
    alias: { '@': resolve(root, 'src') },
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundle,
    logLevel: 'warning'
  })

  const api = await import(pathToFileURL(bundle).href),
    dom = new JSDOM('<main id="root"></main>', { url: 'https://forms.example.test' })

  for (const key of [
    'window',
    'document',
    'HTMLElement',
    'HTMLInputElement',
    'HTMLTextAreaElement',
    'CustomEvent',
    'Event',
    'localStorage'
  ])
    globalThis[key] = dom.window[key]

  const factory = api.createAxisGrowthInputFactory({
    email: api.createEmailBehavior,
    url: () => api.createUrlBehavior({ defaultProtocol: 'https:' }),
    rut: api.createRutBehavior,
    phone: country => api.createPhoneBehavior({ country })
  })

  const contract = api.staticContractFixture()

  contract.fields.push(
    { key: 'rut', type: 'national_id', label: 'RUT', validatorParams: { country: 'CL' } },
    { key: 'website', type: 'url', label: 'Sitio' }
  )

  const renderer = new api.FormRenderer({
    root: document.querySelector('#root'),
    contract,
    api: { baseUrl: 'https://forms.example.test', slug: 'test' },
    doc: document,
    inputBehaviors: factory,
    fetchImpl: async () => new Response('{}', { status: 404 })
  })

  renderer.mount()

  const edit = (name, value, blur = true) => {
    const input = document.querySelector(`[name="${name}"]`)

    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
    if (blur) input.dispatchEvent(new Event('blur'))

return input
  }

  assert.equal(edit('phone', '961234567').value, '9 6123 4567')
  assert.equal(renderer.values.phone, '+56961234567')
  assert.equal(edit('phone', '+442079460018').value, '+44 20 7946 0018')
  assert.equal(renderer.values.phone, '+442079460018')
  assert.equal(edit('phone', '+5691234567899999').value, '+5691234567899999')
  assert.equal(renderer.values.phone, '+5691234567899999')
  assert.equal(edit('rut', '12345678k').value, '12.345.678-K')
  assert.equal(renderer.values.rut, '12345678K')
  assert.equal(edit('website', 'example.com').value, 'https://example.com')
  assert.equal(edit('work_email', 'User+tag@Example.com').value, 'User+tag@Example.com')

  // DOM behavior is exercised independently of React and preserves native reset / IME / cleanup.
  const form = document.createElement('form'),
    input = document.createElement('input')

  form.append(input)
  document.body.append(form)
  input.defaultValue = '12345678k'
  let changes = 0
  const binding = api.bindInputBehavior(input, api.createRutBehavior(), () => changes++)

  input.value = '12'
  input.dispatchEvent(new Event('input'))
  assert.equal(binding.read().value, '12')
  input.dispatchEvent(new Event('compositionstart'))
  input.value = 'あ'
  input.dispatchEvent(new Event('input'))
  assert.equal(changes, 1)
  input.dispatchEvent(new Event('compositionend'))
  assert.equal(binding.read().state, 'invalid')
  form.reset()
  await Promise.resolve()
  assert.equal(binding.read().value, '12345678K')
  binding.setValue('1234567890')
  input.dispatchEvent(new Event('blur'))
  assert.equal(input.value, '1234567890')
  binding.destroy()
  const before = changes

  input.dispatchEvent(new Event('input'))
  assert.equal(changes, before)
  renderer.destroy()
  dom.window.close()
  console.log(
    'PASS: real AXIS package behaviors → Growth Forms renderer; canonical values, no truncation, portable DOM, IME, reset, cleanup. No network writes.'
  )
} finally {
  await rm(temp, { recursive: true, force: true })
}
