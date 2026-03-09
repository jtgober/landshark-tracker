import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  getMyEvents,
  joinEventForUser,
  toggleSelfAttendance,
  leaveEventForUser,
  deleteEvent,
} from '../controllers/events.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getEvents);
router.get('/me', requireAuth, getMyEvents);
router.get('/:id', getEventById);
router.post('/', createEvent);
router.post('/:id/join', requireAuth, joinEventForUser);
router.post('/:id/attendance/toggle', requireAuth, toggleSelfAttendance);
router.post('/:id/leave', requireAuth, leaveEventForUser);
router.delete('/:id', requireAuth, deleteEvent);

export default router;
