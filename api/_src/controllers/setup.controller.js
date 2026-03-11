const { supabase } = require('../config/database');

const getSetupStatus = async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    // If the table doesn't exist yet, treat as not set up
    if (error) {
      return res.json({ isSetup: false });
    }

    res.json({ isSetup: data.length > 0 });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSetupStatus };
