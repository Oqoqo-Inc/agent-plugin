# Oqoqo Agent Plugin

Official production plugin packages for Oqoqo.

> This repository is generated from a validated Oqoqo production release. Do not edit generated files here.

## Codex and ChatGPT

```bash
codex plugin marketplace add Oqoqo-Inc/agent-plugin \
  --sparse .agents/plugins \
  --sparse distributions/openai
codex plugin add oqoqo@oqoqo
```

## Claude Code

```bash
claude plugin marketplace add Oqoqo-Inc/agent-plugin \
  --scope user \
  --sparse .claude-plugin distributions/claude-code
claude plugin install oqoqo@oqoqo --scope user
```

## Cursor Agent

```bash
cursor-agent plugin marketplace add https://github.com/Oqoqo-Inc/agent-plugin.git
```

Then start `cursor-agent`, enter `/plugin`, and install `oqoqo` from the `oqoqo` marketplace.

## GitHub Copilot CLI

```bash
copilot plugin marketplace add Oqoqo-Inc/agent-plugin
copilot plugin install oqoqo@oqoqo
```

## Agent skills

Install all Oqoqo eval authoring skills with the Skills CLI:

```bash
npx skills add Oqoqo-Inc/agent-plugin --skill '*'
```

The plugin connects to the production Oqoqo MCP endpoint and the public Oqoqo product-documentation MCP endpoint. OAuth and authorization remain at the MCP server boundary. The repository contains no credentials.
