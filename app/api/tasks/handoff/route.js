import { redis } from '../../../../lib/redis'

export async function POST(req) {
  const { fromTask, toEmployeeId, note } = await req.json()

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const task = {
    id,
    employee: toEmployeeId,
    type: 'handoff',
    title: `Handoff: ${fromTask.title}`,
    description: note || fromTask.description,
    brand: fromTask.brand,
    priority: fromTask.priority || 'high',
    status: 'pending',
    handoffFrom: fromTask.employee,
    handoffContext: fromTask.output,
    created_at: Date.now(),
  }

  await redis.set(`task:${id}`, task)
  await redis.lpush('tasks:all', id)
  return Response.json(task)
}
