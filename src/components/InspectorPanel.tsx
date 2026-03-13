import { classNames, formatDateTime, toTitleCase } from "../lib/format";
import type {
  ChangeSelection,
  CommitDetail,
  FileChange,
  FileDiff,
  WorkingTreeStatus,
} from "../types";

interface InspectorPanelProps {
  status: WorkingTreeStatus;
  activeTab: "changes" | "commit";
  selectedChange: ChangeSelection | null;
  fileDiff: FileDiff | null;
  commitDetail: CommitDetail | null;
  commitMessage: string;
  busy: boolean;
  onTabChange: (tab: "changes" | "commit") => void;
  onSelectChange: (change: FileChange, staged: boolean) => void;
  onToggleStage: (change: FileChange, staged: boolean) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  onCommitMessageChange: (message: string) => void;
  onCommit: () => void;
}

function isStaged(change: FileChange): boolean {
  return change.indexStatus !== ".";
}

function isUntracked(change: FileChange): boolean {
  return change.kind === "untracked";
}

function isConflicted(change: FileChange): boolean {
  return change.kind === "conflicted";
}

function isUnstaged(change: FileChange): boolean {
  return !isUntracked(change) && !isConflicted(change) && change.worktreeStatus !== ".";
}

function sectionChanges(
  changes: FileChange[],
  section: "staged" | "unstaged" | "untracked" | "conflicted",
): FileChange[] {
  switch (section) {
    case "staged":
      return changes.filter(isStaged);
    case "unstaged":
      return changes.filter(isUnstaged);
    case "untracked":
      return changes.filter(isUntracked);
    case "conflicted":
      return changes.filter(isConflicted);
  }
}

interface ChangeSectionProps {
  title: string;
  changes: FileChange[];
  staged: boolean;
  selectedChange: ChangeSelection | null;
  busy: boolean;
  onSelectChange: (change: FileChange, staged: boolean) => void;
  onToggleStage: (change: FileChange, staged: boolean) => void;
}

function ChangeSection({
  title,
  changes,
  staged,
  selectedChange,
  busy,
  onSelectChange,
  onToggleStage,
}: ChangeSectionProps) {
  if (changes.length === 0) {
    return null;
  }

  return (
    <div className="change-section">
      <div className="section-heading tight">
        <h3>{title}</h3>
        <span>{changes.length}</span>
      </div>

      <div className="change-list">
        {changes.map((change) => {
          const active =
            selectedChange?.path === change.path && selectedChange.staged === staged;

          return (
            <div
              key={`${title}-${change.path}`}
              className={classNames("change-row", active && "change-row-active")}
            >
              <button
                type="button"
                className="change-main"
                onClick={() => onSelectChange(change, staged)}
              >
                <strong>{change.path}</strong>
                <span>
                  {toTitleCase(change.kind)}
                  {change.originalPath ? ` • ${change.originalPath}` : ""}
                </span>
              </button>

              <button
                type="button"
                className="change-toggle"
                onClick={() => onToggleStage(change, !staged)}
                disabled={busy}
              >
                {staged ? "−" : "+"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function InspectorPanel({
  status,
  activeTab,
  selectedChange,
  fileDiff,
  commitDetail,
  commitMessage,
  busy,
  onTabChange,
  onSelectChange,
  onToggleStage,
  onStageAll,
  onUnstageAll,
  onCommitMessageChange,
  onCommit,
}: InspectorPanelProps) {
  const stagedChanges = sectionChanges(status.changes, "staged");
  const unstagedChanges = sectionChanges(status.changes, "unstaged");
  const untrackedChanges = sectionChanges(status.changes, "untracked");
  const conflictedChanges = sectionChanges(status.changes, "conflicted");

  return (
    <section className="inspector panel">
      <div className="inspector-tabs">
        <button
          type="button"
          className={classNames(activeTab === "changes" && "tab-active")}
          onClick={() => onTabChange("changes")}
        >
          Changes
        </button>
        <button
          type="button"
          className={classNames(activeTab === "commit" && "tab-active")}
          onClick={() => onTabChange("commit")}
        >
          Commit
        </button>
      </div>

      {activeTab === "changes" ? (
        <>
          <div className="summary-grid">
            <div>
              <strong>{status.stagedCount}</strong>
              <span>staged</span>
            </div>
            <div>
              <strong>{status.unstagedCount}</strong>
              <span>unstaged</span>
            </div>
            <div>
              <strong>{status.untrackedCount}</strong>
              <span>untracked</span>
            </div>
            <div>
              <strong>{status.conflictedCount}</strong>
              <span>conflicts</span>
            </div>
          </div>

          <div className="inspector-actions">
            <button type="button" onClick={onStageAll} disabled={busy}>
              Stage all
            </button>
            <button type="button" onClick={onUnstageAll} disabled={busy}>
              Unstage all
            </button>
          </div>

          <div className="change-sections">
            <ChangeSection
              title="Conflicts"
              changes={conflictedChanges}
              staged={false}
              selectedChange={selectedChange}
              busy={busy}
              onSelectChange={onSelectChange}
              onToggleStage={onToggleStage}
            />
            <ChangeSection
              title="Staged"
              changes={stagedChanges}
              staged={true}
              selectedChange={selectedChange}
              busy={busy}
              onSelectChange={onSelectChange}
              onToggleStage={onToggleStage}
            />
            <ChangeSection
              title="Working tree"
              changes={unstagedChanges}
              staged={false}
              selectedChange={selectedChange}
              busy={busy}
              onSelectChange={onSelectChange}
              onToggleStage={onToggleStage}
            />
            <ChangeSection
              title="Untracked"
              changes={untrackedChanges}
              staged={false}
              selectedChange={selectedChange}
              busy={busy}
              onSelectChange={onSelectChange}
              onToggleStage={onToggleStage}
            />
          </div>

          <div className="diff-panel">
            <div className="section-heading tight">
              <h3>Diff</h3>
              <span>
                {selectedChange
                  ? `${selectedChange.staged ? "staged" : "working tree"} • ${selectedChange.path}`
                  : "Seleziona un file"}
              </span>
            </div>

            <pre className="diff-view">
              {fileDiff?.diff || "Nessuna diff disponibile per la selezione corrente."}
            </pre>
          </div>

          <div className="commit-box">
            <label className="field compact">
              <span>Commit message</span>
              <textarea
                value={commitMessage}
                onChange={(event) => onCommitMessageChange(event.currentTarget.value)}
                placeholder="Descrivi la modifica staged"
                spellCheck={false}
              />
            </label>

            <button
              type="button"
              className="primary-button"
              onClick={onCommit}
              disabled={busy || status.stagedCount === 0 || !commitMessage.trim()}
            >
              Commit staged
            </button>
          </div>
        </>
      ) : (
        <div className="commit-detail">
          {commitDetail ? (
            <>
              <div className="commit-header">
                <div>
                  <h3>{commitDetail.subject}</h3>
                  <p>
                    {commitDetail.authorName} • {commitDetail.authorEmail}
                  </p>
                </div>
                <span>{formatDateTime(commitDetail.authoredAt)}</span>
              </div>

              {commitDetail.body ? (
                <pre className="commit-body">{commitDetail.body.trim()}</pre>
              ) : null}

              <pre className="diff-view commit-diff">
                {commitDetail.diff || "Nessuna patch disponibile per questo commit."}
              </pre>
            </>
          ) : (
            <p className="empty-state">
              Seleziona un commit nella history per vedere dettagli e patch.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
