function validateWeeklyTest(body = {}) {
    const fail = message => { const error = new Error(message); error.statusCode = 400; throw error; };
    const month = String(body.month || '');
    const week = Number(body.week);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) fail('Select a valid month.');
    if (!Number.isInteger(week) || week < 1 || week > 4) fail('Select Week One to Week Four.');
    if (!body.studentId || !String(body.classGrade || '').trim()) fail('Class and student are required.');
    if (!Array.isArray(body.subjects) || !body.subjects.length) fail('Enter marks for at least one subject.');
    const names = new Set();
    const subjects = body.subjects.map(item => {
        const subject = String(item.subject || '').trim();
        const totalMarks = Number(item.totalMarks);
        const obtainedMarks = Number(item.obtainedMarks);
        if (!subject || names.has(subject.toLowerCase())) fail('Subject names must be unique.');
        names.add(subject.toLowerCase());
        if (item.totalMarks == null || String(item.totalMarks).trim() === '' || !Number.isFinite(totalMarks) || totalMarks <= 0) fail('Total marks must be greater than zero.');
        if (item.obtainedMarks == null || String(item.obtainedMarks).trim() === '' || !Number.isFinite(obtainedMarks) || obtainedMarks < 0 || obtainedMarks > totalMarks) fail('Obtained marks must be between zero and total marks.');
        return { subject, totalMarks, obtainedMarks };
    });
    return {
        id: `WEEKLY-${encodeURIComponent(String(body.studentId))}-${month}-${week}`,
        studentId: String(body.studentId), studentName: String(body.studentName || ''),
        rollNo: String(body.rollNo || ''), fatherName: String(body.fatherName || ''),
        classGrade: String(body.classGrade).trim(), section: String(body.section || 'General'),
        campusName: String(body.campusName || 'Main Campus'), month, week, subjects
    };
}

module.exports = { validateWeeklyTest };
