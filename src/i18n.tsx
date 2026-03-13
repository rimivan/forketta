import { createContext, useContext, type ReactNode } from "react";

const englishCatalog = {
  "app.error.unexpected": "An unexpected error occurred.",
  "app.notice.environment": "Environment",
  "app.notice.repository": "Repository",
  "app.notice.openRepository": "Open repository",
  "app.notice.repositoryOpened": "Repository opened",
  "app.notice.commitDetail": "Commit details",
  "app.notice.fileDiff": "File diff",
  "app.notice.refresh": "Refresh",
  "app.notice.checkoutBranch": "Checkout branch",
  "app.notice.createBranch": "Create branch",
  "app.notice.commitChanges": "Commit staged changes",
  "app.notice.stageFile": "Stage file",
  "app.notice.unstageFile": "Unstage file",
  "app.notice.stageAll": "Stage all",
  "app.notice.unstageAll": "Unstage all",
  "app.notice.mergeBranches": "Merge branches",
  "app.notice.fetch": "Fetch",
  "app.notice.pullWithStash": "Pull with stash",
  "app.notice.push": "Push",
  "app.message.validRepositoryPath": "Enter a valid repository path.",
  "app.message.repositorySynced": "Repository synced with the local state.",
  "app.status.noRemoteConfigured": "No remote configured",
  "app.status.notAvailable": "n/a",
  "app.status.clean": "working tree clean",
  "app.status.summary":
    "{staged} staged • {unstaged} unstaged • {untracked} untracked",
  "app.busy.working": "Working...",
  "landing.description":
    "Desktop Git client with a clean shell, readable commit graph, and a fast flow for local and WSL repositories.",
  "landing.wslAvailable": "WSL available",
  "landing.localHost": "Local host",
  "landing.desktop": "desktop",
  "landing.minimalPalette": "Minimal palette",
  "landing.supported": "Supported",
  "landing.repoPathLabel": "Repository path",
  "landing.repoPathPlaceholder":
    "C:\\code\\repo or wsl://Ubuntu/home/user/repo",
  "landing.optionalWslDistro": "Optional WSL distro",
  "landing.autoSelect": "Select automatically",
  "landing.actions": "Actions",
  "landing.openFolder": "Open folder",
  "landing.open": "Open",
  "landing.opening": "Opening...",
  "landing.quickNotes": "Quick notes",
  "landing.note.openRepository": "Open a local repository or a WSL path.",
  "landing.note.autoDistro":
    "The distro is suggested automatically when the context allows it.",
  "landing.note.recents":
    "The repository stays saved in the recent list for quick access.",
  "landing.recents": "Recents",
  "landing.recentlyOpened": "Recently opened repositories",
  "landing.host": "Host {os}",
  "landing.noRecentRepositories":
    "No recent repositories yet. Open one to save it here.",
  "toolbar.refresh": "Refresh",
  "toolbar.fetch": "Fetch",
  "toolbar.pull": "Pull",
  "toolbar.push": "Push",
  "toolbar.openAnother": "Open another",
  "toolbar.execution.wsl": "WSL • {distro}",
  "toolbar.execution.native": "Native Git",
  "toolbar.auto": "auto",
  "toolbar.headDetached": "Detached HEAD",
  "toolbar.noBranch": "No branch",
  "toolbar.updated": "Updated {date}",
  "branch.head": "HEAD",
  "branch.protected": "Protected",
  "branch.linked": "linked",
  "branch.noRecentCommit": "No recent commit",
  "branch.navigator": "Navigator",
  "branch.localChanges": "Local changes",
  "branch.clean": "clean",
  "branch.allCommits": "All commits",
  "branch.refsCount": "{count} refs",
  "branch.branches": "Branches",
  "branch.dragDrop":
    "Drag and drop between local branches to propose a merge.",
  "branch.searchPlaceholder": "Search branches",
  "branch.newBranchPlaceholder": "New branch",
  "branch.create": "Create",
  "branch.local": "Local",
  "branch.mergeEnabled": "merge enabled",
  "branch.remote": "Remote",
  "branch.readOnly": "read only",
  "history.allCommits": "All commits",
  "history.graphDescription": "Commit graph rendered with `@gitgraph/react`.",
  "history.commitCount": "{count} commits",
  "history.recentOrder": "recent order",
  "history.noCommits": "No commits available.",
  "inspector.title": "Inspector",
  "inspector.description":
    "Working tree, patch, and details for the selected commit.",
  "inspector.changes": "Changes",
  "inspector.commit": "Commit",
  "inspector.staged": "Staged",
  "inspector.unstaged": "Unstaged",
  "inspector.untracked": "Untracked",
  "inspector.conflicts": "Conflicts",
  "inspector.workingTree": "Working tree",
  "inspector.stageAll": "Stage all",
  "inspector.unstageAll": "Unstage all",
  "inspector.commitStagedChanges": "Commit staged changes",
  "inspector.commitMessagePlaceholder": "Describe the staged changes",
  "inspector.commitStaged": "Commit staged",
  "inspector.diff": "Diff",
  "inspector.selectedArea": "{area} • {path}",
  "inspector.stagedArea": "staged",
  "inspector.workingTreeArea": "working tree",
  "inspector.selectFile": "Select a file",
  "inspector.noDiff": "No diff available for the current selection.",
  "inspector.metadata": "Metadata",
  "inspector.date": "Date",
  "inspector.sha": "SHA",
  "inspector.refs": "Refs",
  "inspector.commitDescription":
    "Patch and message for the selected commit.",
  "inspector.message": "Message",
  "inspector.patch": "Patch",
  "inspector.noPatch": "No patch available for this commit.",
  "inspector.selectCommit":
    "Select a commit in the history to view details and patch.",
  "merge.title": "Merge branch",
  "merge.description":
    "The branch {sourceBranch} will be merged into {targetBranch}. If needed, Forketta will check out the target branch first.",
  "merge.confirm": "Confirm merge",
  "merge.progress": "Merge...",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.wsl": "WSL",
  "change.modified": "Modified",
  "change.added": "Added",
  "change.deleted": "Deleted",
  "change.renamed": "Renamed",
  "change.copied": "Copied",
  "change.untracked": "Untracked",
  "change.conflicted": "Conflicted",
  "result.stage.success": "{count} file(s) staged.",
  "result.unstage.success": "{count} file(s) unstaged.",
  "result.commit.success": "Commit created successfully.",
  "result.checkout.success": "Checked out {branch}.",
  "result.createBranch.success": "Created and switched to {branch}.",
  "result.fetch.success": "Fetched all remotes.",
  "result.pull.success": "Pull completed.",
  "result.pull.stashCreated":
    "The working tree was stashed automatically before pulling.",
  "result.pull.stashApplied":
    "The stash was reapplied successfully after pulling.",
  "result.pull.stashApplyManual":
    "Pull succeeded, but the stash re-apply needs manual attention: {error}",
  "result.push.success": "Push completed for {branch}.",
  "result.merge.autoCheckout": "Checked out {targetBranch} automatically.",
  "result.merge.success":
    "Merged {sourceBranch} into {targetBranch}.",
} as const;

