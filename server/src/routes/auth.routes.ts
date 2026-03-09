import { Router } from 'express'
import { login, signup, updateMe, uploadAvatar } from '../controllers/auth.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { avatarUpload } from '../middleware/avatarUpload'

const router = Router()

router.post('/signup', signup)
router.post('/login', login)
router.patch('/me', requireAuth, updateMe)
router.post(
  '/me/avatar',
  requireAuth,
  avatarUpload.single('avatar'),
  uploadAvatar,
)

export default router

