(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const reportMode = document.body.dataset.weeklyMode === 'report';
    const sectionTools = window.studentSchedulingSections;
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    const norm = value => String(value || '').trim().toLowerCase();
    const subjectKey = value => norm(value) === 'math' ? 'mathematics' : norm(value);
    const weekNames = ['Week One', 'Week Two', 'Week Three', 'Week Four'];
    const api = typeof getApiBaseUrl === 'function' ? getApiBaseUrl() : '/api';
    let students = [], courses = [], tests = [], week = reportMode ? 1 : null, dirty = false, saving = false;
    const localRecords = key => sectionTools.getRecords(key);
    const currentMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Karachi', year:'numeric', month:'2-digit' }).formatToParts(new Date()).reduce((out, part) => ({ ...out, [part.type]:part.value }), {});
    const now = currentMonth();
    $('weeklyMonth').value = `${now.year}-${now.month}`;
    function status(message, error = false) { $('weeklyStatus').textContent = message; $('weeklyStatus').dataset.error = String(error); }
    function campusMatches(record) {
        const campus = typeof getGlobalCampusFilterForCurrentUser === 'function' ? getGlobalCampusFilterForCurrentUser() : 'all';
        return !campus || campus === 'all' || norm(record.campusName || record.branchName || record.campus || 'Main Campus') === norm(campus);
    }
    function options(select, values, placeholder) {
        select.innerHTML = `<option value="">${esc(placeholder)}</option>` + values.map(item => `<option value="${esc(item.value ?? item)}">${esc(item.label ?? item)}</option>`).join('');
    }
    function matchesSelection(record) {
        return sectionTools.matches(record, $('weeklyClass').value) &&
            (!$('weeklySection').value || norm(sectionTools.section(record) || 'General') === norm($('weeklySection').value));
    }
    function matchingTests() { return tests.filter(test => test.month === $('weeklyMonth').value && Number(test.week) === week && campusMatches(test)); }
    function classStudents() {
        return students.filter(student => campusMatches(student) && matchesSelection(student));
    }
    function selectedStudent() { return classStudents().find(student => String(student.id) === $('weeklyStudent').value); }
    function existingTest() { return matchingTests().find(test => String(test.studentId) === $('weeklyStudent').value); }
    function invalidateReport() { if (reportMode) { $('weeklyPreview').hidden = true; $('weeklyPrint').disabled = true; } }
    function renderClasses() {
        const records = reportMode ? matchingTests() : students.filter(campusMatches);
        options($('weeklyClass'), sectionTools.getClassOptions(records, reportMode ? [] : localRecords('eduCore_classes').filter(campusMatches)), 'Select Class');
        renderSections();
    }
    function renderSections() {
        const records = reportMode ? matchingTests() : students.filter(campusMatches);
        const values = [...new Set(records.filter(item => sectionTools.matches(item, $('weeklyClass').value)).map(item => sectionTools.section(item) || 'General'))].sort();
        options($('weeklySection'), values, 'All Sections');
        renderStudents();
    }
    function renderStudents() {
        const records = reportMode ? matchingTests().filter(matchesSelection) : classStudents();
        options($('weeklyStudent'), $('weeklyClass').value ? records.map(item => ({ value:String(reportMode ? item.studentId : item.id), label:`${item.studentName || item.fullName || 'Student'} (${item.rollNo || item.studentCode || item.studentId || item.id})` })) : [], reportMode ? 'All Students with Saved Marks' : 'Select Student');
        renderMarks();
    }
    function subjectsFor(student, saved) {
        const matches = item => sectionTools.matches(item, $('weeklyClass').value) && (!sectionTools.section(item) || norm(sectionTools.section(item)) === norm(sectionTools.section(student) || 'General')) && (!item.campusName || campusMatches(item));
        const configured = [...courses, ...localRecords('eduCore_student_schedules')].filter(matches).map(item => item.subject || item.title).filter(Boolean);
        const assigned = student?.assignedSubjects || student?.subjects || [];
        const assignedNames = (Array.isArray(assigned) ? assigned : String(assigned).split(/[,|]/)).map(item => typeof item === 'string' ? item : item.subject || item.name).filter(Boolean);
        const fallback = ['English','Urdu','Mathematics','Science','Social Study','Islamiyat','Nazra'];
        if (/^(9|9th|nine|10|10th|ten|class 9|class 10)$/i.test($('weeklyClass').value)) fallback.push('Physics','Chemistry','Biology','Computer');
        const names = [...(configured.length || assignedNames.length ? [...configured, ...assignedNames] : fallback), ...(saved?.subjects || []).map(item => item.subject)];
        return [...new Map(names.map(name => [subjectKey(name), name])).values()];
    }
    function renderMarks() {
        invalidateReport();
        if (reportMode) return;
        const student = selectedStudent(), saved = existingTest();
        const previousTotals = matchingTests().filter(matchesSelection).flatMap(test => test.subjects || []);
        $('weeklyMarksBody').innerHTML = student ? subjectsFor(student, saved).map(subject => {
            const marks = saved?.subjects.find(item => subjectKey(item.subject) === subjectKey(subject));
            const defaults = previousTotals.find(item => subjectKey(item.subject) === subjectKey(subject));
            return `<tr data-subject="${esc(subject)}"><td>${esc(subject)}</td><td><input aria-label="${esc(subject)} total marks" type="number" min="0.01" step="any" data-total value="${esc(marks?.totalMarks ?? defaults?.totalMarks ?? '')}"></td><td><input aria-label="${esc(subject)} obtained marks" type="number" min="0" step="any" data-obtained value="${esc(marks?.obtainedMarks ?? '')}"></td></tr>`;
        }).join('') : '<tr><td colspan="3">Select a class and student to enter marks.</td></tr>';
        $('weeklySave').disabled = !student || !week || !/^[0-9]{4}-(0[1-9]|1[0-2])$/.test($('weeklyMonth').value);
        dirty = false;
        if (student) status(saved ? 'Saved marks loaded. You can update them and save again.' : 'Enter marks and click Save Marks.');
    }
    function renderWeeks() {
        if (reportMode) return;
        $('weeklyMonthTitle').textContent = $('weeklyMonth').value ? new Date(`${$('weeklyMonth').value}-01T12:00:00`).toLocaleDateString('en-PK', { month:'long', year:'numeric' }) : 'Select a month';
        $('weeklyCards').innerHTML = weekNames.map((name, index) => `<button type="button" class="schedule-hub-card weekly-week-card" data-week="${index + 1}" aria-pressed="${week === index + 1}"><span class="schedule-hub-icon"><i data-lucide="calendar-check"></i></span><span><strong>${name}</strong><span>Enter and update weekly test marks</span></span></button>`).join('');
        $('weeklyWorkspace').hidden = !week;
        if (week) $('weeklyHeading').textContent = weekNames[week - 1];
        if (window.lucide) window.lucide.createIcons();
    }
    async function guardChange(action, rollback) {
        if (saving || (dirty && !await showAppConfirm('Discard unsaved weekly test marks?'))) { if (rollback) rollback(); return; }
        dirty = false; action();
    }
    async function request(path, init) {
        const attempts = !init || !init.method || init.method === 'GET' ? 4 : 1;
        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                const response = await fetch(`${api}/${path}`, { cache:'no-store', ...init });
                if ([408, 429, 502, 503, 504].includes(response.status) && attempt < attempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
                    continue;
                }
                const data = await response.json();
                if (!response.ok || data.success === false) throw Object.assign(new Error(
                    response.status === 404 && path === 'weekly-tests'
                        ? 'The server is running an older version. Restart the application server and click Retry Loading.'
                        : data.message || 'Weekly test request failed.'
                ), { responseReceived:true });
                return data;
            } catch (error) {
                if (error.responseReceived || attempt === attempts - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
            }
        }
    }
    async function load() {
        $('weeklyRetry').hidden = true;
        try {
            const [studentData, courseData, testData] = await Promise.all([request('students'), request('student-courses'), request('weekly-tests')]);
            students = Array.isArray(studentData) ? studentData : studentData.students || [];
            courses = courseData.courses || [];
            tests = testData.tests || [];
            renderWeeks(); renderClasses(); status('Select a month and week to continue.');
        } catch (error) { status(`Could not load records: ${error.message}`, true); $('weeklyRetry').hidden = false; }
    }
    async function save(event) {
        event.preventDefault();
        if (saving) return;
        const student = selectedStudent();
        if (!student || !week) return;
        const subjects = [];
        for (const row of $('weeklyMarksBody').querySelectorAll('tr[data-subject]')) {
            const obtained = row.querySelector('[data-obtained]').value;
            if (obtained === '') continue;
            const total = row.querySelector('[data-total]').value;
            if (total === '' || !Number.isFinite(Number(total)) || Number(total) <= 0 || !Number.isFinite(Number(obtained)) || Number(obtained) < 0 || Number(obtained) > Number(total)) {
                status(`Check ${row.dataset.subject}: obtained marks must be between 0 and total marks.`, true); return;
            }
            subjects.push({ subject:row.dataset.subject, totalMarks:Number(total), obtainedMarks:Number(obtained) });
        }
        if (!subjects.length) { status('Enter marks for at least one subject.', true); return; }
        // Blank subjects preserve any marks already saved; every save can add more subjects.
        const merged = new Map((existingTest()?.subjects || []).map(item => [subjectKey(item.subject), item]));
        subjects.forEach(item => merged.set(subjectKey(item.subject), item));
        const payload = { studentId:String(student.id), studentName:student.fullName, fatherName:student.fatherName, rollNo:student.rollNo || student.studentCode, classGrade:sectionTools.classGrade(student), section:sectionTools.section(student) || 'General', campusName:student.campusName || student.branchName || student.campus || 'Main Campus', month:$('weeklyMonth').value, week, subjects:[...merged.values()] };
        saving = true; $('weeklySave').disabled = true;
        try {
            const data = await request('weekly-tests', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(payload) });
            tests = [data.test, ...tests.filter(item => item.id !== data.test.id)];
            dirty = false; status('Weekly test marks saved successfully.');
        } catch (error) { status(`Marks were not saved: ${error.message}`, true); }
        finally { saving = false; $('weeklySave').disabled = false; }
    }
    function viewReport() {
        invalidateReport();
        if (!$('weeklyMonth').value || !$('weeklyClass').value) { status('Select month, week, and class first.', true); return; }
        const records = matchingTests().filter(item => matchesSelection(item) && (!$('weeklyStudent').value || String(item.studentId) === $('weeklyStudent').value));
        if (!records.length) { status('No saved weekly test marks for these filters.'); return; }
        const subjects = [...new Map(records.flatMap(item => item.subjects).map(item => [subjectKey(item.subject), item.subject])).values()];
        const branding = typeof getBrandingSettings === 'function' ? getBrandingSettings() : {};
        const school = branding.schoolName || branding.schoolTitle || window.SCHOOL_BRANDING?.name || 'Beacon Light School System';
        const logo = new URL(branding.logoDataUrl || 'images/logo.jpeg', location.href).href;
        const rows = records.map((item, index) => {
            const total = item.subjects.reduce((sum, subject) => sum + Number(subject.totalMarks), 0);
            const obtained = item.subjects.reduce((sum, subject) => sum + Number(subject.obtainedMarks), 0);
            return `<tr><td class="number">${index + 1}</td><td>${esc(item.rollNo || item.studentId)}</td><td>${esc(item.studentName)}</td><td>${esc(item.fatherName || '-')}</td><td>${esc(item.classGrade)}</td><td>${esc(item.section)}</td>${subjects.map(subject => { const marks = item.subjects.find(mark => subjectKey(mark.subject) === subjectKey(subject)); return `<td class="mark">${marks ? esc(marks.obtainedMarks) : '-'}</td>`; }).join('')}<td class="total-mark">${total}</td><td class="obtained-mark">${obtained}</td><td class="percentage">${total ? (obtained / total * 100).toFixed(1) : '0'}%</td></tr>`;
        }).join('');
        const filters = `${$('weeklyMonth').value} | ${weekNames[week - 1]} | Class: ${$('weeklyClass').value} | Section: ${$('weeklySection').value || 'All'}`;
        $('weeklyPreview').srcdoc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(school)} - Weekly Test Report</title><link rel="stylesheet" href="${esc(new URL('weekly_test_report.css', location.href).href)}"></head><body><main class="report-card"><header class="heading"><div class="school-identity"><img class="logo" src="${esc(logo)}" alt="School logo"><div><h1>${esc(school)}</h1><p class="subtitle">Weekly Test Report Card</p></div></div><div class="meta">${esc(new Date().toLocaleString('en-PK', { timeZone:'Asia/Karachi' }))}<br>Total Students: ${records.length}</div></header><p class="filters">${esc(filters)}</p><div class="table-wrap"><table><thead><tr><th>#</th><th>Student ID</th><th>Student Name</th><th>Father Name</th><th>Class</th><th>Section</th>${subjects.map(subject => `<th class="subject">${esc(subject)}<br><small>Obt.</small></th>`).join('')}<th>Total Marks</th><th>Obtained Marks</th><th>Percentage</th></tr></thead><tbody>${rows}</tbody></table></div><p class="legend">Subject columns show obtained marks. Totals are calculated from saved subjects only.</p><footer class="footer"><span>Generated from saved weekly tests.</span><span>Principal Signature: ____________________</span></footer></main></body></html>`;
        $('weeklyPreview').hidden = false;
        status('Report generated from saved weekly test marks.');
    }
    for (const id of ['weeklyMonth','weeklyClass','weeklySection','weeklyStudent']) {
        const input = $(id); let previous = input.value;
        input.addEventListener('focus', () => { previous = input.value; });
        input.addEventListener('change', () => guardChange(() => {
            if (id === 'weeklyMonth') { if (!reportMode) week = null; renderWeeks(); renderClasses(); }
            else if (id === 'weeklyClass') renderSections();
            else if (id === 'weeklySection') renderStudents();
            else renderMarks();
            previous = input.value;
        }, () => { input.value = previous; }));
    }
    $('weeklyRetry').addEventListener('click', load);
    if (reportMode) {
        $('weeklyWeek').addEventListener('change', () => { week = Number($('weeklyWeek').value); renderClasses(); invalidateReport(); });
        $('weeklyView').addEventListener('click', viewReport);
        $('weeklyPreview').addEventListener('load', () => { $('weeklyPrint').disabled = $('weeklyPreview').hidden; });
        $('weeklyPrint').addEventListener('click', () => { const frame = $('weeklyPreview').contentWindow; frame.focus(); frame.print(); });
    } else {
        $('weeklyCards').addEventListener('click', event => { const card = event.target.closest('[data-week]'); if (card) guardChange(() => { week = Number(card.dataset.week); renderWeeks(); renderClasses(); }); });
        $('weeklyMarksForm').addEventListener('input', () => { dirty = true; });
        $('weeklyMarksForm').addEventListener('submit', save);
        window.addEventListener('beforeunload', event => { if (dirty || saving) { event.preventDefault(); event.returnValue = ''; } });
    }
    window.addEventListener('storage', event => { if (event.key === 'eduCore_dashboard_campus_filter') guardChange(() => { renderClasses(); invalidateReport(); }); });
    load();
})();
