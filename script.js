// ===================================================================
//  GLOBAL HELPERS
// ===================================================================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function toggleSidebar() {
    document.body.classList.toggle('sidebar-hidden');
}

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

function timeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diff = Math.floor((now - past) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
}

function refreshIcons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

// ===================================================================
//  AUTH STATE
// ===================================================================
const token = localStorage.getItem('token');
const isLoggedIn = !!token;
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('👋 Welcome,', isLoggedIn ? user.name : 'Guest');

const API_BASE = 'https://studyflow-2kcz.onrender.com';

// ===================================================================
//  DEMO DATA (for guests)
// ===================================================================
const DEMO_DATA = {
    subjects: [
        { id: 1, name: 'Computer Science', assignments_count: 8, notes_count: 24 },
        { id: 2, name: 'Mathematics', assignments_count: 6, notes_count: 18 },
        { id: 3, name: 'Physics', assignments_count: 5, notes_count: 15 },
        { id: 4, name: 'Chemistry', assignments_count: 7, notes_count: 12 },
        { id: 5, name: 'English Literature', assignments_count: 4, notes_count: 20 },
        { id: 6, name: 'History', assignments_count: 6, notes_count: 16 }
    ],
    assignments: [
        { id: 1, title: 'Data Structures - Binary Tree', subject: 'CS', due_date: '2026-04-24', completed: false },
        { id: 2, title: 'Calculus Problem Set', subject: 'Math', due_date: '2026-04-28', completed: false },
        { id: 3, title: 'Physics Lab Report', subject: 'Physics', due_date: '2026-04-20', completed: true }
    ],
    goals: [
        { id: 1, text: 'Complete CS assignment', done: false },
        { id: 2, text: 'Review calculus notes', done: false }
    ],
    reminders: [
        { id: 1, title: 'Submit math homework', reminder_time: new Date(Date.now() + 3600000).toISOString(), repeat: 'none' }
    ],
    calendarEvents: [
        { id: 1, title: 'Study Group', date_key: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(), time: '15:00', color: '#4f46e5' }
    ],
    schedule: [
        { subject: 'Computer Science', day: 0, start_time: '09:00', end_time: '10:30', location: 'Room 101', color_class: 'color-cs' },
        { subject: 'Mathematics', day: 1, start_time: '11:00', end_time: '12:30', location: 'Room 205', color_class: 'color-math' },
        { subject: 'Physics', day: 2, start_time: '13:00', end_time: '14:30', location: 'Lab 3', color_class: 'color-physics' },
        { subject: 'Chemistry', day: 3, start_time: '09:00', end_time: '10:30', location: 'Lab 1', color_class: 'color-chemistry' },
        { subject: 'English Literature', day: 4, start_time: '14:00', end_time: '15:30', location: 'Room 310', color_class: 'color-english' }
    ],
    upcomingDeadlines: [
        { title: 'Data Structures Assignment', subject: 'CS', due: 'Apr 24', urgency: 'urgent' },
        { title: 'Calculus Midterm', subject: 'Math', due: 'Apr 28', urgency: 'warning' },
        { title: 'Research Paper Draft', subject: 'English', due: 'May 03', urgency: 'normal' }
    ],
    recentActivity: [
        { type: 'assignment_completed', message: 'Completed Physics Lab Report', created_at: new Date(Date.now() - 7200000).toISOString() },
        { type: 'subject_added', message: 'Added Chemistry notes', created_at: new Date(Date.now() - 18000000).toISOString() },
        { type: 'study_session_complete', message: 'Studied Calculus 3h', created_at: new Date(Date.now() - 86400000).toISOString() }
    ],
    stats: { subjects: 6, pending: 12, studyTime: '24h', completion: '85%' }
};

// ===================================================================
//  ALARM SYSTEM (for Pomodoro)
// ===================================================================
let alarmInterval = null;
let alarmAudioCtx = null;
let isAlarmActive = false;

function playAlarmBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = 880;
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
        if (ctx.state === 'running') {
            alarmAudioCtx = ctx;
        }
    } catch (e) {
        console.warn('Alarm beep error:', e);
    }
}

function startAlarmSound() {
    if (isAlarmActive) return;
    isAlarmActive = true;
    playAlarmBeep();
    alarmInterval = setInterval(playAlarmBeep, 600);
}

function stopAlarmSound() {
    isAlarmActive = false;
    if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }
    if (alarmAudioCtx && alarmAudioCtx.state === 'running') {
        try { alarmAudioCtx.close(); } catch (e) { /* ignore */ }
        alarmAudioCtx = null;
    }
}

function showAlarmModal(title, message) {
    stopAlarmSound();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal" style="max-width:420px; text-align:center;">
            <div style="font-size:4rem; margin-bottom:0.5rem;">🔔</div>
            <h3 style="margin-bottom:0.5rem;">${escapeHtml(title)}</h3>
            <p style="color:var(--text-secondary); margin-bottom:1.5rem;">${escapeHtml(message)}</p>
            <button class="btn btn-primary" id="alarmStopBtn" style="font-size:1.2rem; padding:0.8rem 2.5rem;">
                ⏹ Stop Alarm
            </button>
        </div>
    `;
    document.body.appendChild(overlay);
    startAlarmSound();
    overlay.querySelector('#alarmStopBtn').addEventListener('click', () => {
        stopAlarmSound();
        overlay.remove();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            stopAlarmSound();
            overlay.remove();
        }
    });
    setTimeout(() => {
        if (document.body.contains(overlay)) {
            stopAlarmSound();
            overlay.remove();
        }
    }, 30000);
}

// ===================================================================
//  REQUIRE LOGIN MODAL
// ===================================================================
function requireLogin() {
    if (isLoggedIn) return true;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal" style="max-width:400px; text-align:center;">
            <h3>🔐 Login Required</h3>
            <p style="color:var(--text-secondary); margin:1rem 0;">Please log in or create an account to use this feature.</p>
            <div style="display:flex; gap:0.75rem; justify-content:center; flex-wrap:wrap; margin-top:1.5rem;">
                <a href="login.html" class="btn btn-primary" style="text-decoration:none;">Log In</a>
                <a href="login.html" class="btn btn-secondary" style="text-decoration:none;">Sign Up</a>
            </div>
            <button class="btn btn-secondary" style="margin-top:1rem; width:100%;" onclick="this.closest('.modal-overlay').remove()">Close</button>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    return false;
}

// ===================================================================
//  MODAL SYSTEM
// ===================================================================
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

// ===================================================================
//  NOTIFICATIONS
// ===================================================================
async function loadNotifications() {
    console.log('🔔 loadNotifications called');
    const badge = document.getElementById('notificationBadge');
    const list = document.getElementById('notificationList');
    if (!isLoggedIn) {
        badge.style.display = 'none';
        list.innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:1rem 0;">Login to see notifications.</p>';
        return;
    }
    try {
        const url = `${API_BASE}/api/activities?userId=${user.id}&limit=10`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch activities');
        const data = await response.json();
        if (data.unreadCount > 0) {
            badge.style.display = 'inline';
            badge.textContent = data.unreadCount;
        } else {
            badge.style.display = 'none';
        }
        if (!data.activities || data.activities.length === 0) {
            list.innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:1rem 0;">No notifications yet</p>';
            return;
        }
        list.innerHTML = data.activities.map(a => `
            <div class="notification-item ${a.is_read ? '' : 'unread'}">
                <div>${escapeHtml(a.message)}</div>
                <span class="time">${timeAgo(a.created_at)}</span>
            </div>
        `).join('');
        refreshIcons();
    } catch (err) {
        console.error('Load notifications error:', err);
        list.innerHTML = '<p style="color:var(--danger);">Failed to load.</p>';
    }
}

function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    const isOpen = dropdown.classList.toggle('open');
    if (isOpen) {
        markAllRead();
        loadNotifications();
    }
}

async function markAllRead() {
    if (!isLoggedIn) return;
    try {
        await fetch(`${API_BASE}/api/activities/mark-all-read`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ userId: user.id })
        });
        document.getElementById('notificationBadge').style.display = 'none';
    } catch (err) {
        console.error('Mark all read error:', err);
    }
}

// ===================================================================
//  RECENT ACTIVITIES
// ===================================================================
async function loadRecentActivities() {
    const container = document.getElementById('activityTimeline');
    if (!container) return;
    if (!isLoggedIn) {
        container.innerHTML = `<div class="empty-state"><i data-lucide="activity"></i><p>Login to see your activity.</p></div>`;
        refreshIcons();
        return;
    }
    try {
        const url = `${API_BASE}/api/activities?userId=${user.id}&limit=5`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch recent activities');
        const data = await response.json();
        if (!data.activities || data.activities.length === 0) {
            container.innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:1rem;">No recent activity</p>';
            return;
        }
        const icons = {
            'assignment_completed': '✅',
            'goal_completed': '🎯',
            'subject_added': '📚',
            'xp_earned': '⭐',
            'study_session_complete': '🧘',
            'account_created': '🎉',
            'reminder_set': '⏰'
        };
        container.innerHTML = data.activities.map(a => `
            <div>
                ${icons[a.type] || '📌'} ${escapeHtml(a.message)}
                <span class="activity-time">${timeAgo(a.created_at)}</span>
            </div>
        `).join('');
    } catch (err) {
        console.error('Load recent activities error:', err);
        container.innerHTML = '<p style="color:var(--danger);">Failed to load.</p>';
    }
}

// ===================================================================
//  UPDATE STATS (Dashboard)
// ===================================================================
async function updateStats() {
    if (!isLoggedIn) {
        document.getElementById('statSubjects').textContent = DEMO_DATA.stats.subjects;
        document.getElementById('statPending').textContent = DEMO_DATA.stats.pending;
        document.getElementById('statStudyHours').textContent = DEMO_DATA.stats.studyTime;
        document.getElementById('statCompletion').textContent = DEMO_DATA.stats.completion;
        return;
    }
    try {
        const subRes = await fetch(`${API_BASE}/api/subjects?userId=${user.id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (subRes.ok) {
            const subjects = await subRes.json();
            document.getElementById('statSubjects').textContent = subjects.length;
        }
        const assignRes = await fetch(`${API_BASE}/api/assignments?userId=${user.id}&filter=pending`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (assignRes.ok) {
            const pending = await assignRes.json();
            document.getElementById('statPending').textContent = pending.length;
        }
    } catch (err) {
        console.error('Failed to update stats:', err);
    }
}

// ===================================================================
//  LOAD STATS (XP, Level, Steady stats)
// ===================================================================
async function loadStats() {
    if (!isLoggedIn) {
        totalFocusSecs = 0;
        totalSteadySessions = 0;
        streak = 0;
        updateSteadyStats();
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/api/stats?userId=${user.id}`, {
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
        const response = await fetch(`${API_BASE}/api/stats/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ userId })
        });
        if (!response.ok) {
            console.warn('Stats init response not OK:', response.status);
            return;
        }
        await loadStats();
        console.log('✅ Stats initialized for user:', userId);
    } catch (err) {
        console.error('❌ Init stats error:', err);
    }
}

