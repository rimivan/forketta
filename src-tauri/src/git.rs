use std::{collections::BTreeMap, path::PathBuf, process::Command};

use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoRequest {
    pub path: String,
    pub wsl_distro: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentInfo {
    pub os: String,
    pub supports_wsl: bool,
    pub wsl_distros: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositorySnapshot {
    pub repository: RepositoryDescriptor,
    pub execution: ExecutionInfo,
    pub head: HeadSummary,
    pub remotes: Vec<RemoteInfo>,
    pub branches: Vec<BranchInfo>,
    pub status: WorkingTreeStatus,
    pub commits: Vec<CommitRecord>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryDescriptor {
    pub name: String,
    pub root_path: String,
    pub display_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionInfo {
    pub mode: &'static str,
    pub working_directory: String,
    pub display_path: String,
    pub distro: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeadSummary {
    pub current_branch: Option<String>,
    pub upstream: Option<String>,
    pub ahead: usize,
    pub behind: usize,
    pub detached: bool,
    pub last_updated: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteInfo {
    pub name: String,
    pub fetch_url: Option<String>,
    pub push_url: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchInfo {
    pub name: String,
    pub full_name: String,
    pub short_target: String,
    pub upstream: Option<String>,
    pub track: Option<String>,
    pub subject: String,
    pub author: String,
    pub committer_date: String,
    pub is_head: bool,
    pub is_remote: bool,
    pub is_protected: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkingTreeStatus {
    pub clean: bool,
    pub staged_count: usize,
    pub unstaged_count: usize,
    pub untracked_count: usize,
    pub conflicted_count: usize,
    pub changes: Vec<FileChange>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileChange {
    pub path: String,
    pub original_path: Option<String>,
    pub index_status: String,
    pub worktree_status: String,
    pub kind: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitRecord {
    pub oid: String,
    pub short_oid: String,
    pub parents: Vec<String>,
    pub refs: Vec<String>,
    pub author_name: String,
    pub author_email: String,
    pub authored_at: String,
    pub subject: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitDetail {
    pub oid: String,
    pub author_name: String,
    pub author_email: String,
    pub authored_at: String,
    pub subject: String,
    pub body: String,
    pub diff: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDiff {
    pub path: String,
    pub staged: bool,
    pub diff: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslationMessage {
    pub key: &'static str,
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    pub values: BTreeMap<String, String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationResult {
    pub message: TranslationMessage,
    pub warnings: Vec<TranslationMessage>,
}

#[derive(Debug, Clone)]
enum RepoMode {
    Native,
    Wsl { distro: String },
}

#[derive(Debug, Clone)]
struct RepoTarget {
    mode: RepoMode,
    root_path: String,
    display_path: String,
}

fn translation_message(key: &'static str) -> TranslationMessage {
    TranslationMessage {
        key,
        values: BTreeMap::new(),
    }
}

fn translation_message_with_values(
    key: &'static str,
    values: impl IntoIterator<Item = (&'static str, String)>,
) -> TranslationMessage {
    let mut mapped_values = BTreeMap::new();
    for (name, value) in values {
        mapped_values.insert(name.to_string(), value);
    }

    TranslationMessage {
        key,
        values: mapped_values,
    }
}

pub fn load_environment() -> Result<EnvironmentInfo, String> {
    let wsl_distros = if cfg!(target_os = "windows") {
        list_wsl_distros().unwrap_or_default()
    } else {
        Vec::new()
    };

    Ok(EnvironmentInfo {
        os: std::env::consts::OS.to_string(),
        supports_wsl: cfg!(target_os = "windows"),
        wsl_distros,
    })
}

pub fn open_repository(request: &RepoRequest) -> Result<RepositorySnapshot, String> {
    let target = resolve_target(request)?;
    let status_output = run_git(&target, &["status", "--porcelain=v1", "--branch"])?;
    let (head, status) = parse_status(&status_output);

    Ok(RepositorySnapshot {
        repository: RepositoryDescriptor {
            name: repository_name(&target.root_path),
            root_path: target.root_path.clone(),
            display_path: target.display_path.clone(),
        },
        execution: target.execution_info(),
        head,
        remotes: load_remotes(&target)?,
        branches: load_branches(&target)?,
        status,
        commits: load_commits(&target)?,
    })
}

pub fn read_commit_detail(request: &RepoRequest, revision: &str) -> Result<CommitDetail, String> {
    let target = resolve_target(request)?;
    let format = "%H%x1f%an%x1f%ae%x1f%ad%x1f%s%x1f%b%x1e";
    let output = run_git(
        &target,
        &[
            "show",
            "--stat",
            "--patch",
            "--date=iso-strict",
            &format!("--format={format}"),
            revision,
        ],
    )?;
    let (metadata, diff) = output
        .split_once('\u{001e}')
        .unwrap_or((output.as_str(), ""));
    let fields: Vec<&str> = metadata.split('\u{001f}').collect();
    if fields.len() < 6 {
        return Err("Unable to read the requested commit details.".to_string());
    }

    Ok(CommitDetail {
        oid: fields[0].trim().to_string(),
        author_name: fields[1].trim().to_string(),
        author_email: fields[2].trim().to_string(),
        authored_at: fields[3].trim().to_string(),
        subject: fields[4].trim().to_string(),
        body: fields[5].trim().to_string(),
        diff: diff.trim().to_string(),
    })
}

pub fn read_file_diff(
    request: &RepoRequest,
    path: &str,
    staged: bool,
    kind: &str,
) -> Result<FileDiff, String> {
    let target = resolve_target(request)?;
    let diff = if staged {
        run_git(&target, &["diff", "--cached", "--", path])?
    } else if kind == "untracked" {
        run_git_allow_codes(
            &target,
            &["diff", "--no-index", "--", "/dev/null", path],
            &[0, 1],
        )?
    } else {
        run_git(&target, &["diff", "--", path])?
    };

    Ok(FileDiff {
        path: path.to_string(),
        staged,
        diff,
    })
}

pub fn set_stage_state(
    request: &RepoRequest,
    paths: Vec<String>,
    staged: bool,
) -> Result<OperationResult, String> {
    if paths.is_empty() {
        return Err("No file selected.".to_string());
    }

    let target = resolve_target(request)?;
    if staged {
        let mut args = vec!["add".to_string(), "--".to_string()];
        args.extend(paths.iter().cloned());
        run_git_owned(&target, &args, &[0])?;
    } else {
        let mut args = vec![
            "restore".to_string(),
            "--staged".to_string(),
            "--".to_string(),
        ];
        args.extend(paths.iter().cloned());

        if run_git_owned(&target, &args, &[0]).is_err() {
            let mut fallback = vec![
                "rm".to_string(),
                "--cached".to_string(),
                "-r".to_string(),
                "--".to_string(),
            ];
            fallback.extend(paths.iter().cloned());
            run_git_owned(&target, &fallback, &[0])?;
        }
    }

    Ok(OperationResult {
        message: if staged {
            translation_message_with_values(
                "result.stage.success",
                [("count", paths.len().to_string())],
            )
        } else {
            translation_message_with_values(
                "result.unstage.success",
                [("count", paths.len().to_string())],
            )
        },
        warnings: Vec::new(),
    })
}

pub fn commit_changes(request: &RepoRequest, message: &str) -> Result<OperationResult, String> {
    let target = resolve_target(request)?;
    run_git(&target, &["commit", "-m", message])?;

    Ok(OperationResult {
        message: translation_message("result.commit.success"),
        warnings: Vec::new(),
    })
}

pub fn checkout_branch(request: &RepoRequest, branch: &str) -> Result<OperationResult, String> {
    let target = resolve_target(request)?;
    run_git(&target, &["checkout", branch])?;

    Ok(OperationResult {
        message: translation_message_with_values(
            "result.checkout.success",
            [("branch", branch.to_string())],
        ),
        warnings: Vec::new(),
    })
}

pub fn create_branch(request: &RepoRequest, branch: &str) -> Result<OperationResult, String> {
    let target = resolve_target(request)?;
    run_git(&target, &["checkout", "-b", branch])?;

    Ok(OperationResult {
        message: translation_message_with_values(
            "result.createBranch.success",
            [("branch", branch.to_string())],
        ),
        warnings: Vec::new(),
    })
}

pub fn fetch_all(request: &RepoRequest) -> Result<OperationResult, String> {
    let target = resolve_target(request)?;
    run_git(&target, &["fetch", "--all", "--prune"])?;

    Ok(OperationResult {
        message: translation_message("result.fetch.success"),
        warnings: Vec::new(),
    })
}

pub fn pull_with_stash(request: &RepoRequest) -> Result<OperationResult, String> {
    let target = resolve_target(request)?;
    let dirty = !run_git(&target, &["status", "--porcelain"])
        .unwrap_or_default()
        .trim()
        .is_empty();
    let mut warnings = Vec::new();

    if dirty {
        let message = format!("forketta-auto-stash-{}", Utc::now().timestamp());
        run_git(
            &target,
            &["stash", "push", "--include-untracked", "-m", &message],
        )?;
        warnings.push(translation_message("result.pull.stashCreated"));
    }

    if let Err(error) = run_git(&target, &["pull", "--prune", "--tags"]) {
        if dirty {
            return Err(format!(
                "Pull failed after creating an automatic stash. The stash was kept in stash@{{0}}: {error}"
            ));
        }
        return Err(error);
    }

    if dirty {
        match run_git(&target, &["stash", "apply", "--index", "stash@{0}"]) {
            Ok(_) => {
                let _ = run_git(&target, &["stash", "drop", "stash@{0}"]);
                warnings.push(translation_message("result.pull.stashApplied"));
            }
            Err(error) => warnings.push(translation_message_with_values(
                "result.pull.stashApplyManual",
                [("error", error)],
            )),
        }
    }

    Ok(OperationResult {
        message: translation_message("result.pull.success"),
        warnings,
    })
}

pub fn push_current_branch(request: &RepoRequest) -> Result<OperationResult, String> {
    let target = resolve_target(request)?;
    let branch = current_branch(&target)?
        .ok_or_else(|| "Detached HEAD: unable to push the current branch.".to_string())?;

    if let Some(_upstream) = current_upstream(&target)? {
        run_git(&target, &["push"])?;
    } else {
        let remote = load_remotes(&target)?
            .into_iter()
            .map(|remote| remote.name)
            .next()
            .unwrap_or_else(|| "origin".to_string());
        run_git(&target, &["push", "-u", &remote, &branch])?;
    }

    Ok(OperationResult {
        message: translation_message_with_values("result.push.success", [("branch", branch)]),
        warnings: Vec::new(),
    })
}

pub fn merge_branches(
    request: &RepoRequest,
    source_branch: &str,
    target_branch: &str,
) -> Result<OperationResult, String> {
    let target = resolve_target(request)?;
    let mut warnings = Vec::new();

    if current_branch(&target)?.as_deref() != Some(target_branch) {
        run_git(&target, &["checkout", target_branch])?;
        warnings.push(translation_message_with_values(
            "result.merge.autoCheckout",
            [("targetBranch", target_branch.to_string())],
        ));
    }

    run_git(&target, &["merge", "--no-ff", source_branch])?;

    Ok(OperationResult {
        message: translation_message_with_values(
            "result.merge.success",
            [
                ("sourceBranch", source_branch.to_string()),
                ("targetBranch", target_branch.to_string()),
            ],
        ),
        warnings,
    })
}

fn resolve_target(request: &RepoRequest) -> Result<RepoTarget, String> {
    let input_path = request.path.trim();
    if input_path.is_empty() {
        return Err("The repository path is empty.".to_string());
    }

    let provisional = classify_input(input_path, request.wsl_distro.clone())?;
    let root_path = run_git(&provisional, &["rev-parse", "--show-toplevel"])?;

    Ok(match provisional.mode {
        RepoMode::Native => RepoTarget {
            mode: RepoMode::Native,
            display_path: root_path.clone(),
            root_path,
        },
        RepoMode::Wsl { distro } => RepoTarget {
            mode: RepoMode::Wsl {
                distro: distro.clone(),
            },
            display_path: format!("wsl://{distro}{root_path}"),
            root_path,
        },
    })
}

fn classify_input(path: &str, distro_hint: Option<String>) -> Result<RepoTarget, String> {
    if let Some((distro, linux_path)) = parse_wsl_scheme(path) {
        return Ok(RepoTarget {
            mode: RepoMode::Wsl {
                distro: distro.clone(),
            },
            display_path: format!("wsl://{distro}{linux_path}"),
            root_path: linux_path,
        });
    }

    if let Some((distro, linux_path)) = parse_wsl_unc(path) {
        return Ok(RepoTarget {
            mode: RepoMode::Wsl {
                distro: distro.clone(),
            },
            display_path: format!("wsl://{distro}{linux_path}"),
            root_path: linux_path,
        });
    }

    if cfg!(target_os = "windows") && path.starts_with('/') {
        let distro = distro_hint.ok_or_else(|| {
            "A POSIX path was detected on Windows. Select a WSL distro or use wsl://<distro>/...".to_string()
        })?;

        return Ok(RepoTarget {
            mode: RepoMode::Wsl {
                distro: distro.clone(),
            },
            display_path: format!("wsl://{distro}{path}"),
            root_path: path.to_string(),
        });
    }

    Ok(RepoTarget {
        mode: RepoMode::Native,
        display_path: path.to_string(),
        root_path: path.to_string(),
    })
}

fn parse_wsl_scheme(path: &str) -> Option<(String, String)> {
    let remainder = path.strip_prefix("wsl://")?;
    let (distro, rest) = remainder.split_once('/')?;
    let linux_path = format!("/{}", rest.trim_start_matches('/').replace('\\', "/"));
    Some((distro.to_string(), linux_path))
}

fn parse_wsl_unc(path: &str) -> Option<(String, String)> {
    let prefix = if path.starts_with("\\\\wsl$\\") {
        "\\\\wsl$\\"
    } else if path.starts_with("\\\\wsl.localhost\\") {
        "\\\\wsl.localhost\\"
    } else {
        return None;
    };

    let remainder = path.strip_prefix(prefix)?;
    let mut parts = remainder
        .split(['\\', '/'])
        .filter(|part| !part.trim().is_empty());
    let distro = parts.next()?.to_string();
    let linux_path = format!("/{}", parts.collect::<Vec<_>>().join("/"));
    Some((distro, linux_path))
}

fn list_wsl_distros() -> Result<Vec<String>, String> {
    let output = Command::new("wsl.exe")
        .args(["-l", "-q"])
        .output()
        .map_err(|error| format!("Unable to execute wsl.exe: {error}"))?;

    if !output.status.success() {
        return Ok(Vec::new());
    }

    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToString::to_string)
        .collect())
}

impl RepoTarget {
    fn execution_info(&self) -> ExecutionInfo {
        match &self.mode {
            RepoMode::Native => ExecutionInfo {
                mode: "native",
                working_directory: self.root_path.clone(),
                display_path: self.display_path.clone(),
                distro: None,
            },
            RepoMode::Wsl { distro } => ExecutionInfo {
                mode: "wsl",
                working_directory: self.root_path.clone(),
                display_path: self.display_path.clone(),
                distro: Some(distro.clone()),
            },
        }
    }
}

fn git_command(target: &RepoTarget) -> Command {
    match &target.mode {
        RepoMode::Native => {
            let mut command = Command::new("git");
            command.current_dir(PathBuf::from(&target.root_path));
            command
        }
        RepoMode::Wsl { distro } => {
            let executable = if cfg!(target_os = "windows") {
                "wsl.exe"
            } else {
                "wsl"
            };
            let mut command = Command::new(executable);
            command
                .arg("-d")
                .arg(distro)
                .arg("--cd")
                .arg(&target.root_path)
                .arg("--exec")
                .arg("git");
            command
        }
    }
}

fn run_git(target: &RepoTarget, args: &[&str]) -> Result<String, String> {
    run_git_allow_codes(target, args, &[0])
}

fn run_git_owned(
    target: &RepoTarget,
    args: &[String],
    allowed_codes: &[i32],
) -> Result<String, String> {
    let refs: Vec<&str> = args.iter().map(String::as_str).collect();
    run_git_allow_codes(target, &refs, allowed_codes)
}

fn run_git_allow_codes(
    target: &RepoTarget,
    args: &[&str],
    allowed_codes: &[i32],
) -> Result<String, String> {
    let output = git_command(target)
        .args(args)
        .output()
        .map_err(|error| format!("Unable to execute git: {error}"))?;

    let code = output.status.code().unwrap_or(-1);
    let stdout = String::from_utf8_lossy(&output.stdout)
        .trim_end_matches(|value| value == '\n' || value == '\r')
        .to_string();
    let stderr = String::from_utf8_lossy(&output.stderr)
        .trim_end_matches(|value| value == '\n' || value == '\r')
        .to_string();

    if allowed_codes.contains(&code) {
        return Ok(stdout);
    }

    let message = if !stderr.is_empty() {
        stderr
    } else if !stdout.is_empty() {
        stdout
    } else {
        format!("git exited with status code {code}")
    };

    Err(message)
}

fn load_remotes(target: &RepoTarget) -> Result<Vec<RemoteInfo>, String> {
    let output = run_git(target, &["remote", "-v"])?;
    let mut remotes: BTreeMap<String, RemoteInfo> = BTreeMap::new();

    for line in output.lines() {
        let columns: Vec<&str> = line.split_whitespace().collect();
        if columns.len() < 3 {
            continue;
        }

        let entry = remotes.entry(columns[0].to_string()).or_insert(RemoteInfo {
            name: columns[0].to_string(),
            fetch_url: None,
            push_url: None,
        });

        match columns[2] {
            "(fetch)" => entry.fetch_url = Some(columns[1].to_string()),
            "(push)" => entry.push_url = Some(columns[1].to_string()),
            _ => {}
        }
    }

    Ok(remotes.into_values().collect())
}

fn load_branches(target: &RepoTarget) -> Result<Vec<BranchInfo>, String> {
    let format = "%(refname:short)%x1f%(refname)%x1f%(objectname:short)%x1f%(upstream:short)%x1f%(upstream:trackshort)%x1f%(committerdate:iso-strict)%x1f%(subject)%x1f%(authorname)%x1f%(HEAD)";
    let output = run_git(
        target,
        &[
            "for-each-ref",
            "refs/heads",
            "refs/remotes",
            "--sort=-committerdate",
            &format!("--format={format}"),
        ],
    )?;

    Ok(output
        .lines()
        .filter_map(|line| {
            let fields: Vec<&str> = line.split('\u{001f}').collect();
            if fields.len() < 9 {
                return None;
            }

            let name = fields[0].trim().to_string();
            Some(BranchInfo {
                is_remote: fields[1].starts_with("refs/remotes/"),
                is_head: fields[8].trim() == "*",
                is_protected: matches!(
                    name.as_str(),
                    "main" | "master" | "develop" | "development" | "release"
                ),
                name,
                full_name: fields[1].trim().to_string(),
                short_target: fields[2].trim().to_string(),
                upstream: empty_to_none(fields[3]),
                track: empty_to_none(fields[4]),
                committer_date: fields[5].trim().to_string(),
                subject: fields[6].trim().to_string(),
                author: fields[7].trim().to_string(),
            })
        })
        .collect())
}

fn load_commits(target: &RepoTarget) -> Result<Vec<CommitRecord>, String> {
    let format = "%H%x1f%h%x1f%P%x1f%D%x1f%an%x1f%ae%x1f%ad%x1f%s%x1e";
    let output = run_git(
        target,
        &[
            "log",
            "--all",
            "--topo-order",
            "--decorate",
            "--date=iso-strict",
            "-n",
            "240",
            &format!("--pretty=format:{format}"),
        ],
    )?;

    Ok(output
        .split('\u{001e}')
        .filter_map(|record| {
            let cleaned = record.trim();
            if cleaned.is_empty() {
                return None;
            }

            let fields: Vec<&str> = cleaned.split('\u{001f}').collect();
            if fields.len() < 8 {
                return None;
            }

            Some(CommitRecord {
                oid: fields[0].trim().to_string(),
                short_oid: fields[1].trim().to_string(),
                parents: fields[2]
                    .split_whitespace()
                    .map(ToString::to_string)
                    .collect(),
                refs: fields[3]
                    .split(',')
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(ToString::to_string)
                    .collect(),
                author_name: fields[4].trim().to_string(),
                author_email: fields[5].trim().to_string(),
                authored_at: fields[6].trim().to_string(),
                subject: fields[7].trim().to_string(),
            })
        })
        .collect())
}

fn parse_status(output: &str) -> (HeadSummary, WorkingTreeStatus) {
    let mut current_branch = None;
    let mut upstream = None;
    let mut ahead = 0usize;
    let mut behind = 0usize;
    let mut detached = false;
    let mut changes = Vec::new();

    for (index, line) in output.lines().enumerate() {
        if index == 0 && line.starts_with("## ") {
            let summary = line.trim_start_matches("## ").trim();
            let (branch, branch_upstream, branch_ahead, branch_behind, is_detached) =
                parse_branch_summary(summary);
            current_branch = branch;
            upstream = branch_upstream;
            ahead = branch_ahead;
            behind = branch_behind;
            detached = is_detached;
            continue;
        }

        if line.starts_with("!!") || line.len() < 3 {
            continue;
        }

        let index_status = normalize_status(line.chars().nth(0).unwrap_or(' '));
        let worktree_status = normalize_status(line.chars().nth(1).unwrap_or(' '));
        let raw_path = line.get(3..).unwrap_or("").trim();
        if raw_path.is_empty() {
            continue;
        }

        let (original_path, path) = if let Some((source, target)) = raw_path.split_once(" -> ") {
            (Some(decode_git_path(source)), decode_git_path(target))
        } else {
            (None, decode_git_path(raw_path))
        };

        changes.push(FileChange {
            kind: change_kind(&index_status, &worktree_status, original_path.as_ref()),
            path,
            original_path,
            index_status,
            worktree_status,
        });
    }

    let staged_count = changes
        .iter()
        .filter(|change| change.index_status != ".")
        .count();
    let unstaged_count = changes
        .iter()
        .filter(|change| {
            change.worktree_status != "."
                && change.kind != "untracked"
                && change.kind != "conflicted"
        })
        .count();
    let untracked_count = changes
        .iter()
        .filter(|change| change.kind == "untracked")
        .count();
    let conflicted_count = changes
        .iter()
        .filter(|change| change.kind == "conflicted")
        .count();

    (
        HeadSummary {
            current_branch,
            upstream,
            ahead,
            behind,
            detached,
            last_updated: Utc::now().to_rfc3339(),
        },
        WorkingTreeStatus {
            clean: changes.is_empty(),
            staged_count,
            unstaged_count,
            untracked_count,
            conflicted_count,
            changes,
        },
    )
}

fn parse_branch_summary(summary: &str) -> (Option<String>, Option<String>, usize, usize, bool) {
    if let Some(branch) = summary.strip_prefix("No commits yet on ") {
        return (Some(branch.to_string()), None, 0, 0, false);
    }

    if let Some(branch) = summary.strip_prefix("Initial commit on ") {
        return (Some(branch.to_string()), None, 0, 0, false);
    }

    if summary.starts_with("HEAD ") || summary == "HEAD" {
        return (None, None, 0, 0, true);
    }

    let (branch_part, tracking_part) = if let Some((branch, tracking)) = summary.split_once(" [") {
        (branch, tracking.trim_end_matches(']'))
    } else {
        (summary, "")
    };

    let (branch_name, upstream) = if let Some((local, remote)) = branch_part.split_once("...") {
        (Some(local.to_string()), empty_to_none(remote))
    } else {
        (Some(branch_part.to_string()), None)
    };

    let mut ahead = 0usize;
    let mut behind = 0usize;

    for value in tracking_part.split(',').map(str::trim) {
        if let Some(number) = value.strip_prefix("ahead ") {
            ahead = number.parse::<usize>().unwrap_or(0);
        }
        if let Some(number) = value.strip_prefix("behind ") {
            behind = number.parse::<usize>().unwrap_or(0);
        }
    }

    (branch_name, upstream, ahead, behind, false)
}

fn normalize_status(value: char) -> String {
    if value == ' ' {
        ".".to_string()
    } else {
        value.to_string()
    }
}

fn change_kind(
    index_status: &str,
    worktree_status: &str,
    original_path: Option<&String>,
) -> String {
    if index_status == "U"
        || worktree_status == "U"
        || (index_status == "A" && worktree_status == "A")
        || (index_status == "D" && worktree_status == "D")
    {
        return "conflicted".to_string();
    }

    if index_status == "?" || worktree_status == "?" {
        return "untracked".to_string();
    }

    if original_path.is_some() || index_status == "R" || worktree_status == "R" {
        return "renamed".to_string();
    }

    if index_status == "C" || worktree_status == "C" {
        return "copied".to_string();
    }

    if index_status == "A" || worktree_status == "A" {
        return "added".to_string();
    }

    if index_status == "D" || worktree_status == "D" {
        return "deleted".to_string();
    }

    "modified".to_string()
}

fn decode_git_path(value: &str) -> String {
    let trimmed = value.trim();
    if !trimmed.starts_with('"') || !trimmed.ends_with('"') {
        return trimmed.to_string();
    }

    let mut output = String::new();
    let inner = &trimmed[1..trimmed.len() - 1];
    let mut chars = inner.chars().peekable();

    while let Some(character) = chars.next() {
        if character != '\\' {
            output.push(character);
            continue;
        }

        match chars.next() {
            Some('n') => output.push('\n'),
            Some('t') => output.push('\t'),
            Some('\\') => output.push('\\'),
            Some('"') => output.push('"'),
            Some(first @ '0'..='7') => {
                let mut octal = String::from(first);
                for _ in 0..2 {
                    if let Some(next @ '0'..='7') = chars.peek().copied() {
                        octal.push(next);
                        chars.next();
                    }
                }
                if let Ok(value) = u8::from_str_radix(&octal, 8) {
                    output.push(value as char);
                }
            }
            Some(other) => output.push(other),
            None => break,
        }
    }

    output
}

fn repository_name(path: &str) -> String {
    path.rsplit(['/', '\\'])
        .find(|segment| !segment.trim().is_empty())
        .unwrap_or("repository")
        .to_string()
}

fn empty_to_none(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn current_branch(target: &RepoTarget) -> Result<Option<String>, String> {
    let branch = run_git(target, &["rev-parse", "--abbrev-ref", "HEAD"])?;
    if branch == "HEAD" {
        Ok(None)
    } else {
        Ok(Some(branch))
    }
}

fn current_upstream(target: &RepoTarget) -> Result<Option<String>, String> {
    match run_git_allow_codes(
        target,
        &[
            "rev-parse",
            "--abbrev-ref",
            "--symbolic-full-name",
            "@{upstream}",
        ],
        &[0, 128],
    ) {
        Ok(value) if value.is_empty() => Ok(None),
        Ok(value) => Ok(Some(value)),
        Err(error) if error.contains("no upstream configured") => Ok(None),
        Err(error) => Err(error),
    }
}
