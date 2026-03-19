import { apiPublicUrl } from '../config'

/**
 * Member row id is `user-${users.id}` (see server events/auth). Returns `users.id`.
 */
export function memberIdToUserId(memberId: string): string {
  return memberId.startsWith('user-') ? memberId.slice('user-'.length) : memberId
}

/**
 * Build a URL that loads reliably: uploaded avatars go through the API so missing
 * files fall back to DiceBear; external URLs are unchanged.
 */
export function resolveAvatarSrc(
  avatarUrl: string | null | undefined,
  avatarUpdatedAt: string | null | undefined,
  options?: { memberId?: string; userId?: string },
): string | undefined {
  if (avatarUrl == null || avatarUrl === '') return undefined
  const v =
    avatarUpdatedAt != null && avatarUpdatedAt !== ''
      ? `?v=${encodeURIComponent(avatarUpdatedAt)}`
      : ''
  if (avatarUrl.startsWith('http')) {
    return `${avatarUrl}${v}`
  }
  if (avatarUrl.startsWith('/uploads/')) {
    const userId =
      options?.userId ??
      (options?.memberId ? memberIdToUserId(options.memberId) : undefined)
    if (userId) {
      return apiPublicUrl(
        `/api/avatars/user/${encodeURIComponent(userId)}${v}`,
      )
    }
  }
  return apiPublicUrl(`${avatarUrl}${v}`)
}
