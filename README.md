# AgentLint for VS Code

Security scanner for AI agent configurations. Get inline warnings for risky patterns in Claude Code, Cursor, and CLAUDE.md files.

![AgentLint in action](images/screenshot.png)

## Features

- **Inline Diagnostics**: See security warnings directly in your editor
- **Real-time Scanning**: Automatically scans on file open and save
- **20 Security Rules**: Detects `curl | bash`, secret leaks, unscoped access, and more
- **Configurable Severity**: Choose what triggers errors vs warnings

## Supported Files

- `.claude/skills/*.md`
- `.claude/agents/*.md`
- `.claude/hooks/*`
- `CLAUDE.md`
- `AGENTS.md`
- `.cursorrules`

## Usage

1. Install the extension
2. Open a project with agent config files
3. See warnings inline as you edit

### Commands

- `AgentLint: Scan Workspace` - Scan all agent configs in workspace
- `AgentLint: Scan Current File` - Scan the current file

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `agentlint.enable` | `true` | Enable/disable diagnostics |
| `agentlint.failOn` | `high` | Severity to show as errors |
| `agentlint.warnOn` | `medium` | Severity to show as warnings |
| `agentlint.configPath` | - | Path to agentlint.yaml |

## What It Detects

- Dynamic shell execution (`curl | bash`)
- Secret references (`$GITHUB_TOKEN`)
- Auto-triggered hooks with side effects
- Unscoped file write access
- Remote script fetches
- And 15 more security patterns

See [AgentLint rules](https://github.com/akz4ol/agentlint#what-it-detects) for the full list.

## Requirements

- VS Code 1.85.0 or higher
- Node.js 18+ (for AgentLint CLI)

## Links

- [AgentLint CLI](https://github.com/akz4ol/agentlint)
- [GitHub Action](https://github.com/akz4ol/agentlint-action)
- [Report Issues](https://github.com/akz4ol/agentlint-vscode/issues)

## License

Apache 2.0