// ===================================================================
//  REMINDERS
// ===================================================================
async function loadReminders() {
    const container = document.getElementById('remindersList');
    if (!container) return;
    if (!isLoggedIn) {
        container.innerHTML = `<div class="empty-state"><i data-lucide="bell"></i><p>Login to manage reminders.</p></div>`;
        refreshIcons();
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/api/reminders?userId=${user.id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch reminders');
        const data = await response.json();
        if (data.length === 0) {
            container.innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:1rem;">No reminders set.</p>';
            return;
        }
        container.innerHTML = data.map(r => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 1rem; background:var(--border-light); border-radius:12px; border-left:4px solid var(--primary);">
                <div>
                    <strong>${escapeHtml(r.title)}</strong>
                    <div style="font-size:0.8rem; color:var(--text-secondary);">${new Date(r.reminder_time).toLocaleString()} ${r.repeat !== 'none' ? '🔁 ' + r.repeat : ''}</div>
                </div>
                <button class="delete-reminder" data-id="${r.id}" style="background:none; border:none; color:var(--danger); cursor:pointer;">🗑️</button>
            </div>
        `).join('');
        container.querySelectorAll('.delete-reminder').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!requireLogin()) return;
                const id = parseInt(btn.dataset.id);
                if (!confirm('Delete this reminder?')) return;
                try {
                    await fetch(`${API_BASE}/api/reminders/${id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                        body: JSON.stringify({ userId: user.id })
                    });
                    await loadReminders();
                    showNotification('Reminder deleted');
                } catch (err) { console.error(err); }
            });
        });
        refreshIcons();
    } catch (err) {
        console.error('Load reminders error:', err);
        container.innerHTML = '<p style="color:var(--danger);">Failed to load.</p>';
    }
}

function checkReminders() {
    if (!isLoggedIn) return;
    fetch(`${API_BASE}/api/reminders?userId=${user.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to fetch reminders');
        return res.json();
    })
    .then(reminders => {
        const now = new Date();
        reminders.forEach(r => {
            const reminderTime = new Date(r.reminder_time);
            const diff = (reminderTime - now) / 1000;
            if (diff <= 60 && diff > -10) {
                triggerNotification(r.title);
                if (r.repeat === 'none') {
                    fetch(`${API_BASE}/api/reminders/${r.id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                        body: JSON.stringify({ userId: user.id })
                    }).then(() => loadReminders()).catch(console.error);
                }
            }
        });
    })
    .catch(err => console.error('Check reminders error:', err));
}

async function triggerNotification(title) {
    if (!isLoggedIn) return;
    try {
        await fetch(`${API_BASE}/api/activities`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                userId: user.id,
                type: 'reminder_triggered',
                message: `🔔 Reminder: "${title}"`,
                metadata: { reminder_title: title }
            })
        });
        await loadNotifications();
    } catch (e) { console.warn('Failed to log reminder activity:', e); }

    if (Notification.permission === 'granted') {
        try {
            new Notification('🔔 Reminder', { body: title, icon: '📘' });
        } catch (e) { /* ignore */ }
    } else if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
            new Notification('🔔 Reminder', { body: title, icon: '📘' });
        }
    }

    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') await audioCtx.resume();
        playBeep(audioCtx);
    } catch (e) { console.warn('Audio not supported', e); }

    showNotification('🔔 ' + title);
}

function playBeep(audioCtx) {
    try {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 880;
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);

        setTimeout(() => {
            try {
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                osc2.frequency.value = 660;
                osc2.type = 'square';
                gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                osc2.start(audioCtx.currentTime);
                osc2.stop(audioCtx.currentTime + 0.5);
            } catch (e) { /* ignore */ }
        }, 200);
    } catch (e) { /* ignore */ }
}

// ===================================================================
//  LOAD SUBJECTS
// ===================================================================
async function loadSubjects() {
    const container = document.querySelector('.subjects-grid');
    if (!container) return;
    if (!isLoggedIn) {
        container.innerHTML = DEMO_DATA.subjects.map(s => `
            <div class="subject-card">
                <h3>${escapeHtml(s.name)}</h3>
                <p>${s.assignments_count} assignments · ${s.notes_count} notes</p>
            </div>
        `).join('');
        refreshIcons();
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/api/subjects?userId=${user.id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) throw new Error('Failed to fetch subjects');
        const subjects = await res.json();
        if (subjects.length === 0) {
            container.innerHTML = `<div class="empty-state"><i data-lucide="book-open"></i><p>No subjects yet — add your first one!</p></div>`;
            refreshIcons();
            return;
        }
        container.innerHTML = subjects.map(s => `
            <div class="subject-card">
                <h3>${escapeHtml(s.name)}</h3>
                <p>${s.assignments_count || 0} assignments · ${s.notes_count || 0} notes</p>
            </div>
        `).join('');
        refreshIcons();
    } catch (err) {
        console.error('Load subjects error:', err);
        container.innerHTML = '<p style="color:var(--danger);">Failed to load.</p>';
    }
}

// ===================================================================
//  ASSIGNMENTS
// ===================================================================
async function renderAssignments(filter = "all") {
    const container = document.getElementById('assignmentsList');
    if (!container) return;
    if (!isLoggedIn) {
        let filtered = DEMO_DATA.assignments;
        if (filter === 'pending') filtered = filtered.filter(a => !a.completed);
        else if (filter === 'completed') filtered = filtered.filter(a => a.completed);
        container.innerHTML = filtered.map(a => `
            <div class="assignment-item">
                <input type="checkbox" class="assign-check" disabled ${a.completed ? 'checked' : ''}>
                <div>
                    <strong>${escapeHtml(a.title)}</strong>
                    <div style="font-size:0.8rem">${escapeHtml(a.subject)} • Due ${a.due_date ? new Date(a.due_date).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : 'No date'}</div>
                </div>
            </div>
        `).join('');
        return;
    }
    try {
        const url = `${API_BASE}/api/assignments?userId=${user.id}&filter=${filter}`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) throw new Error('Failed to fetch assignments');
        const data = await res.json();
        assignmentsData = data;
        if (assignmentsData.length === 0) {
            container.innerHTML = `<div class="empty-state"><i data-lucide="clipboard-list"></i><p>No assignments — create your first one!</p></div>`;
            refreshIcons();
            return;
        }
        container.innerHTML = assignmentsData.map(a => `
            <div class="assignment-item">
                <input type="checkbox" class="assign-check" data-id="${a.id}" ${a.completed ? 'checked' : ''}>
                <div>
                    <strong>${escapeHtml(a.title)}</strong>
                    <div style="font-size:0.8rem">${escapeHtml(a.subject)} • Due ${a.due_date ? new Date(a.due_date).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : 'No date'}</div>
                </div>
            </div>
        `).join('');
        container.querySelectorAll('.assign-check').forEach(cb => {
            cb.addEventListener('change', async (e) => {
                const id = parseInt(cb.dataset.id);
                const checked = cb.checked;
                await toggleAssignment(id, checked);
            });
        });
        refreshIcons();
    } catch (err) {
        console.error('Render assignments error:', err);
        container.innerHTML = '<p style="color:var(--danger);">Failed to load.</p>';
    }
}

async function toggleAssignment(id, completed) {
    if (!requireLogin()) return;
    try {
        const res = await fetch(`${API_BASE}/api/assignments/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ userId: user.id, completed })
        });
        if (!res.ok) throw new Error('Failed');
        if (completed) addXP(5);
        const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
        await renderAssignments(activeFilter);
        updateStats();
    } catch (err) {
        console.error('Toggle assignment error:', err);
        alert('Failed to update assignment.');
    }
}

// ===================================================================
//  GOALS
// ===================================================================
async function renderGoals() {
    const container = document.getElementById('goalsList');
    if (!container) return;
    if (!isLoggedIn) {
        container.innerHTML = DEMO_DATA.goals.map(g => `
            <div class="goal-item">
                <input type="checkbox" class="goal-check" disabled ${g.done ? 'checked' : ''}>
                <span style="flex:1;${g.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${escapeHtml(g.text)}</span>
            </div>
        `).join('');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/api/goals?userId=${user.id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) throw new Error('Failed to fetch goals');
        const data = await res.json();
        goals = data;
        if (goals.length === 0) {
            container.innerHTML = `<div class="empty-state"><i data-lucide="target"></i><p>No goals yet — set your first one!</p></div>`;
            refreshIcons();
            return;
        }
        container.innerHTML = goals.map(g => `
            <div class="goal-item">
                <input type="checkbox" class="goal-check" data-id="${g.id}" ${g.done ? 'checked' : ''}>
                <span style="flex:1;${g.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${escapeHtml(g.text)}</span>
                <button class="del-goal" data-id="${g.id}">🗑️</button>
            </div>
        `).join('');
        container.querySelectorAll('.goal-check').forEach(cb => {
            cb.addEventListener('change', async (e) => {
                const id = parseInt(cb.dataset.id);
                const checked = cb.checked;
                await toggleGoal(id, checked);
            });
        });
        container.querySelectorAll('.del-goal').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(btn.dataset.id);
                await deleteGoal(id);
            });
        });
        refreshIcons();
    } catch (err) {
        console.error('Render goals error:', err);
        container.innerHTML = '<p style="color:var(--danger);">Failed to load.</p>';
    }
}

async function toggleGoal(id, done) {
    if (!requireLogin()) return;
    try {
        const res = await fetch(`${API_BASE}/api/goals/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ userId: user.id, done })
        });
        if (!res.ok) throw new Error('Failed');
        if (done) addXP(5);
        await renderGoals();
    } catch (err) { alert('Failed to update goal.'); }
}

