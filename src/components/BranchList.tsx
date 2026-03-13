import { useState } from "react";
import { classNames, formatRelativeTime } from "../lib/format";
import type { BranchInfo } from "../types";

interface BranchListProps {
  branches: BranchInfo[];
  filter: string;
  createBranchName: string;
  busy: boolean;
  onFilterChange: (value: string) => void;
  onCreateBranchNameChange: (value: string) => void;
  onCreateBranch: () => void;
  onCheckout: (branch: string) => void;
  onMergeRequest: (sourceBranch: string, targetBranch: string) => void;
}

const dragMime = "application/x-forketta-branch";

export function BranchList({
  branches,
  filter,
  createBranchName,
  busy,
  onFilterChange,
  onCreateBranchNameChange,
  onCreateBranch,
  onCheckout,
  onMergeRequest,
}: BranchListProps) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const localBranches = branches.filter((branch) => !branch.isRemote);
  const remoteBranches = branches.filter((branch) => branch.isRemote);

  function renderBranch(branch: BranchInfo) {
    return (
      <button
        key={branch.fullName}
        className={classNames(
          "branch-item",
          branch.isHead && "branch-item-active",
          dropTarget === branch.name && "branch-item-drop",
        )}
        type="button"
        draggable={!busy && !branch.isRemote}
        onClick={() => {
          if (!branch.isRemote) {
            onCheckout(branch.name);
          }
        }}
        onDragStart={(event) => {
          if (branch.isRemote) {
            return;
          }
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData(dragMime, branch.name);
        }}
        onDragOver={(event) => {
          if (branch.isRemote) {
            return;
          }

          const source = event.dataTransfer.getData(dragMime);
          if (!source || source === branch.name) {
            return;
          }

          event.preventDefault();
          setDropTarget(branch.name);
        }}
        onDragLeave={() => {
          if (dropTarget === branch.name) {
            setDropTarget(null);
          }
        }}
        onDragEnd={() => setDropTarget(null)}
        onDrop={(event) => {
          const source = event.dataTransfer.getData(dragMime);
          setDropTarget(null);
          if (!source || source === branch.name || branch.isRemote) {
            return;
          }

          event.preventDefault();
          onMergeRequest(source, branch.name);
        }}
      >
        <div className="branch-item-top">
          <strong>{branch.name}</strong>
          <div className="branch-badges">
            {branch.isHead ? <span className="branch-badge head">HEAD</span> : null}
            {branch.isProtected ? (
              <span className="branch-badge protected">core</span>
            ) : null}
            {branch.upstream ? (
              <span className="branch-badge subtle">{branch.track || "linked"}</span>
            ) : null}
          </div>
        </div>

        <span className="branch-meta">
          {branch.shortTarget} • {formatRelativeTime(branch.committerDate)}
        </span>
        <span className="branch-subject">{branch.subject || "Nessun commit recente"}</span>
      </button>
    );
  }

  return (
    <aside className="sidebar panel">
      <div className="section-heading">
        <h2>Branches</h2>
        <span>{localBranches.length + remoteBranches.length} refs</span>
      </div>

      <label className="field compact">
        <span>Filtro</span>
        <input
          value={filter}
          onChange={(event) => onFilterChange(event.currentTarget.value)}
          placeholder="Cerca branch"
          spellCheck={false}
        />
      </label>

      <div className="branch-create">
        <input
          value={createBranchName}
          onChange={(event) => onCreateBranchNameChange(event.currentTarget.value)}
          placeholder="Nuovo branch"
          spellCheck={false}
          disabled={busy}
        />
        <button
          type="button"
          className="primary-button"
          onClick={onCreateBranch}
          disabled={busy || !createBranchName.trim()}
        >
          Crea
        </button>
      </div>

      <div className="branch-group">
        <div className="section-heading tight">
          <h3>Local</h3>
          <span>drag & drop merge</span>
        </div>
        <div className="branch-list">{localBranches.map(renderBranch)}</div>
      </div>

      <div className="branch-group">
        <div className="section-heading tight">
          <h3>Remote</h3>
          <span>read only</span>
        </div>
        <div className="branch-list">{remoteBranches.map(renderBranch)}</div>
      </div>
    </aside>
  );
}
