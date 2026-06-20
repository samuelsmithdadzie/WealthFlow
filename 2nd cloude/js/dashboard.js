/**
 * js/dashboard.js
 * All dashboard interactivity — reads/writes via db.js
 */

// ─── STATE ────────────────────────────────────────────
let currentAmount = '';
let selectedCat   = null;

// ─── SECTION SWITCHING ────────────────────────────────
function switchSection(name, el) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sec-' + name).classList.add('active');
  if (el) el.classList.add('active');
  // Render the section
  const renders = {
    overview: renderOverview, expenses: renderExpenses, budget: renderBudget,
    goals: renderGoals, predictor: renderPredictor, coach: renderCoach,
    health: renderHealth, reconcile: renderReconcile, calendar: renderCalendar,
    achievements: renderAchievements
  };
  if (renders[name]) renders[name]();
}

// ─── TOPBAR ───────────────────────────────────────────
function renderTopbar() {
  const user = User.get();
  const hs   = HealthScore.calculate();
  document.getElementById('topbarStreak').textContent = `🔥 ${user.streakDays}-day streak · Score ${hs.score}/100`;
  document.getElementById('topbarAvatar').textContent = user.name[0];
  document.getElementById('sidebarAvatar').textContent = user.name[0];
  document.getElementById('sidebarName').textContent   = user.name;
  document.getElementById('sidebarRank').textContent   = '⚡ ' + user.levelName;
  renderNotifications();
}

function toggleNotif() {
  document.getElementById('notifDropdown').classList.toggle('open');
}
document.addEventListener('click', e => {
  if (!e.target.closest('#notifBtn') && !e.target.closest('#notifDropdown')) {
    document.getElementById('notifDropdown').classList.remove('open');
  }
});

