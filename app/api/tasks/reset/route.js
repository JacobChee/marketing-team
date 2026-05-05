import { redis } from '../../../../lib/redis'

export async function POST() {
  const ids = await redis.lrange('tasks:all', 0, -1)
  if (ids.length) {
    await Promise.all(ids.map(id => redis.del(`task:${id}`)))
    await redis.del('tasks:all')
  }
  return Response.json({ ok: true, deleted: ids.length })
}
