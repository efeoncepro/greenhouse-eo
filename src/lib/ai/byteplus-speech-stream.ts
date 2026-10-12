import 'server-only'

import { randomUUID } from 'node:crypto'
import { gzipSync, gunzipSync } from 'node:zlib'

import { parse } from 'protobufjs'
import WebSocket from 'ws'

import type { BytePlusModel } from './byteplus-catalog'
import { bytePlusHeaders, BytePlusError } from './byteplus'

/** ASR wire contract: official sauc_python/protocol.py, retrieved 2026-10-12. No demo code is executed. */
export const encodeBytePlusAsr = (payload: Buffer, sequence: number, audio = false, last = false): Buffer => {
  const compressed = gzipSync(payload)
  const header = Buffer.alloc(12)

  header.set([0x11, ((audio ? 2 : 1) << 4) | (last ? 3 : 1), 0x11, 0])
  header.writeInt32BE(last ? -sequence : sequence,4)
  header.writeUInt32BE(compressed.length,8)

  return Buffer.concat([header,compressed])
}

export const decodeBytePlusAsr = (frame: Buffer) => {
  if (frame.length < 8 || frame[0] >> 4 !== 1) throw new Error('ASR: frame inválido.')
  const flags = frame[1] & 15
  const type = frame[1] >> 4
  let offset = (frame[0] & 15)*4
  let sequence = 0

  if (flags & 1) {sequence=frame.readInt32BE(offset);offset+=4}
  if (flags & 4) offset+=4

  if (type===15) {
    const code=frame.readInt32BE(offset)

    throw new BytePlusError(200,`asr_${code}`,null)
  }

  if (type!==9 || frame.length < offset+4) throw new Error('ASR: tipo de respuesta no soportado.')
  const size=frame.readUInt32BE(offset)

  offset+=4
  if (frame.length !== offset+size) throw new Error('ASR: payload truncado.')
  const payload=(frame[2]&15)===1 ? gunzipSync(frame.subarray(offset),{maxOutputLength:4*1024*1024}) : frame.subarray(offset)

  if (frame[2]>>4!==1) throw new Error('ASR: serialización no soportada.')

  return {sequence,complete:Boolean(flags&2),data:JSON.parse(payload.toString('utf8')) as Record<string,unknown>}
}

/** Minimal interoperable AST schema. Field IDs/types from official protos.tar.gz (2026-07-27).
 * Source: docs.byteplus.com/en/docs/byteplusvoice/liveinterpretationapi. Audio uses binary_data=14, not data=1.
 * Kept in code: no runtime file dependency and no generated SDK with credentials/logging side effects.
 */
const astSchema = `syntax="proto3";
message RequestMeta { string SessionID=6; }
message User { string uid=1; string did=2; string platform=3; string sdk_version=4; string app_version=5; }
message Audio { string format=4; string codec=5; string language=6; int32 rate=7; int32 bits=8; int32 channel=9; bytes binary_data=14; }
message ReqParams { string mode=1; string source_language=2; string target_language=3; string speaker_id=4; int32 speech_rate=5; bool enable_source_language_detect=6; bool is_custom_speaker=7; string tts_resource_id=8; string extra=80; }
message TranslateRequest { RequestMeta request_meta=1; int32 event=2; User user=3; Audio source_audio=4; Audio target_audio=5; ReqParams request=6; bool denoise=7; }
message BillingItem { string Unit=1; float Quantity=2; }
message Billing { repeated BillingItem Items=1; int64 DurationMsec=2; int64 WordCount=3; }
message ResponseMeta { string SessionID=1; int32 Sequence=2; int32 StatusCode=3; string Message=4; Billing Billing=5; }
message TranslateResponse { ResponseMeta response_meta=1; int32 event=2; bytes data=3; string text=4; int32 start_time=5; int32 end_time=6; bool spk_chg=7; int32 muted_duration_ms=8; }
`

const astRoot = parse(astSchema,{keepCase:true}).root

export const encodeBytePlusInterpretation = (input: Record<string,unknown>) => {
  const type=astRoot.lookupType('TranslateRequest')
  const obj=type.fromObject(input)
  const error=type.verify(obj)

  if (error) throw new Error(`Interpretation: ${error}`)

  return Buffer.from(type.encode(obj).finish())
}

export const decodeBytePlusInterpretation = (frame: Buffer) => {
  const type=astRoot.lookupType('TranslateResponse')

  return type.toObject(type.decode(frame),{longs:Number,bytes:Buffer}) as {
    event:number;data?:Buffer;text?:string;response_meta?:{StatusCode?:number;Message?:string;Billing?:unknown};[key:string]:unknown
  }
}

const validateWav = (audio: Buffer) => {
  if (audio.length < 44 || audio.toString('ascii',0,4)!=='RIFF' || audio.toString('ascii',8,12)!=='WAVE') throw new Error('Streaming requiere WAV PCM de 16 kHz, 16 bits, mono; convierte una copia con ffmpeg.')
  let foundFormat=false
  let foundData=false

  for (let p=12; p+8<=audio.length;) {
    const name=audio.toString('ascii',p,p+4)
    const length=audio.readUInt32LE(p+4)

    if (p+8+length>audio.length) throw new Error('WAV truncado.')

    if (name==='fmt ') {
      if (length<16 || audio.readUInt16LE(p+8)!==1 || audio.readUInt16LE(p+10)!==1 || audio.readUInt32LE(p+12)!==16000 || audio.readUInt16LE(p+22)!==16) throw new Error('WAV debe ser PCM mono 16 kHz / 16 bits.')
      foundFormat=true
    }

    if (name==='data' && length>0) foundData=true
    p+=8+length+(length%2)
  }

  if (!foundFormat || !foundData) throw new Error('WAV sin formato/audio válido.')
  if (audio.length > 16000*2*1800) throw new Error('Streaming local admite hasta 30 minutos por corrida.')
}

