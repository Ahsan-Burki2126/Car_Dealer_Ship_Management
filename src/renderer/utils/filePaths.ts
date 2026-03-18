export function toFileUrl(filePath?: string | null): string {
  if (!filePath) return "";
  if (
    /^(file|https?|data|local-image):/i.test(filePath)
  ) {
    return filePath;
  }

  return `local-image://localhost?path=${encodeURIComponent(filePath)}`;
}
