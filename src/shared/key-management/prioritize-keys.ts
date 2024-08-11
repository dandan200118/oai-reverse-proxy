import { Key } from "./index";

export function prioritizeKeys<T extends Key>(keys: T[]) {
  // Sorts keys from highest priority to lowest priority, where priority is:
  // 1. Keys which are not rate limited
  //    a. If all keys were rate limited recently, select the least-recently
  //       rate limited key.
  // 2. Keys which have not been used in the longest time

  const now = Date.now();

  return keys.sort((a, b) => {
    const aRateLimited = now - a.rateLimitedAt < a.rateLimitedUntil;
    const bRateLimited = now - b.rateLimitedAt < b.rateLimitedUntil;

    if (aRateLimited && !bRateLimited) return 1;
    if (!aRateLimited && bRateLimited) return -1;
    if (aRateLimited && bRateLimited) {
      return a.rateLimitedAt - b.rateLimitedAt;
    }

    return a.lastUsed - b.lastUsed;
  });
}
