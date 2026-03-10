const { supabase } = require('../config/database');
const { WEDDING_DATE, BRIDE_NAME, GROOM_NAME } = require('../config/constants');

const getCountdown = async (req, res, next) => {
  try {
    const now = new Date();
    const diff = WEDDING_DATE - now;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    res.json({
      bride: BRIDE_NAME,
      groom: GROOM_NAME,
      weddingDate: WEDDING_DATE.toISOString(),
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
    // Get guest counts
    const { data: guests, error: guestError } = await supabase
      .from('guests')
      .select('id, side');

    const { data: rsvps, error: rsvpError } = await supabase
      .from('guest_event_rsvp')
      .select('rsvp_status');

    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('status');

    const { data: budget, error: budgetError } = await supabase
      .from('budget_summary')
      .select('*')
      .single();

    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('amount');

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
    // Get events
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });

    // Get upcoming tasks
    const { data: upcomingTasks } = await supabase
      .from('tasks')
      .select('*')
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true })
      .limit(5);

    // Get pending payments
    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('*, vendors(name)')
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
