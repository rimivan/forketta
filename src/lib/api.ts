import { invoke } from "@tauri-apps/api/core";
import type {
  CommitDetail,
  EnvironmentInfo,
  FileChange,
  FileDiff,
  OperationResult,
  RepoRequest,
  RepositorySnapshot,
} from "../types";

export async function loadEnvironment(): Promise<EnvironmentInfo> {
  return invoke<EnvironmentInfo>("load_environment");
}

export async function openRepository(
  request: RepoRequest,
): Promise<RepositorySnapshot> {
  return invoke<RepositorySnapshot>("open_repository", { request });
}

export async function readCommitDetail(
  request: RepoRequest,
  revision: string,
): Promise<CommitDetail> {
  return invoke<CommitDetail>("read_commit_detail", { request, revision });
}

export async function readFileDiff(
  request: RepoRequest,
  path: string,
  staged: boolean,
  kind: FileChange["kind"],
): Promise<FileDiff> {
  return invoke<FileDiff>("read_file_diff", { request, path, staged, kind });
}

export async function setStageState(
  request: RepoRequest,
  paths: string[],
  staged: boolean,
): Promise<OperationResult> {
  return invoke<OperationResult>("set_stage_state", { request, paths, staged });
}

export async function commitChanges(
  request: RepoRequest,
  message: string,
): Promise<OperationResult> {
  return invoke<OperationResult>("commit_changes", { request, message });
}

export async function checkoutBranch(
  request: RepoRequest,
  branch: string,
): Promise<OperationResult> {
  return invoke<OperationResult>("checkout_branch", { request, branch });
}

export async function createBranch(
  request: RepoRequest,
  branch: string,
): Promise<OperationResult> {
  return invoke<OperationResult>("create_branch", { request, branch });
}

export async function fetchAll(
  request: RepoRequest,
): Promise<OperationResult> {
  return invoke<OperationResult>("fetch_all", { request });
}

export async function pullWithStash(
  request: RepoRequest,
): Promise<OperationResult> {
  return invoke<OperationResult>("pull_with_stash", { request });
}

export async function pushCurrentBranch(
  request: RepoRequest,
): Promise<OperationResult> {
  return invoke<OperationResult>("push_current_branch", { request });
}

export async function mergeBranches(
  request: RepoRequest,
  sourceBranch: string,
  targetBranch: string,
): Promise<OperationResult> {
  return invoke<OperationResult>("merge_branches", {
    request,
    sourceBranch,
    targetBranch,
  });
}
