/**
 * js/db.js
 * Local data layer for WealthFlow — NO AUTH.
 * Everything lives in localStorage under a single demo profile that is
 * auto-seeded on first load. No login/signup, no sessions — every visitor
 * just sees the working app with realistic demo data already in it.
 */

const DB_KEY = 'wf_demo_v2';

// ─── CONSTANTS ──────────────────────────────────────────
const CAT_EMOJI = {
  Food: '🍔', Transport: '🚌', Data: '📶',
  Education: '📚', Entertainment: '🎉', Miscellaneous: '⚙️'
};

const LEVELS = [
  { level: 1, name: 'Freshman Saver',   emoji: '🌱', xpReq: 0,    desc: 'Just getting started' },
  { level: 2, name: 'Budget Apprentice',emoji: '📚', xpReq: 150,  desc: 'Learning the ropes' },
  { level: 3, name: 'Smart Spender',    emoji: '💡', xpReq: 300,  desc: 'Building good habits' },
  { level: 4, name: 'Wealth Builder',   emoji: '🏗️', xpReq: 600,  desc: 'Compounding discipline' },
  { level: 5, name: 'Financial Master', emoji: '🏆', xpReq: 1000, desc: 'Total mastery' },
];

const BADGES = {
  first_log:          { id: 'first_log',          name: 'First Log',           emoji: '⚡', xp: 15 },
  first_budget:        { id: 'first_budget',        name: 'First Budget Set',    emoji: '📊', xp: 30 },
  three_day_streak:    { id: 'three_day_streak',     name: '3-Day Streak',        emoji: '🔥', xp: 25 },
  smart_saver:          { id: 'smart_saver',          name: 'Smart Saver',         emoji: '🎯', xp: 75 },
  reconciliation_pro:   { id: 'reconciliation_pro',   name: 'Reconciliation Pro',  emoji: '⚖️', xp: 30 },
  financial_master:     { id: 'financial_master',     name: 'Financial Master',    emoji: '🌟', xp: 100 },
};

// ─── SEED DATA ──────────────────────────────────────────
function seedData() {
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
  const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

  return {
    user: {
      name: 'Ama Owusu',
      balance: 0,
      streakDays: 0,
      lastLogDate: null,
      xp: 0,
      level: 1,
      levelName: 'Freshman Saver',
      badgesEarned: [],
      monthlyIncome: 0,
      nextStipendDate: '',
    },
    expenses: [],
    budget: {
      monthlyIncome: 0,
      sideIncome: 0,
      scholarshipIncome: 0,
      totalIncome: 0,
      allocations: { food: 0, transport: 0, data: 0, savings: 0, discretionary: 0 },
    },
    goals: [],
    calendar: [],
    notifications: [],
    reconcileHistory: [],
    coachMessages: [
      { role: 'assistant', text: 'Hey there! 👋 I\'m your AI financial coach. Set up your budget and start logging expenses, then ask me anything about your money.' },
    ],
  };
}

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Chat history intentionally does NOT persist across page refreshes —
      // every reload starts the AI Coach with a clean conversation.
      parsed.coachMessages = [
        { role: 'assistant', text: 'Hey there! 👋 I\'m your AI financial coach. Set up your budget and start logging expenses, then ask me anything about your money.' },
      ];
      saveDB(parsed);
      return parsed;
    }
  } catch (e) { /* fall through to reseed */ }
  const fresh = seedData();
  localStorage.setItem(DB_KEY, JSON.stringify(fresh));
  return fresh;
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

let db = loadDB();

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function awardXP(amount) {
  db.user.xp += amount;
  const newLevel = [...LEVELS].reverse().find(l => db.user.xp >= l.xpReq) || LEVELS[0];
  db.user.level = newLevel.level;
  db.user.levelName = newLevel.name;
}

function awardBadge(id) {
  if (db.user.badgesEarned.includes(id)) return false;
  db.user.badgesEarned.push(id);
  awardXP(BADGES[id]?.xp || 0);
  return true;
}

// ─── USER ───────────────────────────────────────────────
const User = {
  get() { return db.user; },
  save() { saveDB(db); },
};

