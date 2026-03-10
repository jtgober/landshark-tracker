import multer from 'multer'
import path from 'path'
import fs from 'fs'
import type { AuthedRequest } from './auth.middleware'

const uploadRoot = path.join(__dirname, '../../uploads/avatars')

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true })
}

const storage = multer.diskStorage({
  destination: uploadRoot,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png'
    const authReq = req as unknown as AuthedRequest
    const userId =
      authReq.user?.id ??
      `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    cb(null, `${userId}${ext}`)
  },
})

export const avatarUpload = multer({ storage })