function renderNotifications() {
  const notifs = Notifications.getAll();
  const unread = notifs.filter(n => !n.read).length;
  document.getElementById('notifDot').style.display = unread ? 'block' : 'none';
  document.getElementById('notifList').innerHTML = notifs.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="Notifications.markRead('${n.id}');renderNotifications()">
      <div>
        <p>${n.text}</p>
        <div class="notif-time">${n.time}</div>
      </div>
    </div>`).join('') || '<div style="padding:16px;font-size:0.85rem;color:var(--muted)">No notifications</div>';
}

function markAllRead() {
  Notifications.markAllRead();
  renderNotifications();
  UI.showToast('All notifications marked as read.');
}

// ─── OVERVIEW ─────────────────────────────────────────
function renderOverview() {
  const user   = User.get();
  const pred   = Predictor.calculate();
  const hs     = HealthScore.calculate();
  const today  = Expenses.getToday();
  const todayT = today.reduce((s,e) => s+e.amount, 0);
  const week7  = Expenses.getRecent(7);
  const weekT  = week7.reduce((s,e) => s+e.amount, 0);

  // Greeting
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('overviewGreeting').textContent = `${greet}, ${user.name.split(' ')[0]} 👋`;
  document.getElementById('overviewSub').textContent =
    `${new Date().toLocaleDateString('en-GH',{weekday:'long',day:'numeric',month:'long'})} · ${user.streakDays}-day streak 🔥`;

  // Metrics
  const alertColors = {safe:'var(--accent)',warning:'var(--warn)',danger:'var(--danger)',unknown:'var(--muted)'};
  document.getElementById('metricRow').innerHTML = `
    <div class="card metric-card card-highlight">
      <div class="metric-label">Balance <span>💰</span></div>
      <div class="metric-value">${UI.formatGHS(user.balance)}</div>
      <div class="metric-sub" style="color:var(--accent)">Available funds</div>
    </div>
    <div class="card metric-card">
      <div class="metric-label">Today's Spending <span>💸</span></div>
      <div class="metric-value">${UI.formatGHS(todayT)}</div>
      <div class="metric-sub" style="color:${todayT>(pred.dailyCeiling||999)?'var(--danger)':'var(--accent)'}">
        Ceiling: ${UI.formatGHS(pred.dailyCeiling||0)}
      </div>
    </div>
    <div class="card metric-card card-accent">
      <div class="metric-label">Health Score <span>❤️</span></div>
      <div class="metric-value">${hs.score}</div>
      <div class="metric-sub" style="color:${hs.score>75?'var(--accent)':hs.score>50?'var(--warn)':'var(--danger)'}">
        ${hs.score>=85?'Excellent 🌟':hs.score>=70?'Good 💚':hs.score>=50?'Fair ⚠️':'Needs Work 🔴'}
      </div>
    </div>
    <div class="card metric-card">
      <div class="metric-label">Survival Runway <span>🔮</span></div>
      <div class="metric-value" style="color:${alertColors[pred.alertLevel]}">${pred.daysRemaining ?? '?'}</div>
      <div class="metric-sub" style="color:${alertColors[pred.alertLevel]};text-transform:capitalize">${pred.alertLevel}</div>
    </div>
    <div class="card metric-card">
      <div class="metric-label">This Week <span>📅</span></div>
      <div class="metric-value">${UI.formatGHS(weekT)}</div>
      <div class="metric-sub" style="color:var(--muted)">${week7.length} transactions</div>
    </div>`;

  // Savings goal card
  const goals = Goals.getAll();
  const g0    = goals[0];
  document.getElementById('savingsGoalCard').innerHTML = g0 ? `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <h3>${g0.emoji} ${g0.name}</h3>
      <button class="btn btn-ghost btn-sm" onclick="switchSection('goals',document.querySelector('[data-section=goals]'))">View Goals →</button>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--muted);margin-bottom:7px">
      <span>${UI.formatGHS(g0.savedAmount)} saved</span><span>${UI.formatGHS(g0.targetAmount)} goal</span>
    </div>
    ${UI.progressBar((g0.savedAmount/g0.targetAmount)*100,'var(--accent)')}
    <div style="font-size:0.75rem;color:var(--muted);margin-top:8px">
      Save ${UI.formatGHS(Math.max(0,(g0.targetAmount-g0.savedAmount)/Math.max(1,UI.daysUntil(g0.targetDate)/7)).toFixed(0))}/week to reach your goal 🚀
    </div>` : `<h3>🎯 No Goals Yet</h3><p style="color:var(--muted);font-size:0.85rem;margin-top:6px">
    <button class="btn btn-outline btn-sm" onclick="switchSection('goals',document.querySelector('[data-section=goals]'))" style="margin-top:10px">+ Add a Goal</button></p>`;

  // Transactions
  document.getElementById('recentTxList').innerHTML = Expenses.getAll().slice(0,8).map(e => `
    <div class="tx-item">
      <div class="tx-icon">${e.emoji}</div>
      <div class="tx-info">
        <div class="tx-name">${e.note || e.category}</div>
        <div class="tx-meta">${e.category} · ${UI.formatDate(e.date)}</div>
      </div>
      <div class="tx-amount">−${UI.formatGHS(e.amount)}</div>
    </div>`).join('') || '<p style="color:var(--muted);font-size:0.85rem;padding:8px">No expenses logged yet.</p>';

  // Streak card
  document.getElementById('streakCard').innerHTML = `
    <div style="font-size:0.9rem;font-weight:600;margin-bottom:10px">🔥 Daily Streak</div>
    <div style="font-family:var(--font-display);font-size:1.5rem;font-weight:700;color:var(--accent);margin-bottom:12px">${user.streakDays} days</div>
    <div class="streak-days">
      ${['M','T','W','T','F','S','S'].map((d,i)=>`
        <div class="streak-day ${i<user.streakDays-1?'done':i===user.streakDays-1?'today':''}">${d}</div>`).join('')}
    </div>`;

  // Health mini
  document.getElementById('healthMiniCard').innerHTML = `
    <div style="font-size:0.9rem;font-weight:600;margin-bottom:10px">❤️ Health Score</div>
    <div style="display:flex;align-items:center;gap:14px">
      <div style="width:56px;height:56px;border-radius:50%;background:conic-gradient(var(--accent) ${hs.score}%,var(--surface2) 0);display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0">
        <div style="position:absolute;inset:7px;border-radius:50%;background:var(--surface)"></div>
        <span style="position:relative;z-index:1;font-family:var(--font-display);font-size:0.95rem;font-weight:800">${hs.score}</span>
      </div>
      <div style="flex:1">
        ${Object.entries(hs.factors).map(([k,v])=>`
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <div style="font-size:0.68rem;color:var(--muted);width:80px;flex-shrink:0;text-transform:capitalize">${k.replace(/([A-Z])/g,' $1').trim()}</div>
            <div class="progress-track" style="flex:1;height:5px"><div class="progress-fill" style="width:${v}%;height:100%"></div></div>
          </div>`).join('')}
      </div>
    </div>`;

  // Quick tip
  document.getElementById('quickTip').textContent =
    pred.alertLevel==='danger' ? '⚠️ You\'re spending faster than your ceiling. Consider cutting food spending by 20% this week.' :
    pred.alertLevel==='warning'? '📊 You\'re slightly over pace. Small cuts in transport and entertainment can get you back on track.' :
    '✅ You\'re managing well! Keep up the streak and consider bumping your savings by GHS 20 this week.';
}

// ─── EXPENSE LOGGER ───────────────────────────────────
function renderExpenses() {
  const pred   = Predictor.calculate();
  const today  = Expenses.getToday();
  const todayT = today.reduce((s,e)=>s+e.amount,0);
  const { summary } = Expenses.getSummaryByCategory(7);

  document.getElementById('todayCeiling').textContent  = UI.formatGHS(pred.dailyCeiling||0);
  document.getElementById('todaySpentAmt').textContent = UI.formatGHS(todayT);
  const pct = pred.dailyCeiling > 0 ? (todayT/pred.dailyCeiling)*100 : 0;
  document.getElementById('todayProgress').style.width  = Math.min(pct,100)+'%';
  document.getElementById('todayProgress').style.background = pct>100?'var(--danger)':'var(--accent)';

  // Category breakdown
  const catColors={Food:'var(--primary)',Transport:'var(--purple)',Data:'var(--accent)',Education:'var(--warn)',Entertainment:'var(--danger)',Miscellaneous:'var(--muted)'};
  const maxAmt = Math.max(...Object.values(summary),1);
  document.getElementById('catBreakdown').innerHTML = Object.entries(summary).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="width:80px;font-size:0.8rem;color:var(--muted)">${cat}</span>
      <div class="progress-track" style="flex:1"><div class="progress-fill" style="width:${(amt/maxAmt)*100}%;background:${catColors[cat]||'var(--primary)'}"></div></div>
      <span style="font-size:0.78rem;color:var(--muted);width:70px;text-align:right">${UI.formatGHS(amt)}</span>
    </div>`).join('') || '<p style="font-size:0.83rem;color:var(--muted)">No expenses this week yet.</p>';

  // Recent list
  document.getElementById('expenseRecentList').innerHTML = Expenses.getAll().slice(0,8).map(e=>`
    <div class="tx-item" style="border-bottom:1px solid var(--border);padding:7px 0">
      <div class="tx-icon">${e.emoji}</div>
      <div class="tx-info">
        <div class="tx-name" style="font-size:0.82rem">${e.note||e.category}</div>
        <div class="tx-meta">${e.category} · ${UI.formatDate(e.date)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="tx-amount">−${UI.formatGHS(e.amount)}</div>
        <button onclick="deleteExpense('${e.id}')" style="background:none;border:none;color:var(--faint);cursor:pointer;font-size:0.9rem" title="Delete">🗑</button>
      </div>
    </div>`).join('') || '<p style="font-size:0.83rem;color:var(--muted)">No expenses yet.</p>';
}

