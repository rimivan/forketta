mod git;

use git::{
    checkout_branch as checkout_branch_impl, commit_changes as commit_changes_impl,
    create_branch as create_branch_impl, fetch_all as fetch_all_impl,
    load_environment as load_environment_impl, merge_branches as merge_branches_impl,
    open_repository as open_repository_impl, pull_with_stash as pull_with_stash_impl,
    push_current_branch as push_current_branch_impl,
    read_commit_detail as read_commit_detail_impl, read_file_diff as read_file_diff_impl,
    set_stage_state as set_stage_state_impl, EnvironmentInfo, OperationResult, RepoRequest,
    RepositorySnapshot,
};

#[tauri::command]
fn load_environment() -> Result<EnvironmentInfo, String> {
    load_environment_impl()
}

#[tauri::command]
fn open_repository(request: RepoRequest) -> Result<RepositorySnapshot, String> {
    open_repository_impl(&request)
}

#[tauri::command]
fn read_commit_detail(request: RepoRequest, revision: String) -> Result<git::CommitDetail, String> {
    read_commit_detail_impl(&request, &revision)
}

#[tauri::command]
fn read_file_diff(
    request: RepoRequest,
    path: String,
    staged: bool,
    kind: String,
) -> Result<git::FileDiff, String> {
    read_file_diff_impl(&request, &path, staged, &kind)
}

#[tauri::command]
fn set_stage_state(
    request: RepoRequest,
    paths: Vec<String>,
    staged: bool,
) -> Result<OperationResult, String> {
    set_stage_state_impl(&request, paths, staged)
}

#[tauri::command]
fn commit_changes(request: RepoRequest, message: String) -> Result<OperationResult, String> {
    commit_changes_impl(&request, &message)
}

#[tauri::command]
fn checkout_branch(request: RepoRequest, branch: String) -> Result<OperationResult, String> {
    checkout_branch_impl(&request, &branch)
}

#[tauri::command]
fn create_branch(request: RepoRequest, branch: String) -> Result<OperationResult, String> {
    create_branch_impl(&request, &branch)
}

#[tauri::command]
fn fetch_all(request: RepoRequest) -> Result<OperationResult, String> {
    fetch_all_impl(&request)
}

#[tauri::command]
fn pull_with_stash(request: RepoRequest) -> Result<OperationResult, String> {
    pull_with_stash_impl(&request)
}

#[tauri::command]
fn push_current_branch(request: RepoRequest) -> Result<OperationResult, String> {
    push_current_branch_impl(&request)
}

#[tauri::command]
fn merge_branches(
    request: RepoRequest,
    source_branch: String,
    target_branch: String,
) -> Result<OperationResult, String> {
    merge_branches_impl(&request, &source_branch, &target_branch)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_environment,
            open_repository,
            read_commit_detail,
            read_file_diff,
            set_stage_state,
            commit_changes,
            checkout_branch,
            create_branch,
            fetch_all,
            pull_with_stash,
            push_current_branch,
            merge_branches,
        ])
        .run(tauri::generate_context!())
        .expect("error while running forketta");
}
