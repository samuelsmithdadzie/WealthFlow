/**
 * js/db.js — WealthFlow Simulated Database
 * All data lives in localStorage. Every page imports this file.
 * This replaces Firebase + Express entirely.
 */

const DB_KEY = "wealthflow_v1";

// ─── SEED DATA (first load) ───────────────────────────────────
const SEED = {
  user: {
    uid: "usr_001",
    name: "Ama Owusu",
    email: "ama@ug.edu.gh",
    university: "University of Ghana",
    year: "Year 3",
    balance: 847.50,
    monthlyIncome: 1200,
    sideIncome: 200,
    scholarshipIncome: 0,
    nextStipendDate: new Date(Date.now() + 18 * 86400000).toISOString().slice(0, 10),
    level: 3,
    levelName: "Smart Spender",
    xp: 340,
    xpNext: 600,
    streakDays: 5,
    lastLogDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    healthScore: 74,
    badgesEarned: ["first_log", "first_budget", "three_day_streak"],
    currency: "GHS",
    isPremium: false,
    createdAt: new Date().toISOString()
  },

  expenses: [
    { id: "e1", amount: 18.00, category: "Food",          emoji: "🍔", note: "Campus Canteen",         date: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: "e2", amount: 5.50,  category: "Transport",     emoji: "🚌", note: "Trotro fare",            date: new Date(Date.now() - 4 * 3600000).toISOString() },
    { id: "e3", amount: 20.00, category: "Data",          emoji: "📶", note: "MTN bundle",             date: new Date(Date.now() - 86400000).toISOString() },
    { id: "e4", amount: 12.00, category: "Education",     emoji: "📚", note: "Lecture notes printing", date: new Date(Date.now() - 86400000).toISOString() },
    { id: "e5", amount: 35.00, category: "Food",          emoji: "🍔", note: "Weekend groceries",      date: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: "e6", amount: 8.00,  category: "Entertainment", emoji: "🎉", note: "Netflix subscription",   date: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: "e7", amount: 15.00, category: "Transport",     emoji: "🚌", note: "Uber to campus",         date: new Date(Date.now() - 4 * 86400000).toISOString() },
    { id: "e8", amount: 22.00, category: "Food",          emoji: "🍔", note: "Dinner with friends",    date: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: "e9", amount: 5.00,  category: "Miscellaneous", emoji: "⚙️", note: "Library printing",      date: new Date(Date.now() - 6 * 86400000).toISOString() }
  ],

  budget: {
    monthlyIncome: 1200,
    sideIncome: 200,
    scholarshipIncome: 0,
    totalIncome: 1400,
    allocations: { food: 490, transport: 210, data: 140, savings: 280, discretionary: 280 },
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  },

  goals: [
    { id: "g1", name: "Laptop Fund",    emoji: "💻", targetAmount: 500,  savedAmount: 240, targetDate: "2025-08-31", isCompleted: false },
    { id: "g2", name: "December Trip",  emoji: "✈️", targetAmount: 1000, savedAmount: 200, targetDate: "2025-12-01", isCompleted: false }
  ],

  coachHistory: [
    { role: "assistant", text: "Hey Ama! 👋 I'm your WealthFlow AI Coach. I can see your balance is GHS 847.50 with 18 days until your next stipend — giving you a daily ceiling of about GHS 47. Ask me anything about your finances!" }
  ],

  reconcileHistory: [],

  calendarEvents: [
    { id: "c1", title: "Monthly Allowance",   emoji: "💰", date: new Date(Date.now() + 18 * 86400000).toISOString().slice(0,10), type: "stipend",  amount: 1200 },
    { id: "c2", title: "Library Fine Deadline",emoji: "📚", date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0,10),  type: "deadline", amount: 10 },
    { id: "c3", title: "Room Rent Due",        emoji: "🏠", date: new Date(Date.now() + 12 * 86400000).toISOString().slice(0,10), type: "bill",     amount: 350 }
  ],

  oppApplications: [],

  notifications: [
    { id: "n1", text: "Your 5-day streak is active! 🔥 Keep logging today.", read: false, time: "2h ago" },
    { id: "n2", text: "New scholarship: DAAD Study Award — deadline Oct 15.", read: false, time: "5h ago" },
    { id: "n3", text: "Budget tip: You're 18% over food spending this week.", read: true, time: "1d ago" }
  ]
};

