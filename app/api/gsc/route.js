import { google } from 'googleapis'

function getAuth() {
  const email = process.env.GOOGLE_CLIENT_EMAIL
  const key   = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !key) throw new Error('NOT_CONFIGURED')
  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/webmasters'],
  })
}

export async function POST(req) {
  const { action, siteUrl, feedpath, inspectUrl } = await req.json()

  let auth
  try {
    auth = getAuth()
  } catch {
    return Response.json({ error: 'GSC credentials not configured', setup: true }, { status: 503 })
  }

  try {
    if (action === 'submit-sitemap') {
      const wm = google.webmasters({ version: 'v3', auth })
      await wm.sitemaps.submit({ siteUrl, feedpath })
      return Response.json({ ok: true, message: `Submitted ${feedpath}` })
    }

    if (action === 'list-sitemaps') {
      const wm = google.webmasters({ version: 'v3', auth })
      const res = await wm.sitemaps.list({ siteUrl })
      return Response.json({ ok: true, sitemaps: res.data.sitemap || [] })
    }

    if (action === 'inspect-url') {
      const sc = google.searchconsole({ version: 'v1', auth })
      const res = await sc.urlInspection.index.inspect({
        requestBody: { inspectionUrl: inspectUrl, siteUrl },
      })
      return Response.json({ ok: true, result: res.data.inspectionResult })
    }

    if (action === 'search-analytics') {
      const wm = google.webmasters({ version: 'v3', auth })
      const res = await wm.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10),
          endDate:   new Date().toISOString().slice(0, 10),
          dimensions: ['page'],
          rowLimit: 10,
          orderBy: [{ fieldName: 'clicks', sortOrder: 'descending' }],
        },
      })
      return Response.json({ ok: true, rows: res.data.rows || [] })
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
