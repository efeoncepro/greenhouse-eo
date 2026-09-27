// QA de voz: transcribe cada archivo con ElevenLabs STT vía fal para verificar el texto dicho.
import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { config as loadEnv } from 'dotenv'

import { runFalModel, uploadFalFile } from '@/lib/ai/fal'

loadEnv({ path: join(process.cwd(), '.env.local') })

const main = async () => {
  for (const file of process.argv.slice(2)) {
    const up = await uploadFalFile({ bytes: await readFile(file), fileName: basename(file), contentType: 'audio/mpeg' })
    const res = await runFalModel<{ text: string; words?: Array<{ text: string; start: number; end: number; type?: string }> }>({ model: 'fal-ai/elevenlabs/speech-to-text', input: { audio_url: up.url, language_code: 'eng' } })
    console.log(`${basename(file)} → «${res.output?.text}» ${JSON.stringify((res.output?.words ?? []).filter(w => w.type !== "spacing").map(w => [w.text, w.start, w.end]))}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
