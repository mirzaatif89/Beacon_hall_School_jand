const { createHandler, sendJson } = require('../_lib/http');
const { readStore, upsertRecord } = require('../_lib/mobileStore');
const { validateWeeklyTest } = require('../_lib/weeklyTests');

module.exports = createHandler({
    GET: async ({ res }) => sendJson(res, 200, { success: true, tests: readStore('weekly_tests') }),
    POST: async ({ res, body }) => {
        const { record } = upsertRecord('weekly_tests', validateWeeklyTest(body), 'WEEKLY');
        sendJson(res, 200, { success: true, test: record });
    }
});