async function deleteGoal(id) {
    if (!requireLogin()) return;
    if (!confirm('Delete this goal?')) return;
    try {
        const res = await fetch(`${API_BASE}/api/goals/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ userId: user.id })
        });
        if (!res.ok) throw new Error('Failed');
        await renderGoals();
    } catch (err) { alert('Failed to delete goal.'); }
}

async function addGoal() {
    if (!requireLogin()) return;
    const input = document.getElementById('newGoalInput');
    const text = input.value.trim();
    if (!text) return;
    try {
        const res = await fetch(`${API_BASE}/api/goals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ userId: user.id, text })
        });
        if (!res.ok) throw new Error('Failed');
        input.value = '';
        await renderGoals();
    } catch (err) { alert('Could not add goal.'); }
}

// ===================================================================
//  XP & GAMIFICATION
// ===================================================================
function addXP(amount) {
    xp += amount;
    let needed = level * 100;
    while (xp >= needed) {
        xp -= needed;
        level++;
        showNotification(`🎉 LEVEL UP! You reached Level ${level}! 🎉`);
        needed = level * 100;
    }
    localStorage.setItem('xp', xp);
    localStorage.setItem('level', level);
    updateBadgesAndXP();
}

function updateBadgesAndXP() {
    const xpFill = document.getElementById('xpFill');
    const xpText = document.getElementById('xpText');
    const levelEl = document.getElementById('levelDisplay');
    const needed = level * 100;
    if (xpFill) xpFill.style.width = `${(xp / needed) * 100}%`;
    if (xpText) xpText.innerText = `${xp} / ${needed} XP`;
    if (levelEl) levelEl.innerText = `Level ${level}`;
    if (level >= 2 && !badges.find(b => b.name === 'Rising Star')) {
        badges.push({ name: 'Rising Star', icon: '⭐' });
        showNotification('🏅 Badge unlocked: Rising Star!');
    }
    if (level >= 5 && !badges.find(b => b.name === 'Scholar')) {
        badges.push({ name: 'Scholar', icon: '📚' });
        showNotification('🏅 Badge unlocked: Scholar!');
    }
    if (goals.filter(g => g.done).length >= 5 && !badges.find(b => b.name === 'Goal Getter')) {
        badges.push({ name: 'Goal Getter', icon: '🎯' });
        showNotification('🏅 Badge unlocked: Goal Getter!');
    }
    localStorage.setItem('badges', JSON.stringify(badges));
    const bd = document.getElementById('badgesContainer');
    if (bd) bd.innerHTML = badges.map(b => `<span>${b.icon} ${b.name}</span>`).join('');
}

// ===================================================================
//  CALENDAR
// ===================================================================
async function loadCalendarEvents() {
    if (!isLoggedIn) {
        calendarEvents = DEMO_DATA.calendarEvents.map((e, i) => ({ ...e, id: i + 1 }));
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/api/calendar?userId=${user.id}`, {
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
        list.innerHTML = events.map((e) => {
            return `
                    <div class="event-item">
                        <div class="event-color-dot" style="background:${escapeHtml(e.color || '#4f46e5')}"></div>
                        <div class="event-info"><strong>${escapeHtml(e.title)}</strong>${e.time ? ` <small>(${escapeHtml(e.time)})</small>` : ''}</div>
                        <button class="event-delete" data-event-id="${e.id}" aria-label="Delete event">✕</button>
                    </div>`;
        }).join('');

        list.querySelectorAll('.event-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!requireLogin()) return;
                const eventId = parseInt(btn.dataset.eventId);
                await deleteCalendarEvent(eventId);
            });
        });
    }
}

async function deleteCalendarEvent(id) {
    if (!requireLogin()) return;
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
            if (!requireLogin()) return;
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

// ===================================================================
//  CLASS SCHEDULE (Weekly view with 7 days)
// ===================================================================
async function loadSchedule() {
    if (!isLoggedIn) {
        scheduleClasses = [
            { id: 1, subject: 'Morning Workout', day: 0, start_time: '06:00', end_time: '07:00', location: 'Gym', color_class: 'color-red', description: 'Cardio' },
            { id: 2, subject: 'Study: CS', day: 0, start_time: '09:00', end_time: '11:00', location: 'Library', color_class: 'color-blue', description: '' },
            { id: 3, subject: 'Team Meeting', day: 0, start_time: '14:00', end_time: '15:00', location: 'Conf Room', color_class: 'color-yellow', description: 'Weekly sync' },
            { id: 4, subject: 'Early Bird Session', day: 1, start_time: '04:00', end_time: '05:00', location: 'Home', color_class: 'color-purple', description: 'Deep work' },
            { id: 5, subject: 'Study: Math', day: 1, start_time: '10:00', end_time: '12:00', location: 'Library', color_class: 'color-green', description: '' },
            { id: 6, subject: 'Gym', day: 2, start_time: '07:00', end_time: '08:00', location: 'Gym', color_class: 'color-default', description: '' },
        ];
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/api/schedule?userId=${user.id}`, {
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

function openEditEventModal(eventData) {
    console.log('📝 Editing event:', eventData);
    const { id, subject, day, start_time, end_time, location, description, color_class } = eventData;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const colorOptions = ['color-red', 'color-blue', 'color-green', 'color-yellow', 'color-purple', 'color-gray', 'color-default'];
    const colorLabels = ['Red (Important)', 'Blue', 'Green', 'Yellow', 'Purple', 'Gray', 'Indigo (Default)'];

    const colorSelectHtml = colorOptions.map((val, idx) => {
        const selected = val === color_class ? 'selected' : '';
        return `<option value="${val}" ${selected}>${colorLabels[idx]}</option>`;
    }).join('');

    const modalHtml = `
        <div class="form-group">
            <label for="editEventTitle">Activity Title</label>
            <input type="text" id="editEventTitle" value="${escapeHtml(subject)}" required>
        </div>
        <div class="form-group">
            <label for="editEventDay">Day</label>
            <select id="editEventDay">
                ${days.map((d, i) => `<option value="${i}" ${i === day ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label for="editEventStart">Start Time</label>
            <input type="time" id="editEventStart" value="${start_time}" required>
        </div>
        <div class="form-group">
            <label for="editEventEnd">End Time</label>
            <input type="time" id="editEventEnd" value="${end_time}" required>
        </div>
        <div class="form-group">
            <label for="editEventLocation">Location (optional)</label>
            <input type="text" id="editEventLocation" value="${escapeHtml(location || '')}" placeholder="e.g., Room 101">
        </div>
        <div class="form-group">
            <label for="editEventDescription">Description (optional)</label>
            <textarea id="editEventDescription" rows="2" placeholder="Add notes...">${escapeHtml(description || '')}</textarea>
        </div>
        <div class="form-group">
            <label for="editEventColor">Color</label>
            <select id="editEventColor">
                ${colorSelectHtml}
            </select>
        </div>
        <div style="display:flex; gap:0.75rem; margin-top:1rem; justify-content:space-between;">
            <button class="btn btn-danger" id="deleteEventBtn">🗑️ Delete</button>
            <div style="display:flex; gap:0.75rem;">
                <button class="btn btn-secondary modal-cancel">Cancel</button>
                <button class="btn btn-primary" id="saveEventBtn">💾 Save</button>
            </div>
        </div>
    `;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
        <div class="modal" style="max-width:550px;">
            <h3>Edit Event</h3>
            <div class="modal-body">${modalHtml}</div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.remove();
    });

    modalOverlay.querySelector('.modal-cancel').addEventListener('click', () => modalOverlay.remove());

    modalOverlay.querySelector('#deleteEventBtn').addEventListener('click', async () => {
        if (!confirm('Delete this event?')) return;
        try {
            const response = await fetch(`${API_BASE}/api/schedule/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId: user.id })
            });
            if (!response.ok) {
                const data = await response.json();
                showNotification(data.error || 'Failed to delete event', true);
                return;
            }
            modalOverlay.remove();
            await loadSchedule();
            await renderSchedule();
            showNotification('🗑️ Event deleted');
        } catch (err) {
            console.error('Delete error:', err);
            showNotification('Could not connect to server.', true);
        }
    });

    modalOverlay.querySelector('#saveEventBtn').addEventListener('click', async () => {
        const title = modalOverlay.querySelector('#editEventTitle').value.trim();
        const day = parseInt(modalOverlay.querySelector('#editEventDay').value);
        const startTime = modalOverlay.querySelector('#editEventStart').value;
        const endTime = modalOverlay.querySelector('#editEventEnd').value;
        const location = modalOverlay.querySelector('#editEventLocation').value.trim();
        const description = modalOverlay.querySelector('#editEventDescription').value.trim();
        const colorClass = modalOverlay.querySelector('#editEventColor').value;

        if (!title) { showNotification('Please enter a title', true); return; }
        if (!startTime || !endTime) { showNotification('Please set start and end times', true); return; }
        if (startTime >= endTime) { showNotification('End time must be after start time', true); return; }

        try {
            const response = await fetch(`${API_BASE}/api/schedule/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userId: user.id,
                    subject: title,
                    day,
                    startTime,
                    endTime,
                    location,
                    colorClass,
                    description
                })
            });
            if (!response.ok) {
                const data = await response.json();
                showNotification(data.error || 'Failed to update event', true);
                return;
            }
            modalOverlay.remove();
            await loadSchedule();
            await renderSchedule();
            showNotification('✅ Event updated!');
        } catch (err) {
            console.error('Update error:', err);
            showNotification('Could not connect to server.', true);
        }
    });
}

async function renderSchedule() {
    const grid = document.getElementById('scheduleGrid');
    const legend = document.getElementById('scheduleLegend');
    if (!grid) return;

    await loadSchedule();

    if (!scheduleClasses || scheduleClasses.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--text-tertiary);">
            No events yet. Click "Add Event" to get started!
        </div>`;
        if (legend) legend.innerHTML = '';
        return;
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const startTimes = [...new Set(scheduleClasses.map(e => e.start_time))].sort();

    let html = '<div class="schedule-time-label">Time</div>';
    days.forEach(d => { html += `<div class="schedule-day-header">${d}</div>`; });

    startTimes.forEach(time => {
        html += `<div class="schedule-time-label">${time}</div>`;
        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            const eventsInSlot = scheduleClasses.filter(e => e.day === dayIdx && e.start_time === time);
            html += '<div class="schedule-cell">';
            eventsInSlot.forEach(ev => {
                html += `
                    <div class="schedule-class-card ${ev.color_class || 'color-default'}" 
                         data-id="${ev.id}"
                         title="${escapeHtml(ev.subject)} - ${escapeHtml(ev.location || '')}">
                        <div class="class-subject">${escapeHtml(ev.subject)}</div>
                        <div>${ev.start_time}-${ev.end_time}</div>
                        <div class="class-location">${escapeHtml(ev.location || '')}</div>
                        ${ev.description ? `<div style="font-size:0.6rem; opacity:0.8;">${escapeHtml(ev.description)}</div>` : ''}
                    </div>`;
            });
            html += '</div>';
        }
    });

    grid.innerHTML = html;

    grid.querySelectorAll('.schedule-class-card').forEach(card => {
        card.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            const eventData = scheduleClasses.find(e => e.id === id);
            if (eventData) {
                openEditEventModal(eventData);
            } else {
                console.warn('Event data not found for id:', id);
            }
        });
    });

    if (legend) {
        const uniqueSubjects = [...new Set(scheduleClasses.map(c => c.subject))];
        const dotColors = {
            'color-red': '#ef4444',
            'color-blue': '#3b82f6',
            'color-green': '#22c55e',
            'color-yellow': '#eab308',
            'color-purple': '#a855f7',
            'color-gray': '#6b7280',
            'color-default': '#4f46e5'
        };
        legend.innerHTML = uniqueSubjects.map(s => {
            const cc = scheduleClasses.find(c => c.subject === s)?.color_class || 'color-default';
            return `<div class="schedule-legend-item"><div class="schedule-legend-dot" style="background:${dotColors[cc] || '#4f46e5'}"></div>${escapeHtml(s)}</div>`;
        }).join('');
    }
}

