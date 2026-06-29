(function() {
    'use strict';

    var $ = function(id) { return document.getElementById(id); };
    var SESSION_KEY = 'vitalis_session';
    var USERS_KEY = 'vitalis_users';
    var AUDIT_KEY = 'vitalis_audit';
    var SETTINGS_KEY = 'vitalis_settings';

    var session = null;
    var users = [];
    var auditLogs = [];
    var settings = {};

    function loadStorage() {
        try { session = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch(e) { session = null; }
        try { users = JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch(e) { users = []; }
        try { auditLogs = JSON.parse(localStorage.getItem(AUDIT_KEY)) || []; } catch(e) { auditLogs = []; }
        try { settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch(e) { settings = {}; }
    }

    function saveUsers() { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
    function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }

    loadStorage();

    // Auth Gate
    if (!session || session.role !== 'admin') {
        $('authGate').classList.remove('hidden');
        $('appShell').classList.add('hidden');
        return;
    }

    $('authGate').classList.add('hidden');
    $('appShell').classList.remove('hidden');

    // Set user info
    $('adminName').textContent = session.name || 'Administrator';
    $('topbarName').textContent = session.name || 'Admin';
    document.title = 'Vitalis — Admin Control Center';

    // Sample data for demo
    var sampleDepartments = [
        { name: 'Cardiology', head: 'Dr. Sarah Chen', doctors: 4, nurses: 8, patients: 23, beds: 30, occupied: 22, color: '#7A9CB3' },
        { name: 'Surgery', head: 'Dr. James Wilson', doctors: 6, nurses: 12, patients: 18, beds: 24, occupied: 18, color: '#AD7556' },
        { name: 'Pediatrics', head: 'Dr. Maria Garcia', doctors: 3, nurses: 10, patients: 31, beds: 20, occupied: 15, color: '#7BAE7F' },
        { name: 'Emergency', head: 'Dr. Emily Rogers', doctors: 5, nurses: 15, patients: 42, beds: 35, occupied: 28, color: '#ef4444' },
        { name: 'Neurology', head: 'Dr. David Kim', doctors: 2, nurses: 6, patients: 12, beds: 15, occupied: 10, color: '#8b5cf6' },
        { name: 'Orthopedics', head: 'Dr. Michael Brown', doctors: 3, nurses: 7, patients: 15, beds: 18, occupied: 12, color: '#5D8299' }
    ];

    var sampleActivity = [
        { ts: new Date(Date.now() - 300000).toISOString(), action: 'login', details: 'Dr. Sarah Chen logged in', role: 'doctor' },
        { ts: new Date(Date.now() - 900000).toISOString(), action: 'register', details: 'New patient registered: PTN-009', role: 'patient' },
        { ts: new Date(Date.now() - 1800000).toISOString(), action: 'admin', details: 'System settings updated', role: 'admin' },
        { ts: new Date(Date.now() - 3600000).toISOString(), action: 'login', details: 'RN. Amy Taylor logged in', role: 'nurse' },
        { ts: new Date(Date.now() - 5400000).toISOString(), action: 'register', details: 'New doctor account created: DOC-008', role: 'doctor' },
        { ts: new Date(Date.now() - 7200000).toISOString(), action: 'admin', details: 'Department quota adjusted', role: 'admin' },
        { ts: new Date(Date.now() - 10800000).toISOString(), action: 'login', details: 'Front Desk logged in', role: 'receptionist' },
        { ts: new Date(Date.now() - 14400000).toISOString(), action: 'register', details: 'New patient registered: PTN-008', role: 'patient' }
    ];

    var sampleNotifications = [
        { type: 'alert', title: 'Critical Alert', message: 'Room 405-A abnormal vitals detected', time: '15 min ago', color: '#ef4444' },
        { type: 'user', title: 'New Registration', message: 'Doctor account DOC-008 pending approval', time: '1 hour ago', color: '#7A9CB3' },
        { type: 'system', title: 'System Update', message: 'Dashboard updated to v2.4.1', time: '3 hours ago', color: '#7BAE7F' },
        { type: 'alert', title: 'Capacity Warning', message: 'Emergency at 80% bed capacity', time: '5 hours ago', color: '#f59e0b' },
        { type: 'user', title: 'New Patient', message: 'PTN-009 registered via reception', time: '6 hours ago', color: '#AD7556' }
    ];

    // Helpers
    function cap(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

    function fmtTime(ts) {
        if (!ts) return '—';
        var d = new Date(ts);
        var diff = Math.floor((Date.now() - d) / 60000);
        if (diff < 60) return diff + 'm ago';
        if (diff < 1440) return Math.floor(diff / 60) + 'h ago';
        return Math.floor(diff / 1440) + 'd ago';
    }

    function fmtDate(ds) {
        if (!ds || ds === '—') return '—';
        var d = new Date(ds);
        return isNaN(d.getTime()) ? ds : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function initials(name) {
        return name.split(' ').map(function(w) { return w.charAt(0); }).join('').substring(0, 2).toUpperCase();
    }

    function statusBadge(s) {
        var map = { active: 'active', admitted: 'active', 'on-duty': 'active', confirmed: 'active', 'on-leave': 'pending', pending: 'pending', outpatient: 'pending', discharged: 'inactive', completed: 'inactive', inactive: 'inactive' };
        var cls = map[s] || 'pending';
        return '<span class="badge badge-' + cls + '"><span class="badge-dot"></span>' + cap(s.replace('-', ' ')) + '</span>';
    }

    function roleBadge(role) {
        var colors = { admin: '#ef4444', doctor: '#7A9CB3', nurse: '#7BAE7F', receptionist: '#DCCFB8', patient: '#8b5cf6' };
        var c = colors[role] || '#7A9CB3';
        return '<span class="badge" style="background:' + c + '15;color:' + c + ';border:1px solid ' + c + '25"><span class="badge-dot"></span>' + cap(role) + '</span>';
    }

    // Toast
    function showToast(msg, type) {
        type = type || 'info';
        var svg = type === 'success' ? '<polyline points="20 6 9 17 4 12"/>' : type === 'error' ? '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>';
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = '<div class="toast-icon ' + type + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' + svg + '</svg></div><span>' + msg + '</span>';
        $('toastContainer').appendChild(toast);
        setTimeout(function() { toast.classList.add('out'); setTimeout(function() { toast.remove(); }, 300); }, 3500);
    }

    // Animated counter
    function animateCount(el, target, dur) {
        if (!el) return;
        var start = 0;
        var step = Math.max(1, target / (dur / 16));
        var timer = setInterval(function() {
            start += step;
            if (start >= target) { start = target; clearInterval(timer); }
            el.textContent = Math.floor(start);
        }, 16);
    }

    // Line chart renderer
    function renderLineChart(id, data, color) {
        var container = $(id);
        if (!container || !data || !data.length) return;

        var maxVal = Math.max.apply(null, data.map(function(d) { return d.val; }));
        if (maxVal === 0) maxVal = 1;

        var w = container.clientWidth || 500;
        var h = container.clientHeight || 260;
        var pad = 35;
        var padR = 20;
        var padB = 35;
        var cW = w - pad * 2;
        var cH = h - pad - padB;

        var points = [];
        var step = cW / Math.max(1, data.length - 1);

        data.forEach(function(d, i) {
            points.push({ x: padR + i * step, y: pad + cH - ((d.val / maxVal) * cH * 0.85) });
        });

        var pathD = 'M' + points.map(function(p) { return p.x + ',' + p.y; }).join(' L');
        var last = points[points.length - 1];
        var first = points[0];
        var areaD = pathD + ' L' + last.x + ',' + (h - padB) + ' L' + first.x + ',' + (h - padB) + ' Z';

        var grid = '';
        for (var i = 0; i <= 4; i++) {
            var gy = pad + (i / 4) * cH;
            grid += '<line x1="' + padR + '" y1="' + gy + '" x2="' + (w - padR) + '" y2="' + gy + '" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4"/>';
        }

        var labels = data.map(function(d, i) {
            return '<text x="' + (padR + i * step) + '" y="' + (h - 10) + '" text-anchor="middle" fill="var(--clove-faint)" font-size="11" font-family="var(--font-body)">' + d.label + '</text>';
        }).join('');

        var dots = points.map(function(p) {
            return '<circle cx="' + p.x + '" cy="' + p.y + '" r="5" fill="#fff" stroke="' + (color || '#7A9CB3') + '" stroke-width="2.5"/>';
        }).join('');

        container.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%"><defs><linearGradient id="ag_' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + (color || '#7A9CB3') + '" stop-opacity="0.25"/><stop offset="100%" stop-color="' + (color || '#7A9CB3') + '" stop-opacity="0.02"/></linearGradient></defs>' + grid + '<path d="' + areaD + '" fill="url(#ag_' + id + ')"/><path d="' + pathD + '" fill="none" stroke="' + (color || '#7A9CB3') + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' + dots + labels + '</svg>';
    }

    // Donut chart renderer
    function renderDonutChart(id, data) {
        var container = $(id);
        if (!container || !data || !data.length) return;

        var total = data.reduce(function(s, d) { return s + d.val; }, 0);
        if (total === 0) total = 1;

        var r = 70;
        var cx = 90;
        var cy = 90;
        var circumference = 2 * Math.PI * r;
        var offset = 0;

        var arcs = '';
        data.forEach(function(d) {
            var pct = d.val / total;
            var dashLen = pct * circumference;
            var dashGap = circumference - dashLen;
            arcs += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + d.color + '" stroke-width="24" stroke-dasharray="' + dashLen + ' ' + dashGap + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>';
            offset += dashLen;
        });

        container.innerHTML = '<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">' + arcs + '<text x="' + cx + '" y="' + (cy - 8) + '" text-anchor="middle" font-family="var(--font-heading)" font-size="28" font-weight="800" fill="var(--clove)">' + total + '</text><text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" font-family="var(--font-body)" font-size="11" fill="var(--clove-faint)">Total Users</text></svg>';

        // Legend
        var legend = $('roleLegend');
        if (legend) {
            legend.innerHTML = data.map(function(d) {
                return '<div class="legend-item"><span class="legend-dot" style="background:' + d.color + '"></span>' + d.label + ' (' + d.val + ')</div>';
            }).join('');
        }
    }

    // Navigation
    function showSection(id) {
        document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
        var el = $(id);
        if (el) el.classList.add('active');
    }

    document.querySelectorAll('.nav-item').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var sec = btn.dataset.section;
            if (!sec) return;
            document.querySelectorAll('.nav-item').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            showSection(sec);
            $('sidebar').classList.remove('mobile-open');
        });
    });

    document.querySelectorAll('[data-goto]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            var sec = btn.dataset.goto;
            if (!sec) return;
            document.querySelectorAll('.nav-item').forEach(function(b) { b.classList.remove('active'); });
            var t = document.querySelector('[data-section="' + sec + '"]');
            if (t) t.classList.add('active');
            showSection(sec);
        });
    });

    // Topbar events
    $('hamburger').addEventListener('click', function() {
        $('sidebar').classList.toggle('mobile-open');
    });

    $('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = 'index.html';
    });

    $('notifBtn').addEventListener('click', function() {
        $('notifPanel').classList.toggle('open');
    });

    $('closeNotif').addEventListener('click', function() {
        $('notifPanel').classList.remove('open');
    });

    // Render functions
    function renderOverview() {
        var allUsers = users.length || 42;
        var doctors = users.filter(function(u) { return u.role === 'doctor'; }).length || 7;
        var nurses = users.filter(function(u) { return u.role === 'nurse'; }).length || 6;
        var appts = 12;

        animateCount($('totalUsers'), allUsers, 1200);
        animateCount($('activeDoctors'), doctors, 1200);
        animateCount($('totalNurses'), nurses, 1200);
        animateCount($('todayAppts'), appts, 1200);

        // Registration chart
        renderLineChart('registrationChart', [
            { label: 'Jan', val: 12 }, { label: 'Feb', val: 18 }, { label: 'Mar', val: 25 },
            { label: 'Apr', val: 20 }, { label: 'May', val: 32 }, { label: 'Jun', val: 28 },
            { label: 'Jul', val: 35 }, { label: 'Aug', val: 42 }, { label: 'Sep', val: 38 },
            { label: 'Oct', val: 45 }, { label: 'Nov', val: 50 }, { label: 'Dec', val: 48 }
        ], '#7A9CB3');

        // Role distribution
        var roleCounts = {
            admin: users.filter(function(u) { return u.role === 'admin'; }).length || 2,
            doctor: users.filter(function(u) { return u.role === 'doctor'; }).length || 7,
            nurse: users.filter(function(u) { return u.role === 'nurse'; }).length || 6,
            receptionist: users.filter(function(u) { return u.role === 'receptionist'; }).length || 3,
            patient: users.filter(function(u) { return u.role === 'patient'; }).length || 24
        };

        renderDonutChart('roleChart', [
            { label: 'Admins', val: roleCounts.admin, color: '#ef4444' },
            { label: 'Doctors', val: roleCounts.doctor, color: '#7A9CB3' },
            { label: 'Nurses', val: roleCounts.nurse, color: '#7BAE7F' },
            { label: 'Receptionists', val: roleCounts.receptionist, color: '#DCCFB8' },
            { label: 'Patients', val: roleCounts.patient, color: '#8b5cf6' }
        ]);

        // Activity feed
        var feed = $('activityFeed');
        if (feed) {
            feed.innerHTML = sampleActivity.slice(0, 6).map(function(a) {
                var cls = a.role === 'admin' ? 'admin' : a.action === 'register' ? 'register' : 'login';
                return '<div class="activity-item"><div class="activity-dot ' + cls + '"></div><div><div class="activity-text"><strong>' + a.details + '</strong></div><div class="activity-time">' + fmtTime(a.ts) + '</div></div></div>';
            }).join('');
        }
    }

    function renderUsersTable() {
        var filter = $('roleFilter');
        var filtered = users;

        if (filter && filter.value !== 'all') {
            filtered = users.filter(function(u) { return u.role === filter.value; });
        }

        var tbody = $('usersTable');
        if (!tbody) return;

        if (!filtered.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--clove-faint)">No users found. Users registered via the sign-in page will appear here.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.slice(0, 25).map(function(u) {
            return '<tr><td><div style="display:flex;align-items:center;gap:14px"><div style="width:40px;height:40px;border-radius:50%;background:var(--chambray-wash);border:2px solid var(--chambray-pale);display:flex;align-items:center;justify-content:center;color:var(--chambray);font-size:0.8rem;font-weight:700">' + initials((u.firstName || '') + ' ' + (u.lastName || '')) + '</div><div><strong style="font-size:0.88rem">' + (u.firstName || '') + ' ' + (u.lastName || '') + '</strong><br><span style="font-size:0.74rem;color:var(--clove-faint)">' + (u.email || '') + '</span></div></div></td><td>' + roleBadge(u.role) + '</td><td>' + statusBadge(u.status || 'active') + '</td><td style="font-size:0.82rem;color:var(--clove-faint)">' + fmtDate(u.createdAt) + '</td><td><button class="btn btn-sm btn-outline" onclick="AdminDash.viewUser(\'' + u.id + '\')">View</button></td></tr>';
        }).join('');
    }

    function renderDepartments() {
        var grid = $('deptGrid');
        if (!grid) return;

        grid.innerHTML = sampleDepartments.map(function(d) {
            var occupancy = Math.round((d.occupied / d.beds) * 100);
            var occColor = occupancy > 85 ? 'critical' : occupancy > 60 ? 'warning' : 'good';
            return '<div class="dept-card"><div class="dept-header"><div class="dept-icon" style="background:' + d.color + '15;color:' + d.color + ';border:1px solid ' + d.color + '25"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div><div class="dept-info"><h4>' + d.name + '</h4><span>' + d.head + '</span></div></div><div class="dept-stats"><div class="dept-stat"><div class="value">' + d.doctors + '</div><div class="label">Doctors</div></div><div class="dept-stat"><div class="value">' + d.nurses + '</div><div class="label">Nurses</div></div><div class="dept-stat"><div class="value">' + d.patients + '</div><div class="label">Patients</div></div></div><div style="margin-top:16px"><div style="display:flex;justify-content:space-between;font-size:0.76rem;margin-bottom:6px"><span style="color:var(--clove-faint)">Bed Occupancy</span><span style="font-weight:700;color:var(--clove)">' + occupancy + '%</span></div><div class="health-bar"><div class="health-fill ' + occColor + '" style="width:' + occupancy + '%"></div></div></div></div>';
        }).join('');
    }

    function renderAnalytics() {
        renderLineChart('mauChart', [
            { label: 'Jan', val: 145 }, { label: 'Feb', val: 132 }, { label: 'Mar', val: 168 },
            { label: 'Apr', val: 155 }, { label: 'May', val: 142 }, { label: 'Jun', val: 178 },
            { label: 'Jul', val: 195 }, { label: 'Aug', val: 210 }, { label: 'Sep', val: 188 },
            { label: 'Oct', val: 175 }, { label: 'Nov', val: 202 }, { label: 'Dec', val: 220 }
        ], '#AD7556');

        var metrics = $('healthMetrics');
        if (metrics) {
            var healthData = [
                { label: 'Server Uptime', value: '99.97%', pct: 99.97, cls: 'good' },
                { label: 'API Response', value: '142ms', pct: 85, cls: 'good' },
                { label: 'Database Load', value: '34%', pct: 34, cls: 'good' },
                { label: 'Storage Used', value: '67%', pct: 67, cls: 'warning' },
                { label: 'Memory Usage', value: '72%', pct: 72, cls: 'warning' }
            ];

            metrics.innerHTML = healthData.map(function(h) {
                return '<div class="health-item"><span class="health-label">' + h.label + '</span><span class="health-value">' + h.value + '</span></div><div class="health-bar"><div class="health-fill ' + h.cls + '" style="width:' + h.pct + '%"></div></div>';
            }).join('');
        }
    }

    function renderAuditTrail() {
        var filter = $('auditFilter');
        var logs = auditLogs.length ? auditLogs : sampleActivity;

        if (filter && filter.value !== 'all') {
            logs = logs.filter(function(l) { return l.action === filter.value; });
        }

        var tbody = $('auditTable');
        if (!tbody) return;

        if (!logs.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--clove-faint)">No audit logs found.</td></tr>';
            return;
        }

        tbody.innerHTML = logs.slice(0, 50).map(function(a) {
            var cls = a.role === 'admin' ? 'admin' : a.action === 'register' ? 'register' : 'login';
            return '<tr><td style="font-size:0.8rem;color:var(--clove-faint);white-space:nowrap">' + fmtTime(a.ts) + '</td><td>' + statusBadge(a.action) + '</td><td style="font-size:0.86rem;color:var(--clove-light)">' + (a.details || a.action) + '</td><td>' + roleBadge(a.role || 'system') + '</td></tr>';
        }).join('');
    }

    function renderSystemInfo() {
        var info = $('systemInfo');
        if (!info) return;

        info.innerHTML = [
            { label: 'Version', value: '2.4.1' },
            { label: 'Registered Users', value: users.length || 42 },
            { label: 'Audit Logs', value: auditLogs.length || sampleActivity.length },
            { label: 'Departments', value: sampleDepartments.length },
            { label: 'Uptime', value: '99.97%' },
            { label: 'Last Backup', value: '2 hours ago' }
        ].map(function(item) {
            return '<div class="info-item"><span>' + item.label + '</span><strong>' + item.value + '</strong></div>';
        }).join('');
    }

    function renderNotifications() {
        var body = $('notifBody');
        if (!body) return;

        body.innerHTML = sampleNotifications.map(function(n) {
            return '<div class="notif-item"><div class="notif-icon" style="background:' + n.color + '12;color:' + n.color + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div><strong>' + n.title + '</strong><p>' + n.message + '</p><span class="notif-time">' + n.time + '</span></div></div>';
        }).join('');
    }

    // Event listeners
    if ($('roleFilter')) {
        $('roleFilter').addEventListener('change', renderUsersTable);
    }

    if ($('auditFilter')) {
        $('auditFilter').addEventListener('change', renderAuditTrail);
    }

    $('refreshData').addEventListener('click', function() {
        showToast('Dashboard data refreshed', 'success');
        initDashboard();
    });

    $('saveSettings').addEventListener('click', function() {
        settings.hospitalName = $('hospitalName').value;
        settings.sessionTimeout = $('sessionTimeout').value;
        settings.maxAttempts = $('maxAttempts').value;
        saveSettings();
        showToast('Settings saved successfully', 'success');
    });

    // Load saved settings
    if (settings.hospitalName) $('hospitalName').value = settings.hospitalName;
    if (settings.sessionTimeout) $('sessionTimeout').value = settings.sessionTimeout;
    if (settings.maxAttempts) $('maxAttempts').value = settings.maxAttempts;

    // Global search
    $('globalSearch').addEventListener('input', function() {
        var q = this.value.toLowerCase().trim();
        if (!q) return;
        var found = users.find(function(u) {
            var name = ((u.firstName || '') + ' ' + (u.lastName || '')).toLowerCase();
            return name.indexOf(q) > -1 || (u.email || '').toLowerCase().indexOf(q) > -1 || (u.id || '').toLowerCase().indexOf(q) > -1;
        });
        if (found && q.length >= 2) {
            // Could show search results dropdown - for now just highlight
        }
    });

    // Init
    function initDashboard() {
        renderOverview();
        renderUsersTable();
        renderDepartments();
        renderAnalytics();
        renderAuditTrail();
        renderSystemInfo();
        renderNotifications();
    }

    initDashboard();

    // Public API for inline handlers
    window.AdminDash = {
        showToast: showToast,
        viewUser: function(uid) {
            var u = users.find(function(x) { return x.id === uid; });
            if (!u) { showToast('User not found', 'error'); return; }
            showToast('Viewing user: ' + (u.firstName || '') + ' ' + (u.lastName || ''), 'info');
        }
    };

})();