// Numpad
function numPad(val) {
  if (val === 'del') { currentAmount = currentAmount.slice(0,-1); }
  else if (val === '.') { if (!currentAmount.includes('.')) currentAmount += '.'; }
  else { if (currentAmount.length < 8) currentAmount += String(val); }
  const display = document.getElementById('amountDisplay');
  display.textContent = currentAmount ? 'GHS ' + currentAmount : 'GHS 0';
  display.classList.toggle('has-value', !!currentAmount);
}

function selectCat(el) {
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
  selectedCat = el.dataset.cat;
}

function logExpense() {
  const amt = parseFloat(currentAmount);
  if (!amt || amt <= 0) { UI.showToast('Enter a valid amount first.','warn'); return; }
  if (!selectedCat)     { UI.showToast('Please select a category.','warn'); return; }
  const note = document.getElementById('expenseNote').value.trim();
  const result = Expenses.add(amt, selectedCat, note);

  // Reset
  currentAmount = ''; selectedCat = null;
  document.getElementById('amountDisplay').textContent = 'GHS 0';
  document.getElementById('amountDisplay').classList.remove('has-value');
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('selected'));
  document.getElementById('expenseNote').value = '';

  // Badge notifications
  result.newBadges.forEach(b => UI.showToast(`🏆 Badge unlocked: ${b.name}! +${b.xp} XP`));
  if (!result.newBadges.length) {
    const pred = Predictor.calculate();
    UI.showToast(`Logged ${UI.formatGHS(amt)} for ${selectedCat||result.expense.category}. Daily ceiling: ${UI.formatGHS(pred.dailyCeiling||0)}. Keep your streak! 🔥`);
  }

  renderExpenses();
  renderTopbar();
}

function deleteExpense(id) {
  Expenses.delete(id);
  renderExpenses();
  renderTopbar();
  UI.showToast('Expense deleted.','warn');
}

// ─── BUDGET ───────────────────────────────────────────
function renderBudget() {
  const budget = Budget.get();
  if (!budget) return;

  // Fill inputs
  document.getElementById('budgetMonthly').value     = budget.monthlyIncome || '';
  document.getElementById('budgetSide').value        = budget.sideIncome || '';
  document.getElementById('budgetScholarship').value = budget.scholarshipIncome || '';
  document.getElementById('budgetTotal').textContent = UI.formatGHS(budget.totalIncome || 0);

  // Live total update
  ['budgetMonthly','budgetSide','budgetScholarship'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      const m = parseFloat(document.getElementById('budgetMonthly').value)||0;
      const s = parseFloat(document.getElementById('budgetSide').value)||0;
      const sc= parseFloat(document.getElementById('budgetScholarship').value)||0;
      document.getElementById('budgetTotal').textContent = UI.formatGHS(m+s+sc);
    });
  });

  const alloc = budget.allocations;
  const { summary } = Expenses.getSummaryByCategory(7);
  const catMap = [
    {key:'food',       label:'Food & Sustenance',   emoji:'🍔', color:'var(--primary)', expCat:'Food'},
    {key:'transport',  label:'Transit & Commuting',  emoji:'🚌', color:'var(--purple)',  expCat:'Transport'},
    {key:'data',       label:'Data & Connectivity',  emoji:'📶', color:'var(--accent)',  expCat:'Data'},
    {key:'savings',    label:'Targeted Savings',     emoji:'🎯', color:'var(--warn)',    expCat:null},
    {key:'discretionary',label:'Personal / Emergency',emoji:'⚡',color:'var(--danger)', expCat:null},
  ];

  document.getElementById('budgetRows').innerHTML = catMap.map(c => {
    const budgeted = alloc?.[c.key] || 0;
    const spent    = c.expCat ? (summary[c.expCat]||0) : 0;
    const pct      = budgeted > 0 ? Math.min((spent/budgeted)*100,100) : 0;
    const total    = budget.totalIncome || 1;
    return `
      <div class="budget-row">
        <div class="budget-icon">${c.emoji}</div>
        <div class="budget-info">
          <div class="budget-name">${c.label}</div>
          <div class="budget-amounts">
            <span>${c.expCat?'Spent: '+UI.formatGHS(spent):'Tracked separately'}</span>
            <span>Budget: ${UI.formatGHS(budgeted)}</span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${c.color}"></div></div>
        </div>
        <div class="budget-pct">${Math.round((budgeted/total)*100)}%</div>
      </div>`;
  }).join('');

  // Tips
  document.getElementById('budgetTipsCard').innerHTML = `
    <h3 style="margin-bottom:12px">📌 Budget Tips</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
      <div class="alert alert-safe">✅ You're on track with data spending this month.</div>
      <div class="alert alert-warning">⚠️ Food spending is 18% over your budget this week.</div>
      <div class="alert alert-info">💡 Saving an extra GHS 20/week gets you to your laptop goal faster.</div>
    </div>`;
}

