import { Router } from 'express';
import { getAttendanceByEvent, toggleAttendance } from '../controllers/attendance.controller';

const router = Router();

// Get attendance for a specific event
router.get('/:eventId', getAttendanceByEvent);

// Toggle a member's attendance for a specific event
router.post('/:eventId/toggle/:memberId', toggleAttendance);

export default router;
