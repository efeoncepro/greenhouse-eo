/**
 * TASK-1362 — Scanner estructural: verifica que el archivo SEA lo que dice ser.
 *
 * Antes de esta task, `validatePublicCareersCvUpload` sólo miraba `file.type`,
 * que lo declara el cliente. Un binario arbitrario renombrado a `.pdf` y
 * declarado `application/pdf` entraba al bucket privado y quedaba `attached`.
 * Este scanner lee los magic bytes reales y cierra ese agujero sin infra.
 *
 * LÍMITE HONESTO: no es un antivirus. No tiene base de firmas y sólo inspecciona
 * los bytes en claro — los objetos comprimidos de un PDF (object streams) pueden
 * esconder contenido activo que este scanner no ve. Detecta suplantación de tipo
 * y contenido activo declarado, no malware conocido dentro de un PDF válido.
 * Esa cobertura la aporta el adapter `clamav-http`.
 */
import type { AssetScanFinding, AssetScanInput, AssetScanner, AssetScanResult, AssetScanVerdict } from './types'

const VERSION = '1.0.0'

/**
 * Firmas por prefijo. El orden importa: la primera que matchea gana.
 * WEBP necesita dos anclas (`RIFF` en 0 y `WEBP` en 8) porque el contenedor
 * RIFF también hospeda WAV/AVI: sólo el segundo chunk lo desambigua.
 */
