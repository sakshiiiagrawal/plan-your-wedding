import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/database';

export const listUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, created_at, created_by')
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, email, password, role } = req.body as {
      name: string;
      email: string;
      password: string;
      role: 'family' | 'friends';
    };

    if (!name || !email || !password || !role) {
      res.status(400).json({ error: 'name, email, password, and role are required' });
      return;
    }

    if (!['family', 'friends'].includes(role)) {
      res.status(400).json({ error: 'Role must be family or friends' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase().trim(),
        password_hash,
        role,
        created_by: req.user?.id,
      })
      .select('id, email, name, role, created_at, created_by')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    // Block deletion of last admin
    if (id === req.user?.id) {
      const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');

      if (!admins || admins.length <= 1) {
        res.status(400).json({ error: 'Cannot delete the last admin account' });
        return;
      }
    }

    const { error } = await supabase.from('users').delete().eq('id', id);

    if (error) throw error;
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};