function initSchedule() {
    renderSchedule();

    const addBtn = document.getElementById('addClassBtn');
    const resetBtn = document.getElementById('resetScheduleBtn');

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            if (!requireLogin()) return;

            openModal('Add Event to Planner', `
                <div class="form-group">
                    <label for="eventTitle">Activity Title</label>
                    <input type="text" id="eventTitle" placeholder="e.g., Study, Gym, Meeting" required>
                </div>
                <div class="form-group">
                    <label for="eventDay">Day</label>
                    <select id="eventDay">
                        <option value="0">Sunday</option>
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="eventStart">Start Time</label>
                    <input type="time" id="eventStart" value="09:00" required>
                </div>
                <div class="form-group">
                    <label for="eventEnd">End Time</label>
                    <input type="time" id="eventEnd" value="10:00" required>
                </div>
                <div class="form-group">
                    <label for="eventLocation">Location (optional)</label>
                    <input type="text" id="eventLocation" placeholder="e.g., Room 101, Library">
                </div>
                <div class="form-group">
                    <label for="eventDescription">Description (optional)</label>
                    <textarea id="eventDescription" rows="2" placeholder="Add notes..."></textarea>
                </div>
                <div class="form-group" style="display:flex; align-items:center; gap:0.5rem;">
                    <input type="checkbox" id="eventDaily" style="width:18px; height:18px;">
                    <label for="eventDaily" style="margin:0;">Repeat every day</label>
                </div>
                <div class="form-group">
                    <label for="eventColor">Color</label>
                    <select id="eventColor">
                        <option value="color-red">Red (Important)</option>
                        <option value="color-blue">Blue</option>
                        <option value="color-green">Green</option>
                        <option value="color-yellow">Yellow</option>
                        <option value="color-purple">Purple</option>
                        <option value="color-gray">Gray</option>
                        <option value="color-default">Indigo (Default)</option>
                    </select>
                </div>
            `, async (overlay) => {
                const title = overlay.querySelector('#eventTitle').value.trim();
                const day = parseInt(overlay.querySelector('#eventDay').value);
                const startTime = overlay.querySelector('#eventStart').value;
                const endTime = overlay.querySelector('#eventEnd').value;
                const location = overlay.querySelector('#eventLocation').value.trim();
                const description = overlay.querySelector('#eventDescription').value.trim();
                const colorClass = overlay.querySelector('#eventColor').value;
                const daily = overlay.querySelector('#eventDaily').checked;

                if (!title) { showNotification('Please enter a title', true); return false; }
                if (!startTime || !endTime) { showNotification('Please set start and end times', true); return false; }
                if (startTime >= endTime) { showNotification('End time must be after start time', true); return false; }

                try {
                    const daysToPost = daily ? [0,1,2,3,4,5,6] : [day];
                    for (const d of daysToPost) {
                        const response = await fetch(`${API_BASE}/api/schedule`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({
                                userId: user.id,
                                subject: title,
                                day: d,
                                startTime,
                                endTime,
                                location,
                                colorClass,
                                description
                            })
                        });
                        if (!response.ok) {
                            const data = await response.json();
                            showNotification(data.error || 'Failed to add event', true);
                            return false;
                        }
                    }
                    await loadSchedule();
                    await renderSchedule();
                    showNotification('✅ Event(s) added!');
                    return true;
                } catch (err) {
                    console.error('Add event error:', err);
                    showNotification('Could not connect to server.', true);
                    return false;
                }
            });
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (!requireLogin()) return;

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal" style="max-width:450px;">
                    <h3>Reset Weekly Planner</h3>
                    <p style="color:var(--text-secondary); margin:1rem 0;">This will replace all your current events with the default schedule. Are you sure?</p>
                    <div class="modal-actions" style="justify-content:center; gap:1rem;">
                        <button class="btn btn-secondary" id="resetCancelBtn">Cancel</button>
                        <button class="btn btn-danger" id="resetConfirmBtn">Yes, Reset</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            overlay.querySelector('#resetCancelBtn').addEventListener('click', () => overlay.remove());
            overlay.querySelector('#resetConfirmBtn').addEventListener('click', async () => {
                try {
                    const response = await fetch(`${API_BASE}/api/schedule/reset`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ userId: user.id })
                    });
                    if (!response.ok) throw new Error('Failed');
                    await loadSchedule();
                    await renderSchedule();
                    showNotification('🔄 Schedule reset to default');
                    overlay.remove();
                } catch (err) {
                    console.error('Reset error:', err);
                    showNotification('Could not connect to server.', true);
                    overlay.remove();
                }
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.remove();
            });
        });
    }
}

// ===================================================================
//  POMODORO
// ===================================================================
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

            const isBreak = pomodoroIsBreak;
            showAlarmModal(
                isBreak ? '🍅 Break Finished!' : '✅ Session Complete!',
                isBreak ? 'Time to get back to study!' : `You earned +10 XP!`
            );

            if (!pomodoroIsBreak) {
                addXP(10);
            }

            pomodoroIsBreak = !pomodoroIsBreak;
            pomodoroTime = pomodoroIsBreak ? 5 * 60 : 25 * 60;
            updatePomodoroDisplay();
            const ms = document.getElementById('modeSwitch');
            if (ms) ms.textContent = pomodoroIsBreak ? 'Switch to Study (25 min)' : 'Switch to Break (5 min)';

            startPomodoro();
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

// ===================================================================
//  STEADY MODE
// ===================================================================
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
    const hoursInput = document.getElementById('studyHours');
    const ratioInput = document.getElementById('studyRatio');
    const restDisplay = document.getElementById('restTimeDisplay');

    if (!hoursInput || !ratioInput || !restDisplay) {
        console.warn('Steady Mode elements not found:', { hoursInput, ratioInput, restDisplay });
        return;
    }

    const hours = parseFloat(hoursInput.value) || 1;
    const ratio = parseFloat(ratioInput.value) || 4;

    console.log(`📊 recalcRest: hours=${hours}, ratio=${ratio}`);

    studySecs = hours * 3600;
    restSecs = studySecs / ratio;

    const restMins = Math.floor(restSecs / 60);
    restDisplay.innerText = `${restMins} min`;

    console.log(`📊 restSecs=${restSecs}, restMins=${restMins}`);

    if (!steadyTimer && isSteadyStudy) {
        steadyTimeLeft = studySecs;
        updateSteadyDisplay();
    }
}