const MAGIC_SIGNATURES: ReadonlyArray<{
  mimeType: string
  bytes: readonly number[]
  offset?: number
  alsoRequires?: { bytes: readonly number[]; offset: number }
}> = [
  { mimeType: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { mimeType: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mimeType: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  {
    mimeType: 'image/webp',
    bytes: [0x52, 0x49, 0x46, 0x46], // RIFF
    alsoRequires: { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }, // WEBP
  },
]

/**
 * Tipos que NUNCA deben entrar por un upload de usuario, sin importar lo que
 * declare el MIME. Detectarlos es evidencia de suplantación deliberada.
 */
const HOSTILE_SIGNATURES: ReadonlyArray<{ label: string; bytes: readonly number[] }> = [
  { label: 'zip_or_ooxml', bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK.. (zip, docx, xlsx, jar, apk)
  { label: 'zip_empty', bytes: [0x50, 0x4b, 0x05, 0x06] },
  { label: 'elf_executable', bytes: [0x7f, 0x45, 0x4c, 0x46] },
  { label: 'windows_pe_executable', bytes: [0x4d, 0x5a] }, // MZ
  { label: 'mach_o_executable', bytes: [0xfe, 0xed, 0xfa, 0xce] },
  { label: 'mach_o_executable', bytes: [0xcf, 0xfa, 0xed, 0xfe] },
  { label: 'mach_o_universal', bytes: [0xca, 0xfe, 0xba, 0xbe] },
  { label: 'gzip_archive', bytes: [0x1f, 0x8b] },
  { label: 'rar_archive', bytes: [0x52, 0x61, 0x72, 0x21] },
  { label: 'seven_zip_archive', bytes: [0x37, 0x7a, 0xbc, 0xaf] },
  { label: 'shell_script', bytes: [0x23, 0x21] }, // #!
  { label: 'rtf_document', bytes: [0x7b, 0x5c, 0x72, 0x74, 0x66] }, // {\rtf
]

/** Marcadores HTML: se buscan case-insensitive en el arranque del archivo. */
const HTML_MARKERS = ['<!doctype html', '<html', '<script', '<?php', '<svg']

/**
 * Contenido activo en PDF. `blocking` = raro en un CV real y peligroso.
 * `advisory` = lo emiten exportadores legítimos (Word, InDesign, LaTeX), así
 * que bloquearlo rechazaría currículums reales; se registra y se deja pasar.
 */
const PDF_HAZARDS: ReadonlyArray<{ marker: string; code: string; severity: 'blocking' | 'advisory' }> = [
  { marker: '/Launch', code: 'pdf_launch_action', severity: 'blocking' },
  { marker: '/EmbeddedFile', code: 'pdf_embedded_file', severity: 'blocking' },
  { marker: '/RichMedia', code: 'pdf_rich_media', severity: 'blocking' },
  { marker: '/XFA', code: 'pdf_xfa_form', severity: 'blocking' },
  { marker: '/JavaScript', code: 'pdf_javascript', severity: 'advisory' },
  { marker: '/OpenAction', code: 'pdf_open_action', severity: 'advisory' },
]

const startsWith = (bytes: Buffer, signature: readonly number[], offset = 0) => {
  if (bytes.length < offset + signature.length) return false

  return signature.every((byte, index) => bytes[offset + index] === byte)
}

const detectMimeType = (bytes: Buffer): string | null => {
  for (const signature of MAGIC_SIGNATURES) {
    if (!startsWith(bytes, signature.bytes, signature.offset)) continue

    if (signature.alsoRequires && !startsWith(bytes, signature.alsoRequires.bytes, signature.alsoRequires.offset)) {
      continue
    }

    return signature.mimeType
  }

  return null
}

const detectHostileSignature = (bytes: Buffer): string | null => {
  for (const signature of HOSTILE_SIGNATURES) {
    if (startsWith(bytes, signature.bytes)) return signature.label
  }

  return null
}

const detectHtmlMarker = (bytes: Buffer): string | null => {
  const head = bytes.subarray(0, 1024).toString('utf8').trimStart().toLowerCase()
  const marker = HTML_MARKERS.find(candidate => head.startsWith(candidate))

  return marker ?? null
}

const collectPdfHazards = (bytes: Buffer): AssetScanFinding[] => {
  // Un PDF es ASCII en su estructura; los marcadores viajan en latin1 legible.
  const text = bytes.toString('latin1')

  return PDF_HAZARDS.filter(hazard => text.includes(hazard.marker)).map(hazard => ({
    code: hazard.code,
    severity: hazard.severity,
    detail: `El PDF declara el marcador de contenido activo ${hazard.marker}.`,
  }))
}

const resolveVerdict = (findings: AssetScanFinding[]): AssetScanVerdict =>
  findings.some(finding => finding.severity === 'blocking') ? 'suspicious' : 'clean'

const scan = async ({ bytes, declaredMimeType }: AssetScanInput): Promise<Omit<AssetScanResult, 'durationMs'>> => {
  const findings: AssetScanFinding[] = []

  if (bytes.length === 0) {
    findings.push({ code: 'empty_file', severity: 'blocking', detail: 'El archivo no tiene contenido.' })

    return { verdict: 'suspicious', scanner: 'structural', scannerVersion: VERSION, findings, detectedMimeType: null }
  }

  const hostileSignature = detectHostileSignature(bytes)

  if (hostileSignature) {
    findings.push({
      code: 'hostile_magic_bytes',
      severity: 'blocking',
      detail: `Los magic bytes corresponden a ${hostileSignature}, que nunca es un documento de candidato válido.`,
    })
  }

  const htmlMarker = detectHtmlMarker(bytes)

  if (htmlMarker) {
    findings.push({
      code: 'markup_payload',
      severity: 'blocking',
      detail: `El archivo arranca con el marcador de markup ${htmlMarker}.`,
    })
  }

  const detectedMimeType = detectMimeType(bytes)

  if (!detectedMimeType) {
    findings.push({
      code: 'unrecognized_magic_bytes',
      severity: 'blocking',
      detail: 'No se reconocieron magic bytes de ningún tipo permitido.',
    })
  } else if (detectedMimeType !== declaredMimeType) {
    findings.push({
      code: 'mime_type_mismatch',
      severity: 'blocking',
      detail: `El archivo se declaró como ${declaredMimeType} pero su contenido real es ${detectedMimeType}.`,
    })
  }

  if (detectedMimeType === 'application/pdf') {
    findings.push(...collectPdfHazards(bytes))
  }

  return {
    verdict: resolveVerdict(findings),
    scanner: 'structural',
    scannerVersion: VERSION,
    findings,
    detectedMimeType,
  }
}

export const structuralAssetScanner: AssetScanner = {
  name: 'structural',
  version: VERSION,
  scan,
}

/** Exportado sólo para tests; el resto del código consume el scanner. */
export const __internalDetectMimeType = detectMimeType
