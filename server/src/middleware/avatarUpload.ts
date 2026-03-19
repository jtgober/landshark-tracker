import multer from 'multer'
import path from 'path'
import type { Request } from 'express'
import type { AuthedRequest } from './auth.middleware'
import { avatarUploadDir } from '../paths'

const storage = multer.diskStorage({
  destination: avatarUploadDir,
  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) => {
    const ext = path.extname(file.originalname) || '.png'
    const authReq = req as unknown as AuthedRequest
    const userId =
      authReq.user?.id ??
      `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    cb(null, `${userId}${ext}`)
  },
})

export const avatarUpload = multer({ storage })

