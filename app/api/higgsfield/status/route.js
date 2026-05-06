// Poll a single Higgsfield job and return its current status.
// Called repeatedly by the frontend until done === true.

const BASE_URL = 'https://api.higgsfield.ai'

async function higgsfieldFetch(path) {
  const apiKey = process.env.HIGGSFIELD_API_KEY
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text } }
  return { ok: res.ok, status: res.status, data }
}

function extractUrl(data) {
  return (
    data?.output?.[0] ||
    data?.output ||
    data?.url ||
    data?.image_url ||
    data?.video_url ||
    data?.result?.url ||
    data?.results?.[0]?.url ||
    data?.jobs?.[0]?.results?.raw?.url ||
    null
  )
}

export async function POST(req) {
  const { jobId } = await req.json()
  if (!jobId) return Response.json({ error: 'jobId required' }, { status: 400 })

  const { ok, data } = await higgsfieldFetch(`/v1/generations/${jobId}`)
  if (!ok) {
    return Response.json({ done: false, status: 'error', debug: data })
  }

  const status = data?.status || data?.state || 'unknown'
  const url = extractUrl(data)

  if (url || status === 'completed' || status === 'succeeded') {
    return Response.json({ done: true, url, status: 'completed' })
  }
  if (status === 'failed' || status === 'error') {
    return Response.json({ done: true, error: data?.error || data?.message || 'Generation failed', status })
  }
  if (status === 'nsfw') {
    return Response.json({ done: true, error: 'Content flagged as NSFW', status })
  }

  // Still processing
  return Response.json({ done: false, status })
}
