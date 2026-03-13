import type { EnvironmentInfo } from "../types";
import type { SavedRepository } from "../lib/storage";
import { classNames } from "../lib/format";

interface OpenRepositoryPaneProps {
  environment: EnvironmentInfo | null;
  path: string;
  selectedDistro: string;
  recentRepositories: SavedRepository[];
  busy: boolean;
  onPathChange: (path: string) => void;
  onDistroChange: (distro: string) => void;
  onPickFolder: () => void;
  onOpen: () => void;
  onOpenRecent: (entry: SavedRepository) => void;
}

export function OpenRepositoryPane({
  environment,
  path,
  selectedDistro,
  recentRepositories,
  busy,
  onPathChange,
  onDistroChange,
  onPickFolder,
  onOpen,
  onOpenRecent,
}: OpenRepositoryPaneProps) {
  return (
    <div className="landing-shell">
      <section className="landing-card panel">
        <div className="landing-brand">
          <span className="brand-mark">F</span>
          <div>
            <h1>Forketta</h1>
            <p>
              Git client desktop minimale per workflow veloci, branch graph
              leggibile e supporto nativo ai repository WSL.
            </p>
          </div>
        </div>

        <div className="landing-form">
          <label className="field">
            <span>Percorso repository</span>
            <input
              value={path}
              onChange={(event) => onPathChange(event.currentTarget.value)}
              placeholder="C:\\code\\repo oppure wsl://Ubuntu/home/user/repo"
              spellCheck={false}
            />
          </label>

          <div className="landing-row">
            <button
              className="secondary-button"
              type="button"
              onClick={onPickFolder}
              disabled={busy}
            >
              Apri cartella
            </button>

            <button
              className="primary-button"
              type="button"
              onClick={onOpen}
              disabled={busy || !path.trim()}
            >
              {busy ? "Apertura..." : "Apri repository"}
            </button>
          </div>

          <label
            className={classNames(
              "field",
              !environment?.wslDistros.length && "field-disabled",
            )}
          >
            <span>Distro WSL opzionale</span>
            <select
              value={selectedDistro}
              onChange={(event) => onDistroChange(event.currentTarget.value)}
              disabled={!environment?.wslDistros.length || busy}
            >
              <option value="">Seleziona automaticamente</option>
              {environment?.wslDistros.map((distro) => (
                <option key={distro} value={distro}>
                  {distro}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="landing-footnotes">
          <span>Path WSL supportati</span>
          <code>\\\\wsl$\\Ubuntu\\home\\user\\repo</code>
          <code>\\\\wsl.localhost\\Ubuntu\\home\\user\\repo</code>
          <code>wsl://Ubuntu/home/user/repo</code>
          <code>/home/user/repo + distro selezionata</code>
        </div>
      </section>

      <section className="landing-recents panel">
        <div className="section-heading">
          <h2>Recenti</h2>
          <span>
            {environment?.supportsWsl
              ? "WSL rilevato"
              : `Host ${environment?.os ?? "desktop"}`}
          </span>
        </div>

        <div className="recent-list">
          {recentRepositories.length === 0 ? (
            <p className="empty-state">
              Nessun repository recente. Aprine uno per memorizzarlo qui.
            </p>
          ) : (
            recentRepositories.map((entry) => (
              <button
                key={entry.path}
                className="recent-entry"
                type="button"
                onClick={() => onOpenRecent(entry)}
                disabled={busy}
              >
                <strong>{entry.label}</strong>
                <span>{entry.path}</span>
                {entry.wslDistro ? <em>WSL • {entry.wslDistro}</em> : null}
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
