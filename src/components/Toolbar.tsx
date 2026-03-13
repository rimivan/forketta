import {
  ArrowDownToLine,
  ArrowUpToLine,
  FolderSearch2,
  GitBranch,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  const { locale, t } = useI18n();

  return (
    <Card className="glass-surface border-border/70 px-4 py-4 shadow-toolbar">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-red-400" />
              <span className="size-3 rounded-full bg-amber-400" />
              <span className="size-3 rounded-full bg-emerald-400" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-[-0.03em]">
                {snapshot.repository.name}
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                {snapshot.execution.displayPath}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={busy}>
              <RefreshCw />
              {t("toolbar.refresh")}
            </Button>
            <Button variant="ghost" size="sm" onClick={onFetch} disabled={busy}>
              <RotateCcw />
              {t("toolbar.fetch")}
            </Button>
            <Button variant="ghost" size="sm" onClick={onPull} disabled={busy}>
              <ArrowDownToLine />
              {t("toolbar.pull")}
            </Button>
            <Button variant="ghost" size="sm" onClick={onPush} disabled={busy}>
              <ArrowUpToLine />
              {t("toolbar.push")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onSwitchRepository}
              disabled={busy}
            >
              <FolderSearch2 />
              {t("toolbar.openAnother")}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {snapshot.execution.mode === "wsl"
              ? t("toolbar.execution.wsl", {
                  distro: snapshot.execution.distro ?? t("toolbar.auto"),
                })
              : t("toolbar.execution.native")}
          </Badge>
          <Badge variant="outline">
            <GitBranch className="mr-1 size-3.5" />
            {snapshot.head.detached
              ? t("toolbar.headDetached")
              : snapshot.head.currentBranch ?? t("toolbar.noBranch")}
          </Badge>
          {snapshot.head.upstream ? (
            <Badge variant="outline">
              {snapshot.head.ahead > 0 ? `↑${snapshot.head.ahead}` : "↑0"}{" "}
              {snapshot.head.behind > 0 ? `↓${snapshot.head.behind}` : "↓0"}
            </Badge>
          ) : null}
          <span className="ml-auto text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t("toolbar.updated", {
              date: formatDateTime(snapshot.head.lastUpdated, locale),
            })}
          </span>
        </div>
      </div>
    </Card>
  );
}
