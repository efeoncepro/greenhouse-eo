import 'server-only'

import { getGoogleGenAIClient, getGreenhouseAgentModel } from '@/lib/ai/google-genai'
import type { NexaMessage, HomeSnapshot } from '@/types/home'

interface NexaServiceInput {
  prompt: string
  history: NexaMessage[]
  context: HomeSnapshot
}

/**
 * Nexa Service: The AI core for Greenhouse Home.
 * Uses Google GenAI (Gemini) to provide conversational assistance.
 */
export class NexaService {
  private static buildSystemPrompt(context: HomeSnapshot): string {
    const { user, modules, tasks } = context

    return [
      'Eres Nexa, el asistente inteligente de Greenhouse.',
      'Tu misión es ayudar al cliente a navegar su operación y resolver dudas rápidas sobre sus proyectos y tareas.',
      '',
      'CONTEXTO DEL USUARIO:',
      `- Nombre: ${user.firstName} ${user.lastName || ''}`,
      `- Rol: ${user.role}`,
      '',
      'OPERACIÓN ACTIVA:',
      `- Módulos disponibles: ${modules.map(m => m.title).join(', ')}`,
      `- Tareas pendientes: ${tasks.length} identificadas (OTD, FTR, RPA, etc.)`,
      '',
      'REGLAS DE RESPUESTA:',
      '- Sé conciso, profesional y humano.',
      '- Usa un tono "client-first".',
      '- Si el usuario pregunta por algo que está en sus tareas pendientes, menciónalo directamente.',
      '- Si no sabes algo, sé honesto y sugiérele contactar a su Account Manager.',
      '- Mantén las respuestas breves para que quepan bien en el panel de Home.',
      '',
      'Recuerda: Eres parte de Efeonce Group y Greenhouse es la plataforma que materializa la visión de sus proyectos.'
    ].join('\n')
  }

  static async generateResponse(input: NexaServiceInput): Promise<NexaMessage> {
    const client = await getGoogleGenAIClient()
    const systemPrompt = this.buildSystemPrompt(input.context)

    // Prepare history for Gemini
    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Entendido. Soy Nexa y estoy listo para asistir a ' + input.context.user.firstName + '.' }] },
      ...input.history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: [{ text: input.prompt }] }
    ]

    try {
      const result = await client.models.generateContent({
        model: getGreenhouseAgentModel(),
        contents: contents as any,
        config: {
          temperature: 0.2,
          maxOutputTokens: 500
        }
      })

      const text = result.text?.trim() || 'Lo siento, no pude procesar tu solicitud en este momento.'

      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: text,
        timestamp: new Date().toISOString(),
        suggestions: [] // Logic for dynamic suggestions could go here in v3
      }
    } catch (error) {
      console.error('Nexa AI generation failed:', error)
      throw new Error('Failed to generate Nexa response')
    }
  }
}
