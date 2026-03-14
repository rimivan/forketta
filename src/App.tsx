import { open } from "@tauri-apps/plugin-dialog";
import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { Badge } from "@/components/ui/badge";
import { useI18n, type TranslationKey, type TranslationPayload } from "@/i18n";
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

type RepositoryAction =
  | "openRepository"
  | "refresh"
  | "checkoutBranch"
  | "createBranch"
  | "commitChanges"
  | "stageFile"
  | "unstageFile"
  | "stageAll"
  | "unstageAll"
  | "mergeBranches"
  | "fetch"
  | "pullWithStash"
  | "push";

const actionTitleKeys: Record<RepositoryAction, TranslationKey> = {
  openRepository: "app.notice.openRepository",
  refresh: "app.notice.refresh",
  checkoutBranch: "app.notice.checkoutBranch",
  createBranch: "app.notice.createBranch",
  commitChanges: "app.notice.commitChanges",
  stageFile: "app.notice.stageFile",
  unstageFile: "app.notice.unstageFile",
  stageAll: "app.notice.stageAll",
  unstageAll: "app.notice.unstageAll",
  mergeBranches: "app.notice.mergeBranches",
  fetch: "app.notice.fetch",
  pullWithStash: "app.notice.pullWithStash",
  push: "app.notice.push",
};

function changeSelectionKey(selection: ChangeSelection): string {
  return `${selection.staged ? "staged" : "worktree"}:${selection.kind}:${selection.path}`;
}

function createSelection(change: FileChange, staged: boolean): ChangeSelection {
  return {
    path: change.path,
    staged,
    kind: change.kind,
  };
}

function isSameSelection(
  left: ChangeSelection | null,
  right: ChangeSelection | null,
): boolean {
  if (!left || !right) {
    return false;
  }

  return changeSelectionKey(left) === changeSelectionKey(right);
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths)];
}

