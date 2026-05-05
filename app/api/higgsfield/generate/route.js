export const maxDuration = 60

const BASE_URL = 'https://platform.higgsfield.ai'

const IMAGE_ENDPOINTS = {
  flux: '/flux-pro/kontext/max/text-to-image',
  soul: '/v1/text2image/soul',
}

const VIDEO_ENDPOINT = '/v1/image2video/dop'

function getAuthHeader(apiKey) {
  // Key format from cloud.higgsfield.ai can be:
  // "KEY_ID:KEY_SECRET" → use as-is with "Key " prefix
  // Single token → try Bearer
  if (apiKey.includes(':')) {
    return `Key ${apiKey}`
  }
  return `Bearer ${apiKey}`
}

async function higgsfieldFetch(path, options = {}) {
  const apiKey = process.env.HIGGSFIELD_API_KEY
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: getAuthHeader(apiKey),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const text = await res.text()
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) }
  } catch {
    return { ok: res.ok, status: res.status, data: { error: text } }
  }
}

async function pollUntilDone(requestId, maxWaitMs = 55000) {
  const start = Date.now()
  const POLL_INTERVAL = 2500

  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL))
    const { ok, data } = await higgsfieldFetch(`/requests/${requestId}/status`)
    if (!ok) continue

    const status = data.status
    if (status === 'completed') return { success: true, data }
    if (status === 'failed') return { success: false, error: 'Generation failed' }
    if (status === 'nsfw') return { success: false, error: 'Content flagged as NSFW' }
    // queued / in_progress → keep polling
  }
  return { success: false, error: 'Timed out after 55s' }
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

  let endpoint, input

  if (type === 'image') {
    endpoint = IMAGE_ENDPOINTS[model] || IMAGE_ENDPOINTS.flux
    input = {
      prompt: prompt.trim(),
      aspect_ratio: aspectRatio || '1:1',
      safety_tolerance: 2,
    }
  } else if (type === 'video') {
    endpoint = VIDEO_ENDPOINT
    input = {
      model: 'dop-turbo',
      prompt: prompt.trim(),
      ...(inputImageUrl?.trim() ? {
        input_images: [{ type: 'image_url', image_url: inputImageUrl.trim() }],
      } : {}),
    }
  } else {
    return Response.json({ error: 'type must be image or video' }, { status: 400 })
  }

  // Submit job
  const submit = await higgsfieldFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(input),
  })

  if (!submit.ok) {
    const msg = submit.data?.message || submit.data?.error || `HTTP ${submit.status}`
    return Response.json({ error: `Higgsfield error: ${msg}` }, { status: 502 })
  }

  const requestId = submit.data?.request_id
  if (!requestId) {
    return Response.json({
      error: 'No request_id returned',
      debug: submit.data,
    }, { status: 502 })
  }

  // Poll for completion
  const result = await pollUntilDone(requestId)
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 500 })
  }

  // Extract URL from result
  const job = result.data?.jobs?.[0]
  const url = job?.results?.raw?.url || job?.results?.min?.url || result.data?.url

  if (!url) {
    return Response.json({ error: 'No output URL in response', debug: result.data }, { status: 500 })
  }

  return Response.json({ ok: true, url, type })
}
