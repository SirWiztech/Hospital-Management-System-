(function() {
    'use strict';

    var $ = function(id) { return document.getElementById(id); };
    var SESSION_KEY = 'vitalis_session';

    var session = null;

    try { session = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch(e) { session = null; }

    // Auth Gate - Only doctors allowed
    if (!session || session.role !== 'doctor') {
        $('authGate').classList.remove('hidden');
        $('appShell').classList.add('hidden');
        return;
    }

    $('authGate').classList.add('hidden');
    $('appShell').classList.remove('hidden');

    // Set user info
    $('docName').textContent = session.name || 'Dr. Sarah Chen';
    $('docDept').textContent = session.dept || 'Cardiology';
    $('topbarName').textContent = session.name || 'Dr. Sarah Chen';
    document.title = 'Vitalis — Doctor Portal';

    // Sample data
    var myPatients = [
        { id: 'PTN-001', name: 'John Smith', dept: 'Cardiology', room: '204-B', condition: 'Chest pain evaluation', status: 'admitted' },
        { id: 'PTN-008', name: 'Ashley Thomas', dept: 'Cardiology', room: '—', condition: 'Follow-up checkup', status: 'outpatient' },
        { id: 'PTN-010', name: 'David Martinez', dept: 'Cardiology', room: '206-A', condition: 'Post-MI recovery', status: 'admitted' },
        { id: 'PTN-011', name: 'Lisa Wang', dept: 'Cardiology', room: '—', condition: 'Hypertension management', status: 'outpatient' }
    ];

    var myAppointments = [
        { id: 'APT-001', patient: 'John Smith', date: '2025-01-15', time: '09:00', type: 'Follow-up', status: 'confirmed' },
        { id: 'APT-008', patient: 'Ashley Thomas', date: '2025-01-15', time: '10:30', type: 'Checkup', status: 'confirmed' },
        { id: 'APT-012', patient: 'David Martinez', date: '2025-01-15', time: '14:00', type: 'Procedure', status: 'pending' },
        { id: 'APT-013', patient: 'Lisa Wang', date: '2025-01-16', time: '11:00', type: 'Consultation', status: 'confirmed' },
        { id: 'APT-014', patient: 'John Smith', date: '2025-01-17', time: '09:00', type: 'Follow-up', status: 'pending' }
    ];

    var myPrescriptions = [
        { patient: 'John Smith', med: 'Lisinopril', dosage: '10mg', freq: 'Once daily', date: '2025-01-10', status: 'active' },
        { patient: 'John Smith', med: 'Metformin', dosage: '500mg', freq: 'Twice daily', date: '2025-01-08', status: 'active' },
        { patient: 'David Martinez', med: 'Clopidogrel', dosage: '75mg', freq: 'Once daily', date: '2025-01-12', status: 'active' },
        { patient: 'Lisa Wang', med: 'Amlodipine', dosage: '5mg', freq: 'Once daily', date: '2025-01-05', status: 'active' },
        { patient: 'Ashley Thomas', med: 'Amoxicillin', dosage: '250mg', freq: 'Three times daily', date: '2024-12-20', status: 'completed' }
    ];

    var notifications = [
        { type: 'appt', title: 'Upcoming Appointment', message: 'John Smith at 9:00 AM today', time: '30 min ago', color: '#7A9CB3' },
        { type: 'lab', title: 'Lab Results Ready', message: 'CBC results for David Martinez', time: '2 hours ago', color: '#AD7556' },
        { type: 'alert', title: 'Critical Vitals', message: 'David Martinez SpO2 dropped to 94%', time: '15 min ago', color: '#ef4444' }
    ];

    // Helpers
    function cap(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

    function fmtDate(ds) {
        if (!ds || ds === '—') return '—';
        var d = new Date(ds);
        return isNaN(d.getTime()) ? ds : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function initials(name) {
        return name.split(' ').map(function(w) { return w.charAt(0); }).join('').substring(0, 2).toUpperCase();
    }

    function statusBadge(s) {
        var map = { active: 'active', admitted: 'active', confirmed: 'active', pending: 'pending', outpatient: 'pending', discharged: 'inactive', completed: 'completed' };
        var cls = map[s] || 'pending';
        return '<span class="badge badge-' + cls + '"><span class="badge-dot"></span>' + cap(s.replace('-', ' ')) + '</span>';
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

    // Modal
    function openModal(title, bodyHtml, footerHtml) {
        $('modalTitle').textContent = title;
        $('modalBody').innerHTML = bodyHtml;
        if (footerHtml) {
            $('modalFooter').innerHTML = footerHtml;
        } else {
            $('modalFooter').innerHTML = '';
        }
        $('modalOverlay').classList.remove('hidden');
    }

    function closeModal() {
        $('modalOverlay').classList.add('hidden');
    }

    $('modalClose').addEventListener('click', closeModal);
    $('modalOverlay').addEventListener('click', function(e) {
        if (e.target === $('modalOverlay')) closeModal();
    });

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

    // Live clock
    function updateClock() {
        var now = new Date();
        var h = now.getHours().toString().padStart(2, '0');
        var m = now.getMinutes().toString().padStart(2, '0');
        var s = now.getSeconds().toString().padStart(2, '0');
        if ($('liveClock')) {
            $('liveClock').textContent = h + ':' + m + ':' + s;
        }
    }
    setInterval(updateClock, 1000);
    updateClock();

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
    function renderDashboard() {
        animateCount($('myPatients'), myPatients.length, 1000);
        animateCount($('todayAppts'), 3, 1000);
        animateCount($('completed'), 1, 1000);
        animateCount($('pendingReports'), 2, 1000);

        // Today's schedule
        var schedule = $('todaySchedule');
        if (schedule) {
            var todayAppts = myAppointments.filter(function(a) { return a.date === '2025-01-15'; });
            schedule.innerHTML = todayAppts.map(function(a) {
                return '<div class="schedule-item"><span class="schedule-time">' + a.time + '</span><div class="schedule-divider"></div><div class="schedule-info"><h4>' + a.patient + '</h4><p>' + a.type + '</p></div>' + statusBadge(a.status) + '</div>';
            }).join('');
        }

        // Next appointment
        var nextAppt = $('nextApptSection');
        if (nextAppt) {
            var next = myAppointments.find(function(a) { return a.status === 'confirmed'; });
            if (next) {
                var d = new Date(next.date);
                nextAppt.innerHTML = '<div class="next-appt-card"><div class="appt-date-block"><div class="appt-day">' + d.getDate() + '</div><div class="appt-month">' + d.toLocaleDateString('en-US', { month: 'short' }) + '</div></div><div class="appt-details"><h4>Next: ' + next.patient + '</h4><p>' + next.time + ' — ' + next.type + ' (' + next.id + ')</p></div>' + statusBadge(next.status) + '</div>';
            }
        }
    }

    function renderPatients() {
        var tbody = $('patientsTable');
        if (!tbody) return;

        tbody.innerHTML = myPatients.map(function(p) {
            return '<tr><td><div style="display:flex;align-items:center;gap:14px"><div style="width:40px;height:40px;border-radius:50%;background:var(--chambray-wash);border:2px solid var(--chambray-pale);display:flex;align-items:center;justify-content:center;color:var(--chambray);font-size:0.8rem;font-weight:700">' + initials(p.name) + '</div><div><strong>' + p.name + '</strong><br><span style="font-size:0.74rem;color:var(--clove-faint)">' + p.id + '</span></div></div></td><td>' + p.dept + '</td><td>' + p.room + '</td><td style="font-size:0.84rem;color:var(--clove-light)">' + p.condition + '</td><td>' + statusBadge(p.status) + '</td><td><button class="btn btn-sm btn-outline" onclick="DoctorDash.viewPatient(\'' + p.id + '\')">View</button></td></tr>';
        }).join('');
    }

    function renderAppointments() {
        var tbody = $('apptsTable');
        if (!tbody) return;

        tbody.innerHTML = myAppointments.map(function(a) {
            var action = '';
            if (a.status === 'confirmed') {
                action = '<button class="btn btn-sm btn-outline" onclick="DoctorDash.completeAppt(\'' + a.id + '\')">Complete</button>';
            } else if (a.status === 'pending') {
                action = '<button class="btn btn-sm btn-outline" onclick="DoctorDash.confirmAppt(\'' + a.id + '\')">Confirm</button>';
            }
            return '<tr><td style="font-size:0.82rem;color:var(--clove-faint)">' + fmtDate(a.date) + '</td><td><strong style="color:var(--chambray-dark)">' + a.time + '</strong></td><td>' + a.patient + '</td><td>' + a.type + '</td><td>' + statusBadge(a.status) + '</td><td>' + action + '</td></tr>';
        }).join('');
    }

    function renderPrescriptions() {
        var tbody = $('rxTable');
        if (!tbody) return;

        tbody.innerHTML = myPrescriptions.map(function(rx) {
            return '<tr><td>' + rx.patient + '</td><td><strong>' + rx.med + '</strong></td><td>' + rx.dosage + '</td><td>' + rx.freq + '</td><td style="font-size:0.82rem;color:var(--clove-faint)">' + fmtDate(rx.date) + '</td><td>' + statusBadge(rx.status) + '</td></tr>';
        }).join('');
    }

    function renderSchedule() {
        var grid = $('weekSchedule');
        if (!grid) return;

        var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        var todayIdx = (new Date().getDay() + 6) % 7;

        var slots = [
            [{ t: '09:00', p: 'John Smith' }, { t: '10:30', p: 'Ashley Thomas' }, { t: '14:00', p: 'David Martinez' }],
            [{ t: '09:00', p: 'Consultation' }, { t: '14:00', p: 'Team Meeting' }],
            [{ t: '08:30', p: 'Lisa Wang' }, { t: '11:00', p: 'Follow-ups' }],
            [{ t: '09:00', p: 'Lab Review' }, { t: '15:00', p: 'Research' }],
            [{ t: '09:00', p: 'Morning Rounds' }, { t: '13:00', p: 'Admin' }],
            [{ t: 'Off', p: '' }],
            [{ t: 'Off', p: '' }]
        ];

        grid.innerHTML = days.map(function(day, i) {
            var isToday = i === todayIdx;
            var cls = isToday ? 'schedule-day-card today' : 'schedule-day-card';
            var content = slots[i].map(function(s) {
                if (s.t === 'Off') return '<div class="schedule-slot"><span class="off">Day Off</span></div>';
                return '<div class="schedule-slot"><span class="time">' + s.t + '</span><span>' + s.p + '</span></div>';
            }).join('');
            return '<div class="' + cls + '"><h4>' + day + (isToday ? ' (Today)' : '') + '</h4>' + content + '</div>';
        }).join('');
    }

    function renderProfile() {
        $('profileName').textContent = session.name || 'Dr. Sarah Chen';
        $('profileDept').textContent = session.dept || 'Cardiology';
        $('profileSpecialty').textContent = 'Interventional Cardiology';
        $('profileLicense').textContent = 'MD-2018-4521';
        $('profilePatients').textContent = myPatients.length;
        $('profileYears').textContent = '12';
        $('profileRating').textContent = '4.9';

        $('editName').value = session.name || 'Dr. Sarah Chen';
        $('editPhone').value = session.phone || '(555) 234-5678';
        $('editSpecialty').value = 'Interventional Cardiology';
        $('editBio').value = session.bio || 'Board-certified cardiologist with 12 years of experience in interventional cardiology. Specializing in cardiac catheterization and structural heart interventions.';
    }

    function renderNotifications() {
        var body = $('notifBody');
        if (!body) return;

        body.innerHTML = notifications.map(function(n) {
            return '<div class="notif-item"><div class="notif-icon" style="background:' + n.color + '12;color:' + n.color + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div><strong>' + n.title + '</strong><p>' + n.message + '</p><span class="notif-time">' + n.time + '</span></div></div>';
        }).join('');
    }

    // Profile save
    $('saveProfile').addEventListener('click', function() {
        session.name = $('editName').value;
        session.phone = $('editPhone').value;
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        $('docName').textContent = session.name;
        $('topbarName').textContent = session.name;
        $('profileName').textContent = session.name;
        showToast('Profile updated successfully', 'success');
    });

    // Init
    function initDashboard() {
        renderDashboard();
        renderPatients();
        renderAppointments();
        renderPrescriptions();
        renderSchedule();
        renderProfile();
        renderNotifications();
    }

    initDashboard();

    // Public API
    window.DoctorDash = {
        showToast: showToast,
        closeModal: closeModal,

        addRecord: function() {
            var patOpts = myPatients.map(function(p) { return '<option>' + p.name + '</option>'; }).join('');
            openModal('New Patient Record',
                '<div class="form-group"><label>Patient</label><select class="form-input" id="recPatient">' + patOpts + '</select></div>' +
                '<div class="form-group"><label>Diagnosis</label><input type="text" class="form-input" id="recDiagnosis" placeholder="Enter diagnosis"></div>' +
                '<div class="form-group"><label>Notes</label><textarea class="form-input" rows="4" id="recNotes" placeholder="Clinical notes..." style="resize:vertical"></textarea></div>',
                '<button class="btn btn-outline btn-sm" onclick="DoctorDash.closeModal()">Cancel</button><button class="btn btn-primary doc-btn btn-sm" onclick="DoctorDash.saveRecord()">Save Record</button>'
            );
        },

        saveRecord: function() {
            closeModal();
            showToast('Patient record saved successfully', 'success');
        },

        writeRx: function() {
            var patOpts = myPatients.map(function(p) { return '<option>' + p.name + '</option>'; }).join('');
            openModal('Write Prescription',
                '<div class="form-group"><label>Patient</label><select class="form-input" id="rxPatient">' + patOpts + '</select></div>' +
                '<div class="form-group"><label>Medication</label><input type="text" class="form-input" id="rxMed" placeholder="Medication name"></div>' +
                '<div class="form-group"><label>Dosage</label><input type="text" class="form-input" id="rxDosage" placeholder="e.g. 10mg"></div>' +
                '<div class="form-group"><label>Frequency</label><select class="form-input" id="rxFreq"><option>Once daily</option><option>Twice daily</option><option>Three times daily</option><option>As needed</option></select></div>' +
                '<div class="form-group"><label>Instructions</label><textarea class="form-input" rows="3" id="rxInstructions" placeholder="Special instructions..." style="resize:vertical"></textarea></div>',
                '<button class="btn btn-outline btn-sm" onclick="DoctorDash.closeModal()">Cancel</button><button class="btn btn-primary doc-btn btn-sm" onclick="DoctorDash.saveRx()">Prescribe</button>'
            );
        },

        saveRx: function() {
            var med = $('rxMed').value.trim();
            if (!med) { showToast('Please enter medication name', 'error'); return; }
            closeModal();
            showToast('Prescription written for ' + med, 'success');
        },

        viewLabs: function() {
            showToast('Lab results panel coming soon', 'info');
        },

        orderTest: function() {
            var patOpts = myPatients.map(function(p) { return '<option>' + p.name + '</option>'; }).join('');
            openModal('Order Lab Test',
                '<div class="form-group"><label>Patient</label><select class="form-input" id="testPatient">' + patOpts + '</select></div>' +
                '<div class="form-group"><label>Test Type</label><select class="form-input" id="testType"><option>CBC (Complete Blood Count)</option><option>Metabolic Panel</option><option>Lipid Panel</option><option>Thyroid Panel</option><option>Urinalysis</option><option>Custom</option></select></div>' +
                '<div class="form-group"><label>Urgency</label><select class="form-input" id="testUrgency"><option>Routine</option><option>Urgent</option><option>STAT</option></select></div>',
                '<button class="btn btn-outline btn-sm" onclick="DoctorDash.closeModal()">Cancel</button><button class="btn btn-primary doc-btn btn-sm" onclick="DoctorDash.saveTest()">Order Test</button>'
            );
        },

        saveTest: function() {
            closeModal();
            showToast('Lab test ordered successfully', 'success');
        },

        viewPatient: function(pid) {
            var p = myPatients.find(function(x) { return x.id === pid; });
            if (!p) { showToast('Patient not found', 'error'); return; }
            openModal('Patient: ' + p.name,
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
                '<div class="form-group"><label>Patient ID</label><div style="font-size:0.92rem;color:var(--clove)">' + p.id + '</div></div>' +
                '<div class="form-group"><label>Room</label><div style="font-size:0.92rem;color:var(--clove)">' + p.room + '</div></div>' +
                '<div class="form-group"><label>Department</label><div style="font-size:0.92rem;color:var(--clove)">' + p.dept + '</div></div>' +
                '<div class="form-group"><label>Status</label><div>' + statusBadge(p.status) + '</div></div>' +
                '</div>' +
                '<div class="form-group"><label>Condition</label><div style="font-size:0.92rem;color:var(--clove-light)">' + p.condition + '</div></div>',
                '<button class="btn btn-outline btn-sm" onclick="DoctorDash.closeModal()">Close</button>'
            );
        },

        completeAppt: function(aid) {
            var a = myAppointments.find(function(x) { return x.id === aid; });
            if (a) { a.status = 'completed'; renderAppointments(); renderDashboard(); }
            showToast('Appointment marked as completed', 'success');
        },

        confirmAppt: function(aid) {
            var a = myAppointments.find(function(x) { return x.id === aid; });
            if (a) { a.status = 'confirmed'; renderAppointments(); renderDashboard(); }
            showToast('Appointment confirmed', 'success');
        }
    };

})();