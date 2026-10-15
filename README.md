# dsh-standardcompute

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) plugin that adds
[Standard Compute](https://standardcompute.com) as a model provider.

Standard Compute is an OpenAI-compatible API (`https://api.stdcmpt.com/v1`) with one key for
many models. Its `standardcompute` model is a router: for each request it picks a model and
provider, sending routine steps to cheaper models and harder ones to stronger models. You can also
pin one exact model by id.

This package is configuration only. Requests go through dsh's own `@deepseek-ai/dsh-llm-pi-ai`
adapter; the bundle adds one route to it. There is no code that runs on your machine besides
dsh itself.

## What you get

A provider route named `standardcompute` with three models in the picker:

| Model id | What it is |
|---|---|
| `standardcompute` | The router. Picks the model per request. Text and images. |
| `deepseek/deepseek-v4-pro` | Pinned DeepSeek V4 Pro. Text. |
| `anthropic/claude-sonnet-5.5` | Pinned Claude Sonnet 5.5. Text and images. |

Any other id from `GET https://api.stdcmpt.com/v1/models` works too: add it on
**Settings → Models** (edit the Standard Compute provider, **Fetch available models**) or in your
profile's `cordis.patch.yml`.

## Install

Requires dsh 0.2.0-rc.1 or newer and Node.js `^22.19.0 || >=24`.

From the release tarball (no npm account or build step needed):

```sh
dsh plugin --profile web add https://github.com/henrikdukefoss/dsh-standardcompute/releases/latest/download/dsh-standardcompute.tgz
```

Or straight from GitHub:

```sh
dsh plugin --profile web add github:henrikdukefoss/dsh-standardcompute
```

In the desktop app or Web UI you can paste either spec into **Plugins → Add plugin**.

Then restart the profile (`dsh web`) and give it a key. Create one at
[standardcompute.com/dashboard](https://standardcompute.com/dashboard), then either:

- open **Settings → Models**, edit **Standard Compute**, paste the key and save (stored
  write-only in `$DSH_HOME/.credentials.yaml`), or
- export it before starting dsh:

  ```sh
  export STANDARDCOMPUTE_API_KEY=...
  ```

Pick **Standard Compute (router)** in the composer's model menu. Selecting it also makes it the
default for new sessions.

Check what the bundle added without starting anything:

```sh
dsh --profile web --dump-config   # shows "# == @deepseek-ai/dsh-base, patched by dsh-standardcompute"
```

## How the router works

You send `model: "standardcompute"`. The gateway looks at the request and picks a model and an
upstream provider for it; routine steps go to cheaper models and harder steps to stronger ones. A
pinned id such as `anthropic/claude-sonnet-5.5` skips that choice and always uses that model.
Images are accepted on the router; it chooses a vision-capable model when a request carries one.

Reasoning: this bundle declares no reasoning levels, so dsh sends none and the reasoning setting
on your Standard Compute dashboard applies. If you want dsh's **Effort** menu instead, declare the
levels on a model (dsh then sends `reasoning_effort`, which overrides the dashboard setting for
that request):

```yaml
- id: standardcompute
  name: Standard Compute (router)
  contextWindow: 1000000
  input: [text, image]
  reasoningEfforts:
    low: low
    medium: medium
    high: high
```

## Billing: requests stop at the budget

Standard Compute is a monthly plan with a fixed compute budget, not pay-per-token. When the
plan's budget is used up, new requests fail with **HTTP 402** until the plan renews or you change
plans. Requests already running finish, and nothing is billed on top of the plan. In dsh a 402
shows up as a failed request on the `standardcompute` route; switch to another provider in the
model menu if you need to keep going. Plans and budgets: [standardcompute.com](https://standardcompute.com).

## Already have other providers?

A Cordis patch replaces a row's whole `config`, and your profile's own `cordis.patch.yml` is
applied after plugin bundles. So if that file already configures `llm-pi-ai` (for example because
you added a provider by hand before installing this plugin), your file wins and the
`standardcompute` route does not appear. Two ways to fix it:

- Paste the `standardcompute:` block from this package's [`cordis.patch.yml`](cordis.patch.yml)
  under `providers:` in your profile's `llm-pi-ai` entry, or
- add it by hand on **Settings → Models → Add model provider → Custom model API**: Provider ID
  `standardcompute`, base URL `https://api.stdcmpt.com/v1`, protocol **OpenAI Chat Completions**,
  model `standardcompute`.

Adding providers on the Models page after installing this plugin is fine: dsh's config editor
writes the complete current provider list, `standardcompute` included, into your profile.

## Configuration written by this plugin

```yaml
- id: llm-pi-ai
  config:
    providers:
      standardcompute:
        displayName: Standard Compute
        apiKeyEnv: STANDARDCOMPUTE_API_KEY
        api: openai-completions
        baseURL: https://api.stdcmpt.com/v1
        compat:
          supportsDeveloperRole: false
          maxTokensField: max_tokens
        models: [standardcompute, deepseek/deepseek-v4-pro, anthropic/claude-sonnet-5.5]  # abbreviated
```

`apiKeyEnv` is a credential reference, not a key. Nothing secret is stored in this package.

## Troubleshooting

- **`MISSING_CREDENTIAL`**: no key found. Save it on Settings → Models or export `STANDARDCOMPUTE_API_KEY`.
- **`AUTH: 401 Invalid API key`**: the key is wrong or revoked. Create a new one on the dashboard.
- **HTTP 402**: the plan's compute budget is used up for this period. See "Billing" above.
- **The route is missing after install**: see "Already have other providers?".

More setup notes and how this compares with a DeepSeek key or OpenRouter:
[Best API for DeepSeek Harness](https://standardcompute.com/best-api-for/deepseek-harness).

## Development

```sh
npm install
npm test                               # manifest and patch checks
DSH_BIN=$(command -v dsh) npm test     # also installs into a temp DSH_HOME and checks --dump-config (needs pnpm)
npm run check:models                   # every bundled model id is still listed by /v1/models (public, no key)
npm run pack:check                     # what would ship
```

Publishing to npm (`npm publish`) runs the tests first via `prepack`.

## Disclosure

This plugin is maintained by Standard Compute. It is not affiliated with or endorsed by DeepSeek.

## License

[MIT](LICENSE)