function startSteady() {
    if (steadyTimer) clearInterval(steadyTimer);

    steadyTimer = setInterval(() => {
        if (steadyTimeLeft > 0) {
            steadyTimeLeft--;
            updateSteadyDisplay();
        } else {
            clearInterval(steadyTimer);
            steadyTimer = null;

            if (isSteadyStudy) {
                showNotification('✅ Study session complete! +15 XP');
                addXP(15);

                (async () => {
                    if (!isLoggedIn) {
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
                        return;
                    }

                    try {
                        const response = await fetch(`${API_BASE}/api/stats`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({
                                userId: user.id,
                                sessionTime: studySecs,
                                sessionIncrement: true,
                                streakUpdate: true
                            })
                        });

                        if (!response.ok) throw new Error('Failed to update stats');

                        const data = await response.json();
                        totalFocusSecs = data.total_focus_seconds;
                        totalSteadySessions = data.total_sessions;
                        streak = data.streak;
                        lastDate = data.last_active_date;

                        localStorage.setItem('totalFocusSecs', totalFocusSecs);
                        localStorage.setItem('totalSteadySessions', totalSteadySessions);
                        localStorage.setItem('steadyStreak', streak);
                        localStorage.setItem('lastSteadyDate', lastDate);

                        updateSteadyStats();
                    } catch (err) {
                        console.error('Failed to update steady stats:', err);
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
                    }
                })();

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

    if (focusEl) {
        const hours = Math.floor(totalFocusSecs / 3600);
        const mins = Math.floor((totalFocusSecs % 3600) / 60);
        focusEl.innerText = `${hours}h ${mins}m`;
    }
    if (sessionsEl) sessionsEl.innerText = totalSteadySessions;
    if (streakEl) streakEl.innerText = `${streak} days`;
}

function initSteadyMode() {
    const studySlider = document.getElementById('studyHours');
    const ratioSlider = document.getElementById('studyRatio');
    const resetBtn = document.getElementById('resetSteadySettings');

    console.log('🔄 initSteadyMode called');

    if (!studySlider || !ratioSlider) {
        console.warn('Steady Mode sliders not found');
        return;
    }

    studySlider.addEventListener('input', function() {
        const display = document.getElementById('studyHoursDisplay');
        if (display) {
            display.innerText = this.value + (this.value == 1 ? ' hour' : ' hours');
        }
        recalcRest();
        if (!steadyTimer) {
            steadyTimeLeft = studySecs;
            updateSteadyDisplay();
        }
        console.log('⏱️ Study duration changed to', this.value);
    });

    ratioSlider.addEventListener('input', function() {
        const display = document.getElementById('ratioDisplay');
        if (display) {
            display.innerText = this.value + ' : 1';
        }
        recalcRest();
        if (!steadyTimer) {
            steadyTimeLeft = studySecs;
            updateSteadyDisplay();
        }
        console.log('⚖️ Ratio changed to', this.value);
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            studySlider.value = '1';
            ratioSlider.value = '4';
            const shDisplay = document.getElementById('studyHoursDisplay');
            const rDisplay = document.getElementById('ratioDisplay');
            if (shDisplay) shDisplay.innerText = '1 hour';
            if (rDisplay) rDisplay.innerText = '4 : 1';
            recalcRest();
            if (!steadyTimer) {
                steadyTimeLeft = studySecs;
                updateSteadyDisplay();
            }
            showNotification('Settings reset to default');
            console.log('🔄 Steady settings reset');
        });
    }

    document.getElementById('steadyStart')?.addEventListener('click', function() {
        console.log('▶️ Start Steady');
        startSteady();
    });

    document.getElementById('steadyPause')?.addEventListener('click', function() {
        console.log('⏸️ Pause Steady');
        if (steadyTimer) {
            clearInterval(steadyTimer);
            steadyTimer = null;
            document.getElementById('sessionStatus').innerText = 'Paused';
        }
    });

    document.getElementById('steadyReset')?.addEventListener('click', function() {
        console.log('🔄 Reset Steady');
        if (steadyTimer) {
            clearInterval(steadyTimer);
            steadyTimer = null;
        }
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

    console.log('✅ Steady Mode initialized with studySecs=', studySecs, 'restSecs=', restSecs);
}

// ===================================================================
//  NAVIGATION
// ===================================================================
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
            if (pageId === 'progress-page') loadProgress();
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

// ===================================================================
//  QUICK ACTIONS & GLOBAL ADD TASK
// ===================================================================
function initQuickActions() {
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action === 'study') {
                document.querySelector('.nav-link[data-page="steady"]')?.click();
            } else if (action === 'note') {
                document.querySelector('.nav-link[data-page="notes"]')?.click();
            } else if (action === 'reminder') {
                document.getElementById('addReminderBtn')?.click();
            } else if (action === 'progress') {
                document.querySelector('.nav-link[data-page="progress"]')?.click();
            }else if (action === 'progress') {
                if (!requireLogin()) return;
                showNotification('📊 Progress page coming soon!');
            } else {
                showNotification('✨ Feature coming soon!');
            }
        });
    });

    document.getElementById('globalAddTask')?.addEventListener('click', () => {
        if (!requireLogin()) return;

        const modalContent = `
            <div style="display:flex; gap:0.5rem; margin-bottom:1.2rem; flex-wrap:wrap;" id="taskTypeSelector">
                <button class="btn btn-primary task-type-btn" data-type="assignment" style="flex:1; justify-content:center;">📋 Assignment</button>
                <button class="btn btn-secondary task-type-btn" data-type="goal" style="flex:1; justify-content:center;">🎯 Goal</button>
                <button class="btn btn-secondary task-type-btn" data-type="reminder" style="flex:1; justify-content:center;">⏰ Reminder</button>
            </div>
            <div id="taskDynamicFields"></div>
            <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1rem;">
                <button class="btn btn-secondary modal-cancel">Cancel</button>
                <button class="btn btn-primary" id="submitTaskBtn">💾 Save Task</button>
            </div>
        `;

        const container = document.getElementById('modalContainer');
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal" style="max-width:550px;">
                <h3 style="display:flex; align-items:center; gap:0.5rem;">
                    <i data-lucide="plus-circle"></i> Add New Task
                </h3>
                <div class="modal-body">${modalContent}</div>
            </div>
        `;
        container.appendChild(overlay);

        const closeModal = () => overlay.remove();
        overlay.querySelector('.modal-cancel').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        const typeBtns = overlay.querySelectorAll('.task-type-btn');
        const dynamicContainer = overlay.querySelector('#taskDynamicFields');
        let currentType = 'assignment';

        function renderFields(type) {
            typeBtns.forEach(btn => {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
                if (btn.dataset.type === type) {
                    btn.classList.remove('btn-secondary');
                    btn.classList.add('btn-primary');
                }
            });
            currentType = type;

            let fieldsHtml = '';
            if (type === 'assignment') {
                fieldsHtml = `
                    <div class="form-group">
                        <label for="taskTitle">Assignment Title</label>
                        <input type="text" id="taskTitle" placeholder="e.g., Binary Trees Homework" required autofocus>
                    </div>
                    <div class="form-group">
                        <label for="taskSubject">Subject</label>
                        <input type="text" id="taskSubject" placeholder="e.g., Computer Science" required>
                    </div>
                    <div class="form-group">
                        <label for="taskDueDate">Due Date <small style="font-weight:400; color:var(--text-tertiary);">(optional)</small></label>
                        <input type="date" id="taskDueDate" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                `;
            } else if (type === 'goal') {
                fieldsHtml = `
                    <div class="form-group">
                        <label for="taskTitle">Goal Description</label>
                        <input type="text" id="taskTitle" placeholder="e.g., Finish Chapter 5" required autofocus>
                    </div>
                    <div style="color:var(--text-tertiary); font-size:0.85rem; margin-top:-0.5rem; margin-bottom:0.5rem;">
                        💡 Goals appear on your dashboard under "Today's Goals".
                    </div>
                `;
            } else if (type === 'reminder') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const defaultDateTime = tomorrow.toISOString().slice(0, 16);
                fieldsHtml = `
                    <div class="form-group">
                        <label for="taskTitle">Reminder Title</label>
                        <input type="text" id="taskTitle" placeholder="e.g., Call the dentist" required autofocus>
                    </div>
                    <div class="form-group">
                        <label for="taskReminderTime">Date & Time</label>
                        <input type="datetime-local" id="taskReminderTime" value="${defaultDateTime}" required>
                    </div>
                    <div class="form-group">
                        <label for="taskRepeat">Repeat</label>
                        <select id="taskRepeat">
                            <option value="none">Never</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                `;
            }
            dynamicContainer.innerHTML = fieldsHtml;
            const titleInput = dynamicContainer.querySelector('#taskTitle');
            if (titleInput) setTimeout(() => titleInput.focus(), 100);
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        typeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                renderFields(btn.dataset.type);
            });
        });

        renderFields('assignment');

        const submitBtn = overlay.querySelector('#submitTaskBtn');
        submitBtn.addEventListener('click', async () => {
            const titleInput = dynamicContainer.querySelector('#taskTitle');
            if (!titleInput) return;

            const title = titleInput.value.trim();
            if (!title) {
                showNotification('Please enter a title.', true);
                titleInput.focus();
                return;
            }

            let payload = {};
            let endpoint = '';

            if (currentType === 'assignment') {
                const subjectInput = dynamicContainer.querySelector('#taskSubject');
                const dueDateInput = dynamicContainer.querySelector('#taskDueDate');
                const subject = subjectInput ? subjectInput.value.trim() : '';
                if (!subject) {
                    showNotification('Please enter a subject.', true);
                    subjectInput.focus();
                    return;
                }
                payload = {
                    userId: user.id,
                    title,
                    subject,
                    dueDate: dueDateInput ? dueDateInput.value || null : null
                };
                endpoint = `${API_BASE}/api/assignments`;
            } else if (currentType === 'goal') {
                payload = {
                    userId: user.id,
                    text: title
                };
                endpoint = `${API_BASE}/api/goals`;
            } else if (currentType === 'reminder') {
                const dateTimeInput = dynamicContainer.querySelector('#taskReminderTime');
                const repeatSelect = dynamicContainer.querySelector('#taskRepeat');
                if (!dateTimeInput || !dateTimeInput.value) {
                    showNotification('Please select a date and time.', true);
                    dateTimeInput.focus();
                    return;
                }
                payload = {
                    userId: user.id,
                    title,
                    reminderTime: dateTimeInput.value,
                    repeat: repeatSelect ? repeatSelect.value : 'none'
                };
                endpoint = `${API_BASE}/api/reminders`;
            }

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const data = await response.json();
                    showNotification(data.error || `Failed to add ${currentType}.`, true);
                    return;
                }

                if (currentType === 'assignment') {
                    const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
                    await renderAssignments(activeFilter);
                    await updateStats();
                    await updateDeadlines();
                } else if (currentType === 'goal') {
                    await renderGoals();
                } else if (currentType === 'reminder') {
                    await loadReminders();
                }

                closeModal();
                showNotification(`✅ ${currentType.charAt(0).toUpperCase() + currentType.slice(1)} added successfully!`);
            } catch (err) {
                console.error('Add task error:', err);
                showNotification('Could not connect to server.', true);
            }
        });

        dynamicContainer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                e.preventDefault();
                submitBtn.click();
            }
        });

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    });
}

// ===================================================================
//  ANIMATION
// ===================================================================
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

// ===================================================================
//  UPDATE DEADLINES
// ===================================================================
async function updateDeadlines() {
    const container = document.getElementById('upcomingDeadlines');
    if (!container) return;

    if (!isLoggedIn) {
        container.innerHTML = DEMO_DATA.upcomingDeadlines.map(d => `
            <div class="deadline-item ${d.urgency}">
                <div class="deadline-date"><span class="date-day">${d.due.split(' ')[0]}</span><span>${d.due.split(' ')[1]}</span></div>
                <div class="deadline-content">
                    <strong>${escapeHtml(d.title)}</strong>
                    <div>${escapeHtml(d.subject)}</div>
                </div>
                <span class="deadline-badge">${d.urgency === 'urgent' ? '2 days left' : d.urgency === 'warning' ? '6 days left' : '11 days left'}</span>
            </div>
        `).join('');
        return;
    }

    try {
        const assignRes = await fetch(`${API_BASE}/api/assignments?userId=${user.id}&filter=pending`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!assignRes.ok) throw new Error('Failed to fetch assignments');

        const assignments = await assignRes.json();

        const eventRes = await fetch(`${API_BASE}/api/calendar?userId=${user.id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!eventRes.ok) throw new Error('Failed to fetch calendar events');

        const events = await eventRes.json();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const formattedAssignments = assignments
            .filter(a => a.due_date)
            .map(a => {
                const dueDate = new Date(a.due_date);
                dueDate.setHours(0, 0, 0, 0);
                const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                return {
                    type: 'assignment',
                    id: a.id,
                    title: a.title,
                    subject: a.subject,
                    dueDate: dueDate,
                    daysDiff: daysDiff,
                    color: '#4f46e5',
                    icon: '📋',
                    urgency: daysDiff <= 2 ? 'urgent' : daysDiff <= 5 ? 'warning' : 'normal',
                    urgencyText: daysDiff <= 0 ? 'Past due!' : `${daysDiff} days left`
                };
            });

        const formattedEvents = events
            .filter(e => e.date_key)
            .map(e => {
                const [year, month, day] = e.date_key.split('-').map(Number);
                const eventDate = new Date(year, month - 1, day);
                eventDate.setHours(0, 0, 0, 0);
                const daysDiff = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
                return {
                    type: 'event',
                    id: e.id,
                    title: e.title,
                    subject: e.time ? `🕐 ${e.time}` : 'No time set',
                    dueDate: eventDate,
                    daysDiff: daysDiff,
                    color: e.color || '#4f46e5',
                    icon: '📅',
                    urgency: daysDiff <= 2 ? 'urgent' : daysDiff <= 5 ? 'warning' : 'normal',
                    urgencyText: daysDiff <= 0 ? 'Past due!' : `${daysDiff} days left`
                };
            });

        const combined = [...formattedAssignments, ...formattedEvents];
        combined.sort((a, b) => {
            const aPast = a.daysDiff <= 0;
            const bPast = b.daysDiff <= 0;
            if (aPast && !bPast) return -1;
            if (!aPast && bPast) return 1;
            return a.daysDiff - b.daysDiff;
        });

        if (combined.length === 0) {
            container.innerHTML = '<p style="color:var(--text-tertiary);">No upcoming deadlines or events 🎉</p>';
            return;
        }

        let listHtml = `<div style="max-height:300px; overflow-y:auto; display:flex; flex-direction:column; gap:0.8rem; padding-right:4px;">`;
        listHtml += combined.map(item => {
            const month = item.dueDate.toLocaleString('default', { month: 'short' });
            const day = item.dueDate.getDate();

            return `
                <div class="deadline-item ${item.urgency}" style="border-left-color: ${item.color}; flex-shrink:0;">
                    <div class="deadline-date" style="background:${item.color}20; color:${item.color};">
                        <span class="date-day">${day}</span>
                        <span>${month}</span>
                    </div>
                    <div class="deadline-content">
                        <strong>${item.icon} ${escapeHtml(item.title)}</strong>
                        <div>${escapeHtml(item.subject)}</div>
                    </div>
                    <span class="deadline-badge" style="background:${item.color}20; color:${item.color};">
                        ${item.daysDiff <= 0 ? '⚠️ Past due' : item.urgencyText}
                    </span>
                </div>
            `;
        }).join('');
        listHtml += `</div>`;

        container.innerHTML = listHtml;
    } catch (err) {
        console.error('Update deadlines error:', err);
        container.innerHTML = '<p style="color:var(--danger);">Failed to load deadlines.</p>';
    }
}

