import Anthropic from '@anthropic-ai/sdk'
import { redis } from '../../../lib/redis'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  const { messages, systemPrompt, employeeId, liveContext } = await req.json()

  // Fetch stored employee memory from Redis
  let memory = ''
  if (employeeId) {
    try {
      memory = await redis.get(`employee:memory:${employeeId}`) || ''
    } catch {}
  }

  let fullSystem = systemPrompt
  if (memory) fullSystem += `\n\n---\n**Your current context (updated by founder):**\n${memory}`
  if (liveContext) fullSystem += `\n\n---\n**Live data provided for this session:**\n${liveContext}`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 8000,
          system: fullSystem,
          messages,
        })

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`))
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
