const MAX_LENGTH = 50;

export function sanitizeClientName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\uAC00-\uD7A3]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, MAX_LENGTH);
}
