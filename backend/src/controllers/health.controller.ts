import { Request, Response } from 'express';

export const getHealth = (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'reachinbox-email-scheduler-backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
};
