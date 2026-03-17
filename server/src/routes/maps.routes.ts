import { Router } from 'express'
import { getMapCoordinates, resolveMapUrl } from '../controllers/maps.controller'

const router = Router()

router.get('/resolve', resolveMapUrl)
router.get('/coordinates', getMapCoordinates)

export default router
