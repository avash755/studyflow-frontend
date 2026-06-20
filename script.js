// ========== PROTECT DASHBOARD ==========
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'login.html';
}

const userData = JSON.parse(localStorage.getItem('user') || '{}');
console.log('👋 Welcome,', userData.name || 'User');

const API_BASE = 'https://studyflow-2kcz.onrender.com';

// ========== NOTIFICATIONS / ACTIVITIES ==========
async function loadNotifications() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id;
    if (!userId) return;

    try {
        const response = await fetch(`${API_BASE}/api/activities?userId=${userId}&limit=10`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch activities');
        const data = await response.json();

        // Update Badge
        const badge = document.getElementById('notificationBadge');
        const list = document.getElementById('notificationList');
        if (data.unreadCount > 0) {
            badge.style.display = 'inline';
            badge.textContent = data.unreadCount;
        } else {
            badge.style.display = 'none';
        }

        // Render list
        if (data.activities.length === 0) {
            list.innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:1rem 0;">No notifications yet</p>';
            return;
        }

        list.innerHTML = data.activities.map(a => `
            <div class="notification-item ${a.is_read ? '' : 'unread'}">
                <div>${escapeHtml(a.message)}</div>
                <span class="time">${timeAgo(a.created_at)}</span>
            </div>
        `).join('');

    } catch (err) {
        console.error('Load notifications error:', err);
    }
}

// Simple "time ago" helper
function timeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diff = Math.floor((now - past) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
}

// Toggle dropdown
function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    const isOpen = dropdown.classList.toggle('open');
    if (isOpen) {
        markAllRead();
        loadNotifications();
    }
}

// Mark all as read
async function markAllRead() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) return;
    try {
        await fetch(`${API_BASE}/api/activities/mark-all-read`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ userId: user.id })
        });
        const badge = document.getElementById('notificationBadge');
        badge.style.display = 'none';
    } catch (err) {
        console.error('Mark all read error:', err);
    }
}

// ========== LOAD RECENT ACTIVITIES (for Dashboard) ==========
async function loadRecentActivities() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id;
    if (!userId) return;

    try {
        const response = await fetch(`${API_BASE}/api/activities?userId=${userId}&limit=5`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch recent activities');
        const data = await response.json();
        const container = document.getElementById('activityTimeline');
        if (!container) return;

        if (data.activities.length === 0) {
            container.innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:1rem;">No recent activity</p>';
            return;
        }

        const icons = {
            'assignment_completed': '✅',
            'goal_completed': '🎯',
            'subject_added': '📚',
            'xp_earned': '⭐',
            'study_session_complete': '🧘',
            'account_created': '🎉'
        };

        container.innerHTML = data.activities.map(a => `
            <div>
                ${icons[a.type] || '📌'} ${escapeHtml(a.message)}
                <span class="activity-time">${timeAgo(a.created_at)}</span>
            </div>
        `).join('');
    } catch (err) {
        console.error('Load recent activities error:', err);
    }
}

