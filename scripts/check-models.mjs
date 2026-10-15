// Checks that every model id in cordis.patch.yml is still served by
// GET https://api.stdcmpt.com/v1/models. The listing is public; no key needed.
import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'

const patch = parse(await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8'))
const route = patch[0].config.providers.standardcompute
const wanted = route.models.map((m) => m.id)

const response = await fetch(`${route.baseURL}/models`)
if (!response.ok) {
  console.error(`GET ${route.baseURL}/models failed: ${response.status} ${response.statusText}`)
  process.exit(1)
}
const { data = [] } = await response.json()
// The gateway matches model ids case-insensitively (the router is listed as "StandardCompute").
const served = new Set(data.map((m) => String(m.id).toLowerCase()))
const missing = wanted.filter((id) => !served.has(id.toLowerCase()))

if (missing.length > 0) {
  console.error(`Not served any more: ${missing.join(', ')}`)
  process.exit(1)
}
console.log(`All ${wanted.length} configured models are served (${served.size} listed).`)
