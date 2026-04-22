# Example Workflows

This directory contains ready-to-use GitHub Actions workflow templates that demonstrate how to integrate the Cosine CLI into your CI/CD pipelines. Copy any file into your repository under `.github/workflows/` and adapt the prompts and triggers to your needs.

| Example | Trigger | Mode | Model | Description |
|---------|---------|------|-------|-------------|
| [PR Review](../.github/workflows/examples/pr-review.yml) | `pull_request` | `auto` | `vars.COS_MODEL` | Automated code review with high reasoning on every PR update. |
| [Security Audit](../.github/workflows/examples/security-audit.yml) | `push` to main/master, `workflow_dispatch` | `auto` | `gemini-3.1-pro` | Deep security audit with extra-high reasoning. |
| [Documentation](../.github/workflows/examples/documentation.yml) | `workflow_dispatch` | `plan` then `auto` | default | Preview and apply documentation updates with medium reasoning. |
| [Model Matrix](../.github/workflows/examples/model-matrix.yml) | `workflow_dispatch` | `auto` | matrix of 3 models | Run the same prompt across multiple models and collect artifacts. |
