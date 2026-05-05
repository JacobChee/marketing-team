export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    return Response.json({ error: 'Missing env vars', url: !!url, token: !!token })
  }

  try {
    const res = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    return Response.json({ ok: true, ping: data, urlPrefix: url.slice(0, 30) })
  } catch (err) {
    return Response.json({ error: err.message })
  }
}
