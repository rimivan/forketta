import { FolderOpen, HardDriveDownload, MonitorSmartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SavedRepository } from "../lib/storage";
import type { EnvironmentInfo } from "../types";

interface OpenRepositoryPaneProps {
  environment: EnvironmentInfo | null;
  path: string;
  selectedDistro: string;
  recentRepositories: SavedRepository[];
  busy: boolean;
  onPathChange: (path: string) => void;
  onDistroChange: (distro: string) => void;
  onPickFolder: () => void;
  onOpen: () => void;
  onOpenRecent: (entry: SavedRepository) => void;
}

export function OpenRepositoryPane({
  environment,
  path,
  selectedDistro,
  recentRepositories,
  busy,
  onPathChange,
  onDistroChange,
  onPickFolder,
  onOpen,
  onOpenRecent,
}: OpenRepositoryPaneProps) {
  return (
    <div className="container relative z-10 grid min-h-screen items-center gap-6 py-8 lg:py-12 xl:grid-cols-[minmax(0,1.35fr)_360px]">
      <Card className="glass-surface overflow-hidden border-border/70">
        <CardHeader className="gap-6 border-b border-border/70 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-lg font-semibold text-background shadow-sm">
                  F
                </div>
                <div>
                  <CardTitle className="text-3xl font-semibold tracking-[-0.03em]">
                    Forketta
                  </CardTitle>
                  <CardDescription className="mt-1 max-w-2xl text-base">
                    Git client desktop con una shell pulita, commit graph leggibile
                    e flusso rapido per repository locali e WSL.
                  </CardDescription>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {environment?.supportsWsl ? "WSL disponibile" : "Host locale"}
                </Badge>
                <Badge variant="outline">{environment?.os ?? "desktop"}</Badge>
                <Badge variant="accent">Palette minimale</Badge>
              </div>
            </div>

            <div className="hidden rounded-2xl border border-border/70 bg-background/90 p-3 shadow-sm lg:block">
              <div className="grid gap-2 text-sm text-muted-foreground">
                <span>Supportati</span>
                <code>\\wsl$\\Ubuntu\\home\\user\\repo</code>
                <code>wsl://Ubuntu/home/user/repo</code>
                <code>/home/user/repo + distro</code>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 pt-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Percorso repository
              </label>
              <Input
                value={path}
                onChange={(event) => onPathChange(event.currentTarget.value)}
                placeholder="C:\\code\\repo oppure wsl://Ubuntu/home/user/repo"
                spellCheck={false}
                className="h-12 rounded-xl bg-white/80 text-base"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Distro WSL opzionale
                </label>
                <Select
                  value={selectedDistro || "__auto__"}
                  onValueChange={(value) =>
                    onDistroChange(value === "__auto__" ? "" : value)
                  }
                  disabled={!environment?.wslDistros.length || busy}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-white/80">
                    <SelectValue placeholder="Seleziona automaticamente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__auto__">Seleziona automaticamente</SelectItem>
                    {environment?.wslDistros.map((distro) => (
                      <SelectItem key={distro} value={distro}>
                        {distro}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Azioni
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="h-12 flex-1 rounded-xl"
                    type="button"
                    onClick={onPickFolder}
                    disabled={busy}
                  >
                    <FolderOpen />
                    Apri cartella
                  </Button>
                  <Button
                    className="h-12 flex-1 rounded-xl"
                    type="button"
                    onClick={onOpen}
                    disabled={busy || !path.trim()}
                  >
                    <HardDriveDownload />
                    {busy ? "Apertura..." : "Apri"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-secondary/40 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <MonitorSmartphone className="size-4 text-primary" />
              Quick notes
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <p>Apri un repository locale o un path WSL.</p>
              <p>La distro viene suggerita automaticamente se il contesto lo consente.</p>
              <p>Il repository resta salvato nella lista recente per il riaccesso rapido.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-surface flex min-h-[420px] flex-col border-border/70">
        <CardHeader className="border-b border-border/70 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Recenti</CardTitle>
              <CardDescription>Repository aperti di recente</CardDescription>
            </div>
            <Badge variant="outline">
              {environment?.supportsWsl ? "WSL" : `Host ${environment?.os ?? "desktop"}`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pt-4">
          <div className="grid gap-3">
            {recentRepositories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
                Nessun repository recente. Aprine uno per memorizzarlo qui.
              </div>
            ) : (
              recentRepositories.map((entry) => (
                <button
                  key={entry.path}
                  className="rounded-xl border border-border/70 bg-background/80 p-4 text-left transition-colors hover:bg-secondary"
                  type="button"
                  onClick={() => onOpenRecent(entry)}
                  disabled={busy}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="truncate text-sm font-semibold">{entry.label}</strong>
                    {entry.wslDistro ? <Badge variant="outline">WSL</Badge> : null}
                  </div>
                  <p className="mt-1 break-all text-sm text-muted-foreground">
                    {entry.path}
                  </p>
                  {entry.wslDistro ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {entry.wslDistro}
                    </p>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
