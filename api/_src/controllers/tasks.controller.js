const { supabase } = require('../config/database');
const { validateRequiredFields, createValidationError } = require('../utils/validation');
const { getWeddingOwnerId } = require('../utils/auth');

const getAll = async (req, res, next) => {
  try {
    const { status, priority, event_id, assigned_to } = req.query;
    const ownerId = getWeddingOwnerId(req);

    let query = supabase
      .from('tasks')
      .select('*, events(name)')
      .eq('user_id', ownerId);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }
    if (event_id) {
      query = query.eq('event_id', event_id);
    }
    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to);
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getOverdue = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('tasks')
      .select('*, events(name)')
      .eq('user_id', ownerId)
      .lt('due_date', today)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getUpcoming = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const ownerId = getWeddingOwnerId(req);

    const { data, error } = await supabase
      .from('tasks')
      .select('*, events(name)')
      .eq('user_id', ownerId)
      .gte('due_date', today)
      .lte('due_date', nextWeek)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('tasks')
      .select('*, events(*)')
      .eq('id', id)
      .eq('user_id', ownerId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Task not found' });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const validation = validateRequiredFields(req.body, ['title']);
    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.missingFields));
    }

    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ ...req.body, user_id: ownerId }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('tasks')
      .update(req.body)
      .eq('id', id)
      .eq('user_id', ownerId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const ownerId = getWeddingOwnerId(req);

    const updateData = { status };
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', ownerId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ownerId = getWeddingOwnerId(req);
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', ownerId);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('status, due_date')
      .eq('user_id', ownerId);

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];

    const total = tasks?.length || 0;
    const pending = tasks?.filter(t => t.status === 'pending').length || 0;
    const in_progress = tasks?.filter(t => t.status === 'in_progress').length || 0;
    const completed = tasks?.filter(t => t.status === 'completed').length || 0;
    const overdue = tasks?.filter(t =>
      t.due_date < today &&
      (t.status === 'pending' || t.status === 'in_progress')
    ).length || 0;

    res.json({
      total,
      pending,
      in_progress,
      completed,
      overdue
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getOverdue,
  getUpcoming,
  getById,
  create,
  update,
  updateStatus,
  delete: deleteTask,
  getStats
};
