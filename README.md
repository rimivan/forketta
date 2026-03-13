# Forketta

Forketta e un client Git GUI desktop ispirato a Fork, ridotto all'essenziale: tre pannelli netti, cronologia leggibile, working tree immediato e un backend che esegue Git reale invece di simulare operazioni.

La base tecnica usa `Tauri v2 + React + TypeScript + Rust` per restare leggera su Windows e, soprattutto, per trattare i repository WSL come requisito di primo livello.

## Obiettivi del progetto

- UI minimale, chiara e pronta per workflow Git frequenti
- target Windows con supporto affidabile ai path WSL
- open source end-to-end
- shell desktop leggera, senza peso Electron

## Feature implementate

- apertura repository da path nativo o WSL
- commit graph con lane visuali per branch e merge
- elenco branch locale/remoto con ricerca
- drag and drop branch-to-branch per il merge
- fetch, pull, push, checkout e creazione branch
- `pull` con auto-stash e re-apply
- working tree inspector con stage/unstage, diff e commit
- recent repositories persistiti localmente

## Supporto WSL

Forketta risolve ed esegue correttamente repository aperti tramite:

- `\\wsl$\Ubuntu\home\user\repo`
- `\\wsl.localhost\Ubuntu\home\user\repo`
- `wsl://Ubuntu/home/user/repo`
- `/home/user/repo` con distro WSL selezionata

Per i repository WSL il backend non usa path translation fragile: invoca `wsl.exe -d <distro> --cd <path> git ...`, cosi le operazioni Git girano dentro la distro corretta.

## Architettura

- `src/`: shell React, commit graph, inspector, branch sidebar, storage locale
- `src-tauri/src/git.rs`: risoluzione path, esecuzione Git/WSL, parsing branch/status/log/diff
- `src-tauri/src/lib.rs`: registrazione comandi Tauri e bootstrap desktop

## Sviluppo

Prerequisiti per il target Windows:

- Node.js 24+
- Rust toolchain
- prerequisiti Tauri per Windows
- Git for Windows installato
- WSL installato se vuoi lavorare su repository Linux

Installazione:

```bash
npm install
```

Frontend checks:

```bash
npm run typecheck
npm test
npm run build
```

Avvio desktop:

```bash
npm run tauri dev
```

Build release:

```bash
npm run tauri build
```

## Licenza

MIT. Vedi [LICENSE](./LICENSE).
