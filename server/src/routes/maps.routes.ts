import { Router } from 'express'
import { resolveMapUrl } from '../controllers/maps.controller'

const router = Router()

router.get('/resolve', resolveMapUrl)

export default router
