const test = require('node:test');
const assert = require('node:assert/strict');
const { validateWeeklyTest } = require('../api/_lib/weeklyTests');

const valid = () => ({
    studentId: 'student-1', classGrade: '9th', month: '2026-11', week: 1,
    subjects: [{ subject: 'English', totalMarks: 20, obtainedMarks: 0 }]
});

test('zero and decimal marks survive validation', () => {
    const data = valid();
    data.subjects.push({ subject: 'Physics', totalMarks: '25.5', obtainedMarks: '21.5' });
    const result = validateWeeklyTest(data);
    assert.equal(result.subjects[0].obtainedMarks, 0);
    assert.equal(result.subjects[1].obtainedMarks, 21.5);
});

test('one student has distinct records for each month and week', () => {
    const record = validateWeeklyTest(valid());
    assert.equal(record.id, validateWeeklyTest({ ...valid(), id: 'untrusted-id' }).id);
    assert.notEqual(record.id, validateWeeklyTest({ ...valid(), week: 2 }).id);
    assert.notEqual(record.id, validateWeeklyTest({ ...valid(), month: '2026-12' }).id);
    assert.notEqual(record.id, validateWeeklyTest({ ...valid(), studentId: 'student-2' }).id);
});

test('only four weeks and valid calendar months are accepted', () => {
    for (const week of [0, 5, 1.5, 'invalid']) {
        assert.throws(() => validateWeeklyTest({ ...valid(), week }), { statusCode: 400 });
    }
    for (const month of ['', '2026-00', '2026-13', '2026-1']) {
        assert.throws(() => validateWeeklyTest({ ...valid(), month }), { statusCode: 400 });
    }
});

test('incomplete, duplicate and out-of-range subject marks are rejected', () => {
    for (const marks of [
        { totalMarks: 0, obtainedMarks: 0 }, { totalMarks: 20, obtainedMarks: -1 },
        { totalMarks: 20, obtainedMarks: 21 }, { totalMarks: '', obtainedMarks: 0 },
        { totalMarks: 20, obtainedMarks: '' }, { totalMarks: 20, obtainedMarks: null },
        { totalMarks: 'NaN', obtainedMarks: 1 }
    ]) {
        assert.throws(() => validateWeeklyTest({ ...valid(), subjects: [{ subject: 'English', ...marks }] }), { statusCode: 400 });
    }
    assert.throws(() => validateWeeklyTest({ ...valid(), subjects: [...valid().subjects, ...valid().subjects] }), { statusCode: 400 });
    assert.throws(() => validateWeeklyTest({ ...valid(), subjects: [] }), { statusCode: 400 });
});

test('API saves persist after reload, update without duplicates, and stay separate from exams', () => {
    // Run the real file-backed handler in a child process with an isolated working directory.
    const { spawnSync } = require('node:child_process');
    const handlerPath = require.resolve('../api/weekly-tests');
    const code = `
        const assert = require('node:assert/strict');
        const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
        const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'aspire-weekly-unit-'));
        process.chdir(folder);
        const handler = require(${JSON.stringify(handlerPath)});
        async function request(method, body) {
            const res = { setHeader() {}, end(raw) { this.data = JSON.parse(raw); } };
            await handler({ method, body, headers: {} }, res);
            return res;
        }
        (async () => {
            const payload = ${JSON.stringify(valid())};
            assert.equal((await request('POST', payload)).statusCode, 200);
            payload.subjects[0].obtainedMarks = 12;
            await request('POST', payload);
            const result = await request('GET');
            assert.equal(result.data.tests.length, 1);
            assert.equal(result.data.tests[0].subjects[0].obtainedMarks, 12);
            const file = path.join(folder, 'data/mobile_api_store/weekly_tests.json');
            assert.equal(JSON.parse(fs.readFileSync(file))[0].subjects[0].obtainedMarks, 12);
            assert.equal(fs.existsSync(path.join(folder, 'data/mobile_api_store/student_results.json')), false);
            assert.equal((await request('POST', { ...payload, week: 5 })).statusCode, 400);
        })().catch(error => { console.error(error); process.exitCode = 1; });
    `;
    const result = spawnSync(process.execPath, ['-e', code], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
});
