import { Gitgraph, TemplateName, templateExtend } from "@gitgraph/react";
import type { GitgraphUserApi } from "@gitgraph/core";
import { Clock3, GitCommitHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n, type Locale } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "../lib/format";
import type { CommitRecord } from "../types";

interface HistoryListProps {
  commits: CommitRecord[];
  selectedCommit: string | null;
  onSelectCommit: (oid: string) => void;
}

const rowHeight = 34;
const graphTemplate = templateExtend(TemplateName.Metro, {
  colors: ["#f59e0b", "#94a3b8", "#84cc16", "#38bdf8", "#d6d3d1"],
  branch: {
    spacing: 16,
    lineWidth: 2,
    label: {
      display: false,
    },
  },
  commit: {
    spacing: rowHeight,
    dot: {
      size: 3,
      strokeColor: "#f8f6f1",
      strokeWidth: 1,
      font: '600 9px "Avenir Next"',
    },
    message: {
      display: true,
      displayAuthor: false,
      displayHash: false,
      color: "#27211a",
      font: '500 11px "Avenir Next"',
    },
  },
});

function refTone(reference: string): "head" | "remote" | "tag" | "local" {
  if (reference.startsWith("HEAD")) {
    return "head";
  }
  if (reference.startsWith("tag:")) {
    return "tag";
  }
  if (reference.includes("/")) {
    return "remote";
  }
  return "local";
}

function firstInterestingRef(commit: CommitRecord): string | null {
  return (
    commit.refs.find((reference) => !reference.startsWith("HEAD")) ??
    commit.refs[0] ??
    null
  );
}