// ─── CONSTANTS ────────────────────────────────────────────────
const BADGES = {
  first_log:         { id: "first_log",         name: "First Log",          emoji: "📝", xp: 10,  desc: "Logged your first expense" },
  three_day_streak:  { id: "three_day_streak",  name: "3-Day Streak",       emoji: "⚡", xp: 20,  desc: "Logged 3 days in a row" },
  seven_day_streak:  { id: "seven_day_streak",  name: "7-Day Streak",       emoji: "🔥", xp: 50,  desc: "Logged 7 days in a row" },
  first_budget:      { id: "first_budget",      name: "First Budget Set",   emoji: "📊", xp: 30,  desc: "Set up your first budget" },
  smart_saver:       { id: "smart_saver",       name: "Smart Saver",        emoji: "🏆", xp: 75,  desc: "Completed a savings goal" },
  discipline_master: { id: "discipline_master", name: "Discipline Master",  emoji: "🎯", xp: 100, desc: "14 days under daily ceiling" },
  opp_hunter:        { id: "opp_hunter",        name: "Opportunity Hunter", emoji: "🔍", xp: 40,  desc: "Applied to 3+ opportunities" },
  reconcile_pro:     { id: "reconcile_pro",     name: "Reconciliation Pro", emoji: "⚖️", xp: 30,  desc: "Completed first reconciliation" }
};

const LEVELS = [
  { level: 1, name: "Freshman Saver",    emoji: "🌱", xpReq: 0,    desc: "Account created, onboarding complete" },
  { level: 2, name: "Budget Apprentice", emoji: "📚", xpReq: 100,  desc: "Budget configured, 3-day streak" },
  { level: 3, name: "Smart Spender",     emoji: "💡", xpReq: 300,  desc: "7-day consecutive daily limit adherence" },
  { level: 4, name: "Wealth Builder",    emoji: "🏗️", xpReq: 600,  desc: "First savings milestone attained" },
  { level: 5, name: "Financial Master",  emoji: "🏆", xpReq: 1000, desc: "Health score above 85 for a full month" }
];

