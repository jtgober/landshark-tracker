import { Router } from 'express'
import {
  login,
  signup,
  getMe,
  updateMe,
  uploadAvatar,
  deleteUser,
  socialLoginDev,
  startGoogleOAuth,
  googleOAuthCallback,
  startFacebookOAuth,
  facebookOAuthCallback,
} from '../controllers/auth.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { avatarUpload } from '../middleware/avatarUpload'

const router = Router()

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Create a new account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201:
 *         description: Account created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.post('/signup', signup)

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email & password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.post('/login', login)

/**
 * @openapi
 * /auth/google:
 *   get:
 *     tags: [Auth]
 *     summary: Start Google OAuth flow
 *     responses:
 *       302:
 *         description: Redirects to Google
 */
router.get('/google', startGoogleOAuth)

/**
 * @openapi
 * /auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Google OAuth callback
 *     parameters:
 *       - in: query
 *         name: code
 *         schema: { type: string }
 *     responses:
 *       302:
 *         description: Redirects to frontend with token
 */
router.get('/google/callback', googleOAuthCallback)

/**
 * @openapi
 * /auth/facebook:
 *   get:
 *     tags: [Auth]
 *     summary: Start Facebook OAuth flow
 *     responses:
 *       302:
 *         description: Redirects to Facebook
 */
router.get('/facebook', startFacebookOAuth)

/**
 * @openapi
 * /auth/facebook/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Facebook OAuth callback
 *     parameters:
 *       - in: query
 *         name: code
 *         schema: { type: string }
 *     responses:
 *       302:
 *         description: Redirects to frontend with token
 */
router.get('/facebook/callback', facebookOAuthCallback)

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 */
router.get('/me', requireAuth, getMe)

/**
 * @openapi
 * /auth/me:
 *   patch:
 *     tags: [Auth]
 *     summary: Update profile (email, password, phone)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               phone: { type: string }
 *     responses:
 *       200:
 *         description: Updated profile
 */
router.patch('/me', requireAuth, updateMe)

/**
 * @openapi
 * /auth/me/avatar:
 *   post:
 *     tags: [Auth]
 *     summary: Upload avatar image
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 avatarUrl: { type: string }
 *                 avatarUpdatedAt: { type: string }
 */
router.post(
  '/me/avatar',
  requireAuth,
  avatarUpload.single('avatar'),
  uploadAvatar,
)

/**
 * @openapi
 * /auth/social/dev:
 *   post:
 *     tags: [Auth]
 *     summary: Dev-only social login shortcut
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider: { type: string, enum: [google, facebook] }
 *     responses:
 *       200:
 *         description: Auth token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.post('/social/dev', socialLoginDev)

/**
 * @openapi
 * /auth/users/{id}:
 *   delete:
 *     tags: [Auth]
 *     summary: Delete a user by ID (and their linked member/attendance)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: The user ID to delete
 *     responses:
 *       204:
 *         description: User deleted
 *       404:
 *         description: User not found
 */
router.delete('/users/:id', deleteUser)

export default router