// ========== UPDATE DASHBOARD STATS ==========
async function updateStats() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id;
    if (!userId) return;

    try {
        const subRes = await fetch(`${API_BASE}/api/subjects?userId=${userId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (subRes.ok) {
            const subjects = await subRes.json();
            const statValues = document.querySelectorAll('.stat-value');
            if (statValues.length >= 1) {
                statValues[0].textContent = subjects.length;
            }
        }

        const assignRes = await fetch(`${API_BASE}/api/assignments?userId=${userId}&filter=pending`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (assignRes.ok) {
            const pendingAssignments = await assignRes.json();
            const statValues = document.querySelectorAll('.stat-value');
            if (statValues.length >= 2) {
                statValues[1].textContent = pendingAssignments.length;
            }
        }
    } catch (err) {
        console.error('Failed to update stats:', err);
    }
}

(function() {
    // ========== GLOBAL STATE ==========
    let pomodoroInterval = null;
    let pomodoroTime = 25 * 60;
    let pomodoroIsBreak = false;
    let goals = [];
    let xp = parseInt(localStorage.getItem('xp')) || 0;
    let level = parseInt(localStorage.getItem('level')) || 1;
    let badges = JSON.parse(localStorage.getItem('badges')) || [];
    let assignmentsData = [];
    let calendarEvents = [];
    let scheduleClasses = [];
    let calendarYear, calendarMonth;
    let selectedCalendarDate = null;
    let steadyTimer = null;
    let steadyTimeLeft = 3600;
    let isSteadyStudy = true;
    let studySecs = 3600;
    let restSecs = 900;
    let totalFocusSecs = parseInt(localStorage.getItem('totalFocusSecs')) || 0;
    let totalSteadySessions = parseInt(localStorage.getItem('totalSteadySessions')) || 0;
    let streak = parseInt(localStorage.getItem('steadyStreak')) || 0;
    let lastDate = localStorage.getItem('lastSteadyDate');

    const now = new Date();
    calendarYear = now.getFullYear();
    calendarMonth = now.getMonth();
    selectedCalendarDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // ========== DOM READY ==========
    document.addEventListener('DOMContentLoaded', async () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const nameEl = document.getElementById('dashboardUserName');
        if (nameEl && user.name) {
            nameEl.textContent = user.name;
        }

        const greetingEl = document.getElementById('dashboardGreeting');
        if (greetingEl && user.name) {
            greetingEl.textContent = `Welcome back, ${user.name}`;
        }

        // Load stats, notifications, and recent activities
        await loadStats();
        await loadNotifications();
        await loadRecentActivities();

        initNavigation();
        initDarkMode();
        initHamburger();
        initPomodoro();
        initGoals();
        initGamification();
        initAssignments();
        initCalendar();
        initSchedule();
        initSteadyMode();
        initQuickActions();
        initDashboardLinks();
        animateOnLoad();
        loadSubjects();
        updateStats();

        // LOGOUT BUTTON
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });

        // ========== ADD SUBJECT ==========
        const addSubjectBtn = document.getElementById('addSubjectBtn');
        if (addSubjectBtn) {
            addSubjectBtn.addEventListener('click', async () => {
                const name = prompt('Enter the subject name:');
                if (!name || name.trim() === '') return;

                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const userId = user.id;
                if (!userId) {
                    alert('Please log in first.');
                    return;
                }

                try {
                    const response = await fetch(`${API_BASE}/api/subjects`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ userId, name: name.trim() })
                    });

                    if (!response.ok) {
                        const data = await response.json();
                        alert('Failed to add subject: ' + (data.error || 'Unknown error'));
                        return;
                    }

                    loadSubjects();
                    updateStats();
                    await loadNotifications();
                } catch (err) {
                    console.error('Add subject error:', err);
                    alert('Could not connect to server.');
                }
            });
        }

        // ========== ADD ASSIGNMENT ==========
        const addAssignmentBtn = document.getElementById('addAssignmentBtn');
        if (addAssignmentBtn) {
            addAssignmentBtn.addEventListener('click', async () => {
                const title = prompt('Assignment title:');
                if (!title || title.trim() === '') return;

                const subject = prompt('Subject (e.g., Math, CS):');
                if (!subject || subject.trim() === '') return;

                const dueDate = prompt('Due date (YYYY-MM-DD, or leave blank):');
                const dueDateValue = dueDate && dueDate.trim() ? dueDate.trim() : null;

                const user = JSON.parse(localStorage.getItem('user') || '{}');
                if (!user.id) {
                    alert('Please log in first.');
                    return;
                }

                try {
                    const response = await fetch(`${API_BASE}/api/assignments`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({
                            userId: user.id,
                            title: title.trim(),
                            subject: subject.trim(),
                            dueDate: dueDateValue
                        })
                    });

                    if (!response.ok) {
                        const data = await response.json();
                        alert('Failed to add assignment: ' + (data.error || 'Unknown error'));
                        return;
                    }

                    const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
                    await renderAssignments(activeFilter);
                    updateStats();
                    await loadNotifications();
                    alert('✅ Assignment added!');
                } catch (err) {
                    console.error('Add assignment error:', err);
                    alert('Could not connect to server.');
                }
            });
        }

        // Notification bell toggle
        document.getElementById('notificationBell')?.addEventListener('click', toggleNotifications);

        // Click outside to close
        document.addEventListener('click', (e) => {
            const container = document.getElementById('notificationContainer');
            if (container && !container.contains(e.target)) {
                document.getElementById('notificationDropdown')?.classList.remove('open');
            }
        });

        // Mark all read button
        document.getElementById('markAllReadBtn')?.addEventListener('click', async () => {
            await markAllRead();
            await loadNotifications();
        });
    });

    // ========== HELPERS ==========
    function showNotification(msg, isError = false) {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        const div = document.createElement('div');
        div.className = 'notification';
        div.textContent = msg;
        div.style.background = isError ? 'var(--danger)' : 'var(--primary)';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 2800);
    }

    function escapeHtml(str) {
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function formatDateKey(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    function parseDateKey(key) {
        const [y, m, d] = key.split('-').map(Number);
        return { year: y, month: m - 1, day: d };
    }

    // ========== MODAL SYSTEM ==========
    function openModal(title, contentHtml, onSave) {
        const container = document.getElementById('modalContainer');
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <h3>${title}</h3>
                <div class="modal-body">${contentHtml}</div>
                <div class="modal-actions">
                    <button class="btn btn-secondary modal-cancel">Cancel</button>
                    <button class="btn btn-primary modal-save">Save</button>
                </div>
            </div>`;
        container.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('.modal-cancel').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
        overlay.querySelector('.modal-save').addEventListener('click', () => {
            if (onSave(overlay)) close();
        });
        const escHandler = (e) => { if (e.key === 'Escape') { close();
                document.removeEventListener('keydown', escHandler); } };
        document.addEventListener('keydown', escHandler);
    }

    // ========== NAVIGATION ==========
    function initNavigation() {
        const links = document.querySelectorAll('.nav-link');
        const pages = document.querySelectorAll('.page');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = link.getAttribute('data-page') + '-page';
                links.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                pages.forEach(p => p.classList.remove('active'));
                const target = document.getElementById(pageId);
                if (target) target.classList.add('active');
                if (window.innerWidth <= 768 && sidebar) {
                    sidebar.classList.remove('open');
                    if (overlay) overlay.classList.remove('active');
                }
                if (pageId === 'calendar-page') renderCalendar();
                if (pageId === 'schedule-page') renderSchedule();
            });
        });
    }

    function initDashboardLinks() {
        document.querySelectorAll('.card-link[data-nav]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetPage = link.getAttribute('data-nav') + '-page';
                const navLink = document.querySelector(`.nav-link[data-page="${link.getAttribute('data-nav')}"]`);
                if (navLink) navLink.click();
                else {
                    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                    const page = document.getElementById(targetPage);
                    if (page) page.classList.add('active');
                }
            });
        });
    }

    function initHamburger() {
        const btn = document.getElementById('hamburgerBtn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        if (!btn) return;
        const toggle = () => { sidebar.classList.toggle('open');
            overlay.classList.toggle('active'); };
        btn.addEventListener('click', toggle);
        if (overlay) overlay.addEventListener('click', toggle);
    }

    // ========== DARK MODE ==========
    function initDarkMode() {
        const toggle = document.getElementById('darkModeToggle');
        const stored = localStorage.getItem('darkMode');
        let isDark;
        if (stored !== null) {
            isDark = stored === 'true';
        } else {
            isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        if (isDark) document.body.classList.add('dark');
        toggle.textContent = isDark ? '☀️' : '🌙';
        toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');

        toggle.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            const dark = document.body.classList.contains('dark');
            localStorage.setItem('darkMode', dark);
            toggle.textContent = dark ? '☀️' : '🌙';
            toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        });

        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (localStorage.getItem('darkMode') === null) {
                    if (e.matches) document.body.classList.add('dark');
                    else document.body.classList.remove('dark');
                    const dark = document.body.classList.contains('dark');
                    toggle.textContent = dark ? '☀️' : '🌙';
                    toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
                }
            });
        }
    }

    // ========== POMODORO ==========
    function updatePomodoroDisplay() {
        const el = document.getElementById('pomodoroDisplay');
        if (el) {
            const mins = Math.floor(pomodoroTime / 60);
            const secs = pomodoroTime % 60;
            el.textContent = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
        }
    }

    function startPomodoro() {
        if (pomodoroInterval) clearInterval(pomodoroInterval);
        pomodoroInterval = setInterval(() => {
            if (pomodoroTime > 0) {
                pomodoroTime--;
                updatePomodoroDisplay();
            } else {
                clearInterval(pomodoroInterval);
                pomodoroInterval = null;
                showNotification(pomodoroIsBreak ? '🍅 Break done! Back to study' : '✅ Session complete! +10 XP');
                if (!pomodoroIsBreak) addXP(10);
                pomodoroIsBreak = !pomodoroIsBreak;
                pomodoroTime = pomodoroIsBreak ? 5 * 60 : 25 * 60;
                updatePomodoroDisplay();
                const ms = document.getElementById('modeSwitch');
                if (ms) ms.textContent = pomodoroIsBreak ? 'Switch to Study (25 min)' : 'Switch to Break (5 min)';
            }
        }, 1000);
    }

    function initPomodoro() {
        const start = document.getElementById('pomodoroStart');
        const pause = document.getElementById('pomodoroPause');
        const reset = document.getElementById('pomodoroReset');
        const modeSwitch = document.getElementById('modeSwitch');
        if (start) start.onclick = () => { if (!pomodoroInterval) startPomodoro(); };
        if (pause) pause.onclick = () => { if (pomodoroInterval) { clearInterval(pomodoroInterval);
                pomodoroInterval = null; } };
        if (reset) reset.onclick = () => {
            if (pomodoroInterval) clearInterval(pomodoroInterval);
            pomodoroInterval = null;
            pomodoroTime = 25 * 60;
            pomodoroIsBreak = false;
            updatePomodoroDisplay();
            if (modeSwitch) modeSwitch.textContent = 'Switch to Break (5 min)';
        };
        if (modeSwitch) modeSwitch.onclick = () => {
            if (pomodoroInterval) clearInterval(pomodoroInterval);
            pomodoroInterval = null;
            pomodoroIsBreak = !pomodoroIsBreak;
            pomodoroTime = pomodoroIsBreak ? 5 * 60 : 25 * 60;
            updatePomodoroDisplay();
            modeSwitch.textContent = pomodoroIsBreak ? 'Switch to Study (25 min)' : 'Switch to Break (5 min)';
        };
        updatePomodoroDisplay();
    }

    // ========== GOALS & XP ==========
    function saveGoals() { localStorage.setItem('goals', JSON.stringify(goals));
        renderGoals();
        updateBadgesAndXP(); }

    function renderGoals() {
        const container = document.getElementById('goalsList');
        if (!container) return;
        if (!goals.length) { container.innerHTML =
                '<p style="color:var(--text-tertiary)">✨ Add your first goal!</p>'; return; }
        container.innerHTML = goals.map((g, idx) => `
            <div class="goal-item">
                <input type="checkbox" class="goal-check" data-idx="${idx}" ${g.done?'checked':''} aria-label="Complete goal">
                <span style="flex:1;${g.done?'text-decoration:line-through;opacity:0.6':''}">${escapeHtml(g.text)}</span>
                <button class="del-goal" data-idx="${idx}" aria-label="Delete goal">🗑️</button>
            </div>`).join('');
        container.querySelectorAll('.goal-check').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const i = parseInt(e.target.dataset.idx);
                goals[i].done = e.target.checked;
                saveGoals();
                if (e.target.checked) addXP(5);
            });
        });
        container.querySelectorAll('.del-goal').forEach(btn => {
            btn.addEventListener('click', () => { goals.splice(parseInt(btn.dataset.idx), 1);
                saveGoals(); });
        });
    }

    function addGoal() {
        const input = document.getElementById('newGoalInput');
        const text = input.value.trim();
        if (text) { goals.push({ text, done: false });
            saveGoals();
            input.value = ''; }
    }

    function addXP(amount) {
        xp += amount;
        let needed = level * 100;
        while (xp >= needed) { xp -= needed;
            level++;
            showNotification(`🎉 LEVEL UP! You reached Level ${level}! 🎉`);
            needed = level * 100; }
        localStorage.setItem('xp', xp);
        localStorage.setItem('level', level);
        updateBadgesAndXP();
    }

    function updateBadgesAndXP() {
        const xpFill = document.getElementById('xpFill');
        const xpText = document.getElementById('xpText');
        const levelEl = document.getElementById('levelDisplay');
        const needed = level * 100;
        if (xpFill) xpFill.style.width = `${(xp/needed)*100}%`;
        if (xpText) xpText.innerText = `${xp} / ${needed} XP`;
        if (levelEl) levelEl.innerText = `Level ${level}`;
        if (level >= 2 && !badges.find(b => b.name === 'Rising Star')) {
            badges.push({ name: 'Rising Star', icon: '⭐' });
            showNotification('🏅 Badge unlocked: Rising Star!'); }
        if (level >= 5 && !badges.find(b => b.name === 'Scholar')) {
            badges.push({ name: 'Scholar', icon: '📚' });
            showNotification('🏅 Badge unlocked: Scholar!'); }
        if (goals.filter(g => g.done).length >= 5 && !badges.find(b => b.name === 'Goal Getter')) {
            badges.push({ name: 'Goal Getter', icon: '🎯' });
            showNotification('🏅 Badge unlocked: Goal Getter!'); }
        localStorage.setItem('badges', JSON.stringify(badges));
        const bd = document.getElementById('badgesContainer');
        if (bd) bd.innerHTML = badges.map(b => `<span>${b.icon} ${b.name}</span>`).join('');
    }

    function initGoals() {
        const addBtn = document.getElementById('addGoalBtn');
        const input = document.getElementById('newGoalInput');
        if (addBtn) addBtn.addEventListener('click', addGoal);
        if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') addGoal(); });
        renderGoals();
    }

    function initGamification() { updateBadgesAndXP(); }

    // ========== ASSIGNMENTS ==========
    function saveAssignments() { localStorage.setItem('assignmentsData', JSON.stringify(assignmentsData)); }

    function renderAssignments(filter = "all") {
        const container = document.getElementById('assignmentsList');
        if (!container) return;
        const filtered = assignmentsData.filter(a => filter === 'all' ? true : (filter === 'completed' ? a
            .done : !a.done));
        container.innerHTML = filtered.map((a, idx) => {
            const realIdx = assignmentsData.indexOf(a);
            return `
            <div class="assignment-item">
                <input type="checkbox" class="assign-check" data-idx="${realIdx}" ${a.done?'checked':''} aria-label="Mark complete">
                <div><strong>${escapeHtml(a.title)}</strong>
                <div style="font-size:0.8rem">${escapeHtml(a.subject)} • Due ${escapeHtml(a.due)}</div></div>
            </div>`;
        }).join('');
        container.querySelectorAll('.assign-check').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const i = parseInt(cb.dataset.idx);
                assignmentsData[i].done = cb.checked;
                if (cb.checked) addXP(5);
                saveAssignments();
                const activeFilter = document.querySelector('.filter-btn.active')?.dataset
                    .filter || 'all';
                renderAssignments(activeFilter);
            });
        });
    }

    function initAssignments() {
        renderAssignments('all');
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove(
                    'active'));
                this.classList.add('active');
                renderAssignments(this.dataset.filter);
            });
        });
    }

    // ========== CALENDAR ==========
    function saveCalendarEvents() { localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents)); }

    async function loadCalendarEvents() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = user.id;
        if (!userId) return;

        try {
            const response = await fetch(`${API_BASE}/api/calendar?userId=${userId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Failed to fetch events');
            const data = await response.json();
            calendarEvents = data;
        } catch (err) {
            console.error('Load calendar events error:', err);
            calendarEvents = [];
        }
    }

    function getEventsForDate(year, month, day) {
        const key = formatDateKey(year, month, day);
        return calendarEvents.filter(e => e.dateKey === key);
    }

    async function renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        const label = document.getElementById('calendarMonthLabel');
        if (!grid || !label) return;

        await loadCalendarEvents();

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        label.textContent = `${monthNames[calendarMonth]} ${calendarYear}`;

        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let html = dayHeaders.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

        const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
        const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();
        const today = new Date();
        const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

        const hasEvents = (key) => calendarEvents.some(e => e.date_key === key);

        for (let i = firstDay - 1; i >= 0; i--) {
            const d = daysInPrevMonth - i;
            const key = formatDateKey(calendarYear, calendarMonth - 1, d);
            html += `<div class="calendar-day other-month${hasEvents(key) ? ' has-events' : ''}" data-date-key="${key}">${d}</div>`;
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const key = formatDateKey(calendarYear, calendarMonth, d);
            const isToday = key === todayKey;
            const isSelected = selectedCalendarDate && formatDateKey(selectedCalendarDate.getFullYear(), selectedCalendarDate.getMonth(), selectedCalendarDate.getDate()) === key;
            html += `<div class="calendar-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${hasEvents(key) ? ' has-events' : ''}" data-date-key="${key}">${d}</div>`;
        }

        const remaining = 42 - (firstDay + daysInMonth);
        for (let d = 1; d <= remaining; d++) {
            const key = formatDateKey(calendarYear, calendarMonth + 1, d);
            html += `<div class="calendar-day other-month${hasEvents(key) ? ' has-events' : ''}" data-date-key="${key}">${d}</div>`;
        }

        grid.innerHTML = html;

        grid.querySelectorAll('.calendar-day:not(.other-month)').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                const key = dayEl.dataset.dateKey;
                const parsed = parseDateKey(key);
                selectedCalendarDate = new Date(parsed.year, parsed.month, parsed.day);
                renderCalendar();
                renderEventsPanel();
            });
        });

        grid.querySelectorAll('.calendar-day.other-month').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                const key = dayEl.dataset.dateKey;
                const parsed = parseDateKey(key);
                calendarYear = parsed.year;
                calendarMonth = parsed.month;
                selectedCalendarDate = new Date(parsed.year, parsed.month, parsed.day);
                renderCalendar();
                renderEventsPanel();
            });
        });

        renderEventsPanel();
    }

    function renderEventsPanel() {
        const panel = document.getElementById('calendarEventsPanel');
        const label = document.getElementById('selectedDateLabel');
        const list = document.getElementById('eventsList');
        if (!panel || !label || !list) return;

        if (!selectedCalendarDate) {
            label.textContent = '—';
            list.innerHTML = '<div class="no-events">Select a date to view events</div>';
            return;
        }

        const key = formatDateKey(selectedCalendarDate.getFullYear(), selectedCalendarDate.getMonth(), selectedCalendarDate.getDate());
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        label.textContent = `${monthNames[selectedCalendarDate.getMonth()]} ${selectedCalendarDate.getDate()}, ${selectedCalendarDate.getFullYear()}`;

        const events = calendarEvents.filter(e => e.date_key === key);

        if (!events.length) {
            list.innerHTML = '<div class="no-events">No events for this date</div>';
        } else {
            list.innerHTML = events.map((e, i) => {
                return `
                        <div class="event-item">
                            <div class="event-color-dot" style="background:${escapeHtml(e.color || '#4f46e5')}"></div>
                            <div class="event-info"><strong>${escapeHtml(e.title)}</strong>${e.time ? ` <small>(${escapeHtml(e.time)})</small>` : ''}</div>
                            <button class="event-delete" data-event-id="${e.id}" aria-label="Delete event">✕</button>
                        </div>`;
            }).join('');

            list.querySelectorAll('.event-delete').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const eventId = parseInt(btn.dataset.eventId);
                    await deleteCalendarEvent(eventId);
                });
            });
        }
    }

    async function deleteCalendarEvent(id) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.id) return;
        if (!confirm('Delete this event?')) return;

        try {
            const response = await fetch(`${API_BASE}/api/calendar/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId: user.id })
            });

            if (!response.ok) throw new Error('Failed to delete event');

            await renderCalendar();
            showNotification('Event deleted');
        } catch (err) {
            console.error('Delete event error:', err);
            alert('Failed to delete event.');
        }
    }

    function initCalendar() {
        const prevBtn = document.getElementById('calendarPrev');
        const nextBtn = document.getElementById('calendarNext');
        const todayBtn = document.getElementById('calendarTodayBtn');
        const addBtn = document.getElementById('addEventBtn');

        if (prevBtn) prevBtn.addEventListener('click', () => {
            calendarMonth--;
            if (calendarMonth < 0) { calendarMonth = 11;
                calendarYear--; }
            renderCalendar();
        });
        if (nextBtn) nextBtn.addEventListener('click', () => {
            calendarMonth++;
            if (calendarMonth > 11) { calendarMonth = 0;
                calendarYear++; }
            renderCalendar();
        });
        if (todayBtn) todayBtn.addEventListener('click', () => {
            const now = new Date();
            calendarYear = now.getFullYear();
            calendarMonth = now.getMonth();
            selectedCalendarDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            renderCalendar();
        });

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const defaultKey = selectedCalendarDate ?
                    formatDateKey(selectedCalendarDate.getFullYear(), selectedCalendarDate.getMonth(), selectedCalendarDate.getDate()) :
                    formatDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

                openModal('Add Calendar Event', `
                    <div class="form-group"><label>Event Title</label><input type="text" id="eventTitle" placeholder="E.g., Math Exam" required></div>
                    <div class="form-group"><label>Date</label><input type="date" id="eventDate" value="${defaultKey}" required></div>
                    <div class="form-group"><label>Time (optional)</label><input type="time" id="eventTime"></div>
                    <div class="form-group"><label>Color</label><select id="eventColor">
                        <option value="#4f46e5">Indigo</option>
                        <option value="#ef4444">Red</option>
                        <option value="#f59e0b">Amber</option>
                        <option value="#10b981">Green</option>
                        <option value="#3b82f6">Blue</option>
                        <option value="#ec4899">Pink</option>
                    </select></div>`,
                    async (overlay) => {
                        const title = overlay.querySelector('#eventTitle').value.trim();
                        const dateVal = overlay.querySelector('#eventDate').value;
                        const timeVal = overlay.querySelector('#eventTime').value;
                        const color = overlay.querySelector('#eventColor').value;

                        if (!title) { showNotification('Please enter a title', true); return false; }
                        if (!dateVal) { showNotification('Please select a date', true); return false; }

                        const user = JSON.parse(localStorage.getItem('user') || '{}');
                        if (!user.id) { showNotification('Please log in first.', true); return false; }

                        try {
                            const response = await fetch(`${API_BASE}/api/calendar`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                },
                                body: JSON.stringify({
                                    userId: user.id,
                                    title: title,
                                    dateKey: dateVal,
                                    time: timeVal || null,
                                    color: color
                                })
                            });

                            if (!response.ok) {
                                const data = await response.json();
                                showNotification(data.error || 'Failed to add event', true);
                                return false;
                            }

                            await renderCalendar();
                            showNotification('✅ Event added!');
                            return true;
                        } catch (err) {
                            console.error('Add event error:', err);
                            showNotification('Could not connect to server.', true);
                            return false;
                        }
                    }
                );
            });
        }
        renderCalendar();
    }

    // ========== CLASS SCHEDULE ==========
    function saveScheduleClasses() { localStorage.setItem('scheduleClasses', JSON.stringify(scheduleClasses)); }

    function getDefaultSchedule() {
        return [
            { subject: 'Computer Science', day: 0, startTime: '09:00', endTime: '10:30', location: 'Room 101',
                colorClass: 'color-cs' },
            { subject: 'Mathematics', day: 1, startTime: '11:00', endTime: '12:30', location: 'Room 205',
                colorClass: 'color-math' },
            { subject: 'Physics', day: 2, startTime: '13:00', endTime: '14:30', location: 'Lab 3',
                colorClass: 'color-physics' },
            { subject: 'Chemistry', day: 3, startTime: '09:00', endTime: '10:30', location: 'Lab 1',
                colorClass: 'color-chemistry' },
            { subject: 'English Literature', day: 4, startTime: '14:00', endTime: '15:30', location: 'Room 310',
                colorClass: 'color-english' },
        ];
    }

    async function renderSchedule() {
        const grid = document.getElementById('scheduleGrid');
        const legend = document.getElementById('scheduleLegend');
        if (!grid) return;

        await loadSchedule();

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

        let html = '<div class="schedule-time-label">Time</div>';
        days.forEach(d => { html += `<div class="schedule-day-header">${d}</div>`; });

        timeSlots.forEach(time => {
            html += `<div class="schedule-time-label">${time}</div>`;
            for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
                const classesInSlot = scheduleClasses.filter(c => c.day === dayIdx && c.start_time === time);
                html += '<div class="schedule-cell">';
                classesInSlot.forEach(cls => {
                    html += `
                        <div class="schedule-class-card ${cls.color_class || 'color-default'}" 
                             title="${escapeHtml(cls.subject)} - ${escapeHtml(cls.location)}">
                            <div class="class-subject">${escapeHtml(cls.subject)}</div>
                            <div>${cls.start_time}-${cls.end_time}</div>
                            <div class="class-location">${escapeHtml(cls.location || '')}</div>
                        </div>`;
                });
                html += '</div>';
            }
        });

        grid.innerHTML = html;

        if (legend) {
            const uniqueSubjects = [...new Set(scheduleClasses.map(c => c.subject))];
            const dotColors = {
                'color-cs': '#0891b2',
                'color-math': '#6366f1',
                'color-physics': '#d97706',
                'color-chemistry': '#059669',
                'color-english': '#be185d',
                'color-history': '#7c3aed',
                'color-default': '#4f46e5'
            };
            legend.innerHTML = uniqueSubjects.map(s => {
                const cc = scheduleClasses.find(c => c.subject === s)?.color_class || 'color-default';
                return `<div class="schedule-legend-item"><div class="schedule-legend-dot" style="background:${dotColors[cc] || '#4f46e5'}"></div>${escapeHtml(s)}</div>`;
            }).join('');
        }
    }

    async function loadSchedule() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = user.id;
        if (!userId) return;

        try {
            const response = await fetch(`${API_BASE}/api/schedule?userId=${userId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Failed to fetch schedule');
            const data = await response.json();
            scheduleClasses = data;
        } catch (err) {
            console.error('Load schedule error:', err);
            scheduleClasses = [];
        }
    }

    function initSchedule() {
        renderSchedule();

        const addBtn = document.getElementById('addClassBtn');
        const resetBtn = document.getElementById('resetScheduleBtn');

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                openModal('Add Class', `
                    <div class="form-group"><label>Subject</label><input type="text" id="classSubject" placeholder="E.g., Biology" required></div>
                    <div class="form-group"><label>Day</label>
                        <select id="classDay">
                            <option value="0">Monday</option>
                            <option value="1">Tuesday</option>
                            <option value="2">Wednesday</option>
                            <option value="3">Thursday</option>
                            <option value="4">Friday</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Start Time</label><input type="time" id="classStart" value="09:00" required></div>
                    <div class="form-group"><label>End Time</label><input type="time" id="classEnd" value="10:30" required></div>
                    <div class="form-group"><label>Location</label><input type="text" id="classLocation" placeholder="E.g., Room 101"></div>
                    <div class="form-group"><label>Color</label>
                        <select id="classColor">
                            <option value="color-default">Indigo</option>
                            <option value="color-cs">Teal</option>
                            <option value="color-math">Purple</option>
                            <option value="color-physics">Amber</option>
                            <option value="color-chemistry">Green</option>
                            <option value="color-english">Pink</option>
                            <option value="color-history">Violet</option>
                        </select>
                    </div>`,
                    async (overlay) => {
                        const subject = overlay.querySelector('#classSubject').value.trim();
                        const day = parseInt(overlay.querySelector('#classDay').value);
                        const startTime = overlay.querySelector('#classStart').value;
                        const endTime = overlay.querySelector('#classEnd').value;
                        const location = overlay.querySelector('#classLocation').value.trim();
                        const colorClass = overlay.querySelector('#classColor').value;

                        if (!subject) { showNotification('Please enter a subject', true); return false; }
                        if (!startTime || !endTime) { showNotification('Please set start and end times', true); return false; }
                        if (startTime >= endTime) { showNotification('End time must be after start time', true); return false; }

                        const user = JSON.parse(localStorage.getItem('user') || '{}');
                        if (!user.id) { showNotification('Please log in first.', true); return false; }

                        try {
                            const response = await fetch(`${API_BASE}/api/schedule`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                },
                                body: JSON.stringify({
                                    userId: user.id,
                                    subject,
                                    day,
                                    startTime,
                                    endTime,
                                    location,
                                    colorClass
                                })
                            });

                            if (!response.ok) {
                                const data = await response.json();
                                showNotification(data.error || 'Failed to add class', true);
                                return false;
                            }

                            await renderSchedule();
                            showNotification('✅ Class added!');
                            return true;
                        } catch (err) {
                            console.error('Add class error:', err);
                            showNotification('Could not connect to server.', true);
                            return false;
                        }
                    }
                );
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                if (!confirm('Reset schedule to default? This will replace all your current classes.')) return;

                const user = JSON.parse(localStorage.getItem('user') || '{}');
                if (!user.id) { showNotification('Please log in first.', true); return; }

                try {
                    const response = await fetch(`${API_BASE}/api/schedule/reset`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ userId: user.id })
                    });

                    if (!response.ok) {
                        const data = await response.json();
                        showNotification(data.error || 'Failed to reset schedule', true);
                        return;
                    }

                    await renderSchedule();
                    showNotification('🔄 Schedule reset to default');
                } catch (err) {
                    console.error('Reset schedule error:', err);
                    showNotification('Could not connect to server.', true);
                }
            });
        }
    }

    // ========== STEADY MODE ==========
    function updateSteadyDisplay() {
        const el = document.getElementById('steadyTimerDisplay');
        if (el) {
            const h = Math.floor(steadyTimeLeft / 3600);
            const m = Math.floor((steadyTimeLeft % 3600) / 60);
            const s = steadyTimeLeft % 60;
            el.textContent = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        }
        const total = isSteadyStudy ? studySecs : restSecs;
        const progress = total > 0 ? ((total - steadyTimeLeft) / total) * 100 : 0;
        const fill = document.getElementById('steadyProgressFill');
        if (fill) fill.style.width = `${Math.min(100,progress)}%`;
    }

    function recalcRest() {
        const hours = parseFloat(document.getElementById('studyHours')?.value || 1);
        const ratio = parseFloat(document.getElementById('studyRatio')?.value || 4);
        studySecs = hours * 3600;
        restSecs = studySecs / ratio;
        const restMins = Math.floor(restSecs / 60);
        const restDisplay = document.getElementById('restTimeDisplay');
        if (restDisplay) restDisplay.innerText = `${restMins} min`;
        if (!steadyTimer && isSteadyStudy) { steadyTimeLeft = studySecs;
            updateSteadyDisplay(); }
    }

    function startSteady() {
        if (steadyTimer) clearInterval(steadyTimer);
        steadyTimer = setInterval(() => {
            if (steadyTimeLeft > 0) { steadyTimeLeft--;
                updateSteadyDisplay(); } else {
                clearInterval(steadyTimer);
                steadyTimer = null;
                if (isSteadyStudy) {
                    showNotification('✅ Study session complete! +15 XP');
                    addXP(15);
                    totalFocusSecs += studySecs;
                    totalSteadySessions++;
                    localStorage.setItem('totalFocusSecs', totalFocusSecs);
                    localStorage.setItem('totalSteadySessions', totalSteadySessions);
                    const today = new Date().toDateString();
                    if (lastDate === new Date(Date.now() - 86400000).toDateString()) streak++;
                    else if (lastDate !== today) streak = 1;
                    localStorage.setItem('steadyStreak', streak);
                    localStorage.setItem('lastSteadyDate', today);
                    updateSteadyStats();
                    isSteadyStudy = false;
                    steadyTimeLeft = restSecs;
                    updateSteadyDisplay();
                    const label = document.getElementById('steadyModeLabel');
                    if (label) label.innerHTML = '😴 Rest Time';
                    startSteady();
                } else {
                    showNotification('☕ Break finished! Ready to study again? +5 XP');
                    addXP(5);
                    isSteadyStudy = true;
                    steadyTimeLeft = studySecs;
                    updateSteadyDisplay();
                    const label = document.getElementById('steadyModeLabel');
                    if (label) label.innerHTML = '📚 Study Time';
                    startSteady();
                }
            }
        }, 1000);
        const status = document.getElementById('sessionStatus');
        if (status) status.innerText = isSteadyStudy ? 'Focus mode active' : 'Resting...';
    }

    function updateSteadyStats() {
        const focusEl = document.getElementById('todayFocusTime');
        const sessionsEl = document.getElementById('totalSessions');
        const streakEl = document.getElementById('steadyStreak');
        if (focusEl) focusEl.innerText = `${Math.floor(totalFocusSecs/3600)}h ${Math.floor((totalFocusSecs%3600)/60)}m`;
        if (sessionsEl) sessionsEl.innerText = totalSteadySessions;
        if (streakEl) streakEl.innerText = `${streak} days`;
    }

    function initSteadyMode() {
        const studySlider = document.getElementById('studyHours');
        const ratioSlider = document.getElementById('studyRatio');
        if (studySlider) studySlider.addEventListener('input', () => {
            const display = document.getElementById('studyHoursDisplay');
            if (display) display.innerText = studySlider.value + (studySlider.value == 1 ? ' hour' : ' hours');
            recalcRest();
            if (!steadyTimer) steadyTimeLeft = studySecs;
            updateSteadyDisplay();
        });
        if (ratioSlider) ratioSlider.addEventListener('input', () => {
            const display = document.getElementById('ratioDisplay');
            if (display) display.innerText = ratioSlider.value + ' : 1';
            recalcRest();
            if (!steadyTimer) steadyTimeLeft = studySecs;
            updateSteadyDisplay();
        });
        const resetBtn = document.getElementById('resetSteadySettings');
        if (resetBtn) resetBtn.addEventListener('click', () => {
            if (studySlider) studySlider.value = '1';
            if (ratioSlider) ratioSlider.value = '4';
            const shDisplay = document.getElementById('studyHoursDisplay');
            const rDisplay = document.getElementById('ratioDisplay');
            if (shDisplay) shDisplay.innerText = '1 hour';
            if (rDisplay) rDisplay.innerText = '4 : 1';
            recalcRest();
            if (!steadyTimer) steadyTimeLeft = studySecs;
            updateSteadyDisplay();
            showNotification('Settings reset to default');
        });
        document.getElementById('steadyStart')?.addEventListener('click', startSteady);
        document.getElementById('steadyPause')?.addEventListener('click', () => {
            if (steadyTimer) { clearInterval(steadyTimer);
                steadyTimer = null;
                document.getElementById('sessionStatus').innerText = 'Paused'; }
        });
        document.getElementById('steadyReset')?.addEventListener('click', () => {
            if (steadyTimer) clearInterval(steadyTimer);
            steadyTimer = null;
            isSteadyStudy = true;
            steadyTimeLeft = studySecs;
            updateSteadyDisplay();
            const label = document.getElementById('steadyModeLabel');
            if (label) label.innerHTML = '📚 Study Time';
            const status = document.getElementById('sessionStatus');
            if (status) status.innerText = 'Ready';
        });
        recalcRest();
        updateSteadyDisplay();
        updateSteadyStats();
    }

    // ========== QUICK ACTIONS ==========
    function initQuickActions() {
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'study') {
                    const steadyNav = document.querySelector('.nav-link[data-page="steady"]');
                    if (steadyNav) steadyNav.click();
                } else if (action === 'note') {
                    const notesNav = document.querySelector('.nav-link[data-page="notes"]');
                    if (notesNav) notesNav.click();
                } else {
                    showNotification('✨ Feature coming soon!');
                }
            });
        });
        const globalAdd = document.getElementById('globalAddTask');
        if (globalAdd) globalAdd.addEventListener('click', () => showNotification('➕ Add task form would open'));
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) searchBtn.addEventListener('click', () => showNotification('🔍 Search feature coming soon'));
    }

    // ========== ENTRANCE ANIMATION ==========
    function animateOnLoad() {
        const elements = document.querySelectorAll('.stat-card, .content-card');
        elements.forEach((el, i) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(15px)';
            setTimeout(() => {
                el.style.transition = 'all 0.4s var(--ease-spring)';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, i * 50);
        });
    }

    // ========== LOAD SUBJECTS ==========
    async function loadSubjects() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = user.id;
        if (!userId) {
            console.log('No user logged in, skipping subjects load');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/subjects?userId=${userId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) {
                console.error('Failed to fetch subjects:', response.status);
                return;
            }

            const subjects = await response.json();
            const container = document.querySelector('.subjects-grid');
            if (!container) return;

            if (subjects.length === 0) {
                container.innerHTML = '<p style="color:var(--text-tertiary);">No subjects yet. Add your first!</p>';
                return;
            }

            container.innerHTML = subjects.map(s => `
                <div class="subject-card">
                    <h3>${escapeHtml(s.name)}</h3>
                    <p>${s.assignments_count || 0} assignments · ${s.notes_count || 0} notes</p>
                </div>
            `).join('');
        } catch (err) {
            console.error('Load subjects error:', err);
        }
    }

    // ========== RENDER ASSIGNMENTS ==========
    async function renderAssignments(filter = "all") {
        const container = document.getElementById('assignmentsList');
        if (!container) return;

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = user.id;
        if (!userId) {
            container.innerHTML = '<p style="color:var(--text-tertiary);">Please log in to see assignments.</p>';
            return;
        }

        try {
            const url = `${API_BASE}/api/assignments?userId=${userId}&filter=${filter}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to fetch assignments');

            const data = await response.json();
            assignmentsData = data;

            if (assignmentsData.length === 0) {
                container.innerHTML = '<p style="color:var(--text-tertiary);">📭 No assignments yet. Add one!</p>';
                return;
            }

            container.innerHTML = assignmentsData.map((a) => {
                const dueDisplay = a.due_date ? new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date';
                return `
                    <div class="assignment-item">
                        <input type="checkbox" class="assign-check" data-id="${a.id}" ${a.completed ? 'checked' : ''} aria-label="Mark complete">
                        <div>
                            <strong>${escapeHtml(a.title)}</strong>
                            <div style="font-size:0.8rem">${escapeHtml(a.subject)} • Due ${escapeHtml(dueDisplay)}</div>
                        </div>
                    </div>
                `;
            }).join('');

            container.querySelectorAll('.assign-check').forEach(cb => {
                cb.addEventListener('change', async (e) => {
                    const assignmentId = parseInt(cb.dataset.id);
                    const isChecked = cb.checked;
                    await toggleAssignment(assignmentId, isChecked);
                });
            });
        } catch (err) {
            console.error('Render assignments error:', err);
            container.innerHTML = '<p style="color:var(--danger);">Failed to load assignments.</p>';
        }
    }

    // ========== TOGGLE ASSIGNMENT ==========
    async function toggleAssignment(id, completed) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        try {
            const response = await fetch(`${API_BASE}/api/assignments/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userId: user.id,
                    completed: completed
                })
            });

            if (!response.ok) throw new Error('Failed to update assignment');

            if (completed) {
                addXP(5);
            }

            const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
            await renderAssignments(activeFilter);
            updateStats();
        } catch (err) {
            console.error('Toggle assignment error:', err);
            alert('Failed to update assignment.');
        }
    }

    // ========== RENDER GOALS ==========
    async function renderGoals() {
        const container = document.getElementById('goalsList');
        if (!container) return;

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = user.id;
        if (!userId) {
            container.innerHTML = '<p style="color:var(--text-tertiary);">Please log in.</p>';
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/goals?userId=${userId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to fetch goals');

            const data = await response.json();
            goals = data;

            if (goals.length === 0) {
                container.innerHTML = '<p style="color:var(--text-tertiary);">✨ Add your first goal!</p>';
                return;
            }

            container.innerHTML = goals.map((g) => `
                <div class="goal-item">
                    <input type="checkbox" class="goal-check" data-id="${g.id}" ${g.done ? 'checked' : ''} aria-label="Complete goal">
                    <span style="flex:1;${g.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${escapeHtml(g.text)}</span>
                    <button class="del-goal" data-id="${g.id}" aria-label="Delete goal">🗑️</button>
                </div>
            `).join('');

            container.querySelectorAll('.goal-check').forEach(cb => {
                cb.addEventListener('change', async (e) => {
                    const goalId = parseInt(cb.dataset.id);
                    const isChecked = cb.checked;
                    await toggleGoal(goalId, isChecked);
                });
            });

            container.querySelectorAll('.del-goal').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const goalId = parseInt(btn.dataset.id);
                    await deleteGoal(goalId);
                });
            });
        } catch (err) {
            console.error('Render goals error:', err);
            container.innerHTML = '<p style="color:var(--danger);">Failed to load goals.</p>';
        }
    }

    async function toggleGoal(id, done) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        try {
            const response = await fetch(`${API_BASE}/api/goals/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userId: user.id,
                    done: done
                })
            });

            if (!response.ok) throw new Error('Failed to update goal');

            if (done) {
                addXP(5);
            }

            await renderGoals();
        } catch (err) {
            console.error('Toggle goal error:', err);
            alert('Failed to update goal.');
        }
    }

    async function deleteGoal(id) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!confirm('Delete this goal?')) return;

        try {
            const response = await fetch(`${API_BASE}/api/goals/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId: user.id })
            });

            if (!response.ok) throw new Error('Failed to delete goal');

            await renderGoals();
        } catch (err) {
            console.error('Delete goal error:', err);
            alert('Failed to delete goal.');
        }
    }

    async function addGoal() {
        const input = document.getElementById('newGoalInput');
        const text = input.value.trim();
        if (!text) return;

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.id) {
            alert('Please log in first.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/goals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userId: user.id,
                    text: text
                })
            });

            if (!response.ok) {
                const data = await response.json();
                alert('Failed to add goal: ' + (data.error || 'Unknown error'));
                return;
            }

            input.value = '';
            await renderGoals();
        } catch (err) {
            console.error('Add goal error:', err);
            alert('Could not connect to server.');
        }
    }

    // ========== LOAD STATS ==========
    async function loadStats() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = user.id;
        if (!userId) return;

        try {
            const response = await fetch(`${API_BASE}/api/stats?userId=${userId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Failed to fetch stats');

            const data = await response.json();

            xp = data.xp || 0;
            level = data.level || 1;
            badges = JSON.parse(data.badges || '[]');
            totalFocusSecs = data.total_focus_seconds || 0;
            totalSteadySessions = data.total_sessions || 0;
            streak = data.streak || 0;
            lastDate = data.last_active_date || null;

            updateBadgesAndXP();
            updateSteadyStats();
        } catch (err) {
            console.error('Load stats error:', err);
        }
    }

    async function initStats(userId) {
        try {
            await fetch(`${API_BASE}/api/stats/init`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId })
            });
            await loadStats();
        } catch (err) {
            console.error('Init stats error:', err);
        }
    }

})();