const OPPORTUNITIES = [
  { id:"o1",  type:"scholarship", title:"MasterCard Foundation Scholars Program",  org:"MasterCard Foundation",  logo:"💳", desc:"Full scholarships for academically talented yet financially disadvantaged students across Africa to attend leading universities.", deadline:"Aug 31, 2025",  location:"Pan-Africa",    field:"All Fields",      amount:"Full Scholarship",    urgent:false },
  { id:"o2",  type:"internship",  title:"Software Engineering Intern",              org:"MTN Ghana",              logo:"📡", desc:"Join MTN Ghana's technology team for a 3-month paid internship working on mobile money and digital infrastructure projects.",     deadline:"Jul 15, 2025",  location:"Accra, Ghana",  field:"Technology",      amount:"GHS 1,200/mo",        urgent:true  },
  { id:"o3",  type:"grant",       title:"Tony Elumelu Foundation Grant",            org:"TEF",                    logo:"🌍", desc:"USD $5,000 seed capital plus mentorship for young African entrepreneurs with viable business ideas to launch and scale.",         deadline:"Sep 30, 2025",  location:"Pan-Africa",    field:"Entrepreneurship",amount:"USD $5,000",           urgent:false },
  { id:"o4",  type:"job",         title:"Campus Ambassador",                        org:"Flutterwave",            logo:"⚡", desc:"Represent Flutterwave on your campus, drive adoption among students, and earn commissions plus performance bonuses.",           deadline:"Rolling",       location:"Your Campus",   field:"Marketing",       amount:"GHS 400+/mo",         urgent:false },
  { id:"o5",  type:"scholarship", title:"DAAD Study Scholarship",                   org:"DAAD Germany",           logo:"🎓", desc:"German Academic Exchange Service scholarships for African students pursuing postgraduate degrees at German universities.",        deadline:"Oct 15, 2025",  location:"Germany",       field:"All Fields",      amount:"Full Scholarship",    urgent:false },
  { id:"o6",  type:"internship",  title:"Data Analyst Intern",                      org:"Vodafone Ghana",         logo:"📊", desc:"Assist the analytics team with data pipelines, dashboards, and business intelligence reports in a fast-paced telecom environment.", deadline:"Jul 20, 2025",  location:"Accra, Ghana",  field:"Data/Analytics",  amount:"GHS 1,000/mo",        urgent:true  },
  { id:"o7",  type:"grant",       title:"Ghana Education Trust Fund",               org:"GETFund",                logo:"🇬🇭", desc:"Government-backed educational grants for Ghanaian students pursuing tertiary education in nationally prioritised fields.",      deadline:"Aug 1, 2025",   location:"Ghana",         field:"All Fields",      amount:"Up to GHS 5,000",     urgent:false },
  { id:"o8",  type:"job",         title:"Freelance Content Writer",                 org:"Remote / Multiple",      logo:"✍️", desc:"Write articles, blog posts, and social media content for African tech startups. Flexible hours, fully remote, pay per piece.",   deadline:"Always Open",   location:"Remote",        field:"Writing/Media",   amount:"GHS 50–150/article",  urgent:false },
  { id:"o9",  type:"scholarship", title:"Chevening Scholarship",                    org:"UK Government",          logo:"🇬🇧", desc:"Prestigious UK government scholarship for outstanding Ghanaians to pursue a one-year master's degree in the UK.",               deadline:"Nov 1, 2025",   location:"United Kingdom",field:"All Fields",      amount:"Full Scholarship",    urgent:false },
  { id:"o10", type:"internship",  title:"Finance & Strategy Intern",                org:"Ecobank Ghana",          logo:"🏦", desc:"Work alongside Ecobank's strategy team on market research, financial modeling, and cross-border banking analytics.",            deadline:"Jul 10, 2025",  location:"Accra, Ghana",  field:"Finance",         amount:"GHS 900/mo",          urgent:true  },
  { id:"o11", type:"grant",       title:"Youth Agripreneur Grant",                  org:"IFAD Ghana",             logo:"🌱", desc:"Grants and technical support for young Ghanaians aged 18–35 starting or scaling agribusiness ventures across Ghana.",           deadline:"Sep 15, 2025",  location:"Ghana",         field:"Agriculture",     amount:"Up to USD $10,000",   urgent:false },
  { id:"o12", type:"job",         title:"Peer Tutor",                               org:"University Tutoring Centre",logo:"📖",desc:"Tutor fellow students in STEM subjects on campus. Competitive hourly pay, flexible scheduling around your lectures.",       deadline:"Rolling",       location:"On Campus",     field:"Education",       amount:"GHS 30–50/hr",        urgent:false }
];

const CATEGORY_EMOJI = { Food:"🍔", Transport:"🚌", Data:"📶", Education:"📚", Entertainment:"🎉", Miscellaneous:"⚙️" };
const BUDGET_PCT     = { food:0.35, transport:0.15, data:0.10, savings:0.20, discretionary:0.20 };

// ─── DB CORE ─────────────────────────────────────────────────
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function saveDB(data) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(data)); } catch(e) {}
}

function getDB() {
  let db = loadDB();
  if (!db) { db = JSON.parse(JSON.stringify(SEED)); saveDB(db); }
  return db;
}

function updateDB(updates) {
  const db = getDB();
  Object.assign(db, updates);
  saveDB(db);
  return db;
}

// ─── USER METHODS ─────────────────────────────────────────────
const User = {
  get() { return getDB().user; },

  update(fields) {
    const db = getDB();
    Object.assign(db.user, fields);
    saveDB(db);
    return db.user;
  },

  addXP(amount) {
    const db = getDB();
    db.user.xp = (db.user.xp || 0) + amount;
    // Recalculate level
    let newLevel = LEVELS[0];
    for (const lvl of LEVELS) { if (db.user.xp >= lvl.xpReq) newLevel = lvl; }
    db.user.level = newLevel.level;
    db.user.levelName = newLevel.name;
    saveDB(db);
    return db.user;
  },

  awardBadge(badgeId) {
    const db = getDB();
    if (!db.user.badgesEarned.includes(badgeId)) {
      db.user.badgesEarned.push(badgeId);
      const badge = BADGES[badgeId];
      if (badge) db.user.xp = (db.user.xp || 0) + badge.xp;
      saveDB(db);
      return true; // newly earned
    }
    return false;
  },

  updateStreak() {
    const db   = getDB();
    const today = new Date().toISOString().slice(0, 10);
    const last  = db.user.lastLogDate;
    if (last === today) return db.user.streakDays; // already logged today
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (last === yesterday) db.user.streakDays = (db.user.streakDays || 0) + 1;
    else db.user.streakDays = 1;
    db.user.lastLogDate = today;
    saveDB(db);
    return db.user.streakDays;
  }
};

