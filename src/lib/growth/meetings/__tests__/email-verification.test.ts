import { describe, expect, it } from 'vitest'

import { verifyMeetingEmail } from '../email-verification'

describe('meeting corporate email policy', () => {
  it('reutiliza el gate canónico y rechaza proveedores personales', async () => {
    await expect(verifyMeetingEmail('persona@gmail.com')).resolves.toMatchObject({
      accepted: false,
      isCorporate: false,
      reasonCode: 'email_not_corporate',
    })
  })

  it('acepta el correo corporativo autorizado para la agenda', async () => {
    await expect(verifyMeetingEmail('hhumberly@efeoncepro.com')).resolves.toMatchObject({
      accepted: true,
      syntaxValid: true,
      isCorporate: true,
      isDisposable: false,
      reasonCode: null,
    })
  })

  it('rechaza dominios desechables con el reason code canónico', async () => {
    await expect(verifyMeetingEmail('persona@mailinator.com')).resolves.toMatchObject({
      accepted: false,
      isDisposable: true,
      reasonCode: 'email_disposable',
    })
  })
})
