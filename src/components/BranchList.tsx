import { useState } from "react";
import { Cloud, FileDiff, GitBranch, GitMerge, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "../lib/format";
import type { BranchInfo } from "../types";
import type { WorkingTreeStatus } from "../types";

interface BranchListProps {
  branches: BranchInfo[];
  status: WorkingTreeStatus;
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
  status,
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
        className={cn(
          "w-full rounded-xl border border-transparent bg-background/80 p-3 text-left transition-colors hover:border-border hover:bg-secondary",
          branch.isHead && "border-amber-300 bg-amber-50/80",
          dropTarget === branch.name && "border-primary bg-accent/70",
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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <strong className="truncate text-sm font-semibold">{branch.name}</strong>
            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {branch.shortTarget} • {formatRelativeTime(branch.committerDate)}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {branch.isHead ? <Badge variant="accent">Head</Badge> : null}
            {branch.isProtected ? (
              <Badge variant="outline">Core</Badge>
            ) : null}
            {branch.upstream ? (
              <Badge variant="outline">{branch.track || "linked"}</Badge>
            ) : null}
          </div>
        </div>

        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {branch.subject || "Nessun commit recente"}
        </p>
      </button>
    );
  }

  return (
    <aside className="grid min-h-0 gap-4 xl:grid-rows-[auto_minmax(0,1fr)]">
      <Card className="glass-surface border-border/70">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
            Navigator
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2">
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/80 px-3 py-3">
              <div className="flex items-center gap-3">
                <FileDiff className="size-4 text-primary" />
                <span className="text-sm font-medium">Local Changes</span>
              </div>
              <Badge variant={status.clean ? "success" : "warning"}>
                {status.clean ? "clean" : status.stagedCount + status.unstagedCount + status.untrackedCount}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/80 px-3 py-3">
              <div className="flex items-center gap-3">
                <GitMerge className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">All Commits</span>
              </div>
              <Badge variant="outline">{localBranches.length + remoteBranches.length} refs</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-surface flex min-h-0 flex-col border-border/70">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Branches</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Drag & drop tra branch locali per proporre un merge.
              </p>
            </div>
            <Badge variant="outline">{localBranches.length + remoteBranches.length}</Badge>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(event) => onFilterChange(event.currentTarget.value)}
              placeholder="Cerca branch"
              spellCheck={false}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Input
              value={createBranchName}
              onChange={(event) => onCreateBranchNameChange(event.currentTarget.value)}
              placeholder="Nuovo branch"
              spellCheck={false}
              disabled={busy}
            />
            <Button
              type="button"
              onClick={onCreateBranch}
              disabled={busy || !createBranchName.trim()}
            >
              <Plus />
              Crea
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1 pr-3">
            <div className="grid gap-5">
              <section className="grid gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <GitBranch className="size-3.5" />
                    Local
                  </div>
                  <span className="text-xs text-muted-foreground">merge enabled</span>
                </div>
                <div className="grid gap-2">{localBranches.map(renderBranch)}</div>
              </section>

              <section className="grid gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <Cloud className="size-3.5" />
                    Remote
                  </div>
                  <span className="text-xs text-muted-foreground">read only</span>
                </div>
                <div className="grid gap-2">{remoteBranches.map(renderBranch)}</div>
              </section>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </aside>
  );
}
