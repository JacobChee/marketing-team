import Anthropic from '@anthropic-ai/sdk'
import { redis } from '../../../../lib/redis'
import { employees } from '../../../../lib/employees'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const GENERATE_PROMPT = (type) => `
You are generating a ${type} task list. Output ONLY a JSON array of tasks — no explanation, no markdown, just the raw JSON array.

Each task object must have exactly these fields:
{
  "title": "short action-oriented title (max 8 words)",
  "description": "1-2 sentences on what to produce and why",
  "brand": "afix" | "atsell" | "both",
  "type": "${type}",
  "priority": "high" | "medium" | "low"
}

Generate ${type === 'daily' ? '3-5 daily' : '5-8 weekly'} tasks that are specific, actionable, and produce real outputs (copy, audits, reports, plans — not vague "review" tasks).
Focus on tasks with the highest impact this ${type === 'daily' ? 'day' : 'week'}.
`

export async function POST(req) {
  const { employeeId, type = 'weekly' } = await req.json()
  const emp = employees[employeeId]
  if (!emp) return Response.json({ error: 'Employee not found' }, { status: 404 })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: emp.systemPrompt,
    messages: [{ role: 'user', content: GENERATE_PROMPT(type) }],
  })

  let tasks = []
  try {
    const text = message.content[0].text.trim()
    const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    tasks = JSON.parse(clean)
  } catch {
    return Response.json({ error: 'Failed to parse tasks' }, { status: 500 })
  }

  const saved = await Promise.all(
    tasks.map(async (task) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const full = {
        ...task,
        id,
        employee: employeeId,
        status: 'pending',
        created_at: Date.now(),
      }
      await redis.set(`task:${id}`, full)
      await redis.lpush('tasks:all', id)
      return full
    })
  )

  return Response.json(saved)
}
