import Anthropic from '@anthropic-ai/sdk'
import { redis } from '../../../../lib/redis'
import { employees } from '../../../../lib/employees'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FILE_PATHS = {
  maya: {
    afix: [
      'aircon-servicing-toa-payoh/index.html',
      'aircon-servicing-bishan/index.html',
      'aircon-servicing-ang-mo-kio/index.html',
      'aircon-servicing-kallang/index.html',
      'aircon-servicing-serangoon/index.html',
      'aircon-not-cold/index.html',
      'aircon-leaking-water/index.html',
      'robots.txt',
    ],
    atsell: [
      'app/page.jsx',
      'app/layout.jsx',
      'app/shopee-partner/page.jsx',
      'app/lazada-partner/page.jsx',
      'app/tiktok-shop-partner/page.jsx',
      'app/markets/singapore/page.jsx',
      'app/markets/malaysia/page.jsx',
      'public/robots.txt',
      'public/sitemap.xml',
    ],
  },
  cole: {
    atsell: [
      'app/blog/what-is-an-ecommerce-enabler/page.jsx',
      'app/blog/shopee-vs-lazada/page.jsx',
      'app/blog/shopee-listing-title-optimisation/page.jsx',
      'app/blog/how-to-sell-on-lazada-singapore/page.jsx',
    ],
    afix: [
      'aircon-servicing-toa-payoh/index.html',
      'aircon-servicing-bishan/index.html',
    ],
  },
  cora: {
    afix: ['aircon-servicing-toa-payoh/index.html'],
    atsell: ['app/page.jsx', 'app/calculator/page.jsx', 'app/seo-grader/page.jsx'],
  },
  rex: { afix: [], atsell: [] },
}

const GENERATE_PROMPT = (type, empId) => {
  const filePaths = FILE_PATHS[empId]
  const fileGuidance = filePaths ? `
For tasks that produce a COMPLETE file ready to commit (schema markup, page content, blog article, sitemap, robots.txt) — include these optional fields:
  "repo": "afix" | "atsell",
  "filePath": "<exact relative path from list below>",

Available file paths:
afix repo: ${(filePaths.afix || []).join(', ')}
atsell repo: ${(filePaths.atsell || []).join(', ')}

Only include repo/filePath when the task output would be the ENTIRE updated file content.
` : ''

  if (type === 'systems') return `
You are generating a systems setup task list. Output ONLY a JSON array — no explanation, no markdown, just raw JSON.

Each task object must have exactly these fields (repo and filePath are optional):
{
  "title": "short action-oriented title (max 8 words)",
  "description": "1-2 sentences on what to set up and why it matters",
  "brand": "afix" | "atsell" | "both",
  "type": "systems",
  "priority": "high" | "medium" | "low",
  "repo": "afix" | "atsell",   (optional)
  "filePath": "path/to/file"    (optional)
}
${fileGuidance}
Generate 4-6 systems/infrastructure setup tasks within your specialty.
`

  return `
You are generating a ${type} task list. Output ONLY a JSON array — no explanation, no markdown, just raw JSON.

Each task object must have exactly these fields (repo and filePath are optional):
{
  "title": "short action-oriented title (max 8 words)",
  "description": "1-2 sentences on what to produce and why",
  "brand": "afix" | "atsell" | "both",
  "type": "${type}",
  "priority": "high" | "medium" | "low",
  "repo": "afix" | "atsell",   (optional)
  "filePath": "path/to/file"    (optional)
}
${fileGuidance}
Generate ${type === 'daily' ? '3-5 daily' : '5-8 weekly'} tasks that are specific, actionable, and produce real outputs.
Focus on tasks with the highest impact this ${type === 'daily' ? 'day' : 'week'}.
`
}

export async function POST(req) {
  const { employeeId, type = 'weekly' } = await req.json()
  const emp = employees[employeeId]
  if (!emp) return Response.json({ error: 'Employee not found' }, { status: 404 })

  let systemPrompt = emp.systemPrompt
  try {
    const memory = await redis.get(`employee:memory:${employeeId}`)
    if (memory) systemPrompt += `\n\n---\n**Your current context (updated by founder):**\n${memory}`
  } catch {}

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: GENERATE_PROMPT(type, employeeId) }],
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