// ─── EXPENSE METHODS ─────────────────────────────────────────
const Expenses = {
  getAll() { return getDB().expenses; },

  getRecent(days = 7) {
    const cutoff = Date.now() - days * 86400000;
    return this.getAll().filter(e => new Date(e.date) > cutoff);
  },

  getToday() {
    const today = new Date().toDateString();
    return this.getAll().filter(e => new Date(e.date).toDateString() === today);
  },

  getSummaryByCategory(days = 7) {
    const recent = this.getRecent(days);
    const summary = {};
    let total = 0;
    for (const e of recent) {
      summary[e.category] = (summary[e.category] || 0) + e.amount;
      total += e.amount;
    }
    return { summary, total };
  },

  add(amount, category, note = "") {
    const db  = getDB();
    const exp = {
      id: "e" + Date.now(),
      amount: parseFloat(amount),
      category,
      emoji: CATEGORY_EMOJI[category] || "💸",
      note,
      date: new Date().toISOString()
    };
    db.expenses.unshift(exp);
    db.user.balance = parseFloat((db.user.balance - exp.amount).toFixed(2));

    // Streak
    const today     = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (db.user.lastLogDate !== today) {
      if (db.user.lastLogDate === yesterday) db.user.streakDays++;
      else db.user.streakDays = 1;
      db.user.lastLogDate = today;
    }

    // Badges
    const newBadges = [];
    if (!db.user.badgesEarned.includes("first_log")) {
      db.user.badgesEarned.push("first_log");
      db.user.xp += BADGES.first_log.xp;
      newBadges.push(BADGES.first_log);
    }
    if (db.user.streakDays >= 3 && !db.user.badgesEarned.includes("three_day_streak")) {
      db.user.badgesEarned.push("three_day_streak");
      db.user.xp += BADGES.three_day_streak.xp;
      newBadges.push(BADGES.three_day_streak);
    }
    if (db.user.streakDays >= 7 && !db.user.badgesEarned.includes("seven_day_streak")) {
      db.user.badgesEarned.push("seven_day_streak");
      db.user.xp += BADGES.seven_day_streak.xp;
      newBadges.push(BADGES.seven_day_streak);
    }
    db.user.xp += 10; // base XP per log

    // Recalculate level
    let newLevel = LEVELS[0];
    for (const lvl of LEVELS) { if (db.user.xp >= lvl.xpReq) newLevel = lvl; }
    db.user.level = newLevel.level;
    db.user.levelName = newLevel.name;

    saveDB(db);
    return { expense: exp, newBadges, streak: db.user.streakDays };
  },

  delete(id) {
    const db  = getDB();
    const exp = db.expenses.find(e => e.id === id);
    if (exp) {
      db.user.balance = parseFloat((db.user.balance + exp.amount).toFixed(2));
      db.expenses = db.expenses.filter(e => e.id !== id);
      saveDB(db);
    }
  }
};

// ─── BUDGET METHODS ───────────────────────────────────────────
const Budget = {
  get() { return getDB().budget; },

  set(monthlyIncome, sideIncome = 0, scholarshipIncome = 0) {
    const db = getDB();
    const total = monthlyIncome + sideIncome + scholarshipIncome;
    db.budget = {
      monthlyIncome, sideIncome, scholarshipIncome, totalIncome: total,
      allocations: {
        food:          parseFloat((total * 0.35).toFixed(2)),
        transport:     parseFloat((total * 0.15).toFixed(2)),
        data:          parseFloat((total * 0.10).toFixed(2)),
        savings:       parseFloat((total * 0.20).toFixed(2)),
        discretionary: parseFloat((total * 0.20).toFixed(2))
      },
      month: new Date().getMonth() + 1,
      year:  new Date().getFullYear()
    };
    db.user.monthlyIncome = monthlyIncome;

    // Badge
    const newBadge = !db.user.badgesEarned.includes("first_budget");
    if (newBadge) {
      db.user.badgesEarned.push("first_budget");
      db.user.xp += BADGES.first_budget.xp;
    }
    db.user.xp += 30;
    saveDB(db);
    return { budget: db.budget, newBadge };
  }
};

