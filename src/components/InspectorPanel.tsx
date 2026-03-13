import { FileText, GitCommitVertical, Layers3, Plus, SplitSquareVertical } from "lucide-react";
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
  selectedChange: ChangeSelection | null;
  selectedCommitRecord: CommitRecord | null;
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
  const { t } = useI18n();

  if (changes.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </h3>
        <Badge variant="outline">{changes.length}</Badge>
      </div>

      <div className="grid gap-2">
        {changes.map((change) => {
          const active =
            selectedChange?.path === change.path && selectedChange.staged === staged;

          return (
            <div
              key={`${title}-${change.path}`}
              className={cn(
                "flex items-center gap-2 rounded-xl border border-transparent bg-background/80 p-2 transition-colors hover:bg-secondary",
                active && "border-amber-300 bg-amber-50/80",
              )}
            >
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelectChange(change, staged)}>
                <strong className="block truncate text-sm font-medium">{change.path}</strong>
                <span className="block text-xs text-muted-foreground">
                  {t(changeKindLabelKeys[change.kind])}
                  {change.originalPath ? ` • ${change.originalPath}` : ""}
                </span>
              </button>

              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => onToggleStage(change, !staged)}
                disabled={busy}
              >
                {staged ? "−" : <Plus className="size-4" />}
              </Button>
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
  selectedCommitRecord,
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
  const { locale, t } = useI18n();
  const stagedChanges = sectionChanges(status.changes, "staged");
  const unstagedChanges = sectionChanges(status.changes, "unstaged");
  const untrackedChanges = sectionChanges(status.changes, "untracked");
  const conflictedChanges = sectionChanges(status.changes, "conflicted");

  return (
    <Card className="glass-surface flex min-h-[320px] flex-col overflow-hidden border-border/70">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{t("inspector.title")}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("inspector.description")}
            </p>
          </div>
          <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as "changes" | "commit")}>
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

      <CardContent className="min-h-0 flex-1 pt-5">
        <Tabs
          value={activeTab}
          onValueChange={(value) => onTabChange(value as "changes" | "commit")}
          className="flex h-full flex-col"
        >
          <TabsContent value="changes" className="mt-0 h-full">
            <div className="grid h-full gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
              <div className="grid min-h-0 gap-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    [t("inspector.staged"), status.stagedCount],
                    [t("inspector.unstaged"), status.unstagedCount],
                    [t("inspector.untracked"), status.untrackedCount],
                    [t("inspector.conflicts"), status.conflictedCount],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-border/70 bg-background/80 px-3 py-3"
                    >
                      <div className="text-lg font-semibold">{value}</div>
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                <Card className="flex min-h-0 flex-col border-border/70 bg-background/70 shadow-none">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm">{t("inspector.workingTree")}</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onStageAll} disabled={busy}>
                          {t("inspector.stageAll")}
                        </Button>
                        <Button variant="outline" size="sm" onClick={onUnstageAll} disabled={busy}>
                          {t("inspector.unstageAll")}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="min-h-0 flex-1 pt-0">
                    <ScrollArea className="h-[360px] pr-3 xl:h-full">
                      <div className="grid gap-4">
                        <ChangeSection
                          title={t("inspector.conflicts")}
                          changes={conflictedChanges}
                          staged={false}
                          selectedChange={selectedChange}
                          busy={busy}
                          onSelectChange={onSelectChange}
                          onToggleStage={onToggleStage}
                        />
                        <ChangeSection
                          title={t("inspector.staged")}
                          changes={stagedChanges}
                          staged={true}
                          selectedChange={selectedChange}
                          busy={busy}
                          onSelectChange={onSelectChange}
                          onToggleStage={onToggleStage}
                        />
                        <ChangeSection
                          title={t("inspector.workingTree")}
                          changes={unstagedChanges}
                          staged={false}
                          selectedChange={selectedChange}
                          busy={busy}
                          onSelectChange={onSelectChange}
                          onToggleStage={onToggleStage}
                        />
                        <ChangeSection
                          title={t("inspector.untracked")}
                          changes={untrackedChanges}
                          staged={false}
                          selectedChange={selectedChange}
                          busy={busy}
                          onSelectChange={onSelectChange}
                          onToggleStage={onToggleStage}
                        />
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-background/70 shadow-none">
                  <CardHeader className="pb-4">
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

              <Card className="flex min-h-0 flex-col border-border/70 bg-background/70 shadow-none">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm">{t("inspector.diff")}</CardTitle>
                    <Badge variant="outline">
                      {selectedChange
                        ? t("inspector.selectedArea", {
                            area: t(
                              selectedChange.staged
                                ? "inspector.stagedArea"
                                : "inspector.workingTreeArea",
                            ),
                            path: selectedChange.path,
                          })
                        : t("inspector.selectFile")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 pt-0">
                  <ScrollArea className="h-[420px] rounded-xl border border-border/70 bg-stone-950/[0.03] xl:h-full">
                    <pre className="p-4 text-[12px] leading-5 text-foreground/90">
                      {fileDiff?.diff || t("inspector.noDiff")}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="commit" className="mt-0 h-full">
            {commitDetail && selectedCommitRecord ? (
              <div className="grid h-full gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                <Card className="border-border/70 bg-background/70 shadow-none">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm">{t("inspector.metadata")}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 pt-0">
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
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {t("inspector.date")}
                        </div>
                        <div>{formatDateTime(commitDetail.authoredAt, locale)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {t("inspector.sha")}
                        </div>
                        <div className="font-mono text-xs">{selectedCommitRecord.oid}</div>
                      </div>
                    </div>

                    {selectedCommitRecord.refs.length > 0 ? (
                      <>
                        <Separator />
                        <div className="grid gap-2">
                          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
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
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{commitDetail.subject}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
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
                    <div className="grid h-full gap-4">
                      {commitDetail.body ? (
                        <div className="rounded-xl border border-border/70 bg-card p-4">
                          <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            {t("inspector.message")}
                          </div>
                          <pre className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                            {commitDetail.body.trim()}
                          </pre>
                        </div>
                      ) : null}

                      <div className="min-h-0 flex-1 rounded-xl border border-border/70 bg-stone-950/[0.03]">
                        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          <FileText className="size-3.5" />
                          {t("inspector.patch")}
                        </div>
                        <ScrollArea className="h-[420px] xl:h-[calc(100%-44px)]">
                          <pre className="p-4 text-[12px] leading-5 text-foreground/90">
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
