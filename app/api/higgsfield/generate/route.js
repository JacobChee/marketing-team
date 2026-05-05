export const maxDuration = 60

const BASE_URL = 'https://api.higgsfield.ai'

async function higgsfieldFetch(path, options = {}) {
  const apiKey = process.env.HIGGSFIELD_API_KEY
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text } }
  return { ok: res.ok, status: res.status, data }
}

async function pollUntilDone(id, maxWaitMs = 55000) {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 3000))
    const { ok, data } = await higgsfieldFetch(`/v1/generations/${id}`)
    if (!ok) continue
    const status = data.status
    if (status === 'completed' || status === 'succeeded') return { success: true, data }
    if (status === 'failed' || status === 'error') return { success: false, error: data.error || 'Generation failed' }
    if (status === 'nsfw') return { success: false, error: 'Content flagged as NSFW' }
    // queued / processing / in_progress → keep polling
  }
  return { success: false, error: 'Timed out after 55s' }
}

function extractUrl(data) {
  // Try common response shapes
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
  const apiKey = process.env.HIGGSFIELD_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'HIGGSFIELD_API_KEY not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { type, model, prompt, aspectRatio, inputImageUrl } = body

  if (!prompt?.trim()) {
    return Response.json({ error: 'prompt is required' }, { status: 400 })
  }

  // Build request body
  let requestBody

  if (type === 'image') {
    // Derive width/height from aspect ratio
    const dims = {
      '1:1':  { width: 1024, height: 1024 },
      '9:16': { width: 768,  height: 1360 },
      '16:9': { width: 1360, height: 768  },
      '4:5':  { width: 820,  height: 1024 },
    }[aspectRatio || '1:1'] || { width: 1024, height: 1024 }

    requestBody = {
      task: 'text-to-image',
      model: model === 'soul' ? 'soul' : 'flux',
      prompt: prompt.trim(),
      ...dims,
      steps: 30,
    }
  } else if (type === 'video') {
    requestBody = {
      task: 'image-to-video',
      model: 'default-video-model',
      prompt: prompt.trim(),
      ...(inputImageUrl?.trim() ? { input_image: inputImageUrl.trim() } : {}),
    }
  } else {
    return Response.json({ error: 'type must be image or video' }, { status: 400 })
  }

  // Submit job
  const submit = await higgsfieldFetch('/v1/generations', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  })

  if (!submit.ok) {
    const msg = submit.data?.message || submit.data?.error || submit.data?.detail || `HTTP ${submit.status}`
    return Response.json({ error: `Higgsfield: ${msg}` }, { status: 502 })
  }

  // Check if result came back immediately
  const immediateUrl = extractUrl(submit.data)
  if (immediateUrl) {
    return Response.json({ ok: true, url: immediateUrl, type })
  }

  // Otherwise poll
  const jobId = submit.data?.id || submit.data?.job_id || submit.data?.request_id
  if (!jobId) {
    return Response.json({ error: 'No job ID returned', debug: submit.data }, { status: 502 })
  }

  const result = await pollUntilDone(jobId)
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 500 })
  }

  const url = extractUrl(result.data)
  if (!url) {
    return Response.json({ error: 'No output URL in response', debug: result.data }, { status: 500 })
  }

  return Response.json({ ok: true, url, type })
}
