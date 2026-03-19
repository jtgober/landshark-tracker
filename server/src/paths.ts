import path from 'path'
import fs from 'fs'

/**
 * Root directory that maps to URL prefix `/uploads` (i.e. files live in
 * `uploads/avatars/` on disk and are served as `/uploads/avatars/...`).
 *
 * - If `UPLOADS_DIR` is set, that path is used (mount a persistent volume here).
 * - Else if `DATABASE_PATH` is set, uses `{dirname(DATABASE_PATH)}/uploads` so the
 *   same disk as SQLite keeps avatars across deploys.
 * - Else `./uploads` under `process.cwd()` (local dev).
 */
export function resolveUploadsRoot(): string {
  let root: string
  if (process.env.UPLOADS_DIR) {
    root = process.env.UPLOADS_DIR
  } else if (process.env.DATABASE_PATH) {
    root = path.join(path.dirname(process.env.DATABASE_PATH), 'uploads')
  } else {
    root = path.join(process.cwd(), 'uploads')
  }
  return path.resolve(root)
}

export const uploadsRoot = resolveUploadsRoot()
export const avatarUploadDir = path.join(uploadsRoot, 'avatars')

/** True when uploads are not the default cwd folder (persistent disk expected). */
export const uploadsIsPersistent = Boolean(
  process.env.UPLOADS_DIR || process.env.DATABASE_PATH,
)

if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true })
}
