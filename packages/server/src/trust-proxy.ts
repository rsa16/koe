export type TrustProxyFn = (address: string, hop: number) => boolean;

export type TrustProxyConfig = boolean | string | string[] | TrustProxyFn;

export interface ParseTrustProxyOptions {
  allowUnbounded?: boolean;
}

const UNBOUNDED_TOKENS = new Set(["true", "*"]);
const CATCH_ALL_RANGES = new Set(["0.0.0.0/0", "::/0"]);
const HOP_COUNT = /^\d+$/;

function unboundedError(): Error {
  return new Error(
    "TRUST_PROXY trusts every proxy, which lets clients spoof their address; " +
      "list the trusted proxies (addresses/CIDR ranges) or set TRUST_PROXY_ALLOW_UNBOUNDED=true to accept the risk"
  );
}

/**
 * Parses the `TRUST_PROXY` environment value into a Fastify `trustProxy`
 * configuration. An unset value trusts nothing, so forwarded headers are
 * ignored and the socket peer is used. A comma-separated list of addresses or
 * CIDR ranges is bounded and accepted. Trusting every proxy — via `true`, `*`,
 * or a catch-all range — is rejected unless explicitly acknowledged.
 */
export function parseTrustProxy(
  value: string | undefined,
  options: ParseTrustProxyOptions = {}
): TrustProxyConfig {
  const raw = value?.trim() ?? "";

  if (!raw || raw.toLowerCase() === "false") {
    return false;
  }

  if (UNBOUNDED_TOKENS.has(raw.toLowerCase())) {
    if (!options.allowUnbounded) {
      throw unboundedError();
    }
    return true;
  }

  if (HOP_COUNT.test(raw)) {
    throw new Error(
      "TRUST_PROXY does not accept a bare hop count: trusting a number of hops " +
        "cannot validate the immediate peer, so a directly-reachable client could " +
        "spoof its address. List the trusted proxy addresses/CIDR ranges instead."
    );
  }

  const entries = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    throw new Error("TRUST_PROXY must be a comma-separated list of proxies");
  }

  if (entries.some((entry) => CATCH_ALL_RANGES.has(entry.toLowerCase()))) {
    if (!options.allowUnbounded) {
      throw unboundedError();
    }
    return true;
  }

  return entries.length === 1 ? entries[0] : entries;
}
