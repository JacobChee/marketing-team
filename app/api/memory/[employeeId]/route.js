import { redis } from '../../../../lib/redis'

export async function GET(req, { params }) {
  const { employeeId } = await params
  const memory = await redis.get(`employee:memory:${employeeId}`) || ''
  return Response.json({ memory })
}

export async function POST(req, { params }) {
  const { employeeId } = await params
  const { memory } = await req.json()
  await redis.set(`employee:memory:${employeeId}`, memory)
  return Response.json({ ok: true })
}
