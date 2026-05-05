import { redis } from '../../../lib/redis'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const employee = searchParams.get('employee')
  const status = searchParams.get('status')

  const ids = await redis.lrange('tasks:all', 0, -1)
  if (!ids.length) return Response.json([])

  const tasks = await Promise.all(
    ids.map(id => redis.get(`task:${id}`))
  )

  let filtered = tasks.filter(Boolean)
  if (employee) filtered = filtered.filter(t => t.employee === employee)
  if (status) filtered = filtered.filter(t => t.status === status)

  filtered.sort((a, b) => b.created_at - a.created_at)
  return Response.json(filtered)
}

export async function POST(req) {
  const task = await req.json()
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const full = { ...task, id, created_at: Date.now(), status: 'pending' }
  await redis.set(`task:${id}`, full)
  await redis.lpush('tasks:all', id)
  return Response.json(full)
}
