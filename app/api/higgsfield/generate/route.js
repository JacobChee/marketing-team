// Submit a Higgsfield generation job and return immediately with jobId.
// The frontend polls /api/higgsfield/status for completion.

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
    const dims = {
      '1:1':  { width: 1024, height: 1024 },
      '9:16': { width: 768,  height: 1360 },
      '16:9': { width: 1360, height: 768  },
      '4:5':  { width: 820,  height: 1024 },
    }[aspectRatio || '1:1'] || { width: 1024, height: 1024 }

    requestBody = {
      model: model === 'soul' ? 'soul' : 'flux',
      prompt: prompt.trim(),
      ...dims,
      num_inference_steps: 30,
    }
  } else if (type === 'video') {
    requestBody = {
      model: 'dop-turbo',
      prompt: prompt.trim(),
      ...(inputImageUrl?.trim() ? { image_url: inputImageUrl.trim() } : {}),
    }
  } else {
    return Response.json({ error: 'type must be image or video' }, { status: 400 })
  }

  // Submit job — return immediately, client polls for status
  const submit = await higgsfieldFetch('/v1/generations', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  })

  if (!submit.ok) {
    const msg = submit.data?.message || submit.data?.error || submit.data?.detail || `HTTP ${submit.status}`
    return Response.json({ error: `Higgsfield: ${msg}`, debug: submit.data }, { status: 502 })
  }

  // If result came back immediately (synchronous generation)
  const immediateUrl = extractUrl(submit.data)
  if (immediateUrl) {
    return Response.json({ ok: true, done: true, url: immediateUrl, type })
  }

  // Extract job ID for async polling
  const jobId = submit.data?.id || submit.data?.job_id || submit.data?.request_id || submit.data?.generation_id
  if (!jobId) {
    return Response.json({ error: 'No job ID returned', debug: submit.data }, { status: 502 })
  }

  return Response.json({ ok: true, done: false, jobId, type })
}