function saveBudget() {
  const m  = parseFloat(document.getElementById('budgetMonthly').value)||0;
  const s  = parseFloat(document.getElementById('budgetSide').value)||0;
  const sc = parseFloat(document.getElementById('budgetScholarship').value)||0;
  if (!m) { UI.showToast('Enter your monthly income.','warn'); return; }
  const result = Budget.set(m, s, sc);
  if (result.newBadge) UI.showToast('📊 First Budget Set badge earned! +30 XP');
  else UI.showToast('Budget updated! 🧮');
  renderBudget();
  renderTopbar();
}

// ─── GOALS ────────────────────────────────────────────
function renderGoals() {
  const goals = Goals.getAll();
  document.getElementById('goalsGrid').innerHTML = goals.map(g => {
    const pct      = Math.min((g.savedAmount/g.targetAmount)*100,100);
    const daysLeft = UI.daysUntil(g.targetDate);
    const wksLeft  = Math.max(1, Math.round(daysLeft/7));
    const weekly   = ((g.targetAmount-g.savedAmount)/wksLeft).toFixed(0);
    return `
      <div class="card ${g.isCompleted?'card-accent':'card-highlight'}">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <span style="font-size:1.6rem">${g.emoji}</span>
          <div style="flex:1">
            <div style="font-weight:700">${g.name}</div>
            <div style="font-size:0.75rem;color:var(--muted)">${g.isCompleted?'✅ Completed!':daysLeft+' days left'}</div>
          </div>
          <div style="font-family:var(--font-display);font-size:1rem;font-weight:700;color:${g.isCompleted?'var(--accent)':'var(--primary)'}">${pct.toFixed(0)}%</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--muted);margin-bottom:6px">
          <span>${UI.formatGHS(g.savedAmount)} saved</span><span>${UI.formatGHS(g.targetAmount)} goal</span>
        </div>
        ${UI.progressBar(pct, g.isCompleted?'var(--accent)':'var(--primary)')}
        ${!g.isCompleted ? `
          <div style="font-size:0.72rem;color:var(--muted);margin-top:6px;margin-bottom:12px">Save GHS ${weekly}/week · ${wksLeft} weeks left</div>
          <div style="display:flex;gap:8px">
            <input type="number" id="dep_${g.id}" class="input-field" placeholder="Deposit GHS..." style="flex:1"/>
            <button class="btn btn-primary btn-sm" onclick="depositGoal('${g.id}')">Add</button>
          </div>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="deleteGoal('${g.id}')" style="margin-top:8px;color:var(--faint)">🗑 Remove</button>
      </div>`;
  }).join('');

  // Add placeholder
  document.getElementById('goalsGrid').innerHTML += `
    <div onclick="toggleNewGoalForm()" style="background:var(--surface);border:1.5px dashed var(--border);border-radius:18px;padding:26px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;min-height:160px;transition:0.2s"
      onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
      <span style="font-size:2rem;color:var(--faint)">+</span>
      <span style="font-size:0.875rem;color:var(--muted)">Add New Goal</span>
    </div>`;
}

function toggleNewGoalForm() {
  const form = document.getElementById('newGoalForm');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function addGoal() {
  const name   = document.getElementById('goalName').value.trim();
  const amount = document.getElementById('goalAmount').value;
  const date   = document.getElementById('goalDate').value;
  const emoji  = document.getElementById('goalEmoji').value || '🎯';
  if (!name||!amount||!date) { UI.showToast('Fill in all goal fields.','warn'); return; }
  Goals.add(name, amount, date, emoji);
  document.getElementById('goalName').value=''; document.getElementById('goalAmount').value='';
  document.getElementById('goalDate').value=''; document.getElementById('goalEmoji').value='';
  document.getElementById('newGoalForm').style.display='none';
  renderGoals();
  UI.showToast('New savings goal added! 🎯');
}

function depositGoal(id) {
  const input = document.getElementById('dep_'+id);
  const amt   = parseFloat(input?.value);
  if (!amt||amt<=0) { UI.showToast('Enter deposit amount.','warn'); return; }
  const result = Goals.deposit(id, amt);
  if (result?.newBadge) UI.showToast('🏆 Smart Saver badge earned! +75 XP');
  else UI.showToast('Deposit recorded! 🎯');
  renderGoals();
  renderTopbar();
}

function deleteGoal(id) {
  Goals.delete(id);
  renderGoals();
  UI.showToast('Goal removed.','warn');
}

// ─── PREDICTOR ────────────────────────────────────────
function renderPredictor() {
  const pred = Predictor.calculate();
  const user = User.get();

  document.getElementById('predBalance').value = user.balance;
  document.getElementById('predDate').value    = user.nextStipendDate || '';

  const daysEl = document.getElementById('predDays');
  daysEl.textContent = pred.daysRemaining ?? '?';
  daysEl.className   = 'predictor-days ' + (pred.alertLevel||'unknown');

  document.getElementById('predCeiling').textContent    = UI.formatGHS(pred.dailyCeiling||0);
  document.getElementById('predCeilingSub').textContent = `${UI.formatGHS(user.balance)} ÷ ${pred.daysRemaining||'?'} days`;
  document.getElementById('predAvgDaily').textContent   = UI.formatGHS(pred.avgDaily||0);
  document.getElementById('predAvgDaily').style.color   =
    (pred.avgDaily||0) > (pred.dailyCeiling||999) ? 'var(--danger)' : 'var(--accent)';

  const alertClass = {safe:'alert-safe',warning:'alert-warning',danger:'alert-danger',unknown:'alert-info'};
  document.getElementById('predAlert').innerHTML = pred.message ? `
    <div class="alert ${alertClass[pred.alertLevel]||'alert-info'}">${pred.message}</div>` : '';

  document.getElementById('predScenarios').innerHTML = (pred.scenarios||[]).map(s=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:var(--surface2);border-radius:8px;margin-bottom:6px;font-size:0.83rem">
      <span style="color:var(--muted)">${s.label} (${UI.formatGHS(s.daily)}/day)</span>
      <span style="font-weight:700;color:${s.safe?'var(--accent)':'var(--danger)'}">${s.runway} days ${s.safe?'✅':'⚠️'}</span>
    </div>`).join('');
}

function updatePredictor() {
  const bal  = document.getElementById('predBalance').value;
  const date = document.getElementById('predDate').value;
  if (!date) { UI.showToast('Set your next stipend date.','warn'); return; }
  Predictor.update(bal, date);
  renderPredictor();
  renderTopbar();
  UI.showToast('Predictor updated! 🔮');
}

// ─── AI COACH ─────────────────────────────────────────
function renderCoach() {
  renderCoachMessages();

  // Snapshot card
  const user   = User.get();
  const pred   = Predictor.calculate();
  const hs     = HealthScore.calculate();
  const budget = Budget.get();
  document.getElementById('coachSnapshotCard').innerHTML = `
    <div style="font-size:0.88rem;font-weight:600;margin-bottom:12px">📊 Your Snapshot</div>
    ${[
      ['Balance',       UI.formatGHS(user.balance)],
      ['Income',        UI.formatGHS(budget?.totalIncome||user.monthlyIncome)+'/mo'],
      ['Streak',        user.streakDays+' days 🔥'],
      ['Level',         user.levelName],
      ['Score',         hs.score+'/100'],
      ['Runway',        (pred.daysRemaining||'?')+' days'],
    ].map(([k,v])=>`
      <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:6px">
        <span style="color:var(--muted)">${k}</span><span style="font-weight:600">${v}</span>
      </div>`).join('')}`;

  // Insights
  const { summary } = Expenses.getSummaryByCategory(7);
  const top = Object.entries(summary).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('coachInsightsCard').innerHTML = `
    <div style="font-size:0.88rem;font-weight:600;margin-bottom:10px">💡 Coach Insights</div>
    ${top ? `<div style="font-size:0.78rem;color:var(--muted);padding:9px 10px;background:var(--surface2);border-radius:8px;border-left:3px solid var(--warn);margin-bottom:8px">
      🍔 ${top[0]} is your biggest spend this week at ${UI.formatGHS(top[1])}.
    </div>` : ''}
    <div style="font-size:0.78rem;color:var(--muted);padding:9px 10px;background:var(--surface2);border-radius:8px;border-left:3px solid var(--accent)">
      🔥 ${user.streakDays}-day streak! Keep logging daily to maintain your Health Score.
    </div>`;
}

function renderCoachMessages() {
  const history = Coach.getHistory();
  document.getElementById('coachMessages').innerHTML = history.map(m=>`
    <div class="msg ${m.role==='user'?'user':''}">
      <div class="msg-avatar ${m.role==='assistant'?'bot':'user'}">${m.role==='assistant'?'🤖':'👤'}</div>
      <div class="msg-bubble">${m.text.replace(/\n/g,'<br>')}</div>
    </div>`).join('');
  const container = document.getElementById('coachMessages');
  container.scrollTop = container.scrollHeight;
}

function sendCoachSugg(btn) {
  document.getElementById('coachInput').value = btn.textContent;
  sendCoach();
}

// ─── CANNED COACH REPLIES ──────────────────────────────
// No backend yet, so the coach answers locally using real data from db.js.
// Swap this block out for a real fetch() to your proxy server later.
function generateCoachReply(message) {
  const msg     = message.toLowerCase();
  const user    = User.get();
  const budget  = Budget.get();
  const pred    = Predictor.calculate();
  const hs      = HealthScore.calculate();
  const goals   = Goals.getAll();
  const { summary } = Expenses.getSummaryByCategory(7);
  const top     = Object.entries(summary).sort((a,b)=>b[1]-a[1])[0];
  const name    = user.name.split(' ')[0];

  // Budgeting
  if (/budget|allocat|spend.*plan|enough|how much.*(spend|use)|split.*money/.test(msg)) {
    const a = budget?.allocations;
    return a
      ? `Based on your GHS ${budget.totalIncome} monthly income, here's a healthy split: 🍔 Food GHS ${a.food}, 🚌 Transport GHS ${a.transport}, 📶 Data GHS ${a.data}, 🎯 Savings GHS ${a.savings}, ⚡ Discretionary GHS ${a.discretionary}. Stick close to these and you'll stay on track.`
      : `You haven't set up a budget yet — head to Budget Planner and enter your income so I can build you a personalized allocation.`;
  }

  // Afford a purchase
  if (/afford|can i (buy|get)|new phone|laptop|buy.*now|wait.*buy|should i (buy|get|wait)/.test(msg)) {
    const runway = pred.daysRemaining ?? '?';
    return `Right now you have ${UI.formatGHS(user.balance)} with about ${runway} days until your next stipend (ceiling: ${UI.formatGHS(pred.dailyCeiling||0)}/day). If the purchase costs more than what's left after covering ${runway} days at your ceiling, I'd hold off or save toward it as a goal first — want me to help you set one up?`;
  }

  // Saving faster
  if (/save faster|how.*save|savings? tips?|want to save|save.*by (january|february|march|april|may|june|july|august|september|october|november|december|\d)/.test(msg)) {
    const g0 = goals[0];
    return g0
      ? `For your "${g0.name}" goal, you're at ${UI.formatGHS(g0.savedAmount)} of ${UI.formatGHS(g0.targetAmount)}. Try moving GHS 20–30 into it right after each stipend lands, before it gets spent elsewhere — automatic beats willpower every time. 🎯`
      : `You don't have any savings goals yet — start with something concrete (a laptop, rent buffer, etc.) so your saving has a target. Head to Savings Goals to set one up.`;
  }

  // Scholarships / opportunities
  if (/scholarship|grant|opportunit|internship/.test(msg)) {
    return `Check the Opportunity Hub — it's curated for students like you with scholarships, grants, and campus jobs. I'd also recommend reconciling your balance weekly so you know exactly how much breathing room you have before applying anywhere with fees.`;
  }

  // Spending insight
  if (/spend|spending|where.*money|overspend|eating.*money|what.*eating/.test(msg)) {
    return top
      ? `Your biggest spend this week is ${top[0]} at ${UI.formatGHS(top[1])}. If that's higher than you'd like, try setting a soft daily cap for it and logging every purchase — even small ones add up fast.`
      : `You haven't logged any expenses this week yet — head to Log Expense so I can give you real insight into your spending patterns.`;
  }

  // Health score / general "how am I doing"
  if (/health score|how am i doing|financial health|doing (okay|ok|well|fine)|am i (okay|ok|doing)/.test(msg)) {
    return `Your Financial Health Score is ${hs.score}/100 right now. ${hs.score>=85?'Excellent — you\'re basically running a tight ship! 🌟':hs.score>=70?'That\'s solid — keep logging daily and sticking to your budget. 💚':hs.score>=50?'Decent, but there\'s room to improve — try boosting your savings rate and logging consistency. ⚠️':'It needs work — focus on logging every expense and setting a real budget this week. 🔴'}`;
  }

  // Streak / motivation
  if (/streak|motivat|keep.*track/.test(msg)) {
    return `You're on a ${user.streakDays}-day streak, ${name}! 🔥 Log at least one expense today to keep it alive — consistency is what actually moves your Health Score, more than any single big decision.`;
  }

  // General tip / advice request
  if (/give me a tip|any (tips?|advice)|got advice|help me out/.test(msg)) {
    return top
      ? `Quick one: your top spend this week is ${top[0]} (${UI.formatGHS(top[1])}). Trimming that by even 15% and redirecting it to savings would meaningfully move your Health Score (currently ${hs.score}/100). Want a deeper breakdown?`
      : `Start by logging every expense for a few days — even small ones. Once I have that data I can give you sharper, more specific tips.`;
  }

  // Greeting / generic
  if (/^(hi|hello|hey|sup|yo)\b/.test(msg)) {
    return `Hey ${name}! 👋 Ask me about your budget, whether you can afford something, how to save faster, or what's eating your spending this week.`;
  }

  // Off-topic / unrelated input (weather, gibberish, etc.) — gently redirect
  if (/weather|joke|football|movie|^[a-z]{1,3}$|asdf|qwer/.test(msg) || message.trim().length < 2) {
    return `I'm focused on your finances specifically, ${name} — but I've got real data on you! Try asking about your budget, spending this week, savings goals, or whether you can afford something.`;
  }

  // Fallback
  return `Good question! Based on your numbers — balance ${UI.formatGHS(user.balance)}, ${pred.daysRemaining ?? '?'} days of runway, Health Score ${hs.score}/100 — I'd focus on keeping your daily spend under ${UI.formatGHS(pred.dailyCeiling||0)} and logging consistently. Try asking me about your budget, savings, or spending breakdown for more specific advice.`;
}

async function sendCoach() {
  const input   = document.getElementById('coachInput');
  const message = input.value.trim();
  if (!message) return;
  input.value = '';

  Coach.addMessage('user', message);
  renderCoachMessages();

  // Loading dots
  const container = document.getElementById('coachMessages');
  const loadEl    = document.createElement('div');
  loadEl.className = 'msg';
  loadEl.innerHTML = `<div class="msg-avatar bot">🤖</div>
    <div class="msg-bubble" style="background:var(--surface2);border:1px solid var(--border)">
      <div class="loading-dots"><span></span><span></span><span></span></div>
    </div>`;
  container.appendChild(loadEl);
  container.scrollTop = container.scrollHeight;

  document.getElementById('coachSendBtn').disabled = true;

  // Simulate a brief "thinking" delay so the loading state reads naturally
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random()*500));

  const reply = generateCoachReply(message);
  loadEl.remove();
  Coach.addMessage('assistant', reply);

  document.getElementById('coachSendBtn').disabled = false;
  renderCoachMessages();
}

