import { Router } from 'express';
import axiosInstance from '../utils/axiosInstance';
import prisma from '../prismaClient';

const router = Router();

router.get('/health', async (req, res) => {
  res.json({ ok: true, timestamp: new Date() });
});

export default router;
