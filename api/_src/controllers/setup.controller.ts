import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';

export const getSetupStatus = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    // If the table doesn't exist yet, treat as not set up
    if (error) {
      res.json({ isSetup: false });
      return;
    }

    res.json({ isSetup: data.length > 0 });
  } catch (error) {
    next(error);
  }
};
