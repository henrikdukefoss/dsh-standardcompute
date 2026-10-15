import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { parse } from 'yaml'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const patchText = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
const patch = parse(patchText)

test('package declares a DeepSeek Harness bundle', () => {
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.ok(pkg.files.includes('cordis.patch.yml'), 'the patch must ship in the npm tarball')
  assert.ok(pkg.keywords.includes('dsh-plugin'))
  assert.equal(pkg.license, 'MIT')
})

test('package does not bundle its own copy of a dsh package', () => {
  for (const field of ['dependencies', 'peerDependencies']) {
    for (const name of Object.keys(pkg[field] ?? {})) {
      assert.doesNotMatch(name, /^@deepseek-ai\//, `${field} must not pin ${name}`)
    }
  }
})

test('patch configures the existing llm-pi-ai row and mounts nothing new', () => {
  assert.ok(Array.isArray(patch), 'a Cordis patch is a YAML list')
  assert.equal(patch.length, 1)
  const [row] = patch
  assert.equal(row.id, 'llm-pi-ai')
  assert.equal(row.insert, undefined, 'must not insert a second adapter')
  assert.equal(row.name, undefined, 'must not rename the dsh-base row')
  assert.deepEqual(Object.keys(row.config.providers), ['standardcompute'])
})

const route = patch[0].config.providers.standardcompute

test('route points at the Standard Compute OpenAI-compatible endpoint', () => {
  assert.equal(route.api, 'openai-completions')
  assert.equal(route.baseURL, 'https://api.stdcmpt.com/v1')
  assert.equal(route.apiKeyEnv, 'STANDARDCOMPUTE_API_KEY')
  assert.equal(route.displayName, 'Standard Compute')
})

test('route sets only compat switches that take a value', () => {
  for (const [key, value] of Object.entries(route.compat)) {
    assert.notEqual(value, null, `compat.${key} needs a value; an empty key is refused by dsh`)
  }
})

test('no credential is embedded in the patch', () => {
  assert.equal(route.apiKey, undefined)
  assert.equal(route.headers, undefined)
  assert.doesNotMatch(patchText, /Bearer\s+\S/i)
  assert.doesNotMatch(patchText, /\bsk-[A-Za-z0-9]{8,}/)
})

test('model catalog starts with the router and has unique, well-formed entries', () => {
  const ids = route.models.map((m) => m.id)
  assert.equal(ids[0], 'standardcompute')
  assert.equal(new Set(ids).size, ids.length, 'model ids must be unique')
  for (const model of route.models) {
    assert.equal(typeof model.name, 'string')
    assert.ok(Number.isInteger(model.contextWindow) && model.contextWindow > 0)
    assert.ok(Array.isArray(model.input) && model.input.length > 0)
    for (const modality of model.input) assert.ok(['text', 'image'].includes(modality))
  }
})
