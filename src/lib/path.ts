export function looksLikePosixRepositoryPath(path: string): boolean {
  return path.startsWith("/");
}

export function looksLikeWslRepositoryPath(path: string): boolean {
  return (
    path.startsWith("\\\\wsl$\\") ||
    path.startsWith("\\\\wsl.localhost\\") ||
    path.startsWith("wsl://")
  );
}

export function shouldSuggestWslDistro(path: string): boolean {
  return looksLikePosixRepositoryPath(path) || looksLikeWslRepositoryPath(path);
}