function sanitizeBranchSeed(value: string): string {
  const normalized = value
    .replace(/^tag:\s*/i, "")
    .replace(/[^\w/-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "branch";
}

function ensureBranchName(seed: string, used: Set<string>): string {
  let candidate = sanitizeBranchSeed(seed);
  let suffix = 1;
  while (used.has(candidate)) {
    suffix += 1;
    candidate = `${sanitizeBranchSeed(seed)}-${suffix}`;
  }
  used.add(candidate);
  return candidate;
}

function createPrimaryChildMap(commits: CommitRecord[]): Map<string, string> {
  const children = new Map<string, Array<{ oid: string; index: number }>>();

  commits.forEach((commit, index) => {
    commit.parents.forEach((parent) => {
      const list = children.get(parent) ?? [];
      list.push({ oid: commit.oid, index });
      children.set(parent, list);
    });
  });

  return new Map(
    [...children.entries()].map(([parent, values]) => {
      values.sort((left, right) => left.index - right.index);
      return [parent, values[0]?.oid ?? ""];
    }),
  );
}

function renderRefBadge(reference: string) {
  const tone = refTone(reference);
  const variant =
    tone === "head"
      ? "accent"
      : tone === "tag"
        ? "warning"
        : tone === "remote"
          ? "outline"
          : "default";

  return (
    <Badge key={reference} variant={variant}>
      {reference}
    </Badge>
  );
}

function renderCommitMessage(
  commit: CommitRecord,
  active: boolean,
  messageWidth: number,
  locale: Locale,
  onSelectCommit: (oid: string) => void,
) {
  return (
    <foreignObject
      x={0}
      y={-rowHeight / 2}
      width={messageWidth}
      height={rowHeight}
    >
      <div className="h-full">
        <button
          type="button"
          onClick={() => onSelectCommit(commit.oid)}
          className={cn(
            "flex h-[30px] w-full items-center gap-2 rounded-lg border border-transparent px-2 text-left transition-colors",
            active
              ? "border-amber-300 bg-amber-50 shadow-sm"
              : "hover:border-border hover:bg-secondary/70",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              {commit.refs.length > 0 ? (
                <div className="hidden shrink-0 gap-1 xl:flex">{commit.refs.map(renderRefBadge)}</div>
              ) : null}
              <span className="truncate text-[13px] font-semibold text-foreground">
                {commit.subject}
              </span>
            </div>
            {commit.refs.length > 0 ? (
              <div className="mt-1 flex gap-1 xl:hidden">{commit.refs.slice(0, 2).map(renderRefBadge)}</div>
            ) : null}
          </div>
          <div className="hidden min-w-[104px] text-[12px] text-muted-foreground md:block">
            {commit.authorName}
          </div>
          <div className="hidden min-w-[68px] font-mono text-[11px] text-muted-foreground lg:block">
            {commit.shortOid}
          </div>
          <div className="hidden min-w-[92px] text-right text-[12px] text-muted-foreground lg:block">
            {formatRelativeTime(commit.authoredAt, locale)}
          </div>
        </button>
      </div>
    </foreignObject>
  );
}

function buildGraph(
  gitgraph: GitgraphUserApi<React.ReactElement<SVGElement>>,
  commits: CommitRecord[],
  selectedCommit: string | null,
  onSelectCommit: (oid: string) => void,
  messageWidth: number,
  locale: Locale,
) {
  gitgraph.clear();

  const orderedCommits = [...commits].reverse();
  const primaryChildMap = createPrimaryChildMap(commits);
  const branchByCommit = new Map<string, string>();
  const branchApiByName = new Map<string, ReturnType<typeof gitgraph.branch>>();
  const usedBranchNames = new Set<string>();

  orderedCommits.forEach((commit, index) => {
    const commitOptions = {
      hash: commit.oid,
      subject: commit.subject,
      author: `${commit.authorName} <${commit.authorEmail}>`,
      onClick: () => onSelectCommit(commit.oid),
      onMessageClick: () => onSelectCommit(commit.oid),
      renderMessage: () =>
        renderCommitMessage(
          commit,
          selectedCommit === commit.oid,
          messageWidth,
          locale,
          onSelectCommit,
        ),
    };

    if (commit.parents.length === 0) {
      const branchName = ensureBranchName(
        firstInterestingRef(commit) ?? (index === 0 ? "main" : `root-${index}`),
        usedBranchNames,
      );
      const branchApi = gitgraph.branch(branchName);
      branchApi.checkout().commit(commitOptions);
      branchApiByName.set(branchName, branchApi);
      branchByCommit.set(commit.oid, branchName);
      return;
    }

    const primaryParent = commit.parents[0];
    const continuationBranch = primaryParent
      ? branchByCommit.get(primaryParent)
      : undefined;

    const shouldContinue =
      primaryParent && primaryChildMap.get(primaryParent) === commit.oid;

    let branchName =
      continuationBranch ??
      ensureBranchName(
        firstInterestingRef(commit) ?? `branch-${index + 1}`,
        usedBranchNames,
      );
    let branchApi =
      (continuationBranch && branchApiByName.get(continuationBranch)) || undefined;

    if (!branchApi || !shouldContinue) {
      branchName = ensureBranchName(
        firstInterestingRef(commit) ?? `branch-${index + 1}`,
        usedBranchNames,
      );
      branchApi = gitgraph.branch({
        name: branchName,
        from: primaryParent,
      });
      branchApiByName.set(branchName, branchApi);
    }

    branchApi.checkout();

    const mergeBranchName = commit.parents
      .slice(1)
      .map((parent) => branchByCommit.get(parent))
      .find(Boolean);
    const mergeBranch = mergeBranchName
      ? branchApiByName.get(mergeBranchName)
      : undefined;

    if (mergeBranch) {
      branchApi.merge({
        branch: mergeBranch,
        commitOptions,
      });
    } else {
      branchApi.commit(commitOptions);
    }

    branchByCommit.set(commit.oid, branchName);
  });
}

export function HistoryList({
  commits,
  selectedCommit,
  onSelectCommit,
}: HistoryListProps) {
  const { locale, t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [messageWidth, setMessageWidth] = useState(960);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.max(500, Math.floor(entry.contentRect.width - 72));
      setMessageWidth(nextWidth);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const graphKey = useMemo(
    () =>
      `${selectedCommit ?? "none"}:${messageWidth}:${commits
        .map((commit) => commit.oid)
        .join("|")}`,
    [commits, messageWidth, selectedCommit],
  );

  return (
    <Card className="glass-surface flex min-h-0 flex-col overflow-hidden border-border/70 shadow-none">
      <CardHeader className="border-b border-border/70 pb-2.5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{t("history.allCommits")}</CardTitle>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {t("history.graphDescription")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <GitCommitHorizontal className="size-3.5" />
              {t("history.commitCount", { count: commits.length })}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-3.5" />
              {t("history.recentOrder")}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent ref={containerRef} className="min-h-0 flex-1 overflow-auto p-0">
        {commits.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            {t("history.noCommits")}
          </div>
        ) : (
          <div className="commit-graph min-w-[680px] px-2 py-2.5 lg:px-3">
            <Gitgraph key={graphKey} options={{ template: graphTemplate }}>
              {(gitgraph) =>
                buildGraph(
                  gitgraph as GitgraphUserApi<React.ReactElement<SVGElement>>,
                  commits,
                  selectedCommit,
                  onSelectCommit,
                  messageWidth,
                  locale,
                )
              }
            </Gitgraph>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
