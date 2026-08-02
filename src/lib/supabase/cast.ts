export function toRows<T>(value: unknown): T[] {
  return (value ?? []) as T[];
}

export function toRow<T>(value: unknown): T | null {
  return (value ?? null) as T | null;
}