export type TranslationKey = keyof typeof englishCatalog;
export type TranslationValues = Record<string, string | number>;
export type Locale = "en" | "it";

type TranslationCatalog = Record<TranslationKey, string>;

const italianCatalog: TranslationCatalog = {
  "app.error.unexpected": "Si e verificato un errore inatteso.",
  "app.notice.environment": "Ambiente",
  "app.notice.repository": "Repository",
  "app.notice.openRepository": "Apri repository",
  "app.notice.repositoryOpened": "Repository aperto",
  "app.notice.commitDetail": "Dettagli commit",
  "app.notice.fileDiff": "Diff file",
  "app.notice.refresh": "Aggiorna",
  "app.notice.checkoutBranch": "Checkout branch",
  "app.notice.createBranch": "Crea branch",
  "app.notice.commitChanges": "Commit staged changes",
  "app.notice.stageFile": "Stage file",
  "app.notice.unstageFile": "Unstage file",
  "app.notice.stageAll": "Stage all",
  "app.notice.unstageAll": "Unstage all",
  "app.notice.mergeBranches": "Merge branch",
  "app.notice.fetch": "Fetch",
  "app.notice.pullWithStash": "Pull con stash",
  "app.notice.push": "Push",
  "app.message.validRepositoryPath":
    "Inserisci un percorso repository valido.",
  "app.message.repositorySynced":
    "Repository sincronizzato con lo stato locale.",
  "app.status.noRemoteConfigured": "Nessun remote configurato",
  "app.status.notAvailable": "n/d",
  "app.status.clean": "working tree clean",
  "app.status.summary":
    "{staged} staged • {unstaged} unstaged • {untracked} untracked",
  "app.busy.working": "Operazione in corso...",
  "landing.description":
    "Client Git desktop con shell pulita, commit graph leggibile e flusso rapido per repository locali e WSL.",
  "landing.wslAvailable": "WSL disponibile",
  "landing.localHost": "Host locale",
  "landing.desktop": "desktop",
  "landing.minimalPalette": "Palette minimale",
  "landing.supported": "Supportati",
  "landing.repoPathLabel": "Percorso repository",
  "landing.repoPathPlaceholder":
    "C:\\code\\repo oppure wsl://Ubuntu/home/user/repo",
  "landing.optionalWslDistro": "Distro WSL opzionale",
  "landing.autoSelect": "Seleziona automaticamente",
  "landing.actions": "Azioni",
  "landing.openFolder": "Apri cartella",
  "landing.open": "Apri",
  "landing.opening": "Apertura...",
  "landing.quickNotes": "Note rapide",
  "landing.note.openRepository":
    "Apri un repository locale o un path WSL.",
  "landing.note.autoDistro":
    "La distro viene suggerita automaticamente se il contesto lo consente.",
  "landing.note.recents":
    "Il repository resta salvato nella lista recente per il riaccesso rapido.",
  "landing.recents": "Recenti",
  "landing.recentlyOpened": "Repository aperti di recente",
  "landing.host": "Host {os}",
  "landing.noRecentRepositories":
    "Nessun repository recente. Aprine uno per memorizzarlo qui.",
  "toolbar.refresh": "Aggiorna",
  "toolbar.fetch": "Fetch",
  "toolbar.pull": "Pull",
  "toolbar.push": "Push",
  "toolbar.openAnother": "Apri altro",
  "toolbar.execution.wsl": "WSL • {distro}",
  "toolbar.execution.native": "Git nativo",
  "toolbar.auto": "auto",
  "toolbar.headDetached": "HEAD detached",
  "toolbar.noBranch": "Nessun branch",
  "toolbar.updated": "Aggiornato {date}",
  "branch.head": "Head",
  "branch.protected": "Protetto",
  "branch.linked": "collegato",
  "branch.noRecentCommit": "Nessun commit recente",
  "branch.navigator": "Navigator",
  "branch.localChanges": "Modifiche locali",
  "branch.clean": "clean",
  "branch.allCommits": "Tutti i commit",
  "branch.refsCount": "{count} refs",
  "branch.branches": "Branch",
  "branch.dragDrop":
    "Drag & drop tra branch locali per proporre un merge.",
  "branch.searchPlaceholder": "Cerca branch",
  "branch.newBranchPlaceholder": "Nuovo branch",
  "branch.create": "Crea",
  "branch.local": "Local",
  "branch.mergeEnabled": "merge abilitato",
  "branch.remote": "Remote",
  "branch.readOnly": "sola lettura",
  "history.allCommits": "Tutti i commit",
  "history.graphDescription":
    "Commit graph renderizzato con `@gitgraph/react`.",
  "history.commitCount": "{count} commit",
  "history.recentOrder": "ordine recente",
  "history.noCommits": "Nessun commit disponibile.",
  "inspector.title": "Inspector",
  "inspector.description":
    "Working tree, patch e dettagli del commit selezionato.",
  "inspector.changes": "Modifiche",
  "inspector.commit": "Commit",
  "inspector.staged": "Staged",
  "inspector.unstaged": "Unstaged",
  "inspector.untracked": "Untracked",
  "inspector.conflicts": "Conflitti",
  "inspector.workingTree": "Working tree",
  "inspector.stageAll": "Stage all",
  "inspector.unstageAll": "Unstage all",
  "inspector.commitStagedChanges": "Commit staged changes",
  "inspector.commitMessagePlaceholder": "Descrivi la modifica staged",
  "inspector.commitStaged": "Commit staged",
  "inspector.diff": "Diff",
  "inspector.selectedArea": "{area} • {path}",
  "inspector.stagedArea": "staged",
  "inspector.workingTreeArea": "working tree",
  "inspector.selectFile": "Seleziona un file",
  "inspector.noDiff":
    "Nessuna diff disponibile per la selezione corrente.",
  "inspector.metadata": "Metadata",
  "inspector.date": "Data",
  "inspector.sha": "SHA",
  "inspector.refs": "Refs",
  "inspector.commitDescription":
    "Patch e messaggio del commit selezionato.",
  "inspector.message": "Messaggio",
  "inspector.patch": "Patch",
  "inspector.noPatch": "Nessuna patch disponibile per questo commit.",
  "inspector.selectCommit":
    "Seleziona un commit nella history per vedere dettagli e patch.",
  "merge.title": "Merge branch",
  "merge.description":
    "Il branch {sourceBranch} verra mergiato dentro {targetBranch}. Se necessario, Forketta effettuera prima il checkout del target branch.",
  "merge.confirm": "Conferma merge",
  "merge.progress": "Merge...",
  "common.cancel": "Annulla",
  "common.close": "Chiudi",
  "common.wsl": "WSL",
  "change.modified": "Modified",
  "change.added": "Added",
  "change.deleted": "Deleted",
  "change.renamed": "Renamed",
  "change.copied": "Copied",
  "change.untracked": "Untracked",
  "change.conflicted": "Conflicted",
  "result.stage.success": "{count} file staged.",
  "result.unstage.success": "{count} file unstaged.",
  "result.commit.success": "Commit creato correttamente.",
  "result.checkout.success": "Checkout completato su {branch}.",
  "result.createBranch.success": "Branch {branch} creato e attivato.",
  "result.fetch.success": "Fetch completato su tutti i remoti.",
  "result.pull.success": "Pull completato.",
  "result.pull.stashCreated":
    "Working tree stashato automaticamente prima del pull.",
  "result.pull.stashApplied":
    "Stash riapplicato correttamente dopo il pull.",
  "result.pull.stashApplyManual":
    "Pull riuscito ma il re-apply dello stash richiede attenzione manuale: {error}",
  "result.push.success": "Push completato per {branch}.",
  "result.merge.autoCheckout": "Checkout automatico su {targetBranch}.",
  "result.merge.success": "{sourceBranch} mergiato in {targetBranch}.",
};

const translationCatalogs: Record<Locale, TranslationCatalog> = {
  en: englishCatalog,
  it: italianCatalog,
};

const defaultLocale: Locale = "en";

interface I18nContextValue {
  locale: Locale;
  t: (key: TranslationKey, values?: TranslationValues) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export interface TranslationPayload {
  key: TranslationKey;
  values?: TranslationValues;
}

function translate(
  locale: Locale,
  key: TranslationKey,
  values?: TranslationValues,
): string {
  const template =
    translationCatalogs[locale][key] ?? translationCatalogs[defaultLocale][key];

  if (!values) {
    return template;
  }

  return Object.entries(values).reduce((message, [name, value]) => {
    return message.split(`{${name}}`).join(String(value));
  }, template);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nContext.Provider
      value={{
        locale: defaultLocale,
        t: (key, values) => translate(defaultLocale, key, values),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider.");
  }

  return context;
}
