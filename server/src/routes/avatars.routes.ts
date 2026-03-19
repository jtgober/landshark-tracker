import { Router } from 'express'
import { getAvatarForUser } from '../controllers/avatars.controller'

const router = Router()

router.get('/user/:userId', getAvatarForUser)

export default router
