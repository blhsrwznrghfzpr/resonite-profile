function canUseKvCache(
  kvNamespace: KVNamespace | null | undefined
): kvNamespace is KVNamespace {
  return (
    kvNamespace != null &&
    typeof kvNamespace.get === 'function' &&
    typeof kvNamespace.put === 'function'
  );
}

function buildKvCacheKey(requestUrl: string): string {
  return `search-cache:${requestUrl}`;
}

export async function readKvCache(
  requestUrl: string,
  kvNamespace: KVNamespace | null | undefined
): Promise<unknown> {
  if (!canUseKvCache(kvNamespace)) return null;

  try {
    const value = await kvNamespace.get(buildKvCacheKey(requestUrl));
    if (!value) return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function writeKvCache(
  requestUrl: string,
  payload: unknown,
  kvNamespace: KVNamespace | null | undefined,
  ttlSeconds: number
): Promise<void> {
  if (!canUseKvCache(kvNamespace)) return;

  try {
    await kvNamespace.put(
      buildKvCacheKey(requestUrl),
      JSON.stringify(payload),
      { expirationTtl: ttlSeconds }
    );
  } catch {
    // cache write failure should not break API response
  }
}
