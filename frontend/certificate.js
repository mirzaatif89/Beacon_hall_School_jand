(function () {
    'use strict';
    const templates = [
        { title:'Certificate of Achievement', audience:'Student', text:'In recognition of excellent academic achievement, dedication to learning, and successful completion of the required academic work.' },
        { title:'Best Student Performance Certificate', audience:'Student', text:'In recognition of outstanding overall performance, consistent effort, and a positive contribution to the learning environment.' },
        { title:'Perfect Attendance Certificate', audience:'Student', text:'In recognition of perfect attendance and punctuality during the stated academic period, demonstrating commitment and responsibility.' },
        { title:'Character Certificate', audience:'Student', text:'This is to certify that the named student has demonstrated good moral character, respectful behaviour, and satisfactory conduct during their time at this institution.' },
        { title:'School Leaving Certificate', audience:'Student', text:'This is to certify that the named student was enrolled in the class stated above and is leaving this institution. This certificate is issued on request for admission or transfer purposes.' },
        { title:'Participation Certificate', audience:'Student', text:'In recognition of active participation, enthusiasm, and a valuable contribution to the stated school activity or event.' },
        { title:'Sports Achievement Certificate', audience:'Student', text:'In recognition of excellent performance in sports, teamwork, discipline, and commendable sportsmanship in the stated competition.' },
        { title:'Best Teacher Performance Certificate', audience:'Teacher', text:'In recognition of outstanding teaching performance, effective classroom practice, and dedication to the academic progress and development of students.' },
        { title:'Teacher Appreciation Certificate', audience:'Teacher', text:'With appreciation for dedicated service, guidance, and a valuable contribution to students and the school community.' },
        { title:'Teaching Experience Certificate', audience:'Teacher', text:'This is to certify that the named teacher served at this institution in the department or subject stated above. Add the designation, employment dates, and responsibilities here before issuing.' }
    ];
    const $ = id => document.getElementById(id);
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    const current = () => templates.find(item => item.title === $('certificateType').value) || templates[0];
    let previousAudience = '';
    function recipients() {
        const audience = current().audience;
        const key = audience === 'Teacher' ? 'eduCore_teachers' : 'eduCore_students';
        let records = [];
        try { records = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) {}
        const campus = typeof getGlobalCampusFilterForCurrentUser === 'function' ? getGlobalCampusFilterForCurrentUser() : 'all';
        return (Array.isArray(records) ? records : []).filter(item => !campus || campus === 'all' || String(item.campusName || item.branchName || item.campus || 'Main Campus').trim().toLowerCase() === String(campus).trim().toLowerCase());
    }
    function populateRecipients() {
        const selected = $('certificateRecipient').value;
        $('certificateRecipient').innerHTML = '<option value="">Enter name manually</option>' + recipients().map(item => `<option value="${esc(item.id)}">${esc(item.fullName || item.name || '')}${item.rollNo || item.employeeId ? ` (${esc(item.rollNo || item.employeeId)})` : ''}</option>`).join('');
        $('certificateRecipient').value = selected;
    }
    function updateTemplate() {
        const template = current();
        const teacher = template.audience === 'Teacher';
        if (previousAudience && previousAudience !== template.audience) {
            $('certificateStudentName').value = '';
            $('certificateClass').value = '';
            $('certificateRecipient').value = '';
        }
        previousAudience = template.audience;
        $('certificateNameLabel').textContent = `${template.audience} Name`;
        $('certificateStudentName').placeholder = `${template.audience} name`;
        $('certificateDetailLabel').textContent = teacher ? 'Department / Subject' : 'Class';
        $('certificateClass').placeholder = teacher ? 'Department or teaching subject' : 'Class';
        $('certificateRecipientLabel').textContent = `Select ${template.audience} (Optional)`;
        $('certificateText').value = template.text;
        populateRecipients();
        render();
    }
    function render() {
        const branding = typeof getBrandingSettings === 'function' ? getBrandingSettings() : {};
        const schoolName = branding.schoolName || branding.schoolTitle || window.SCHOOL_BRANDING?.name || 'Beacon Light School System';
        const logo = typeof getBrandingLogoSrc === 'function' ? getBrandingLogoSrc() : 'images/logo.jpeg';
        const date = $('certificateDate').value ? new Date(`${$('certificateDate').value}T12:00:00`).toLocaleDateString('en-GB') : '-';
        $('certificatePreview').innerHTML = `
            <div class="certificate-head"><img class="certificate-logo" src="${esc(logo)}" alt="School logo"><div><h1>${esc(schoolName)}</h1><p>${esc(branding.schoolTitle || schoolName)}</p></div><img class="certificate-logo" src="${esc(logo)}" alt="School logo"></div>
            <div class="certificate-title">${esc(current().title)}</div>
            <div class="certificate-body"><div>This certificate is awarded to</div><div class="certificate-name">${esc($('certificateStudentName').value || `${current().audience} Name`)}</div><div>${current().audience === 'Teacher' ? 'Department / Subject' : 'Class'}: <strong>${esc($('certificateClass').value || '-')}</strong></div><div style="white-space:pre-line">${esc($('certificateText').value || '-')}</div><div>Date: <strong>${esc(date)}</strong></div></div>
            <div class="certificate-sign"><div>${esc($('certificatePreparedBy').value || 'Administration')}</div><div>${esc($('certificatePrincipal').value || 'Principal')}</div></div>`;
    }
    $('certificateType').innerHTML = ['Student','Teacher'].map(audience => `<optgroup label="${audience} Certificates">${templates.filter(item => item.audience === audience).map(item => `<option>${esc(item.title)}</option>`).join('')}</optgroup>`).join('');
    const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Karachi', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
    const part = type => dateParts.find(item => item.type === type).value;
    $('certificateDate').value = `${part('year')}-${part('month')}-${part('day')}`;
    $('certificateType').addEventListener('change', updateTemplate);
    $('certificateRecipient').addEventListener('focus', populateRecipients);
    $('certificateRecipient').addEventListener('change', () => {
        const record = recipients().find(item => String(item.id) === $('certificateRecipient').value);
        if (!record) return;
        $('certificateStudentName').value = record.fullName || record.name || '';
        $('certificateClass').value = current().audience === 'Teacher' ? record.subject || record.department || record.designation || '' : [record.classGrade, record.section].filter(Boolean).join(' - Section ');
        render();
    });
    $('certificateForm').addEventListener('submit', event => event.preventDefault());
    $('certificateForm').addEventListener('input', render);
    $('certificateForm').addEventListener('change', render);
    $('printCertificateBtn').addEventListener('click', () => {
        if (!$('certificateStudentName').value.trim()) { showAppAlert('Enter or select the recipient name before printing.'); return; }
        render(); window.print();
    });
    updateTemplate();
    if (window.lucide) window.lucide.createIcons();
})();
