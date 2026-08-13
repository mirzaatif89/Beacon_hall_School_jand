const { createHandler, sendJson } = require('../_lib/http');
const { readStore, upsertRecord } = require('../_lib/mobileStore');

const defaultAboutSoftware = {
    id: 'ABOUT-SOFTWARE',
    appName: 'Beacon Light School System Jand',
    schoolName: 'Beacon Light School System Jand',
    website: process.env.SCHOOL_WEBSITE || '',
    supportEmail: process.env.SMTP_FROM_EMAIL || '',
    supportPhone: '03174944258',
    schoolAddress: 'Jand',
    principalName: 'Mahmood ul Hassan',
    description: 'Student and teacher portal APIs for Beacon Light School System Jand.',
    version: '1.0.0'
};

module.exports = createHandler({
    GET: async ({ res }) => {
        const records = readStore('about_software');
        sendJson(res, 200, { success: true, aboutSoftware: records[0] || defaultAboutSoftware });
    },
    POST: async ({ res, body }) => {
        const { record } = upsertRecord('about_software', {
            ...defaultAboutSoftware,
            ...(body || {}),
            id: body?.id || defaultAboutSoftware.id
        }, 'ABOUT');
        sendJson(res, 200, { success: true, aboutSoftware: record });
    }
});