export const runBytePlusSpeechStream = async (model:BytePlusModel,audio:Buffer,input:Record<string,unknown>) => {
  validateWav(audio)
  const interpretation=model.kind==='interpretation'
  const requestId=randomUUID()
  const headers=await bytePlusHeaders('speech',model.resource,requestId)
  const config=interpretation ? input : {user:{uid:'efeonce-operator'},audio:{format:'wav',codec:'raw',rate:16000,bits:16,channel:1},request:{model_name:'bigmodel',enable_itn:true,enable_punc:true,show_utterances:true},...input}
  const request=input.request as Record<string,unknown> | undefined
  const source = (interpretation ? input.source_audio : input.audio) as Record<string,unknown> | undefined

  if (source && (source.format !== 'wav' || Number(source.rate) !== 16000 || Number(source.bits) !== 16 || Number(source.channel) !== 1 || source.codec && source.codec !== 'raw')) throw new Error('La configuración de audio debe coincidir con WAV PCM mono 16 kHz / 16 bits.')

  if (interpretation && (!request?.source_language || !request.target_language || request.corpus)) throw new Error('Interpretación exige request.source_language/target_language; corpus no se expone sin schema verificado.')
  if (interpretation && request?.mode==='s2s' && (!request.speaker_id || !request.tts_resource_id || !input.target_audio)) throw new Error('S2S exige speaker_id, tts_resource_id y target_audio.')
  const path=interpretation ? '/api/v4/ast/v2/translate' : '/api/v3/sauc/bigmodel_async'
  const socket=new WebSocket(`wss://voice.ap-southeast-1.bytepluses.com${path}`,{headers,handshakeTimeout:20_000,maxPayload:8*1024*1024})
  const events:Record<string,unknown>[]=[]
  const outputAudio:Buffer[]=[]
  const chunkSize=interpretation ? 2560 : 6400
  const tick=interpretation ? 80 : 200

  return new Promise<{requestId:string;events:Record<string,unknown>[];audio?:Buffer}>((resolve,reject)=>{
    let started=false
    let ended=false
    const timer=setTimeout(()=>finish(new Error('Timeout de voz; no se repite la solicitud.')),Math.ceil(audio.length/32000)*1000+120_000)

    const finish=(error?:Error)=>{
      if (ended) return
      ended=true
      clearTimeout(timer)
      socket.terminate()
      if (error) reject(error)
      else resolve({requestId,events,audio:outputAudio.length ? Buffer.concat(outputAudio) : undefined})
    }

    const send=(data:Buffer)=>new Promise<void>((done,fail)=>socket.send(data,error=>error ? fail(new Error('Fallo de envío de voz.')) : done()))

    const sendAudio=async()=>{
      let sequence=2

      for (let p=0;p<audio.length && !ended;p+=chunkSize) {
        const chunk=audio.subarray(p,p+chunkSize)

        await send(interpretation ? encodeBytePlusInterpretation({request_meta:{SessionID:requestId},event:200,source_audio:{binary_data:chunk}}) : encodeBytePlusAsr(chunk,sequence++,true,p+chunkSize>=audio.length))
        if (p+chunkSize<audio.length) await new Promise(r=>setTimeout(r,tick))
      }

      if (interpretation && !ended) await send(encodeBytePlusInterpretation({request_meta:{SessionID:requestId},event:102}))
    }

    socket.on('open',()=>{
      send(interpretation ? encodeBytePlusInterpretation({...config,request_meta:{SessionID:requestId},event:100,
        user:input.user ?? {uid:'efeonce-operator'},source_audio:input.source_audio ?? {format:'wav',codec:'raw',rate:16000,bits:16,channel:1}}) : encodeBytePlusAsr(Buffer.from(JSON.stringify(config)),1)).catch(()=>finish(new Error('No se pudo iniciar la sesión de voz.')))
    })
    socket.on('message',(raw,isBinary)=>{
      try {
        if (!isBinary) throw new Error('Voz: respuesta no binaria.')
        const frame=Array.isArray(raw) ? Buffer.concat(raw) : Buffer.from(raw as ArrayBuffer)

        if (interpretation) {
          const event=decodeBytePlusInterpretation(frame)

          if (event.event===153) throw new BytePlusError(200,`interpretation_${event.response_meta?.StatusCode ?? 'failed'}`,requestId)
          if (event.data?.length) outputAudio.push(event.data)
          const metadata = { ...event }

          delete metadata.data

          events.push(metadata)
          if (event.event===150 && !started) {started=true;void sendAudio().catch(()=>finish(new Error('Falló el envío de audio.')))}
          if (event.event===152) finish()
        } else {
          const event=decodeBytePlusAsr(frame)

          events.push(event.data)
          if (!started) {started=true;void sendAudio().catch(()=>finish(new Error('Falló el envío de audio.')))}
          if (event.complete) finish()
        }
      } catch (error) {finish(error instanceof Error ? error : new Error('Frame de voz inválido.'))}
    })
    socket.on('error',()=>finish(new Error('WebSocket de voz: fallo de transporte; no se reintenta.')))
    socket.on('unexpected-response',(_req,response)=>finish(new BytePlusError(response.statusCode ?? 0,'speech_handshake',requestId)))
    socket.on('close',()=>{if(!ended)finish(new Error('Sesión de voz cerrada sin evento terminal.'))})
  })
}
