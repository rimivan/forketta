import type { RepoRequest } from "../types";

export interface SavedRepository extends RepoRequest {
  label: string;
  lastOpenedAt: string;
}

const STORAGE_KEY = "forketta.recent-repositories";

export function loadRecentRepositories(): SavedRepository[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as SavedRepository[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function upsertRecentRepository(
  entries: SavedRepository[],
  next: SavedRepository,
): SavedRepository[] {
  return [next, ...entries.filter((entry) => entry.path !== next.path)].slice(
    0,
    6,
  );
}

export function persistRecentRepositories(entries: SavedRepository[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
