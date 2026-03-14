import {
  ChevronDown,
  FileText,
  GitCommitVertical,
  Layers3,
  LoaderCircle,
  Minus,
  Plus,
  SplitSquareVertical,
} from "lucide-react";
import { useI18n, type TranslationKey } from "@/i18n";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatDateTime } from "../lib/format";
import type {
  ChangeSelection,
  CommitRecord,
  CommitDetail,
  FileChange,
  FileDiff,
  WorkingTreeStatus,
} from "../types";

interface InspectorPanelProps {
  status: WorkingTreeStatus;
  activeTab: "changes" | "commit";
  expandedChange: ChangeSelection | null;
  selectedCommitRecord: CommitRecord | null;
  expandedDiff: FileDiff | null;
  expandedDiffError: string | null;
  expandedDiffLoading: boolean;
  commitDetail: CommitDetail | null;
  commitMessage: string;
  busy: boolean;
  onTabChange: (tab: "changes" | "commit") => void;
  onToggleChangeExpansion: (change: FileChange, staged: boolean) => void;
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
  return (
    !isUntracked(change) &&
    !isConflicted(change) &&
    change.worktreeStatus !== "."
  );
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

function isExpandedChange(
  expandedChange: ChangeSelection | null,
  change: FileChange,
  staged: boolean,
): boolean {
  return (
    expandedChange?.path === change.path &&
    expandedChange.staged === staged &&
    expandedChange.kind === change.kind
  );
}

const changeKindLabelKeys: Record<FileChange["kind"], TranslationKey> = {
  modified: "change.modified",
  added: "change.added",
  deleted: "change.deleted",
  renamed: "change.renamed",
  copied: "change.copied",
  untracked: "change.untracked",
  conflicted: "change.conflicted",
};

interface ChangeSectionProps {
  title: string;
  changes: FileChange[];
  staged: boolean;
  expandedChange: ChangeSelection | null;
  expandedDiff: FileDiff | null;
  expandedDiffError: string | null;
  expandedDiffLoading: boolean;
  busy: boolean;
  onToggleChangeExpansion: (change: FileChange, staged: boolean) => void;
  onToggleStage: (change: FileChange, staged: boolean) => void;
}

function ChangeSection({
  title,
  changes,
  staged,
  expandedChange,
  expandedDiff,
  expandedDiffError,
  expandedDiffLoading,
  busy,
  onToggleChangeExpansion,
  onToggleStage,
}: ChangeSectionProps) {
  const { t } = useI18n();

  if (changes.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </h3>
        <Badge variant="outline">{changes.length}</Badge>
      </div>

      <div className="grid gap-2">
        {changes.map((change) => {
          const expanded = isExpandedChange(expandedChange, change, staged);

          return (
            <div
              key={`${title}-${staged ? "staged" : "worktree"}-${change.path}`}
              className={cn(
                "overflow-hidden rounded-2xl border border-border/70 bg-background/80 transition-colors",
                expanded && "border-amber-300/80 bg-amber-50/70 shadow-sm",
              )}
            >
              <div className="flex items-start gap-2 p-1.5">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-background/70"
                  onClick={() => onToggleChangeExpansion(change, staged)}
                >
                  <ChevronDown
                    className={cn(
                      "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
                      expanded && "rotate-180 text-foreground",
                    )}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <strong className="truncate text-[13px] font-medium">
                        {change.path}
                      </strong>
                      <Badge variant={staged ? "accent" : "outline"}>
                        {t(changeKindLabelKeys[change.kind])}
                      </Badge>
                    </div>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {change.originalPath
                        ? `${t(changeKindLabelKeys[change.kind])} - ${change.originalPath}`
                        : t(changeKindLabelKeys[change.kind])}
                    </span>
                  </div>
                </button>

                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleStage(change, !staged);
                  }}
                  disabled={busy}
                >
                  {staged ? <Minus className="size-4" /> : <Plus className="size-4" />}
                </Button>
              </div>

              {expanded ? (
                <div className="border-t border-border/70 bg-stone-950/[0.04]">
                  {expandedDiffLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                      <LoaderCircle className="size-4 animate-spin" />
                      {t("inspector.diffLoading")}
                    </div>
                  ) : expandedDiffError ? (
                    <div className="grid gap-1 px-3 py-2.5 text-sm">
                      <span className="font-medium text-foreground">
                        {t("inspector.diffError")}
                      </span>
                      <span className="text-muted-foreground">
                        {expandedDiffError}
                      </span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <pre className="p-3 text-[11px] leading-4 text-foreground/90">
                        {expandedDiff?.diff.trim() ? expandedDiff.diff : t("inspector.noDiff")}
                      </pre>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function InspectorPanel({
  status,
  activeTab,
  expandedChange,
  selectedCommitRecord,
  expandedDiff,
  expandedDiffError,
  expandedDiffLoading,
  commitDetail,
  commitMessage,
  busy,
  onTabChange,
  onToggleChangeExpansion,
  onToggleStage,
  onStageAll,
  onUnstageAll,
  onCommitMessageChange,
  onCommit,
}: InspectorPanelProps) {
  const { locale, t } = useI18n();
  const stagedChanges = sectionChanges(status.changes, "staged");
  const unstagedChanges = sectionChanges(status.changes, "unstaged");
  const untrackedChanges = sectionChanges(status.changes, "untracked");
  const conflictedChanges = sectionChanges(status.changes, "conflicted");
  const hasAnyChanges = status.changes.length > 0;

  return (
    <Card className="glass-surface flex min-h-0 flex-col overflow-hidden border-border/70">
      <CardHeader className="border-b border-border/70 pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{t("inspector.title")}</CardTitle>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {t("inspector.description")}
            </p>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={(value) => onTabChange(value as "changes" | "commit")}
          >
            <TabsList>
              <TabsTrigger value="changes">
                <Layers3 className="mr-2 size-4" />
                {t("inspector.changes")}
              </TabsTrigger>
              <TabsTrigger value="commit">
                <GitCommitVertical className="mr-2 size-4" />
                {t("inspector.commit")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 pt-4">
        <Tabs
          value={activeTab}
          onValueChange={(value) => onTabChange(value as "changes" | "commit")}
          className="flex h-full min-h-0 flex-col"
        >
          <TabsContent value="changes" className="mt-0 flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                {[
                  [t("inspector.staged"), status.stagedCount],
                  [t("inspector.unstaged"), status.unstagedCount],
                  [t("inspector.untracked"), status.untrackedCount],
                  [t("inspector.conflicts"), status.conflictedCount],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5"
                  >
                    <div className="text-base font-semibold leading-none">{value}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
                <Card className="flex min-h-0 flex-1 flex-col border-border/70 bg-background/70 shadow-none">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle className="text-sm">{t("inspector.workingTree")}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onStageAll}
                          disabled={busy}
                        >
                          {t("inspector.stageAll")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onUnstageAll}
                          disabled={busy}
                        >
                          {t("inspector.unstageAll")}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="min-h-0 flex-1 pt-0">
                    <ScrollArea className="h-full pr-3">
                      <div className="grid gap-3 pb-1">
                        {!hasAnyChanges ? (
                          <div className="rounded-xl border border-dashed border-border bg-background/70 p-3 text-sm text-muted-foreground">
                            {t("app.status.clean")}
                          </div>
                        ) : null}

                        <ChangeSection
                          title={t("inspector.conflicts")}
                          changes={conflictedChanges}
                          staged={false}
                          expandedChange={expandedChange}
                          expandedDiff={expandedDiff}
                          expandedDiffError={expandedDiffError}
                          expandedDiffLoading={expandedDiffLoading}
                          busy={busy}
                          onToggleChangeExpansion={onToggleChangeExpansion}
                          onToggleStage={onToggleStage}
                        />
                        <ChangeSection
                          title={t("inspector.staged")}
                          changes={stagedChanges}
                          staged={true}
                          expandedChange={expandedChange}
                          expandedDiff={expandedDiff}
                          expandedDiffError={expandedDiffError}
                          expandedDiffLoading={expandedDiffLoading}
                          busy={busy}
                          onToggleChangeExpansion={onToggleChangeExpansion}
                          onToggleStage={onToggleStage}
                        />
                        <ChangeSection
                          title={t("inspector.workingTree")}
                          changes={unstagedChanges}
                          staged={false}
                          expandedChange={expandedChange}
                          expandedDiff={expandedDiff}
                          expandedDiffError={expandedDiffError}
                          expandedDiffLoading={expandedDiffLoading}
                          busy={busy}
                          onToggleChangeExpansion={onToggleChangeExpansion}
                          onToggleStage={onToggleStage}
                        />
                        <ChangeSection
                          title={t("inspector.untracked")}
                          changes={untrackedChanges}
                          staged={false}
                          expandedChange={expandedChange}
                          expandedDiff={expandedDiff}
                          expandedDiffError={expandedDiffError}
                          expandedDiffLoading={expandedDiffLoading}
                          busy={busy}
                          onToggleChangeExpansion={onToggleChangeExpansion}
                          onToggleStage={onToggleStage}
                        />
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-background/70 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      {t("inspector.commitStagedChanges")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 pt-0">
                    <Textarea
                      value={commitMessage}
                      onChange={(event) => onCommitMessageChange(event.currentTarget.value)}
                      placeholder={t("inspector.commitMessagePlaceholder")}
                      spellCheck={false}
                      className="min-h-[96px]"
                    />
                    <Button
                      type="button"
                      onClick={onCommit}
                      disabled={busy || status.stagedCount === 0 || !commitMessage.trim()}
                    >
                      <GitCommitVertical />
                      {t("inspector.commitStaged")}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="commit" className="mt-0 flex min-h-0 flex-1 flex-col">
            {commitDetail && selectedCommitRecord ? (
              <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[260px_minmax(0,1fr)]">
                <Card className="min-h-0 border-border/70 bg-background/70 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{t("inspector.metadata")}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 overflow-auto pt-0">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {commitDetail.authorName
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part.charAt(0).toUpperCase())
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {commitDetail.authorName}
                        </div>
                        <div className="truncate text-sm text-muted-foreground">
                          {commitDetail.authorEmail}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {t("inspector.date")}
                        </div>
                        <div>{formatDateTime(commitDetail.authoredAt, locale)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {t("inspector.sha")}
                        </div>
                        <div className="font-mono text-xs">{selectedCommitRecord.oid}</div>
                      </div>
                    </div>

                    {selectedCommitRecord.refs.length > 0 ? (
                      <>
                        <Separator />
                        <div className="grid gap-2">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            {t("inspector.refs")}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedCommitRecord.refs.map((reference) => (
                              <Badge key={reference} variant="outline">
                                {reference}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="flex min-h-0 flex-col border-border/70 bg-background/70 shadow-none">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{commitDetail.subject}</CardTitle>
                        <p className="mt-0.5 text-[13px] text-muted-foreground">
                          {t("inspector.commitDescription")}
                        </p>
                      </div>
                      <Badge variant="outline">
                        <SplitSquareVertical className="mr-1 size-3.5" />
                        {selectedCommitRecord.shortOid}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="min-h-0 flex-1 pt-0">
                    <div className="grid h-full gap-3">
                      {commitDetail.body ? (
                        <div className="rounded-xl border border-border/70 bg-card p-3">
                          <div className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            {t("inspector.message")}
                          </div>
                          <pre className="whitespace-pre-wrap text-[13px] leading-5 text-foreground">
                            {commitDetail.body.trim()}
                          </pre>
                        </div>
                      ) : null}

                      {commitDetail.files.length > 0 ? (
                        <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                          <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            {t("inspector.filesChanged")}
                          </div>
                          <ScrollArea className="max-h-32 pr-2">
                            <div className="grid gap-1.5 md:grid-cols-2">
                              {commitDetail.files.map((file) => (
                                <div
                                  key={`${file.kind}:${file.originalPath ?? ""}:${file.path}`}
                                  className="rounded-lg border border-border/60 bg-background/80 px-2.5 py-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                      {t(changeKindLabelKeys[file.kind])}
                                    </Badge>
                                    <span className="truncate text-[13px] font-medium">
                                      {file.path}
                                    </span>
                                  </div>
                                  {file.originalPath ? (
                                    <div className="mt-1 truncate text-[11px] text-muted-foreground">
                                      {file.originalPath}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-border bg-card/50 p-3 text-sm text-muted-foreground">
                          {t("inspector.noFilesChanged")}
                        </div>
                      )}

                      <div className="min-h-0 flex flex-1 flex-col rounded-xl border border-border/70 bg-stone-950/[0.03]">
                        <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          <FileText className="size-3.5" />
                          {t("inspector.patch")}
                        </div>
                        <ScrollArea className="min-h-0 flex-1">
                          <pre className="p-3 text-[11px] leading-4 text-foreground/90">
                            {commitDetail.diff || t("inspector.noPatch")}
                          </pre>
                        </ScrollArea>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-background/70 p-6 text-sm text-muted-foreground">
                {t("inspector.selectCommit")}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
