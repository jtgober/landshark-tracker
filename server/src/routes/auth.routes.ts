import { Router } from 'express'
import {
  login,
  signup,
  getMe,
  updateMe,
  uploadAvatar,
  getUsers,
  getUserById,
  deleteUser,
  forgotPassword,
  resetPassword,
  socialLoginDev,
  startGoogleOAuth,
  googleOAuthCallback,
  startFacebookOAuth,
  facebookOAuthCallback,
} from '../controllers/auth.controller'
import { requireAuth, requireAdmin } from '../middleware/auth.middleware'
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
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset link
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200:
 *         description: Reset link generated (check server logs)
 */
router.post('/forgot-password', forgotPassword)

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using a token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password', resetPassword)

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
 * /auth/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   email: { type: string }
 *                   avatar_url: { type: string, nullable: true }
 *                   phone: { type: string, nullable: true }
 *                   created_at: { type: string }
 */
router.get('/users', requireAuth, requireAdmin, getUsers)

/**
 * @openapi
 * /auth/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user by ID (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: User ID (user-...) or member ID (user-user-...)
 *     responses:
 *       200:
 *         description: User object
 *       404:
 *         description: User not found
 */
router.get('/users/:id', requireAuth, requireAdmin, getUserById)

/**
 * @openapi
 * /auth/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user by ID (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: User ID (user-...) or member ID (user-user-...)
 *     responses:
 *       204:
 *         description: User deleted
 *       404:
 *         description: User not found
 */
router.delete('/users/:id', requireAuth, requireAdmin, deleteUser)

export default router
