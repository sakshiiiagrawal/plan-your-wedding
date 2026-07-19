import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { getAuthUser } from '../shared/utils/auth.utils';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authService.createUser(req.body);
    const token = authService.signToken(user);

    res.status(201).json({
      token,
      slug: user.slug,
      user: { id: user.id, email: user.email, name: user.name, slug: user.slug },
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

    const token = authService.signToken(user);
    const slug = user.slug;
    res.json({
      token,
      slug,
      user: { id: user.id, email: user.email, name: user.name, slug },
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
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(req.user);
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await authService.requestPasswordReset(req.body.email);
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ message: 'Password updated. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await authService.verifyEmail(req.body.token);
    res.json({ message: 'Email verified successfully.' });
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id, email } = getAuthUser(req);
    await authService.requestEmailVerification({ id, email });
    res.json({ message: 'Verification email sent.' });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = getAuthUser(req);
    const user = await authService.updateProfile(id, req.body);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateViewPref = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = getAuthUser(req);
    const { key, value } = req.body as { key: string; value: unknown };
    const view_prefs = await authService.updateViewPref(id, key, value);
    res.json({ view_prefs });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id, email } = getAuthUser(req);
    await authService.changePassword(id, req.body.oldPassword, req.body.newPassword);
    // The change invalidated every token issued before it, including the one
    // used for this request — hand back a fresh one so this session survives.
    const token = authService.signToken({ id, email });
    res.json({ message: 'Password changed successfully', token });
  } catch (error) {
    next(error);
  }
};

export const listWeddings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = getAuthUser(req);
    res.json(await authService.listUserWeddings(id));
  } catch (error) {
    next(error);
  }
};

export const setActiveWedding = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = getAuthUser(req);
    await authService.setActiveWedding(id, req.body.weddingId ?? req.body.ownerId);
    res.json({ message: 'Active wedding updated' });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = getAuthUser(req);
    await authService.deleteAccount(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
