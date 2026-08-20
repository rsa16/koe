export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "23505"
  );
}

export async function withUniqueViolationRetry<T>(
  fn: () => Promise<T>
): Promise<T> {
  let attempt = 0;
  for (;;) {
    attempt++;
    try {
      return await fn();
    } catch (err) {
      if (attempt >= 2 || !isUniqueViolation(err)) {
        throw err;
      }
    }
  }
}