// ─── HEALTH SCORE ─────────────────────────────────────
function renderHealth() {
  const hs = HealthScore.calculate();
  const ring = document.getElementById('healthRing');
  ring.style.setProperty('--pct', hs.score + '%');
  ring.style.background = `conic-gradient(var(--accent) ${hs.score}%, var(--surface2) 0%)`;
  document.getElementById('healthRingVal').textContent = hs.score;
  document.getElementById('healthLabel').textContent   =
    hs.score>=85?'Excellent 🌟':hs.score>=70?'Good 💚':hs.score>=50?'Fair ⚠️':'Needs Work 🔴';

  const factorColors = { budgetAdherence:'var(--primary)', streakConsistency:'var(--accent)', savingsRate:'var(--warn)', logFrequency:'var(--purple)' };
  const factorNames  = { budgetAdherence:'Budget Adherence', streakConsistency:'Streak Consistency', savingsRate:'Savings Rate', logFrequency:'Log Frequency' };
  document.getElementById('healthFactors').innerHTML = Object.entries(hs.factors).map(([k,v])=>`
    <div class="health-factor-row">
      <span class="health-factor-name">${factorNames[k]}</span>
      <div class="progress-track" style="flex:1"><div class="progress-fill" style="width:${v}%;background:${factorColors[k]}"></div></div>
      <span class="health-factor-score" style="color:${factorColors[k]}">${v}</span>
    </div>`).join('');

  document.getElementById('healthScoreGrid').innerHTML = `
    <h3 style="margin-bottom:12px">Score Breakdown</h3>
    <div class="grid-2" style="gap:10px">
      ${Object.entries(hs.factors).map(([k,v])=>`
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
          <div style="font-family:var(--font-display);font-size:1.4rem;font-weight:700;color:${factorColors[k]}">${v}</div>
          <div style="font-size:0.7rem;color:var(--muted);margin-top:3px">${factorNames[k]}</div>
        </div>`).join('')}
    </div>`;
}

