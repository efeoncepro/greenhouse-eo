import { render } from '@react-email/render'
import { Text } from '@react-email/components'
import { describe, expect, it } from 'vitest'

import EmailLayout from './EmailLayout'

describe('EmailLayout', () => {
  it('renders the Spanish institutional shell from microcopy without losing unsubscribe', async () => {
    const html = await render(
      <EmailLayout previewText='Vista previa' locale='es' unsubscribeUrl='https://greenhouse.test/unsubscribe'>
        <Text>Contenido personalizado</Text>
      </EmailLayout>
    )

    expect(html).toContain('lang="es"')
    expect(html).toContain('Efeonce Greenhouse™ · Empower your Growth')
    expect(html).toContain('Este es un correo automático. Si tienes dudas, contacta a tu administrador.')
    expect(html).toContain('Dejar de recibir estos correos')
    expect(html).toContain('https://greenhouse.test/unsubscribe')
    expect(html).toContain('Contenido personalizado')
  })

  it('preserves the legacy English footer while en-US dictionary remains a mirror stub', async () => {
    const html = await render(
      <EmailLayout previewText='Preview' locale='en' unsubscribeUrl='https://greenhouse.test/unsubscribe'>
        <Text>Personalized content</Text>
      </EmailLayout>
    )

    expect(html).toContain('lang="en"')
    expect(html).toContain('This is an automated email. If you have questions, contact your administrator.')
    expect(html).toContain('Unsubscribe from these emails')
    expect(html).toContain('Personalized content')
  })
})
