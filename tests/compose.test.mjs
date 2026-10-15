// Installs this checkout into a throwaway DSH_HOME with the real `dsh` CLI and
// checks the composed profile. Runs only when DSH_BIN points at a dsh binary
// (and pnpm is on PATH), because it needs the harness installed:
//
//   DSH_BIN=$(command -v dsh) npm test
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const dsh = process.env.DSH_BIN
const root = fileURLToPath(new URL('..', import.meta.url))

test('dsh composes the standardcompute route into a profile', { skip: !dsh && 'set DSH_BIN to run' }, () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-standardcompute-'))
  try {
    const env = { ...process.env, DSH_HOME: home }
    execFileSync(dsh, ['plugin', '--profile', 'test', 'add', root], { env, stdio: 'pipe' })
    const dump = execFileSync(dsh, ['--profile', 'test', '--dump-config'], { env, encoding: 'utf8' })
    assert.match(dump, /patched by dsh-standardcompute/)
    assert.match(dump, /standardcompute:\n\s+displayName: Standard Compute/)
    assert.match(dump, /baseURL: https:\/\/api\.stdcmpt\.com\/v1/)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