export default function App() {
  const { t } = useI18n();
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
  const [expandedChange, setExpandedChange] = useState<ChangeSelection | null>(
    null,
  );
  const [commitDetail, setCommitDetail] = useState<CommitDetail | null>(null);
  const [fileDiffCache, setFileDiffCache] = useState<Record<string, FileDiff>>(
    {},
  );
  const [fileDiffErrors, setFileDiffErrors] = useState<Record<string, string>>(
    {},
  );
  const [loadingDiffKeys, setLoadingDiffKeys] = useState<Record<string, true>>(
    {},
  );
  const [activeTab, setActiveTab] = useState<"changes" | "commit">("changes");
  const [commitMessage, setCommitMessage] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [createBranchName, setCreateBranchName] = useState("");
  const [mergeState, setMergeState] = useState<MergeState | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [activeAction, setActiveAction] = useState<RepositoryAction | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredBranchFilter = useDeferredValue(branchFilter);
  const diffRequestSession = useRef(0);
  const getUnexpectedDiffErrorMessage = useEffectEvent(() =>
    t("app.error.unexpected"),
  );

  const busy = Boolean(activeAction) || isPending;

  function translatePayload(payload: TranslationPayload): string {
    return t(payload.key, payload.values);
  }

  useEffect(() => {
    void loadEnvironment()
      .then((value) => setEnvironment(value))
      .catch((error) =>
        setNotice({
          tone: "error",
          title: t("app.notice.environment"),
          lines: [toErrorMessage(error, t("app.error.unexpected"))],
        }),
      );
  }, [t]);

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
      setCommitDetail(null);
      return;
    }

    if (!snapshot.commits.some((commit) => commit.oid === selectedCommit)) {
      setSelectedCommit(snapshot.commits[0]?.oid ?? null);
    }
  }, [snapshot, selectedCommit]);

  useEffect(() => {
    diffRequestSession.current += 1;
    setExpandedChange(null);
    setFileDiffCache({});
    setFileDiffErrors({});
    setLoadingDiffKeys({});
  }, [snapshot]);

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
            title: t("app.notice.commitDetail"),
            lines: [toErrorMessage(error, t("app.error.unexpected"))],
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeRepository, selectedCommit, t]);

  useEffect(() => {
    if (!activeRepository || !expandedChange) {
      return;
    }

    const diffKey = changeSelectionKey(expandedChange);
    if (fileDiffCache[diffKey] || loadingDiffKeys[diffKey]) {
      return;
    }

    const session = diffRequestSession.current;
    setLoadingDiffKeys((current) => ({ ...current, [diffKey]: true }));
    setFileDiffErrors((current) => {
      if (!(diffKey in current)) {
        return current;
      }

      const next = { ...current };
      delete next[diffKey];
      return next;
    });

    void readFileDiff(
      activeRepository,
      expandedChange.path,
      expandedChange.staged,
      expandedChange.kind,
    )
      .then((diff) => {
        if (diffRequestSession.current !== session) {
          return;
        }

        setFileDiffCache((current) => ({
          ...current,
          [diffKey]: diff,
        }));
      })
      .catch((error) => {
        if (diffRequestSession.current !== session) {
          return;
        }

        setFileDiffErrors((current) => ({
          ...current,
          [diffKey]: toErrorMessage(error, getUnexpectedDiffErrorMessage()),
        }));
      })
      .finally(() => {
        if (diffRequestSession.current !== session) {
          return;
        }

        setLoadingDiffKeys((current) => {
          if (!(diffKey in current)) {
            return current;
          }

          const next = { ...current };
          delete next[diffKey];
          return next;
        });
      });
  }, [
    activeRepository,
    expandedChange,
    fileDiffCache,
    getUnexpectedDiffErrorMessage,
    loadingDiffKeys,
  ]);

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
        title: t("app.notice.repository"),
        lines: [t("app.message.validRepositoryPath")],
      });
      return;
    }

    setActiveAction("openRepository");
    try {
      await hydrateRepository(request, { remember: true });
      setNotice({
        tone: "info",
        title: t("app.notice.repositoryOpened"),
        lines: [request.path],
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: t("app.notice.openRepository"),
        lines: [toErrorMessage(error, t("app.error.unexpected"))],
      });
    } finally {
      setActiveAction(null);
    }
  }

  async function runRepositoryAction(
    actionName: RepositoryAction,
    operation: (request: RepoRequest) => Promise<OperationResult>,
  ) {
    if (!activeRepository) {
      return;
    }

    const title = t(actionTitleKeys[actionName]);

    setActiveAction(actionName);
    try {
      const result = await operation(activeRepository);
      await hydrateRepository(activeRepository, { remember: false });
      setNotice({
        tone: result.warnings.length > 0 ? "warning" : "info",
        title,
        lines: [
          translatePayload(result.message),
          ...result.warnings.map(translatePayload),
        ],
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title,
        lines: [toErrorMessage(error, t("app.error.unexpected"))],
      });
    } finally {
      setActiveAction(null);
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

    setActiveAction("refresh");
    try {
      await hydrateRepository(activeRepository, { remember: false });
      setNotice({
        tone: "info",
        title: t("app.notice.refresh"),
        lines: [t("app.message.repositorySynced")],
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: t("app.notice.refresh"),
        lines: [toErrorMessage(error, t("app.error.unexpected"))],
      });
    } finally {
      setActiveAction(null);
    }
  }

  async function handleCheckout(branch: string) {
    if (!activeRepository || snapshot?.head.currentBranch === branch) {
      return;
    }

    await runRepositoryAction("checkoutBranch", (request) =>
      checkoutBranch(request, branch),
    );
  }

  async function handleCreateBranch() {
    const branch = createBranchName.trim();
    if (!activeRepository || !branch) {
      return;
    }

    await runRepositoryAction("createBranch", (request) =>
      createBranch(request, branch),
    );
    setCreateBranchName("");
  }

  async function handleCommit() {
    const message = commitMessage.trim();
    if (!activeRepository || !message) {
      return;
    }

    await runRepositoryAction("commitChanges", (request) =>
      commitChanges(request, message),
    );
    setCommitMessage("");
  }

  async function handleToggleStage(change: FileChange, staged: boolean) {
    if (!activeRepository) {
      return;
    }

    await runRepositoryAction(staged ? "stageFile" : "unstageFile", (request) =>
      setStageState(request, [change.path], staged),
    );
  }

  function handleToggleChangeExpansion(change: FileChange, staged: boolean) {
    const nextSelection = createSelection(change, staged);
    setExpandedChange((current) =>
      isSameSelection(current, nextSelection) ? null : nextSelection,
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

    await runRepositoryAction("stageAll", (request) =>
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

    await runRepositoryAction("unstageAll", (request) =>
      setStageState(request, paths, false),
    );
  }

  async function confirmMerge() {
    if (!mergeState) {
      return;
    }

    await runRepositoryAction("mergeBranches", (request) =>
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
  const expandedDiffKey = expandedChange
    ? changeSelectionKey(expandedChange)
    : null;
  const expandedDiff = expandedDiffKey
    ? fileDiffCache[expandedDiffKey] ?? null
    : null;
  const expandedDiffError = expandedDiffKey
    ? fileDiffErrors[expandedDiffKey] ?? null
    : null;
  const expandedDiffLoading = expandedDiffKey
    ? Boolean(loadingDiffKeys[expandedDiffKey])
    : false;

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
        <div className="container relative z-10 flex min-h-screen flex-col gap-3 py-3 lg:h-[100svh] lg:overflow-hidden lg:py-4">
          <Toolbar
            snapshot={snapshot}
            busy={busy}
            onRefresh={() => void handleRefresh()}
            onFetch={() => void runRepositoryAction("fetch", fetchAll)}
            onPull={() => void runRepositoryAction("pullWithStash", pullWithStash)}
            onPush={() => void runRepositoryAction("push", pushCurrentBranch)}
            onSwitchRepository={() => {
              setSnapshot(null);
              setActiveRepository(null);
              setSelectedCommit(null);
              setExpandedChange(null);
              setCommitDetail(null);
              setFileDiffCache({});
              setFileDiffErrors({});
              setLoadingDiffKeys({});
              setActiveTab("changes");
            }}
          />

          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {snapshot.remotes.length === 0 ? (
              <Badge variant="outline">{t("app.status.noRemoteConfigured")}</Badge>
            ) : (
              snapshot.remotes.map((remote) => (
                <Badge key={remote.name} variant="outline">
                  {remote.name} •{" "}
                  {remote.fetchUrl ?? remote.pushUrl ?? t("app.status.notAvailable")}
                </Badge>
              ))
            )}

            {snapshot.status.clean ? (
              <Badge variant="success">{t("app.status.clean")}</Badge>
            ) : (
              <Badge variant="warning">
                {t("app.status.summary", {
                  staged: snapshot.status.stagedCount,
                  unstaged: snapshot.status.unstagedCount,
                  untracked: snapshot.status.untrackedCount,
                })}
              </Badge>
            )}
          </div>

          <main className="grid min-h-0 flex-1 gap-3 lg:overflow-hidden xl:grid-cols-[280px_minmax(0,1fr)]">
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

            <div className="grid min-h-0 gap-3 lg:min-h-0 lg:overflow-hidden xl:grid-rows-[minmax(0,0.38fr)_minmax(0,0.62fr)]">
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
                expandedChange={expandedChange}
                selectedCommitRecord={selectedCommitRecord}
                expandedDiff={expandedDiff}
                expandedDiffError={expandedDiffError}
                expandedDiffLoading={expandedDiffLoading}
                commitDetail={commitDetail}
                commitMessage={commitMessage}
                busy={busy}
                onTabChange={setActiveTab}
                onToggleChangeExpansion={(change, staged) => {
                  handleToggleChangeExpansion(change, staged);
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
          {activeAction ? t(actionTitleKeys[activeAction]) : t("app.busy.working")}
        </div>
      ) : null}
    </div>
  );
}