// ─── RECONCILE ────────────────────────────────────────
function renderReconcile() {
  const user = User.get();
  document.getElementById('reconExpected').textContent = UI.formatGHS(user.balance);
  document.getElementById('reconInput').value = '';
  document.getElementById('reconResult').innerHTML = '';

  const history = Reconcile.history();
  document.getElementById('reconHistory').innerHTML = history.length
    ? history.slice(0,5).map(r=>`
        <div class="recon-hist-item">
          <span style="color:var(--muted)">${UI.formatDate(r.date)}</span>
          <span style="color:${r.isMatch?'var(--accent)':'var(--warn)'}">
            ${r.isMatch?'✅ Matched':'⚠️ GHS '+Math.abs(r.diff).toFixed(2)+' gap'}
          </span>
        </div>`).join('')
    : '<p style="font-size:0.83rem;color:var(--muted)">No reconciliations yet.</p>';
}

function runReconcile() {
  const val = document.getElementById('reconInput').value;
  if (!val) { UI.showToast('Enter your actual cash balance.','warn'); return; }
  const result = Reconcile.run(val);
  if (result.newBadge) UI.showToast('⚖️ Reconciliation Pro badge earned! +30 XP');
  const msg = result.isMatch
    ? '✅ Perfect match! Your records are fully reconciled.'
    : `⚠️ Discrepancy of GHS ${Math.abs(result.diff).toFixed(2)} auto-categorised as Miscellaneous.`;
  document.getElementById('reconResult').innerHTML = `<div class="alert ${result.isMatch?'alert-safe':'alert-warning'}" style="margin-top:4px">${msg}</div>`;
  document.getElementById('reconExpected').textContent = UI.formatGHS(parseFloat(val));
  UI.showToast(msg, result.isMatch?'success':'warn');
  renderReconcile();
  renderTopbar();
}

