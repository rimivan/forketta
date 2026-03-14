import type { TranslationPayload } from "./i18n";

export interface RepoRequest {
  path: string;
  wslDistro: string | null;
}

export interface EnvironmentInfo {
  os: string;
  supportsWsl: boolean;
  wslDistros: string[];
}

export interface RepositorySnapshot {
  repository: RepositoryDescriptor;
  execution: ExecutionInfo;
  head: HeadSummary;
  remotes: RemoteInfo[];
  branches: BranchInfo[];
  status: WorkingTreeStatus;
  commits: CommitRecord[];
}

export interface RepositoryDescriptor {
  name: string;
  rootPath: string;
  displayPath: string;
}

export interface ExecutionInfo {
  mode: "native" | "wsl";
  workingDirectory: string;
  displayPath: string;
  distro: string | null;
}

export interface HeadSummary {
  currentBranch: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  detached: boolean;
  lastUpdated: string;
}

export interface RemoteInfo {
  name: string;
  fetchUrl: string | null;
  pushUrl: string | null;
}

export interface BranchInfo {
  name: string;
  fullName: string;
  shortTarget: string;
  upstream: string | null;
  track: string | null;
  subject: string;
  author: string;
  committerDate: string;
  isHead: boolean;
  isRemote: boolean;
  isProtected: boolean;
}

export interface WorkingTreeStatus {
  clean: boolean;
  stagedCount: number;
  unstagedCount: number;
  untrackedCount: number;
  conflictedCount: number;
  changes: FileChange[];
}

export interface FileChange {
  path: string;
  originalPath: string | null;
  indexStatus: string;
  worktreeStatus: string;
  kind:
    | "modified"
    | "added"
    | "deleted"
    | "renamed"
    | "copied"
    | "untracked"
    | "conflicted";
}

export interface CommitRecord {
  oid: string;
  shortOid: string;
  parents: string[];
  refs: string[];
  authorName: string;
  authorEmail: string;
  authoredAt: string;
  subject: string;
}

export interface CommitDetail {
  oid: string;
  authorName: string;
  authorEmail: string;
  authoredAt: string;
  subject: string;
  body: string;
  files: CommitFileRecord[];
  diff: string;
}

export interface CommitFileRecord {
  path: string;
  originalPath: string | null;
  kind: "modified" | "added" | "deleted" | "renamed" | "copied";
}

export interface FileDiff {
  path: string;
  staged: boolean;
  diff: string;
}

export interface OperationResult {
  message: TranslationPayload;
  warnings: TranslationPayload[];
}

export interface ChangeSelection {
  path: string;
  staged: boolean;
  kind: FileChange["kind"];
}
