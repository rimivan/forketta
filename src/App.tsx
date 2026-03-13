import { open } from "@tauri-apps/plugin-dialog";
import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BranchList } from "./components/BranchList";
import { HistoryList } from "./components/HistoryList";
import { InspectorPanel } from "./components/InspectorPanel";
import { MergeDialog } from "./components/MergeDialog";
import { OpenRepositoryPane } from "./components/OpenRepositoryPane";
import { Toolbar } from "./components/Toolbar";
import {
  checkoutBranch,
  commitChanges,
  createBranch,
  fetchAll,
  loadEnvironment,
  mergeBranches,
  openRepository,
  pullWithStash,
  pushCurrentBranch,
  readCommitDetail,
  readFileDiff,
  setStageState,
} from "./lib/api";
import { shouldSuggestWslDistro } from "./lib/path";
import {
  loadRecentRepositories,
  persistRecentRepositories,
  upsertRecentRepository,
  type SavedRepository,
} from "./lib/storage";
import type {
  ChangeSelection,
  CommitDetail,
  EnvironmentInfo,
  FileChange,
  FileDiff,
  OperationResult,
  RepoRequest,
  RepositorySnapshot,
  WorkingTreeStatus,
} from "./types";

interface NoticeState {
  tone: "info" | "warning" | "error";
  title: string;
  lines: string[];
}

interface MergeState {
  sourceBranch: string;
  targetBranch: string;
}

function isChangeStaged(change: FileChange): boolean {
  return change.indexStatus !== ".";
}

function isChangeUntracked(change: FileChange): boolean {
  return change.kind === "untracked";
}

function isChangeConflicted(change: FileChange): boolean {
  return change.kind === "conflicted";
}

function isChangeVisibleInWorkingTree(change: FileChange): boolean {
  return (
    !isChangeUntracked(change) &&
    !isChangeConflicted(change) &&
    change.worktreeStatus !== "."
  );
}

function supportsSelection(change: FileChange, staged: boolean): boolean {
  return staged ? isChangeStaged(change) : isChangeVisibleInWorkingTree(change) || isChangeUntracked(change) || isChangeConflicted(change);
}

function defaultSelection(status: WorkingTreeStatus): ChangeSelection | null {
  const staged = status.changes.find((change) => supportsSelection(change, true));
  if (staged) {
    return { path: staged.path, staged: true, kind: staged.kind };
  }

  const workingTree = status.changes.find((change) =>
    supportsSelection(change, false),
  );
  if (workingTree) {
    return {
      path: workingTree.path,
      staged: false,
      kind: workingTree.kind,
    };
  }

  return null;
}

function selectionStillValid(
  status: WorkingTreeStatus,
  selection: ChangeSelection | null,
): boolean {
  if (!selection) {
    return false;
  }

  return status.changes.some(
    (change) =>
      change.path === selection.path &&
      supportsSelection(change, selection.staged),
  );
}

function toErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Si è verificato un errore inatteso.";
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths)];
}

