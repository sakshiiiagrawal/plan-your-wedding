import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database';
import { env } from '../config/env';
import type { AuthenticatedUser } from '../types/express';

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
    };

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      res.status(401).json({ error: 'User not found or has been deleted' });
      return;
    }

    req.user = user as AuthenticatedUser;
    next();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')
    ) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    next(error);
  }
};
