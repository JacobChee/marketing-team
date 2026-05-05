const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const REPOS = {
  atsell: 'JacobChee/atsell-website',
  afix: 'JacobChee/afix-repo',
}

export async function POST(req) {
  const { repo, path } = await req.json()
  const repoFull = REPOS[repo]
  if (!repoFull) return Response.json({ error: 'Unknown repo' }, { status: 400 })

  const res = await fetch(`https://api.github.com/repos/${repoFull}/contents/${path}`, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'marketing-team-app',
    },
  })

  if (!res.ok) {
    const err = await res.json()
    return Response.json({ error: err.message }, { status: res.status })
  }

  const data = await res.json()

  // Handle directory listing
  if (Array.isArray(data)) {
    return Response.json({ type: 'dir', items: data.map(f => ({ name: f.name, path: f.path, type: f.type, size: f.size })) })
  }

  // Decode file content
  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  return Response.json({ type: 'file', path: data.path, content, sha: data.sha, size: data.size })
}