// ─── EXPENSES ───────────────────────────────────────────
const Expenses = {
  getAll() {
    return [...db.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  getToday() {
    const today = new Date().toISOString().slice(0, 10);
    return db.expenses.filter(e => e.date === today);
  },
  getRecent(days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return db.expenses.filter(e => new Date(e.date) >= cutoff);
  },
  getSummaryByCategory(days) {
    const recent = this.getRecent(days);
    const summary = {};
    recent.forEach(e => { summary[e.category] = (summary[e.category] || 0) + e.amount; });
    return { summary };
  },
  add(amount, category, note) {
    const expense = {
      id: uid(), amount, category, note: note || '',
      date: new Date().toISOString().slice(0, 10),
      emoji: CAT_EMOJI[category] || '⚙️',
    };
    db.expenses.unshift(expense);
    db.user.balance -= amount;

    // Streak tracking: first log ever starts it at 1; logging again the same
    // day doesn't double-count; logging on the very next day extends it;
    // skipping a day resets it back to 1.
    const today = new Date().toISOString().slice(0, 10);
    if (db.user.lastLogDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const wasYesterday = db.user.lastLogDate === yesterday.toISOString().slice(0, 10);
      db.user.streakDays = (wasYesterday || !db.user.lastLogDate) ? db.user.streakDays + 1 : 1;
      db.user.lastLogDate = today;
    }

    const newBadges = [];
    if (awardBadge('first_log')) newBadges.push(BADGES.first_log);
    if (db.user.streakDays >= 3 && awardBadge('three_day_streak')) newBadges.push(BADGES.three_day_streak);
    awardXP(5);

    saveDB(db);
    return { expense, newBadges };
  },
  delete(id) {
    const exp = db.expenses.find(e => e.id === id);
    if (exp) db.user.balance += exp.amount;
    db.expenses = db.expenses.filter(e => e.id !== id);
    saveDB(db);
  },
};

// ─── BUDGET ─────────────────────────────────────────────
const Budget = {
  get() { return db.budget; },
  set(monthlyIncome, sideIncome, scholarshipIncome) {
    const totalIncome = monthlyIncome + sideIncome + scholarshipIncome;
    const previousIncome = db.budget.totalIncome || 0;

    db.budget = {
      monthlyIncome, sideIncome, scholarshipIncome, totalIncome,
      allocations: {
        food: +(totalIncome * 0.35).toFixed(0),
        transport: +(totalIncome * 0.15).toFixed(0),
        data: +(totalIncome * 0.10).toFixed(0),
        savings: +(totalIncome * 0.20).toFixed(0),
        discretionary: +(totalIncome * 0.20).toFixed(0),
      },
    };
    db.user.monthlyIncome = monthlyIncome;

    // Simulate income landing in the balance. On first-time setup this credits
    // the full amount; on later edits it only credits the increase, so
    // re-saving the same numbers doesn't duplicate funds.
    const delta = totalIncome - previousIncome;
    if (delta > 0) db.user.balance += delta;

    const newBadge = awardBadge('first_budget');
    saveDB(db);
    return { newBadge };
  },
};

// ─── GOALS ──────────────────────────────────────────────
const Goals = {
  getAll() { return db.goals; },
  add(name, amount, date, emoji) {
    db.goals.push({
      id: uid(), name, targetAmount: parseFloat(amount), savedAmount: 0,
      targetDate: date, emoji, isCompleted: false,
    });
    saveDB(db);
  },
  deposit(id, amount) {
    const goal = db.goals.find(g => g.id === id);
    if (!goal) return null;
    goal.savedAmount += amount;
    if (goal.savedAmount >= goal.targetAmount) goal.isCompleted = true;
    const newBadge = awardBadge('smart_saver');
    saveDB(db);
    return { newBadge };
  },
  delete(id) {
    db.goals = db.goals.filter(g => g.id !== id);
    saveDB(db);
  },
};

// ─── PREDICTOR ──────────────────────────────────────────
const Predictor = {
  calculate() {
    const user = db.user;
    if (!user.nextStipendDate) {
      return { dailyCeiling: 0, daysRemaining: null, alertLevel: 'unknown', avgDaily: 0, message: 'Set your next stipend date to get a forecast.', scenarios: [] };
    }
    const daysRemaining = UI.daysUntil(user.nextStipendDate);
    const dailyCeiling = daysRemaining > 0 ? user.balance / daysRemaining : 0;

    const recent = Expenses.getRecent(7);
    const avgDaily = recent.length ? recent.reduce((s, e) => s + e.amount, 0) / 7 : 0;

    let alertLevel = 'safe', message = `✅ At your current pace, you're on track to make it to your next stipend with room to spare.`;
    if (avgDaily > dailyCeiling * 1.3) {
      alertLevel = 'danger';
      message = `⚠️ Your average spending (GHS ${avgDaily.toFixed(2)}/day) is well above your safe ceiling. You risk running out before your next stipend.`;
    } else if (avgDaily > dailyCeiling) {
      alertLevel = 'warning';
      message = `📊 You're spending slightly faster than your ceiling allows. Small cuts now will keep you on track.`;
    }

    const scenarios = [
      { label: 'Conservative', daily: +(dailyCeiling * 0.7).toFixed(2), runway: Math.floor(user.balance / Math.max(1, dailyCeiling * 0.7)), safe: true },
      { label: 'Current Ceiling', daily: +dailyCeiling.toFixed(2), runway: daysRemaining, safe: true },
      { label: 'Your Avg Pace', daily: +avgDaily.toFixed(2), runway: Math.floor(user.balance / Math.max(1, avgDaily || 1)), safe: avgDaily <= dailyCeiling },
    ];

    return { dailyCeiling, daysRemaining, alertLevel, avgDaily, message, scenarios };
  },
  update(balance, date) {
    db.user.balance = parseFloat(balance) || 0;
    db.user.nextStipendDate = date;
    saveDB(db);
  },
};

// ─── HEALTH SCORE ───────────────────────────────────────
const HealthScore = {
  calculate() {
    const user = db.user;
    const budget = db.budget;
    const { summary } = Expenses.getSummaryByCategory(7);
    const spent = Object.values(summary).reduce((s, v) => s + v, 0);
    const budgeted = budget?.totalIncome ? (budget.totalIncome / 4) : 1;

    const budgetAdherence = Math.max(0, Math.min(100, Math.round(100 - ((spent - budgeted) / budgeted) * 100)));
    const streakConsistency = Math.min(100, Math.round((user.streakDays / 7) * 100));
    const savingsRate = budget?.totalIncome ? Math.round((budget.allocations.savings / budget.totalIncome) * 100 * 2) : 0;
    const logFrequency = Math.min(100, Expenses.getRecent(7).length * 14);

    const factors = {
      budgetAdherence: Math.min(100, budgetAdherence),
      streakConsistency,
      savingsRate: Math.min(100, savingsRate),
      logFrequency,
    };
    const score = Math.round(Object.values(factors).reduce((s, v) => s + v, 0) / 4);

    if (score >= 85) awardBadge('financial_master');
    saveDB(db);

    return { score, factors };
  },
};

// ─── RECONCILE ──────────────────────────────────────────
const Reconcile = {
  history() {
    return [...db.reconcileHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  run(actualBalance) {
    const expected = db.user.balance;
    const actual = parseFloat(actualBalance);
    const diff = actual - expected;
    const isMatch = Math.abs(diff) < 1;

    if (!isMatch) {
      db.expenses.unshift({
        id: uid(), amount: Math.abs(diff), category: 'Miscellaneous',
        note: 'Reconciliation gap (cash not previously logged)',
        date: new Date().toISOString().slice(0, 10), emoji: CAT_EMOJI.Miscellaneous,
      });
    }
    db.user.balance = actual;
    db.reconcileHistory.unshift({ date: new Date().toISOString().slice(0, 10), diff, isMatch });

    const newBadge = awardBadge('reconciliation_pro');
    saveDB(db);
    return { isMatch, diff, newBadge };
  },
};

// ─── CALENDAR ───────────────────────────────────────────
const Calendar = {
  getAll() { return db.calendar; },
  add(title, date, type, amount, emoji) {
    db.calendar.push({ id: uid(), title, date, type, amount: parseFloat(amount) || 0, emoji });
    saveDB(db);
  },
  delete(id) {
    db.calendar = db.calendar.filter(e => e.id !== id);
    saveDB(db);
  },
};

// ─── NOTIFICATIONS ──────────────────────────────────────
const Notifications = {
  getAll() {
    return [...db.notifications].sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1));
  },
  markRead(id) {
    const n = db.notifications.find(n => n.id === id);
    if (n) n.read = true;
    saveDB(db);
  },
  markAllRead() {
    db.notifications.forEach(n => n.read = true);
    saveDB(db);
  },
};

// ─── AI COACH ───────────────────────────────────────────
const Coach = {
  getHistory() { return db.coachMessages; },
  addMessage(role, text) {
    db.coachMessages.push({ role, text });
    saveDB(db);
  },
  buildSystemPrompt() {
    const user = db.user;
    const pred = Predictor.calculate();
    const budget = db.budget;
    return `You are WealthFlow's AI financial coach for a Ghanaian university student named ${user.name.split(' ')[0]}. ` +
      `Current balance: GHS ${user.balance.toFixed(2)}. Monthly income: GHS ${budget?.totalIncome || user.monthlyIncome}. ` +
      `Daily spending ceiling: GHS ${(pred.dailyCeiling || 0).toFixed(2)}. Days until next stipend: ${pred.daysRemaining ?? 'unknown'}. ` +
      `Logging streak: ${user.streakDays} days. Give short, practical, encouraging financial advice tailored to a student budget in Ghana. Use GHS for currency.`;
  },
};

// ─── UI HELPERS ─────────────────────────────────────────
const UI = {
  formatGHS(amount) {
    const n = parseFloat(amount) || 0;
    return 'GHS ' + n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' });
  },
  daysUntil(dateStr) {
    const diff = new Date(dateStr) - new Date();
    return Math.max(0, Math.ceil(diff / 86400000));
  },
  progressBar(pct, color) {
    pct = Math.max(0, Math.min(100, pct));
    return `<div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>`;
  },
  showToast(message, type) {
    const existing = document.querySelector('.wf-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'wf-toast';
    const icon = type === 'warn' ? '⚠️' : type === 'success' ? '✅' : '💬';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  },
};