// ===================================================================
//  NOTES FUNCTIONS (with Quill Rich Editor)
// ===================================================================
let quill = null; // Quill editor instance

function initQuill() {
    if (quill) return;
    const editorContainer = document.getElementById('quillEditor');
    if (!editorContainer) return;

    const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['clean']
    ];

    quill = new Quill(editorContainer, {
        theme: 'snow',
        modules: {
            toolbar: toolbarOptions,
            imageResize: {
                displaySize: true,
                modules: ['Resize', 'DisplaySize']
            }
        },
        placeholder: 'Start writing...',
        formats: ['header', 'bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block', 'list', 'indent', 'link', 'image', 'video', 'color', 'background', 'align']
    });

    // ---- Image Upload Handler ----
    const imageHandler = () => {
        if (!isLoggedIn) { requireLogin(); return; }
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('image', file);
            try {
                setNoteStatus('Uploading...');
                const response = await fetch(`${API_BASE}/api/upload/image`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: formData
                });
                if (!response.ok) {
                    const data = await response.json();
                    showNotification(data.error || 'Upload failed', true);
                    setNoteStatus('Error');
                    return;
                }
                const data = await response.json();
                const range = quill.getSelection();
                const index = range ? range.index : quill.getLength();
                quill.insertEmbed(index, 'image', data.url);
                quill.setSelection(index + 1);
                setNoteStatus('Image inserted');
                // Trigger auto-save
                autoSaveQuill();
            } catch (err) {
                console.error('Upload error:', err);
                showNotification('Could not upload image.', true);
                setNoteStatus('Error');
            }
        };
    };

    const toolbar = quill.getModule('toolbar');
    if (toolbar) {
        toolbar.addHandler('image', imageHandler);
    }

    // ---- Auto-save on text change ----
    quill.on('text-change', () => {
        autoSaveQuill();
    });
}

function autoSaveQuill() {
    if (noteSaveTimeout) clearTimeout(noteSaveTimeout);
    setNoteStatus('Unsaved changes...');
    noteSaveTimeout = setTimeout(() => {
        const title = document.getElementById('noteTitle').value.trim();
        const content = quill.root.innerHTML.trim();
        if (title || content) {
            saveCurrentNote();
        } else {
            setNoteStatus('Ready');
        }
    }, 1500);
}

