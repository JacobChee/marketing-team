import { higgsfield, config } from '@higgsfield/client/v2'

export const maxDuration = 60

const MODELS = {
  // Image models
  'flux-text': 'flux-pro/kontext/max/text-to-image',
  'soul-text': '/v1/text2image/soul',
  // Video models
  'dop-video': '/v1/image2video/dop',
}

export async function POST(req) {
  const credentials = process.env.HIGGSFIELD_API_KEY
  if (!credentials) {
    return Response.json({ error: 'HIGGSFIELD_API_KEY not set' }, { status: 500 })
  }

  config({ credentials })

  const body = await req.json()
  const { type, model, prompt, aspectRatio, inputImageUrl } = body

  if (!prompt) {
    return Response.json({ error: 'prompt is required' }, { status: 400 })
  }

  try {
    let endpoint, input

    if (type === 'image') {
      endpoint = model === 'soul' ? MODELS['soul-text'] : MODELS['flux-text']
      input = {
        prompt,
        aspect_ratio: aspectRatio || '1:1',
        safety_tolerance: 2,
      }
    } else if (type === 'video') {
      endpoint = MODELS['dop-video']
      input = {
        model: 'dop-turbo',
        prompt,
        ...(inputImageUrl ? {
          input_images: [{ type: 'image_url', image_url: inputImageUrl }],
        } : {}),
      }
    } else {
      return Response.json({ error: 'type must be image or video' }, { status: 400 })
    }

    const jobSet = await higgsfield.subscribe(endpoint, { input, withPolling: true })

    if (jobSet.isFailed) {
      return Response.json({ error: 'Generation failed' }, { status: 500 })
    }

    if (jobSet.isNsfw) {
      return Response.json({ error: 'Content flagged as NSFW' }, { status: 400 })
    }

    const result = jobSet.jobs[0]?.results
    const url = result?.raw?.url || result?.min?.url

    if (!url) {
      return Response.json({ error: 'No output URL returned' }, { status: 500 })
    }

    return Response.json({ ok: true, url, type })
  } catch (err) {
    console.error('Higgsfield error:', err)
    return Response.json({ error: err.message || 'Generation failed' }, { status: 500 })
  }
}