export default function App() {
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null);
  const [inputPath, setInputPath] = useState("");
  const [selectedDistro, setSelectedDistro] = useState("");
  const [recentRepositories, setRecentRepositories] = useState<SavedRepository[]>(
    () => loadRecentRepositories(),
  );
  const [activeRepository, setActiveRepository] = useState<RepoRequest | null>(
    null,
  );
  const [snapshot, setSnapshot] = useState<RepositorySnapshot | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [selectedChange, setSelectedChange] = useState<ChangeSelection | null>(
    null,
  );
  const [commitDetail, setCommitDetail] = useState<CommitDetail | null>(null);
  const [fileDiff, setFileDiff] = useState<FileDiff | null>(null);
  const [activeTab, setActiveTab] = useState<"changes" | "commit">("changes");
  const [commitMessage, setCommitMessage] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [createBranchName, setCreateBranchName] = useState("");
  const [mergeState, setMergeState] = useState<MergeState | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [actionLabel, setActionLabel] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredBranchFilter = useDeferredValue(branchFilter);

  const busy = Boolean(actionLabel) || isPending;

  useEffect(() => {
    void loadEnvironment()
      .then((value) => setEnvironment(value))
      .catch((error) =>
        setNotice({
          tone: "error",
          title: "Environment",
          lines: [toErrorMessage(error)],
        }),
      );
  }, []);

  useEffect(() => {
    if (!notice || notice.tone === "error") {
      return;
    }

    const timeout = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!snapshot) {
      setSelectedCommit(null);
      setSelectedChange(null);
      setCommitDetail(null);
      setFileDiff(null);
      return;
    }

    if (!snapshot.commits.some((commit) => commit.oid === selectedCommit)) {
      setSelectedCommit(snapshot.commits[0]?.oid ?? null);
    }

    if (!selectionStillValid(snapshot.status, selectedChange)) {
      setSelectedChange(defaultSelection(snapshot.status));
    } else if (selectedChange) {
      const nextChange = snapshot.status.changes.find(
        (change) => change.path === selectedChange.path,
      );
      if (nextChange && nextChange.kind !== selectedChange.kind) {
        setSelectedChange({
          path: nextChange.path,
          staged: selectedChange.staged,
          kind: nextChange.kind,
        });
      }
    }
  }, [snapshot, selectedCommit, selectedChange]);

  useEffect(() => {
    if (!activeRepository || !selectedCommit) {
      setCommitDetail(null);
      return;
    }

    let cancelled = false;
    void readCommitDetail(activeRepository, selectedCommit)
      .then((detail) => {
        if (!cancelled) {
          setCommitDetail(detail);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setNotice({
            tone: "error",
            title: "Commit detail",
            lines: [toErrorMessage(error)],
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeRepository, selectedCommit]);

  useEffect(() => {
    if (!activeRepository || !selectedChange) {
      setFileDiff(null);
      return;
    }

    let cancelled = false;
    void readFileDiff(
      activeRepository,
      selectedChange.path,
      selectedChange.staged,
      selectedChange.kind,
    )
      .then((diff) => {
        if (!cancelled) {
          setFileDiff(diff);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setNotice({
            tone: "error",
            title: "File diff",
            lines: [toErrorMessage(error)],
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeRepository, selectedChange]);

  async function hydrateRepository(
    request: RepoRequest,
    options: { remember: boolean },
  ) {
    const nextSnapshot = await openRepository(request);

    startTransition(() => {
      setSnapshot(nextSnapshot);
      setActiveRepository(request);
      setCommitMessage("");
      setInputPath(request.path);
      setSelectedDistro(request.wslDistro ?? "");
    });

    if (options.remember) {
      const updatedRecents = upsertRecentRepository(recentRepositories, {
        label: nextSnapshot.repository.name,
        path: request.path,
        wslDistro: request.wslDistro,
        lastOpenedAt: new Date().toISOString(),
      });
      setRecentRepositories(updatedRecents);
      persistRecentRepositories(updatedRecents);
    }
  }

  function resolveRequest(input: RepoRequest): RepoRequest {
    const trimmedPath = input.path.trim();
    const distro =
      input.wslDistro ||
      (shouldSuggestWslDistro(trimmedPath) &&
      environment?.wslDistros.length === 1
        ? environment.wslDistros[0]
        : null);

    return {
      path: trimmedPath,
      wslDistro: distro,
    };
  }

  async function handleOpen(requestOverride?: RepoRequest) {
    const candidate = requestOverride ?? {
      path: inputPath,
      wslDistro: selectedDistro || null,
    };
    const request = resolveRequest(candidate);

    if (!request.path) {
      setNotice({
        tone: "warning",
        title: "Repository",
        lines: ["Inserisci un percorso repository valido."],
      });
      return;
    }

    setActionLabel("Apri repository");
    try {
      await hydrateRepository(request, { remember: true });
      setNotice({
        tone: "info",
        title: "Repository aperto",
        lines: [request.path],
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Open repository",
        lines: [toErrorMessage(error)],
      });
    } finally {
      setActionLabel(null);
    }
  }

  async function runRepositoryAction(
    label: string,
    action: (request: RepoRequest) => Promise<OperationResult>,
  ) {
    if (!activeRepository) {
      return;
    }

    setActionLabel(label);
    try {
      const result = await action(activeRepository);
      await hydrateRepository(activeRepository, { remember: false });
      setNotice({
        tone: result.warnings.length > 0 ? "warning" : "info",
        title: label,
        lines: [result.message, ...result.warnings],
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: label,
        lines: [toErrorMessage(error)],
      });
    } finally {
      setActionLabel(null);
    }
  }

  async function handlePickFolder() {
    const result = await open({
      directory: true,
      multiple: false,
    });

    if (typeof result === "string") {
      setInputPath(result);
    }
  }

  async function handleRefresh() {
    if (!activeRepository) {
      return;
    }

    setActionLabel("Refresh");
    try {
      await hydrateRepository(activeRepository, { remember: false });
      setNotice({
        tone: "info",
        title: "Refresh",
        lines: ["Repository sincronizzato con lo stato locale."],
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Refresh",
        lines: [toErrorMessage(error)],
      });
    } finally {
      setActionLabel(null);
    }
  }

  async function handleCheckout(branch: string) {
    if (!activeRepository || snapshot?.head.currentBranch === branch) {
      return;
    }

    await runRepositoryAction("Checkout branch", (request) =>
      checkoutBranch(request, branch),
    );
  }

  async function handleCreateBranch() {
    const branch = createBranchName.trim();
    if (!activeRepository || !branch) {
      return;
    }

    await runRepositoryAction("Create branch", (request) =>
      createBranch(request, branch),
    );
    setCreateBranchName("");
  }

  async function handleCommit() {
    const message = commitMessage.trim();
    if (!activeRepository || !message) {
      return;
    }

    await runRepositoryAction("Commit changes", (request) =>
      commitChanges(request, message),
    );
    setCommitMessage("");
  }

  async function handleToggleStage(change: FileChange, staged: boolean) {
    if (!activeRepository) {
      return;
    }

    await runRepositoryAction(staged ? "Stage file" : "Unstage file", (request) =>
      setStageState(request, [change.path], staged),
    );
  }

  async function handleStageAll() {
    if (!activeRepository || !snapshot) {
      return;
    }

    const paths = uniquePaths(
      snapshot.status.changes
        .filter(
          (change) =>
            change.worktreeStatus !== "." ||
            change.kind === "untracked" ||
            change.kind === "conflicted",
        )
        .map((change) => change.path),
    );

    if (paths.length === 0) {
      return;
    }

    await runRepositoryAction("Stage all", (request) =>
      setStageState(request, paths, true),
    );
  }

  async function handleUnstageAll() {
    if (!activeRepository || !snapshot) {
      return;
    }

    const paths = uniquePaths(
      snapshot.status.changes
        .filter((change) => change.indexStatus !== ".")
        .map((change) => change.path),
    );

    if (paths.length === 0) {
      return;
    }

    await runRepositoryAction("Unstage all", (request) =>
      setStageState(request, paths, false),
    );
  }

  async function confirmMerge() {
    if (!mergeState) {
      return;
    }

    await runRepositoryAction("Merge branches", (request) =>
      mergeBranches(request, mergeState.sourceBranch, mergeState.targetBranch),
    );
    setMergeState(null);
  }

  const filteredBranches = snapshot
    ? snapshot.branches.filter((branch) => {
        const query = deferredBranchFilter.trim().toLowerCase();
        if (!query) {
          return true;
        }

        return (
          branch.name.toLowerCase().includes(query) ||
          branch.subject.toLowerCase().includes(query)
        );
      })
    : [];
  const selectedCommitRecord = snapshot?.commits.find(
    (commit) => commit.oid === selectedCommit,
  ) ?? null;

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.35),transparent_32%)]" />

      {notice ? (
        <div
          className={cn(
            "fixed right-4 top-4 z-50 grid min-w-[280px] max-w-[min(520px,calc(100vw-2rem))] gap-1 rounded-xl border px-4 py-3 shadow-panel",
            notice.tone === "info" && "border-border bg-card",
            notice.tone === "warning" && "border-orange-200 bg-orange-50",
            notice.tone === "error" && "border-red-200 bg-red-50",
          )}
        >
          <strong className="text-sm font-semibold">{notice.title}</strong>
          {notice.lines.map((line) => (
            <span key={`${notice.title}-${line}`} className="text-sm text-muted-foreground">
              {line}
            </span>
          ))}
        </div>
      ) : null}

      {!snapshot ? (
        <OpenRepositoryPane
          environment={environment}
          path={inputPath}
          selectedDistro={selectedDistro}
          recentRepositories={recentRepositories}
          busy={busy}
          onPathChange={setInputPath}
          onDistroChange={setSelectedDistro}
          onPickFolder={handlePickFolder}
          onOpen={() => void handleOpen()}
          onOpenRecent={(entry) => {
            setInputPath(entry.path);
            setSelectedDistro(entry.wslDistro ?? "");
            void handleOpen(entry);
          }}
        />
      ) : (
        <div className="container relative z-10 flex min-h-screen flex-col gap-4 py-4 lg:py-6">
          <Toolbar
            snapshot={snapshot}
            busy={busy}
            onRefresh={() => void handleRefresh()}
            onFetch={() => void runRepositoryAction("Fetch", fetchAll)}
            onPull={() => void runRepositoryAction("Pull + stash", pullWithStash)}
            onPush={() => void runRepositoryAction("Push", pushCurrentBranch)}
            onSwitchRepository={() => {
              setSnapshot(null);
              setActiveRepository(null);
              setSelectedCommit(null);
              setSelectedChange(null);
              setCommitDetail(null);
              setFileDiff(null);
              setActiveTab("changes");
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            {snapshot.remotes.length === 0 ? (
              <Badge variant="outline">Nessun remote configurato</Badge>
            ) : (
              snapshot.remotes.map((remote) => (
                <Badge key={remote.name} variant="outline">
                  {remote.name} • {remote.fetchUrl ?? remote.pushUrl ?? "n/a"}
                </Badge>
              ))
            )}

            {snapshot.status.clean ? (
              <Badge variant="success">working tree clean</Badge>
            ) : (
              <Badge variant="warning">
                {snapshot.status.stagedCount} staged • {snapshot.status.unstagedCount} unstaged •{" "}
                {snapshot.status.untrackedCount} untracked
              </Badge>
            )}
          </div>

          <main className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <BranchList
              branches={filteredBranches}
              status={snapshot.status}
              filter={branchFilter}
              createBranchName={createBranchName}
              busy={busy}
              onFilterChange={setBranchFilter}
              onCreateBranchNameChange={setCreateBranchName}
              onCreateBranch={() => void handleCreateBranch()}
              onCheckout={(branch) => void handleCheckout(branch)}
              onMergeRequest={(sourceBranch, targetBranch) =>
                setMergeState({ sourceBranch, targetBranch })
              }
            />

            <div className="grid min-h-0 gap-4 xl:grid-rows-[minmax(360px,1fr)_minmax(320px,0.9fr)]">
              <HistoryList
                commits={snapshot.commits}
                selectedCommit={selectedCommit}
                onSelectCommit={(oid) => {
                  setSelectedCommit(oid);
                  setActiveTab("commit");
                }}
              />

              <InspectorPanel
                status={snapshot.status}
                activeTab={activeTab}
                selectedChange={selectedChange}
                selectedCommitRecord={selectedCommitRecord}
                fileDiff={fileDiff}
                commitDetail={commitDetail}
                commitMessage={commitMessage}
                busy={busy}
                onTabChange={setActiveTab}
                onSelectChange={(change, staged) => {
                  setSelectedChange({
                    path: change.path,
                    staged,
                    kind: change.kind,
                  });
                  setActiveTab("changes");
                }}
                onToggleStage={(change, staged) =>
                  void handleToggleStage(change, staged)
                }
                onStageAll={() => void handleStageAll()}
                onUnstageAll={() => void handleUnstageAll()}
                onCommitMessageChange={setCommitMessage}
                onCommit={() => void handleCommit()}
              />
            </div>
          </main>
        </div>
      )}

      {mergeState ? (
        <MergeDialog
          sourceBranch={mergeState.sourceBranch}
          targetBranch={mergeState.targetBranch}
          busy={busy}
          onCancel={() => setMergeState(null)}
          onConfirm={() => void confirmMerge()}
        />
      ) : null}

      {busy ? (
        <div className="fixed bottom-4 right-4 z-40 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-panel">
          {actionLabel ?? "Working..."}
        </div>
      ) : null}
    </div>
  );
}
