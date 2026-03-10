import { Router } from 'express'
import {
  login,
  signup,
  getMe,
  updateMe,
  uploadAvatar,
  socialLoginDev,
  startGoogleOAuth,
  googleOAuthCallback,
  startFacebookOAuth,
  facebookOAuthCallback,
} from '../controllers/auth.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { avatarUpload } from '../middleware/avatarUpload'

const router = Router()

router.post('/signup', signup)
router.post('/login', login)
router.get('/google', startGoogleOAuth)
router.get('/google/callback', googleOAuthCallback)
router.get('/facebook', startFacebookOAuth)
router.get('/facebook/callback', facebookOAuthCallback)
router.get('/me', requireAuth, getMe)
router.patch('/me', requireAuth, updateMe)
router.post(
  '/me/avatar',
  requireAuth,
  avatarUpload.single('avatar'),
  uploadAvatar,
)
router.post('/social/dev', socialLoginDev)

export default router