// ─── GOALS METHODS ────────────────────────────────────────────
const Goals = {
  getAll() { return getDB().goals; },

  add(name, targetAmount, targetDate, emoji = "🎯") {
    const db = getDB();
    const goal = { id: "g" + Date.now(), name, emoji, targetAmount: parseFloat(targetAmount), savedAmount: 0, targetDate, isCompleted: false };
    db.goals.push(goal);
    saveDB(db);
    return goal;
  },

  deposit(goalId, amount) {
    const db   = getDB();
    const goal = db.goals.find(g => g.id === goalId);
    if (!goal) return null;
    goal.savedAmount = parseFloat((goal.savedAmount + parseFloat(amount)).toFixed(2));
    goal.isCompleted = goal.savedAmount >= goal.targetAmount;
    const newBadge = goal.isCompleted && !db.user.badgesEarned.includes("smart_saver");
    if (newBadge) {
      db.user.badgesEarned.push("smart_saver");
      db.user.xp += BADGES.smart_saver.xp + 100;
    } else {
      db.user.xp += 20;
    }
    saveDB(db);
    return { goal, newBadge };
  },

  delete(goalId) {
    const db = getDB();
    db.goals = db.goals.filter(g => g.id !== goalId);
    saveDB(db);
  }
};

// ─── PREDICTOR ────────────────────────────────────────────────
const Predictor = {
  calculate() {
    const user     = User.get();
    const expenses = Expenses.getAll();
    const balance  = user.balance;
    const next     = user.nextStipendDate ? new Date(user.nextStipendDate) : null;

    if (!next) return { balance, daysRemaining: null, dailyCeiling: null, alertLevel: "unknown", message: "Set your next stipend date to activate the predictor." };

    const today        = new Date(); today.setHours(0,0,0,0);
    const daysRemaining = Math.max(Math.round((next - today) / 86400000), 1);
    const dailyCeiling  = parseFloat((balance / daysRemaining).toFixed(2));

    const week7Ago   = Date.now() - 7 * 86400000;
    const recent     = expenses.filter(e => new Date(e.date) > week7Ago);
    const recentTotal = recent.reduce((s, e) => s + e.amount, 0);
    const avgDaily    = recent.length > 0 ? parseFloat((recentTotal / 7).toFixed(2)) : dailyCeiling;
    const projDays    = avgDaily > 0 ? Math.floor(balance / avgDaily) : daysRemaining;

    let alertLevel, message;
    if (projDays >= daysRemaining) {
      alertLevel = "safe";
      message    = "You're on track — funds will last until your next stipend.";
    } else if (projDays >= daysRemaining * 0.7) {
      alertLevel = "warning";
      message    = `At your current pace, funds deplete ${daysRemaining - projDays} day(s) before your next stipend.`;
    } else {
      alertLevel = "danger";
      message    = `⚠️ At GHS ${avgDaily}/day, funds will run out in ${projDays} days — ${daysRemaining - projDays} days before your next stipend.`;
    }

    return {
      balance, daysRemaining, dailyCeiling, avgDaily, projDays, alertLevel, message,
      scenarios: [
        { label: "Reduce spending 25%", daily: parseFloat((avgDaily * 0.75).toFixed(2)), runway: Math.floor(balance / (avgDaily * 0.75)), safe: Math.floor(balance / (avgDaily * 0.75)) >= daysRemaining },
        { label: "Stay at daily ceiling", daily: dailyCeiling, runway: daysRemaining, safe: true },
        { label: "Current pace",          daily: avgDaily,     runway: projDays,      safe: projDays >= daysRemaining }
      ]
    };
  },

  update(newBalance, nextStipendDate) {
    User.update({ balance: parseFloat(newBalance), nextStipendDate });
    return this.calculate();
  }
};

