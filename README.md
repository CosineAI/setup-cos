# Setup Cosine CLI

A GitHub Action to install the [Cosine CLI](https://github.com/CosineAI/cli2) (`cos`) in your workflows.

The [Cosine CLI](https://cosine.sh/docs/cli) is a terminal-native AI coding agent that helps you write, review, and optimize code directly from your terminal. This action downloads and caches the `cos` binary from Cosine's GitHub releases, making it available to all subsequent steps in your workflow.

## Usage

### Basic workflow example

```yaml
name: Example Cosine Workflow
on: [push]

jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Cosine CLI
        id: setup-cos
        uses: cosineai/setup-cos@v1
        with:
          version: latest

      - name: Run a Cosine command
        run: cos version

      - name: Use the installed binary path explicitly
        run: |
          echo "Cosine version: ${{ steps.setup-cos.outputs.version }}"
          echo "Cosine binary:  ${{ steps.setup-cos.outputs.path }}"
          "${{ steps.setup-cos.outputs.path }}" version
```

## Example Workflows

Ready-to-use workflow templates are available in [`examples/`](examples/). Copy them into your repository under `.github/workflows/` and adapt the prompts and triggers to your needs.

| Example | Trigger | Mode | Description |
|---------|---------|------|-------------|
| [PR Review](.github/workflows/examples/pr-review.yml) | `pull_request` | `auto` | Automated code review on every PR update. |
| [Security Audit](.github/workflows/examples/security-audit.yml) | `push` to main/master | `auto` | Deep security audit with extra-high reasoning. |
| [Documentation](.github/workflows/examples/documentation.yml) | `workflow_dispatch` | `plan` then `auto` | Preview and apply documentation updates. |
| [Model Matrix](.github/workflows/examples/model-matrix.yml) | `workflow_dispatch` | `auto` | Run the same prompt across multiple models. |

### Inputs

| Input     | Description                                                       | Required | Default  |
| --------- | ----------------------------------------------------------------- | -------- | -------- |
| `version` | Version to install. Use `latest` or a specific tag like `v0.1.0`. | No       | `latest` |

### Outputs

| Output    | Description                                    |
| --------- | ---------------------------------------------- |
| `version` | The resolved version string that was installed |
| `path`    | Absolute path to the installed `cos` binary  |

## Supported Platforms

- Linux x64 (`ubuntu-latest`)
- Linux arm64
- macOS arm64 (`macos-latest` Apple Silicon)

macOS x64 runners are **not supported**.

## Documentation

For full CLI documentation, head to [https://cosine.sh/docs/cli](https://cosine.sh/docs/cli).

## Contributing

This action is built with TypeScript and bundled with [`@vercel/ncc`](https://github.com/vercel/ncc).

```bash
# Install dependencies
npm ci

# Build the action (generates dist/index.js)
npm run build

# Package for production (minified)
npm run package
```

> **Note:** The `dist/index.js` file is checked into git because GitHub Actions requires it at runtime. You **must** run `npm run build` and commit the updated `dist/index.js` whenever you modify `src/main.ts`.

## License

This project is licensed under the [MIT License](LICENSE).