// ─── CALENDAR ─────────────────────────────────────────
function renderCalendar() {
  const events = Calendar.getAll().sort((a,b)=>new Date(a.date)-new Date(b.date));
  const typeColors = { stipend:'cal-type-stipend', bill:'cal-type-bill', deadline:'cal-type-deadline', reminder:'cal-type-reminder' };
  const upcoming   = events.filter(e => new Date(e.date) >= new Date());
  document.getElementById('calList').innerHTML = upcoming.length
    ? upcoming.map(e=>`
        <div class="calendar-event">
          <div class="cal-icon">${e.emoji||'📅'}</div>
          <div class="cal-info">
            <div class="cal-title">${e.title}</div>
            <div class="cal-date">${UI.formatDate(e.date)} · ${UI.daysUntil(e.date)} days away</div>
          </div>
          ${e.amount ? `<div class="cal-amount ${typeColors[e.type]||''}">${UI.formatGHS(e.amount)}</div>` : ''}
          <button onclick="deleteCalEvent('${e.id}')" style="background:none;border:none;color:var(--faint);cursor:pointer;margin-left:6px">🗑</button>
        </div>`).join('')
    : '<p style="color:var(--muted);font-size:0.85rem">No upcoming events.</p>';

  // Summary
  const bills   = events.filter(e=>e.type==='bill').reduce((s,e)=>s+e.amount,0);
  const stipends= events.filter(e=>e.type==='stipend').reduce((s,e)=>s+e.amount,0);
  document.getElementById('calSummary').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;justify-content:space-between;font-size:0.85rem"><span style="color:var(--muted)">Upcoming Bills</span><span style="color:var(--warn);font-weight:700">${UI.formatGHS(bills)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:0.85rem"><span style="color:var(--muted)">Expected Stipends</span><span style="color:var(--accent);font-weight:700">${UI.formatGHS(stipends)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:0.85rem"><span style="color:var(--muted)">Total Events</span><span style="font-weight:700">${events.length}</span></div>
      <div style="height:1px;background:var(--border)"></div>
      <div style="display:flex;justify-content:space-between;font-size:0.85rem">
        <span style="color:var(--muted)">Net Expected</span>
        <span style="font-weight:700;color:${stipends-bills>=0?'var(--accent)':'var(--danger)'}">GHS ${(stipends-bills).toFixed(2)}</span>
      </div>
    </div>`;
}

function toggleCalForm() {
  const f = document.getElementById('calForm');
  f.style.display = f.style.display==='none'?'block':'none';
}

function addCalEvent() {
  const title  = document.getElementById('calTitle').value.trim();
  const date   = document.getElementById('calDate').value;
  const type   = document.getElementById('calType').value;
  const amount = document.getElementById('calAmount').value;
  if (!title||!date) { UI.showToast('Fill in title and date.','warn'); return; }
  const emojiMap = {stipend:'💰',bill:'🏠',deadline:'⏰',reminder:'📌'};
  Calendar.add(title, date, type, amount, emojiMap[type]||'📅');
  document.getElementById('calTitle').value=''; document.getElementById('calDate').value='';
  document.getElementById('calAmount').value='';
  document.getElementById('calForm').style.display='none';
  renderCalendar();
  UI.showToast('Event added to calendar! 📅');
}

function deleteCalEvent(id) {
  Calendar.delete(id);
  renderCalendar();
  UI.showToast('Event removed.','warn');
}

// ─── ACHIEVEMENTS ─────────────────────────────────────
function renderAchievements() {
  const user = User.get();
  const xpNext = LEVELS.find(l=>l.xpReq>user.xp)?.xpReq || 1000;
  const xpPrev = LEVELS.filter(l=>l.xpReq<=user.xp).slice(-1)[0]?.xpReq || 0;
  const xpPct  = Math.min(((user.xp-xpPrev)/(xpNext-xpPrev))*100,100);

  document.getElementById('achRankName').textContent  = `${user.levelName} — Level ${user.level}`;
  document.getElementById('achXP').textContent        = `${user.xp} XP`;
  document.getElementById('achNextLevel').textContent = `Level ${Math.min(user.level+1,5)}: ${xpNext} XP`;
  document.getElementById('achXPBar').style.width     = xpPct + '%';

  // Levels
  document.getElementById('levelList').innerHTML = LEVELS.map(l=>{
    const done    = user.xp >= l.xpReq;
    const current = user.level === l.level;
    return `
      <div class="level-item ${done?'unlocked':''} ${current?'current':''}">
        <div class="level-item-emoji">${l.emoji}</div>
        <div>
          <div class="level-item-name">${l.name}</div>
          <div class="level-item-desc">${l.desc}</div>
        </div>
        <div class="level-item-status" style="color:${current?'var(--primary)':done?'var(--accent)':'var(--faint)'}">
          ${current?'Current':done?'✅':'Locked'}
        </div>
      </div>`;
  }).join('');

  // Badges
  document.getElementById('badgesGrid').innerHTML = Object.values(BADGES).map(b=>`
    <div class="badge-card ${user.badgesEarned.includes(b.id)?'earned':''}">
      <div class="badge-icon">${b.emoji}</div>
      <div class="badge-name">${b.name}</div>
    </div>`).join('');

  // Streak
  document.getElementById('streakDaysRow').innerHTML = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>`
    <div class="streak-day ${i<user.streakDays-1?'done':i===user.streakDays-1?'today':''}">${d[0]}</div>`).join('');

  // XP Summary
  document.getElementById('achXPSummary').innerHTML = `
    <h3 style="margin-bottom:12px">XP Summary</h3>
    ${[
      ['Total XP Earned',   user.xp+' XP'],
      ['Badges Unlocked',   user.badgesEarned.length+'/'+Object.keys(BADGES).length],
      ['Current Streak',    user.streakDays+' days'],
      ['Health Score',      HealthScore.calculate().score+'/100'],
    ].map(([k,v])=>`
      <div style="display:flex;justify-content:space-between;font-size:0.83rem;margin-bottom:7px">
        <span style="color:var(--muted)">${k}</span>
        <span style="font-weight:700;color:var(--primary)">${v}</span>
      </div>`).join('')}`;
}

// ─── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Check for anchor in URL (e.g. dashboard.html#coach)
  const hash    = location.hash.replace('#','');
  const section = hash && document.getElementById('sec-'+hash) ? hash : 'overview';
  const navEl   = document.querySelector(`[data-section="${section}"]`);
  switchSection(section, navEl);
  renderTopbar();
});