async function loadNotes() {
    const listContainer = document.getElementById('notesListContainer');
    if (!listContainer) return;
    if (!isLoggedIn) {
        listContainer.innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:1rem;">Login to manage notes.</p>';
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/api/notes?userId=${user.id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch notes');
        const data = await response.json();
        notes = data;
        renderNoteList();
        initQuill(); // ensure quill is initialized
        if (!currentNoteId && notes.length > 0) {
            selectNote(notes[0].id);
        } else if (notes.length === 0) {
            clearEditor();
        }
    } catch (err) {
        console.error('Load notes error:', err);
        listContainer.innerHTML = '<p style="color:var(--danger);">Failed to load notes.</p>';
    }
}

async function loadProgress() {
    const container = document.getElementById('progressContent');
    if (!container) return;

    if (!isLoggedIn) {
        container.innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:2rem;">Login to see your progress.</p>';
        return;
    }

    try {
        // Fetch all data in parallel
        const [statsRes, subjectsRes, assignmentsRes, goalsRes, notesRes, calendarRes, remindersRes] = await Promise.all([
            fetch(`${API_BASE}/api/stats?userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }),
            fetch(`${API_BASE}/api/subjects?userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }),
            fetch(`${API_BASE}/api/assignments?userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }),
            fetch(`${API_BASE}/api/goals?userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }),
            fetch(`${API_BASE}/api/notes?userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }),
            fetch(`${API_BASE}/api/calendar?userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }),
            fetch(`${API_BASE}/api/reminders?userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
        ]);

        const stats = statsRes.ok ? await statsRes.json() : { xp: 0, level: 1, total_focus_seconds: 0, total_sessions: 0, streak: 0 };
        const subjects = subjectsRes.ok ? await subjectsRes.json() : [];
        const assignments = assignmentsRes.ok ? await assignmentsRes.json() : [];
        const goals = goalsRes.ok ? await goalsRes.json() : [];
        const notes = notesRes.ok ? await notesRes.json() : [];
        const calendarEvents = calendarRes.ok ? await calendarRes.json() : [];
        const reminders = remindersRes.ok ? await remindersRes.json() : [];

        // Compute derived stats
        const totalSubjects = subjects.length;
        const totalAssignments = assignments.length;
        const completedAssignments = assignments.filter(a => a.completed).length;
        const totalGoals = goals.length;
        const completedGoals = goals.filter(g => g.done).length;
        const totalNotes = notes.length;
        const totalEvents = calendarEvents.length;
        const totalReminders = reminders.length;

        const xp = stats.xp || 0;
        const level = stats.level || 1;
        const needed = level * 100;
        const xpPercent = Math.min(100, (xp / needed) * 100);
        const focusHours = Math.floor((stats.total_focus_seconds || 0) / 3600);
        const focusMins = Math.floor(((stats.total_focus_seconds || 0) % 3600) / 60);

        // Build HTML
        let html = `
            <div style="display:grid; grid-template-columns: 1fr 2fr; gap:1.5rem; margin-bottom:2rem;">
                <!-- XP Ring -->
                <div style="background:var(--surface); border-radius:16px; border:1px solid var(--border); padding:1.5rem; text-align:center;">
                    <div class="progress-ring" style="--pct: ${xpPercent};">
                        <span class="ring-label">${xp} / ${needed}</span>
                    </div>
                    <div style="font-family:var(--font-display); font-size:1.8rem; font-weight:700; color:var(--primary);">Level ${level}</div>
                    <div style="font-size:0.9rem; color:var(--text-secondary);">${xp} XP · ${needed - xp} XP to next level</div>
                </div>

                <!-- Stats Summary -->
                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:0.8rem;">
                    <div class="progress-stat-card">
                        <div class="stat-icon">⏱️</div>
                        <div class="stat-number">${focusHours}h ${focusMins}m</div>
                        <div class="stat-label">Total Study Time</div>
                    </div>
                    <div class="progress-stat-card">
                        <div class="stat-icon">🏆</div>
                        <div class="stat-number">${stats.total_sessions || 0}</div>
                        <div class="stat-label">Sessions</div>
                    </div>
                    <div class="progress-stat-card">
                        <div class="stat-icon">🔥</div>
                        <div class="stat-number">${stats.streak || 0}</div>
                        <div class="stat-label">Day Streak</div>
                    </div>
                    <div class="progress-stat-card">
                        <div class="stat-icon">📚</div>
                        <div class="stat-number">${totalSubjects}</div>
                        <div class="stat-label">Subjects</div>
                    </div>
                </div>
            </div>

            <!-- Second Row: More Stats -->
            <div class="progress-stats-grid">
                <div class="progress-stat-card">
                    <div class="stat-icon">📋</div>
                    <div class="stat-number">${completedAssignments}/${totalAssignments}</div>
                    <div class="stat-label">Assignments Done</div>
                </div>
                <div class="progress-stat-card">
                    <div class="stat-icon">🎯</div>
                    <div class="stat-number">${completedGoals}/${totalGoals}</div>
                    <div class="stat-label">Goals Completed</div>
                </div>
                <div class="progress-stat-card">
                    <div class="stat-icon">📝</div>
                    <div class="stat-number">${totalNotes}</div>
                    <div class="stat-label">Notes</div>
                </div>
                <div class="progress-stat-card">
                    <div class="stat-icon">📅</div>
                    <div class="stat-number">${totalEvents}</div>
                    <div class="stat-label">Calendar Events</div>
                </div>
                <div class="progress-stat-card">
                    <div class="stat-icon">⏰</div>
                    <div class="stat-number">${totalReminders}</div>
                    <div class="stat-label">Reminders</div>
                </div>
                <div class="progress-stat-card">
                    <div class="stat-icon">🏅</div>
                    <div class="stat-number">${badges.length}</div>
                    <div class="stat-label">Badges Earned</div>
                </div>
            </div>
        `;

        // Badges
        if (badges.length > 0) {
            html += `
                <div style="margin-top:2rem;">
                    <h3 style="font-family:var(--font-display); margin-bottom:0.8rem;"><i data-lucide="trophy"></i> Badges</h3>
                    <div style="display:flex; gap:0.8rem; flex-wrap:wrap;">
                        ${badges.map(b => `
                            <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:0.6rem 1rem; display:flex; align-items:center; gap:0.5rem;">
                                <span style="font-size:1.4rem;">${b.icon}</span>
                                <span style="font-weight:600;">${b.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Recent Activity (latest 10)
        try {
            const actRes = await fetch(`${API_BASE}/api/activities?userId=${user.id}&limit=10`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (actRes.ok) {
                const actData = await actRes.json();
                if (actData.activities && actData.activities.length > 0) {
                    html += `
                        <div style="margin-top:2rem;">
                            <h3 style="font-family:var(--font-display); margin-bottom:0.8rem;"><i data-lucide="activity"></i> Recent Activity</h3>
                            <div style="background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:1rem;">
                                ${actData.activities.slice(0, 10).map(a => `
                                    <div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid var(--border-light);">
                                        <span>${escapeHtml(a.message)}</span>
                                        <span style="color:var(--text-tertiary); font-size:0.8rem;">${timeAgo(a.created_at)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
            }
        } catch (e) { /* ignore */ }

        container.innerHTML = html;
        refreshIcons();

    } catch (err) {
        console.error('Load progress error:', err);
        container.innerHTML = '<p style="color:var(--danger);">Failed to load progress data.</p>';
    }
}

function renderNoteList() {
    const container = document.getElementById('notesListContainer');
    if (!container) return;
    const filter = document.getElementById('notesFilter').value.toLowerCase();
    const filtered = notes.filter(n => {
        const title = n.title.toLowerCase();
        const tags = n.tags.toLowerCase();
        return title.includes(filter) || tags.includes(filter);
    });

    if (filtered.length === 0) {
        container.innerHTML = `<p style="color:var(--text-tertiary); text-align:center; padding:1rem;">${notes.length === 0 ? 'No notes yet. Create one!' : 'No matching notes.'}</p>`;
        return;
    }

    container.innerHTML = filtered.map(n => {
        const isActive = n.id === currentNoteId ? 'active' : '';
        let thumbnail = '';
        // Extract first image URL from content (if any)
        if (n.content) {
            const match = n.content.match(/<img[^>]+src=["']([^"']+)["']/);
            if (match) thumbnail = match[1];
        }
        const tagList = n.tags ? n.tags.split(',').filter(t => t.trim()).map(t => 
            `<span style="background:var(--border-light); padding:0.1rem 0.5rem; border-radius:12px; font-size:0.6rem; margin-right:0.2rem;">${escapeHtml(t.trim())}</span>`
        ).join('') : '';

        return `
            <div class="note-list-item ${isActive}" data-id="${n.id}" 
                 style="display:flex; align-items:center; gap:0.75rem; padding:0.6rem 0.8rem; border-radius:8px; cursor:pointer; transition:background 0.2s; margin-bottom:0.3rem; ${isActive ? 'background:var(--primary-glow); border-left:3px solid var(--primary);' : 'border-left:3px solid transparent;'}"
                 onmouseover="this.style.background='var(--hover-surface)'" onmouseout="this.style.background='${isActive ? 'var(--primary-glow)' : 'transparent'}'">
                ${thumbnail ? `<div style="flex-shrink:0; width:36px; height:36px; border-radius:6px; overflow:hidden; background:var(--border-light);">
                    <img src="${escapeHtml(thumbnail)}" alt="thumbnail" style="width:100%; height:100%; object-fit:cover;">
                </div>` : `<div style="flex-shrink:0; width:36px; height:36px; border-radius:6px; background:var(--border-light); display:flex; align-items:center; justify-content:center; color:var(--text-tertiary); font-size:0.8rem;">
                    <i data-lucide="file-text" style="width:18px; height:18px;"></i>
                </div>`}
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:600; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(n.title || 'Untitled')}</div>
                    <div style="font-size:0.7rem; color:var(--text-tertiary); display:flex; justify-content:space-between; align-items:center; margin-top:0.2rem; flex-wrap:wrap; gap:0.2rem;">
                        <span>${tagList || 'No tags'}</span>
                        <span>${new Date(n.updated_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();

    container.querySelectorAll('.note-list-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = parseInt(el.dataset.id);
            selectNote(id);
        });
    });
}

function selectNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    currentNoteId = id;
    document.getElementById('noteTitle').value = note.title || '';
    document.getElementById('noteTags').value = note.tags || '';
    if (quill) {
        quill.root.innerHTML = note.content || '';
        const text = quill.getText();
        const words = text ? text.trim().split(/\s+/).filter(w => w).length : 0;
        document.getElementById('noteWordCount').textContent = words + ' words';
    }
    document.getElementById('noteLastModified').textContent = note.updated_at ? 'Last saved: ' + new Date(note.updated_at).toLocaleString() : '—';
    renderNoteList();
    setNoteStatus('Loaded');
    document.getElementById('saveNoteBtn').disabled = false;
    document.getElementById('deleteNoteBtn').disabled = false;
}

function clearEditor() {
    currentNoteId = null;
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteTags').value = '';
    if (quill) {
        quill.root.innerHTML = '';
        document.getElementById('noteWordCount').textContent = '0 words';
    }
    document.getElementById('noteLastModified').textContent = '—';
    renderNoteList();
    setNoteStatus('Ready');
    document.getElementById('saveNoteBtn').disabled = false;
    document.getElementById('deleteNoteBtn').disabled = true;
}

function setNoteStatus(msg) {
    document.getElementById('noteStatus').textContent = msg;
}

async function saveCurrentNote() {
    const title = document.getElementById('noteTitle').value.trim() || 'Untitled';
    const content = quill ? quill.root.innerHTML : '';
    const tags = document.getElementById('noteTags').value.trim();

    if (!isLoggedIn) {
        showNotification('Please log in to save notes.', true);
        return;
    }

    setNoteStatus('Saving...');

    try {
        let response;
        if (currentNoteId) {
            response = await fetch(`${API_BASE}/api/notes/${currentNoteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId: user.id, title, content, tags })
            });
        } else {
            response = await fetch(`${API_BASE}/api/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId: user.id, title, content, tags })
            });
        }
        if (!response.ok) {
            const data = await response.json();
            showNotification(data.error || 'Failed to save note.', true);
            setNoteStatus('Error');
            return;
        }
        const savedNote = await response.json();
        if (currentNoteId) {
            const index = notes.findIndex(n => n.id === currentNoteId);
            if (index !== -1) notes[index] = savedNote;
        } else {
            notes.unshift(savedNote);
            currentNoteId = savedNote.id;
        }
        renderNoteList();
        document.getElementById('noteLastModified').textContent = 'Last saved: ' + new Date(savedNote.updated_at).toLocaleString();
        setNoteStatus('Saved');
        showNotification('✅ Note saved.');
        if (quill) {
            const text = quill.getText();
            const words = text ? text.trim().split(/\s+/).filter(w => w).length : 0;
            document.getElementById('noteWordCount').textContent = words + ' words';
        }
        document.getElementById('deleteNoteBtn').disabled = false;
    } catch (err) {
        console.error('Save note error:', err);
        showNotification('Could not connect to server.', true);
        setNoteStatus('Error');
    }
}

