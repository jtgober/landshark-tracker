import { Router } from 'express';
import { getMembers, getMemberById } from '../controllers/members.controller';

const router = Router();

/**
 * @openapi
 * /members:
 *   get:
 *     tags: [Members]
 *     summary: List all members (includes avatar & phone from linked user)
 *     responses:
 *       200:
 *         description: Array of members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Member'
 */
router.get('/', getMembers);

/**
 * @openapi
 * /members/{id}:
 *   get:
 *     tags: [Members]
 *     summary: Get a single member by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Member object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Member'
 *       404:
 *         description: Not found
 */
router.get('/:id', getMemberById);

export default router;
