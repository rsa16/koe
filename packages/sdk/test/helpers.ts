export interface RecordedRequest {
  url: string;
  init: RequestInit;
}

export function mockFetch(
  handler: (url: string, init: RequestInit) => { status: number; body: unknown }
) {
  const calls: RecordedRequest[] = [];
  const fetchFn: typeof globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    const resolvedInit = init ?? {};
    calls.push({ url, init: resolvedInit });
    const result = handler(url, resolvedInit);
    return new Response(
      result.status === 204 ? null : JSON.stringify(result.body),
      {
        status: result.status,
        headers: { "content-type": "application/json" },
      }
    );
  };
  return { fetchFn, calls };
}
