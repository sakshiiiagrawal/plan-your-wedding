const { supabase } = require('../config/database');
const { getWeddingOwnerId } = require('../utils/auth');

const getCountdown = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);
    const { data: heroRow } = await supabase
      .from('website_content')
      .select('content')
      .eq('section_name', 'hero')
      .eq('user_id', ownerId)
      .single();

    const content = heroRow?.content || {};
    const brideName = content.bride_name || 'Bride';
    const groomName = content.groom_name || 'Groom';
    const weddingDateStr = content.wedding_date;

    if (!weddingDateStr) {
      return res.json({
        bride: brideName,
        groom: groomName,
        weddingDate: null,
        countdown: null,
        totalDays: null,
        isPast: false
      });
    }

    const weddingDate = new Date(weddingDateStr);
    const now = new Date();
    const diff = weddingDate - now;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    res.json({
      bride: brideName,
      groom: groomName,
      weddingDate: weddingDate.toISOString(),
      countdown: { days, hours, minutes, seconds },
      totalDays: days,
      isPast: diff < 0
    });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);

    const { data: guests } = await supabase
      .from('guests')
      .select('id, side')
      .eq('user_id', ownerId);

    const { data: rsvps } = await supabase
      .from('guest_event_rsvp')
      .select('rsvp_status');

    const { data: tasks } = await supabase
      .from('tasks')
      .select('status')
      .eq('user_id', ownerId);

    const { data: budget } = await supabase
      .from('budget_summary')
      .select('*')
      .eq('user_id', ownerId)
      .single();

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', ownerId);

    const totalGuests = guests?.length || 0;
    const brideGuests = guests?.filter(g => g.side === 'bride').length || 0;
    const groomGuests = guests?.filter(g => g.side === 'groom').length || 0;

    const confirmedRsvps = rsvps?.filter(r => r.rsvp_status === 'confirmed').length || 0;
    const pendingRsvps = rsvps?.filter(r => r.rsvp_status === 'pending').length || 0;

    const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;

    const totalBudget = budget?.total_budget || 0;
    const totalSpent = expenses?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

    res.json({
      guests: {
        total: totalGuests,
        bride: brideGuests,
        groom: groomGuests
      },
      rsvp: {
        confirmed: confirmedRsvps,
        pending: pendingRsvps
      },
      tasks: {
        pending: pendingTasks,
        completed: completedTasks
      },
      budget: {
        total: totalBudget,
        spent: totalSpent,
        remaining: totalBudget - totalSpent
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);

    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', ownerId)
      .order('event_date', { ascending: true });

    const { data: upcomingTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', ownerId)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true })
      .limit(5);

    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('*, vendors(name)')
      .eq('user_id', ownerId)
      .eq('status', 'pending')
      .limit(5);

    res.json({
      events: events || [],
      upcomingTasks: upcomingTasks || [],
      pendingPayments: pendingPayments || []
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCountdown,
  getStats,
  getSummary
};
