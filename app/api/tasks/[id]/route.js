import { redis } from '../../../../lib/redis'

export async function PATCH(req, { params }) {
  const { id } = await params
  const updates = await req.json()
  const task = await redis.get(`task:${id}`)
  if (!task) return Response.json({ error: 'Not found' }, { status: 404 })
  const updated = { ...task, ...updates, updated_at: Date.now() }
  await redis.set(`task:${id}`, updated)
  return Response.json(updated)
}

export async function DELETE(req, { params }) {
  const { id } = await params
  await redis.del(`task:${id}`)
  const ids = await redis.lrange('tasks:all', 0, -1)
  const remaining = ids.filter(i => i !== id)
  await redis.del('tasks:all')
  if (remaining.length) await redis.rpush('tasks:all', ...remaining)
  return Response.json({ ok: true })
}