// ─── HEALTH SCORE ─────────────────────────────────────────────
const HealthScore = {
  calculate() {
    const user    = User.get();
    const { summary, total } = Expenses.getSummaryByCategory(7);
    const budget  = Budget.get();
    const alloc   = budget?.allocations;

    // Factor 1: Budget adherence
    let budgetAdherence = 50;
    if (alloc) {
      const cats = [{ k: "Food", b: alloc.food }, { k: "Transport", b: alloc.transport }, { k: "Data", b: alloc.data }];
      let dev = 0;
      cats.forEach(({ k, b }) => { const a = summary[k] || 0; if (b > 0) dev += Math.min(Math.max(0, (a - b) / b), 1); });
      budgetAdherence = Math.max(0, Math.round(100 - (dev / cats.length) * 100));
    }

    // Factor 2: Streak consistency
    const streakConsistency = Math.min(100, Math.round((user.streakDays || 0) / 30 * 100));

    // Factor 3: Savings rate
    const weeklyIncome  = (budget?.totalIncome || user.monthlyIncome || 0) / 4;
    const savedAmt      = weeklyIncome - total;
    const savingsRate   = weeklyIncome > 0 ? Math.max(0, Math.min(100, Math.round(savedAmt / weeklyIncome / 0.20 * 100))) : 50;

    // Factor 4: Log frequency
    const recent7 = Expenses.getRecent(7);
    const logFrequency = Math.min(100, Math.round(recent7.length / 7 * 100));

    const score = Math.round(budgetAdherence * 0.30 + streakConsistency * 0.25 + savingsRate * 0.25 + logFrequency * 0.20);
    User.update({ healthScore: score });
    return { score, factors: { budgetAdherence, streakConsistency, savingsRate, logFrequency } };
  }
};

// ─── RECONCILE ────────────────────────────────────────────────
const Reconcile = {
  run(actualBalance) {
    const db       = getDB();
    const expected = db.user.balance;
    const actual   = parseFloat(actualBalance);
    const diff     = parseFloat((expected - actual).toFixed(2));
    const isMatch  = Math.abs(diff) < 0.01;

    const record = { id: "r" + Date.now(), expected, actual, diff, date: new Date().toISOString(), isMatch };
    db.reconcileHistory.unshift(record);
    db.user.balance = actual;

    const newBadge = !db.user.badgesEarned.includes("reconcile_pro");
    if (newBadge) {
      db.user.badgesEarned.push("reconcile_pro");
      db.user.xp += BADGES.reconcile_pro.xp;
    }
    db.user.xp += 25;
    saveDB(db);

    return { record, newBadge, isMatch, diff };
  },

  history() { return getDB().reconcileHistory; }
};

// ─── CALENDAR ─────────────────────────────────────────────────
const Calendar = {
  getAll() { return getDB().calendarEvents; },

  add(title, date, type, amount = 0, emoji = "📅") {
    const db  = getDB();
    const evt = { id: "c" + Date.now(), title, date, type, amount: parseFloat(amount) || 0, emoji };
    db.calendarEvents.push(evt);
    saveDB(db);
    return evt;
  },

  delete(id) {
    const db = getDB();
    db.calendarEvents = db.calendarEvents.filter(c => c.id !== id);
    saveDB(db);
  }
};

// ─── AI COACH ─────────────────────────────────────────────────
const Coach = {
  getHistory() { return getDB().coachHistory; },

  addMessage(role, text) {
    const db = getDB();
    db.coachHistory.push({ role, text });
    saveDB(db);
  },

  buildSystemPrompt() {
    const user  = User.get();
    const pred  = Predictor.calculate();
    const hs    = HealthScore.calculate();
    const { summary, total } = Expenses.getSummaryByCategory(7);
    const topCat = Object.entries(summary).sort((a, b) => b[1] - a[1])[0];

    return `You are WealthFlow's AI Financial Coach for Ghanaian university students. Be concise (under 150 words), friendly, and always reference the student's actual data.

Student: ${user.name} | ${user.university}, ${user.year}
Balance: GHS ${user.balance.toFixed(2)} | Monthly income: GHS ${Budget.get()?.totalIncome || user.monthlyIncome}
Days to next stipend: ${pred.daysRemaining || "unknown"} | Daily ceiling: GHS ${pred.dailyCeiling || "N/A"}
Average daily spend: GHS ${pred.avgDaily || "N/A"} | Runway: ${pred.alertLevel}
Health score: ${hs.score}/100 | Streak: ${user.streakDays} days
Top spend this week: ${topCat ? topCat[0] + " (GHS " + topCat[1].toFixed(2) + ")" : "none"}
This week total spending: GHS ${total.toFixed(2)}

Use GHS. Be specific. If income is strained, suggest scholarships or side hustles.`;
  }
};

