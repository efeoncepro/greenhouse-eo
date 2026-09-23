import assert from 'node:assert/strict'
import test from 'node:test'

import { desescaparXml } from './svg-texto.mjs'

test('Decodifica las entidades de XML que escapa el renderer AXIS', () => {
  assert.equal(desescaparXml('IA &lt;3 &amp; &quot;tú&quot; &apos;ok&apos; &gt;'), 'IA <3 & "tú" \'ok\' >')
  assert.equal(desescaparXml('&#39;hola&#39; &#x2192;'), "'hola' →")
})

test('No decodifica dos veces: &amp;lt; es el texto literal «&lt;»', () => {
  assert.equal(desescaparXml('&amp;lt;'), '&lt;')
})
