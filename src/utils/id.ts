/**
 * Lightweight unique-id generator.
 *
 * We avoid pulling in the `uuid` package (which needs a crypto polyfill on RN)
 * because a timestamp + random suffix is more than enough uniqueness for
 * client-side ids in a single-user, offline app.
 */
export function createId(prefix = 'id'): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}_${rand}`;
}
