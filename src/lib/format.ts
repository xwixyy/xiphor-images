export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}
