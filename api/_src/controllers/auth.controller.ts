import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authService.createAdminUser(req.body);
    const token = authService.signToken(user);

    res.status(201).json({
      token,
      slug: user.slug,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, slug: user.slug },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await authService.findUserByEmail(email);

    if (!user || !user.password_hash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const passwordMatch = await authService.comparePasswords(password, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Determine slug: admin uses own slug; family/friends use their creator's slug
    let slug = user.slug;
    if (user.role !== 'admin' && user.created_by) {
      const adminUser = await authService.findAdminByCreatedBy(user.created_by);
      slug = adminUser?.slug ?? null;
    }

    const token = authService.signToken(user);
    res.json({
      token,
      slug,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, slug },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json(req.user);
  } catch (error) {
    next(error);
  }
};
