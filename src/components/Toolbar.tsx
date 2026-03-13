import { formatDateTime } from "../lib/format";
import type { RepositorySnapshot } from "../types";

interface ToolbarProps {
  snapshot: RepositorySnapshot;
  busy: boolean;
  onRefresh: () => void;
  onFetch: () => void;
  onPull: () => void;
  onPush: () => void;
  onSwitchRepository: () => void;
}

export function Toolbar({
  snapshot,
  busy,
  onRefresh,
  onFetch,
  onPull,
  onPush,
  onSwitchRepository,
}: ToolbarProps) {
  return (
    <header className="toolbar panel">
      <div className="toolbar-repository">
        <div>
          <h1>{snapshot.repository.name}</h1>
          <p>{snapshot.execution.displayPath}</p>
        </div>

        <div className="toolbar-meta">
          <span className="pill">
            {snapshot.execution.mode === "wsl"
              ? `WSL • ${snapshot.execution.distro ?? "auto"}`
              : "Git nativo"}
          </span>
          <span className="pill">
            {snapshot.head.detached
              ? "HEAD detached"
              : snapshot.head.currentBranch ?? "Nessun branch"}
          </span>
          {snapshot.head.upstream ? (
            <span className="pill subtle">
              {snapshot.head.ahead > 0 ? `↑${snapshot.head.ahead}` : "↑0"}{" "}
              {snapshot.head.behind > 0 ? `↓${snapshot.head.behind}` : "↓0"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="toolbar-actions">
        <span className="toolbar-updated">
          Aggiornato {formatDateTime(snapshot.head.lastUpdated)}
        </span>

        <button type="button" onClick={onRefresh} disabled={busy}>
          Refresh
        </button>
        <button type="button" onClick={onFetch} disabled={busy}>
          Fetch
        </button>
        <button type="button" onClick={onPull} disabled={busy}>
          Pull + stash
        </button>
        <button type="button" onClick={onPush} disabled={busy}>
          Push
        </button>
        <button type="button" onClick={onSwitchRepository} disabled={busy}>
          Apri altro
        </button>
      </div>
    </header>
  );
}