// ─── OPPORTUNITIES ────────────────────────────────────────────
const Opportunities = {
  getAll()  { return OPPORTUNITIES; },

  filter(type, search) {
    return OPPORTUNITIES.filter(o => {
      const matchType   = !type || type === "all" || o.type === type;
      const q           = (search || "").toLowerCase();
      const matchSearch = !q || (o.title + o.org + o.desc + o.field + o.location).toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  },

  trackApplication(oppId) {
    const db = getDB();
    if (!db.oppApplications.find(a => a.id === oppId)) {
      db.oppApplications.push({ id: oppId, date: new Date().toISOString() });
      db.user.xp += 20;
      if (db.oppApplications.length >= 3 && !db.user.badgesEarned.includes("opp_hunter")) {
        db.user.badgesEarned.push("opp_hunter");
        db.user.xp += BADGES.opp_hunter.xp;
        saveDB(db);
        return { newBadge: true };
      }
      saveDB(db);
    }
    return { newBadge: false };
  }
};

// ─── NOTIFICATIONS ────────────────────────────────────────────
const Notifications = {
  getAll()        { return getDB().notifications; },
  getUnread()     { return this.getAll().filter(n => !n.read); },
  markRead(id)    { const db = getDB(); const n = db.notifications.find(x => x.id === id); if (n) { n.read = true; saveDB(db); } },
  markAllRead()   { const db = getDB(); db.notifications.forEach(n => n.read = true); saveDB(db); },
  add(text)       { const db = getDB(); db.notifications.unshift({ id: "n"+Date.now(), text, read: false, time: "Just now" }); saveDB(db); }
};

// ─── UI HELPERS (shared across pages) ────────────────────────
const UI = {
  showToast(message, type = "success") {
    const existing = document.querySelector(".wf-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "wf-toast";
    const colors = { success: "var(--accent)", warn: "var(--warn)", error: "var(--danger)" };
    const icons  = { success: "✅", warn: "⚠️", error: "❌" };
    toast.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:9999;
      background:var(--surface);border:1px solid var(--border);
      border-left:3px solid ${colors[type] || colors.success};
      border-radius:14px;padding:14px 18px;max-width:380px;
      box-shadow:0 8px 32px rgba(0,0,0,0.4);
      display:flex;align-items:flex-start;gap:10px;font-size:0.875rem;
      animation:slideIn 0.2s ease;color:var(--text);line-height:1.5;
    `;
    toast.innerHTML = `<span>${icons[type] || icons.success}</span><span style="flex:1">${message}</span>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.1rem;margin-left:6px">×</button>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
  },

  formatGHS(amount) { return "GHS " + parseFloat(amount || 0).toFixed(2); },

  formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-GH", { month: "short", day: "numeric", year: "numeric" });
  },

  progressBar(pct, color = "var(--primary)") {
    return `<div class="progress-track"><div class="progress-fill" style="width:${Math.min(pct,100)}%;background:${color}"></div></div>`;
  },

  daysUntil(dateStr) {
    const diff = new Date(dateStr) - new Date();
    return Math.max(0, Math.round(diff / 86400000));
  }
};

// ─── RESET (for dev) ─────────────────────────────────────────
function resetDB() {
  localStorage.removeItem(DB_KEY);
  location.reload();
}

// Expose everything globally
window.DB        = { getDB, updateDB, saveDB, resetDB };
window.User      = User;
window.Expenses  = Expenses;
window.Budget    = Budget;
window.Goals     = Goals;
window.Predictor = Predictor;
window.HealthScore = HealthScore;
window.Reconcile = Reconcile;
window.Calendar  = Calendar;
window.Coach     = Coach;
window.Opportunities = Opportunities;
window.Notifications = Notifications;
window.UI        = UI;
window.BADGES    = BADGES;
window.LEVELS    = LEVELS;
window.CATEGORY_EMOJI = CATEGORY_EMOJI;
