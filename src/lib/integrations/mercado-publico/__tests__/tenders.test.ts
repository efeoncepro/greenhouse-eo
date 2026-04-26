import { describe, expect, it, vi } from 'vitest'

import {
  downloadMercadoPublicoTenderDocument,
  getMercadoPublicoTenderDetail,
  hydrateMercadoPublicoTenderWithDocuments,
  listMercadoPublicoTenderDocumentReferences,
  parseTenderDocumentPageUrls
} from '../tenders'

const tenderCode = '1000813-8-LE26'
const detailUrl = `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${tenderCode}`
const antecedentUrl = 'https://www.mercadopublico.cl/Procurement/Modules/Attachment/VerAntecedentes.aspx?enc=abc%2B123'

const tenderApiPayload = {
  Cantidad: 1,
  FechaCreacion: '2026-04-26T16:33:13.0314465Z',
  Version: 'v1',
  Listado: [
    {
      CodigoExterno: tenderCode,
      Nombre: 'ADQ. DE PASAJES',
      CodigoEstado: 5,
      Estado: 'Publicada',
      Tipo: 'LE',
      Moneda: 'CLP',
      Comprador: {
        CodigoOrganismo: '111870',
        NombreOrganismo: 'DIVISION LOGISTICA DEL EJERCITO'
      },
      Fechas: {
        FechaCierre: '2026-04-30T18:00:00'
      },
      Items: {
        Cantidad: 2,
        Listado: []
      }
    }
  ]
}

const tenderWebHtml = `
  <html>
    <body>
      <input
        type="image"
        name="imgAdjuntos"
        id="imgAdjuntos"
        onclick="open(&#39;../Attachment/ViewAttachment.aspx?enc=qWZf7m%2B5&#39;,&#39;MercadoPublico&#39;)"
      />
      <input
        type="image"
        name="grvEconomico$ctl02$grvDescargar"
        class="fancyAdjunto"
        href="../Attachment/VerAntecedentes.aspx?enc=abc%2B123"
      />
      <input
        type="image"
        name="grvEconomico$ctl02$grvDescargarLink"
        class="fancyAdjunto"
        href="../Attachment/VerAntecedentes.aspx?enc=abc%2B123"
      />
    </body>
  </html>
`

const antecedentHtml = `
  <html>
    <body>
      <form name="form1" method="post" action="./VerAntecedentes.aspx?enc=abc%2B123" id="form1">
        <input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="view-state" />
        <input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="generator" />
        <table id="grdAttachment">
          <tr class="cssFwkHeaderTableRow">
            <th>Anexo</th><th>Tipo</th><th>Descripcion</th><th>Fecha</th><th>Acciones</th>
          </tr>
          <tr class="cssFwkItemStyle ajustar">
            <td><span id="grdAttachment_ctl02_grdLblSourceFileName">ANEXO_N°1_FORMULARIO_OFERTA_ECONOMICA.docx</span></td>
            <td>Anexos Economicos de Adquisicion</td>
            <td><span id="grdAttachment_ctl02_grdLblFileDescription">Anexo Economico</span></td>
            <td><span id="grdAttachment_ctl02_grdLblFileDate">23-04-2026 14:45:42</span></td>
            <td>
              <input
                type="image"
                name="grdAttachment$ctl02$grdIbtnView"
                id="grdAttachment_ctl02_grdIbtnView"
                title="Ver Anexo"
                src="../../Includes/images/search.gif"
              />
            </td>
          </tr>
        </table>
      </form>
    </body>
  </html>
`

const documentBytes = Buffer.from('PK\u0003\u0004fake-docx')

const buildMockFetch = () => vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = input.toString()

  if (url.startsWith('https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json')) {
    return Response.json(tenderApiPayload)
  }

  if (url === detailUrl) {
    return new Response(tenderWebHtml, {
      headers: {
        'content-type': 'text/html; charset=utf-8'
      }
    })
  }

  if (url === antecedentUrl && (init?.method ?? 'GET') === 'GET') {
    return new Response(antecedentHtml, {
      headers: {
        'content-type': 'text/html; charset=utf-8'
      }
    })
  }

  if (url === antecedentUrl && init?.method === 'POST') {
    const body = init.body?.toString() ?? ''

    expect(body).toContain('__VIEWSTATE=view-state')
    expect(body).toContain('grdAttachment%24ctl02%24grdIbtnView.x=8')

    return new Response(documentBytes, {
      headers: {
        'content-type': 'application/octet-stream',
        'content-disposition': 'attachment; filename=ANEXO_N1.docx'
      }
    })
  }

  return new Response('not found', { status: 404 })
})

describe('Mercado Publico tender helpers', () => {
  it('normalizes tender details from the official API', async () => {
    const fetcher = buildMockFetch()

    const tender = await getMercadoPublicoTenderDetail(tenderCode, {
      ticket: 'ticket',
      fetcher,
      retries: 0
    })

    expect(tender).toMatchObject({
      source: 'mercado_publico_api_v1',
      codigoExterno: tenderCode,
      nombre: 'ADQ. DE PASAJES',
      estado: 'Publicada',
      codigoEstado: 5,
      tipo: 'LE',
      moneda: 'CLP',
      itemsCount: 2
    })
  })

  it('extracts unique antecedent page urls from the public web detail page', () => {
    expect(parseTenderDocumentPageUrls(tenderWebHtml, detailUrl)).toEqual([antecedentUrl])
  })

  it('lists document references from antecedent pages', async () => {
    const fetcher = buildMockFetch()

    const references = await listMercadoPublicoTenderDocumentReferences(tenderCode, {
      fetcher,
      retries: 0
    })

    expect(references).toHaveLength(1)
    expect(references[0]).toMatchObject({
      source: 'mercado_publico_public_web',
      tenderCode,
      filename: 'ANEXO_N°1_FORMULARIO_OFERTA_ECONOMICA.docx',
      documentType: 'Anexos Economicos de Adquisicion',
      description: 'Anexo Economico',
      publishedAt: '23-04-2026 14:45:42',
      sourcePageUrl: antecedentUrl,
      downloadControlName: 'grdAttachment$ctl02$grdIbtnView'
    })
    expect(references[0].sourcePageFingerprint).toMatch(/^[a-f0-9]{64}$/)
  })

  it('downloads documents through the WebForms postback', async () => {
    const fetcher = buildMockFetch()

    const [reference] = await listMercadoPublicoTenderDocumentReferences(tenderCode, {
      fetcher,
      retries: 0
    })

    const file = await downloadMercadoPublicoTenderDocument(reference, {
      fetcher,
      retries: 0
    })

    expect(file).toMatchObject({
      filename: reference.filename,
      contentType: 'application/octet-stream',
      contentDisposition: 'attachment; filename=ANEXO_N1.docx',
      sizeBytes: documentBytes.byteLength
    })
    expect(file.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(file.bytes.equals(documentBytes)).toBe(true)
  })

  it('hydrates tender detail and documents together', async () => {
    const fetcher = buildMockFetch()

    const hydration = await hydrateMercadoPublicoTenderWithDocuments(tenderCode, {
      ticket: 'ticket',
      fetcher,
      retries: 0
    })

    expect(hydration.tender.codigoExterno).toBe(tenderCode)
    expect(hydration.documents).toHaveLength(1)
    expect(hydration.documents[0].bytes.equals(documentBytes)).toBe(true)
  })
})