async function deleteCurrentNote() {
    if (!currentNoteId) {
        showNotification('No note selected.', true);
        return;
    }
    if (!confirm('Delete this note?')) return;
    try {
        const response = await fetch(`${API_BASE}/api/notes/${currentNoteId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ userId: user.id })
        });
        if (!response.ok) {
            const data = await response.json();
            showNotification(data.error || 'Failed to delete note.', true);
            return;
        }
        notes = notes.filter(n => n.id !== currentNoteId);
        currentNoteId = null;
        clearEditor();
        renderNoteList();
        showNotification('🗑️ Note deleted.');
    } catch (err) {
        console.error('Delete note error:', err);
        showNotification('Could not connect to server.', true);
    }
}

// ===================================================================
//  INIT FUNCTIONS
// ===================================================================
function initGoals() {
    const addBtn = document.getElementById('addGoalBtn');
    const input = document.getElementById('newGoalInput');
    if (addBtn) addBtn.addEventListener('click', () => { if (!requireLogin()) return;
        addGoal(); });
    if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter' && isLoggedIn) addGoal(); });
    renderGoals();
}

function initGamification() {
    updateBadgesAndXP();
}

function initAssignments() {
    renderAssignments('all');
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderAssignments(this.dataset.filter);
        });
    });
}

// ===================================================================
//  GLOBAL VARIABLES (declared before DOMContentLoaded)
// ===================================================================
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
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let selectedCalendarDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
let steadyTimer = null;
let steadyTimeLeft = 3600;
let isSteadyStudy = true;
let studySecs = 3600;
let restSecs = 900;
let totalFocusSecs = parseInt(localStorage.getItem('totalFocusSecs')) || 0;
let totalSteadySessions = parseInt(localStorage.getItem('totalSteadySessions')) || 0;
let streak = parseInt(localStorage.getItem('steadyStreak')) || 0;
let lastDate = localStorage.getItem('lastSteadyDate');
let reminderCheckInterval = null;
let notes = [];
let currentNoteId = null;
let noteSaveTimeout = null;

function formatDateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return { year: y, month: m - 1, day: d };
}


// Sidebar toggle on logo click
document.querySelector('.logo a')?.addEventListener('click', function(e) {
    e.preventDefault();
    toggleSidebar();
});

// Show toggle button when sidebar is hidden (we'll add a button in HTML)
// Actually, we'll create a floating toggle button dynamically.
const toggleBtn = document.createElement('button');
toggleBtn.className = 'sidebar-toggle-btn';
toggleBtn.innerHTML = '<i data-lucide="menu"></i>';
toggleBtn.setAttribute('aria-label', 'Toggle sidebar');
document.body.appendChild(toggleBtn);
toggleBtn.addEventListener('click', toggleSidebar);
refreshIcons();

// Load progress when navigating to progress page
// The navigation already handles page switching, but we need to load progress data when the page becomes active.
// We'll override the initNavigation to call loadProgress when pageId === 'progress-page'.


// ===================================================================
//  DOM CONTENT LOADED
// ===================================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Guest banner
    const banner = document.getElementById('guestBanner');
    if (banner) {
        banner.style.display = isLoggedIn ? 'none' : 'block';
    }

    // User name / greeting
    const nameEl = document.getElementById('dashboardUserName');
    if (nameEl) {
        nameEl.textContent = isLoggedIn ? user.name : 'Guest';
    }
    const greetingEl = document.getElementById('dashboardGreeting');
    if (greetingEl) {
        greetingEl.textContent = isLoggedIn ? `Welcome back, ${user.name}` : 'Welcome to StudyFlow';
    }

    // Load data
    await loadStats();
    if (isLoggedIn) {
        await loadNotifications();
        await loadRecentActivities();
    } else {
        document.getElementById('activityTimeline').innerHTML = DEMO_DATA.recentActivity.map(a => `
            <div>
                ${a.type === 'assignment_completed' ? '✅' : a.type === 'subject_added' ? '📚' : '🧘'} ${escapeHtml(a.message)}
                <span class="activity-time">${timeAgo(a.created_at)}</span>
            </div>
        `).join('');
        document.getElementById('notificationList').innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:1rem 0;">Login to see notifications.</p>';
    }

    // Init modules
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
    updateDeadlines();

    // ===== NOTES INIT =====
    if (isLoggedIn) {
        await loadNotes();
    } else {
        document.getElementById('notesListContainer').innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:1rem;">Login to manage notes.</p>';
    }

    // Notes event listeners
    document.getElementById('newNoteBtn')?.addEventListener('click', () => {
        clearEditor();
        document.getElementById('noteTitle').focus();
        setNoteStatus('New note');
    });

    document.getElementById('saveNoteBtn')?.addEventListener('click', saveCurrentNote);
    document.getElementById('deleteNoteBtn')?.addEventListener('click', deleteCurrentNote);

    const noteTitleInput = document.getElementById('noteTitle');
    const noteContentInput = document.getElementById('noteContent');
    const noteTagsInput = document.getElementById('noteTags');

    function autoSave() {
        if (noteSaveTimeout) clearTimeout(noteSaveTimeout);
        setNoteStatus('Unsaved changes...');
        noteSaveTimeout = setTimeout(() => {
            const title = noteTitleInput.value.trim();
            const content = noteContentInput.value.trim();
            if (title || content) {
                saveCurrentNote();
            } else {
                setNoteStatus('Ready');
            }
        }, 1500);
    }

    noteTitleInput?.addEventListener('input', autoSave);
    noteContentInput?.addEventListener('input', autoSave);
    noteTagsInput?.addEventListener('input', autoSave);

    document.getElementById('notesFilter')?.addEventListener('input', renderNoteList);

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveCurrentNote();
        }
    });

    // ---- Note Preview Button ----
    document.getElementById('previewNoteBtn')?.addEventListener('click', () => {
        const content = document.getElementById('noteContent')?.value || '';
        const title = document.getElementById('noteTitle').value || 'Untitled';
        if (!content && !title) {
            showNotification('Nothing to preview.', true);
            return;
        }
        // Convert HTML content to plain text preview? For Quill we can just show the HTML.
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal" style="max-width:700px; max-height:90vh; overflow-y:auto;">
                <h3>${escapeHtml(title)}</h3>
                <div style="border-top:1px solid var(--border); margin-top:0.5rem; padding-top:1rem;">
                    <div id="previewContent" style="color:var(--text-primary); line-height:1.6;">${content}</div>
                </div>
                <div class="modal-actions" style="margin-top:1rem;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    // ---- Add Subject ----
    document.getElementById('addSubjectBtn')?.addEventListener('click', () => {
        if (!requireLogin()) return;
        openModal('Add New Subject', `
            <div class="form-group">
                <label for="subjectName">Subject Name</label>
                <input type="text" id="subjectName" placeholder="e.g., Biology" required>
            </div>
        `, async (overlay) => {
            const nameInput = overlay.querySelector('#subjectName');
            const name = nameInput.value.trim();
            if (!name) {
                showNotification('Please enter a subject name.', true);
                return false;
            }
            try {
                const res = await fetch(`${API_BASE}/api/subjects`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ userId: user.id, name })
                });
                if (!res.ok) {
                    const data = await res.json();
                    showNotification(data.error || 'Failed to add subject.', true);
                    return false;
                }
                await loadSubjects();
                await updateStats();
                await loadNotifications();
                showNotification('✅ Subject added successfully!');
                return true;
            } catch (err) {
                console.error('Add subject error:', err);
                showNotification('Could not connect to server.', true);
                return false;
            }
        });
    });

    // ---- Add Assignment ----
    document.getElementById('addAssignmentBtn')?.addEventListener('click', async () => {
        if (!requireLogin()) return;

        let subjectsHtml = '<option value="">Loading subjects...</option>';
        let subjectsList = [];

        try {
            const response = await fetch(`${API_BASE}/api/subjects?userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                subjectsList = await response.json();
                if (subjectsList.length === 0) {
                    subjectsHtml = '<option value="">No subjects found. Please add a subject first.</option>';
                } else {
                    subjectsHtml = subjectsList.map(s =>
                        `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`
                    ).join('');
                    subjectsHtml = `<option value="">Select a subject...</option>${subjectsHtml}`;
                }
            } else {
                subjectsHtml = '<option value="">Failed to load subjects</option>';
            }
        } catch (err) {
            console.error('Failed to fetch subjects for dropdown:', err);
            subjectsHtml = '<option value="">Error loading subjects</option>';
        }

        const today = new Date().toISOString().split('T')[0];

        openModal('Add New Assignment', `
            <div class="form-group">
                <label for="assignmentTitle">Assignment Title</label>
                <input type="text" id="assignmentTitle" placeholder="e.g., Binary Trees Homework" required>
            </div>
            <div class="form-group">
                <label for="assignmentSubject">Subject</label>
                <select id="assignmentSubject" required>
                    ${subjectsHtml}
                </select>
                <small style="color:var(--text-tertiary); font-size:0.75rem; display:block; margin-top:0.3rem;">
                    ${subjectsList.length === 0 ? '👉 <a href="#" onclick="document.querySelector(\'[data-page=\'subjects\']\')?.click(); return false;" style="color:var(--primary);">Add a subject first</a>' : ''}
                </small>
            </div>
            <div class="form-group">
                <label for="assignmentDueDate">Submission Deadline <small style="font-weight:400; color:var(--text-tertiary);">(optional)</small></label>
                <input type="date" id="assignmentDueDate" value="${today}" min="${today}">
                <small style="color:var(--text-tertiary); font-size:0.75rem; display:block; margin-top:0.3rem;">
                    The last date you can submit this assignment. You cannot pick a past date.
                </small>
            </div>
        `, async (overlay) => {
            const titleInput = overlay.querySelector('#assignmentTitle');
            const subjectSelect = overlay.querySelector('#assignmentSubject');
            const dueDateInput = overlay.querySelector('#assignmentDueDate');

            const title = titleInput.value.trim();
            const subject = subjectSelect.value;
            const dueDate = dueDateInput.value || null;

            if (!title) {
                showNotification('Please enter a title.', true);
                return false;
            }
            if (!subject) {
                showNotification('Please select a subject.', true);
                return false;
            }

            try {
                const res = await fetch(`${API_BASE}/api/assignments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        userId: user.id,
                        title,
                        subject,
                        dueDate
                    })
                });

                if (!res.ok) {
                    const data = await res.json();
                    showNotification(data.error || 'Failed to add assignment.', true);
                    return false;
                }

                const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
                await renderAssignments(activeFilter);
                await updateStats();
                await loadNotifications();
                await updateDeadlines();
                showNotification('✅ Assignment added successfully!');
                return true;
            } catch (err) {
                console.error('Add assignment error:', err);
                showNotification('Could not connect to server.', true);
                return false;
            }
        });
    });

    // ---- Add Reminder ----
    document.getElementById('addReminderBtn')?.addEventListener('click', () => {
        if (!requireLogin()) return;
        openModal('Set Reminder', `
            <div class="form-group"><label>Title</label><input type="text" id="reminderTitle" placeholder="What to remind?" required></div>
            <div class="form-group"><label>Date & Time</label><input type="datetime-local" id="reminderDateTime" required></div>
            <div class="form-group"><label>Repeat</label>
                <select id="reminderRepeat">
                    <option value="none">Never</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                </select>
            </div>
        `, async (overlay) => {
            const title = overlay.querySelector('#reminderTitle').value.trim();
            const dateTime = overlay.querySelector('#reminderDateTime').value;
            const repeat = overlay.querySelector('#reminderRepeat').value;
            if (!title || !dateTime) { showNotification('Please fill all fields', true); return false; }
            try {
                const res = await fetch(`${API_BASE}/api/reminders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: JSON.stringify({ userId: user.id, title, reminderTime: dateTime, repeat })
                });
                if (!res.ok) throw new Error('Failed');
                await loadReminders();
                showNotification('✅ Reminder set!');
                return true;
            } catch (err) { showNotification('Failed to set reminder', true); return false; }
        });
    });

    // Notification bell
    document.getElementById('notificationBell')?.addEventListener('click', toggleNotifications);

    document.addEventListener('click', (e) => {
        const container = document.getElementById('notificationContainer');
        if (container && !container.contains(e.target)) {
            document.getElementById('notificationDropdown')?.classList.remove('open');
        }
    });

    document.getElementById('markAllReadBtn')?.addEventListener('click', async () => {
        if (!requireLogin()) return;
        await markAllRead();
        await loadNotifications();
    });

    // Load reminders and start checking
    if (isLoggedIn) {
        await loadReminders();
        reminderCheckInterval = setInterval(checkReminders, 60000);
        checkReminders();
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    } else {
        document.getElementById('remindersList').innerHTML = `<div class="empty-state"><i data-lucide="bell"></i><p>Login to manage reminders.</p></div>`;
        refreshIcons();
    }

    // Resume audio on any click
    document.addEventListener('click', () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') ctx.resume();
        } catch (e) { /* ignore */ }
    });

    updateDeadlines();
    refreshIcons();
});

// Expose functions if needed
window.renderCalendar = renderCalendar;
window.renderSchedule = renderSchedule;
window.loadSchedule = loadSchedule;
window.loadCalendarEvents = loadCalendarEvents;
window.updateDeadlines = updateDeadlines;