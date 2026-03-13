# Forketta

Forketta is a desktop Git GUI inspired by Fork and reduced to the essentials: three clear panels, readable history, an immediate working tree, and a backend that executes real Git instead of simulating operations.

The technical stack uses `Tauri v2 + React + TypeScript + Rust` to stay lightweight on Windows and, above all, to treat WSL repositories as a first-class requirement.

## Project goals

- minimal, clear UI built for frequent Git workflows
- Windows target with reliable WSL path support
- end-to-end open source stack
- lightweight desktop shell without Electron overhead

## Implemented features

- open repositories from native or WSL paths
- commit graph with visual lanes for branches and merges
- local and remote branch list with search
- branch-to-branch drag and drop for merge proposals
- fetch, pull, push, checkout, and branch creation
- `pull` with auto-stash and re-apply
- working tree inspector with stage/unstage, diff, and commit actions
- recent repositories persisted locally

## WSL support

Forketta resolves and executes repositories correctly when opened through:

- `\\wsl$\Ubuntu\home\user\repo`
- `\\wsl.localhost\Ubuntu\home\user\repo`
- `wsl://Ubuntu/home/user/repo`
- `/home/user/repo` with the selected WSL distro

For WSL repositories, the backend does not rely on fragile path translation: it invokes `wsl.exe -d <distro> --cd <path> git ...`, so Git operations run inside the correct distro.

## Architecture

- `src/`: React shell, commit graph, inspector, branch sidebar, local storage
- `src-tauri/src/git.rs`: path resolution, Git/WSL execution, branch/status/log/diff parsing
- `src-tauri/src/lib.rs`: Tauri command registration and desktop bootstrap

## Development

Prerequisites for the Windows target:

- Node.js 24+
- Rust toolchain
- Tauri prerequisites for Windows
- Git for Windows installed
- WSL installed if you want to work with Linux repositories

Installation:

```bash
npm install
```

Frontend checks:

```bash
npm run typecheck
npm test
npm run build
```

Desktop launch:

```bash
npm run tauri dev
```

Local release build:

```bash
npm run tauri build
```

Local Windows installer build:

```bash
npm run tauri:build:windows
```

This command must be run on Windows and generates:

- NSIS installer `.exe` in `src-tauri/target/release/bundle/nsis/`
- standalone `.exe` binary in `src-tauri/target/release/forketta.exe`

## Windows distribution from GitHub Actions

The repository includes the workflow [`.github/workflows/windows-release.yml`](./.github/workflows/windows-release.yml).

You can use it in two ways:

- manual launch from GitHub Actions with `Build Windows Installer`
- push a tag such as `v0.1.0`

The job runs on `windows-latest` and:

- publishes a `Forketta-windows` artifact
- attaches the files to the GitHub Release when triggered by a `v*` tag

The distributed files are:

- installer `.exe` for end users
- standalone `forketta.exe`

## License

MIT. See [LICENSE](./LICENSE).
