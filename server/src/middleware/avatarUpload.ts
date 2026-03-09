import multer from 'multer'
import path from 'path'
import fs from 'fs'

const uploadRoot = path.join(__dirname, '../../uploads/avatars')

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true })
}

const storage = multer.diskStorage({
  destination: uploadRoot,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png'
    // user id is on req.user from auth middleware; fall back to timestamp if missing
    const userId =
      (req as any).user?.id || `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    cb(null, `${userId}${ext}`)
  },
})

export const avatarUpload = multer({ storage })

