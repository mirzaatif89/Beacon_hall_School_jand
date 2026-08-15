const { createHandler, sendJson } = require('../_lib/http');
const { getDb } = require('../_lib/db');

const SPECIAL_NOTICE_PORTALS = ['student', 'teacher', 'staff'];
const SPECIAL_NOTICE_AUDIENCES = new Set(['portal', 'school', 'class']);

function normalizeNoticeTargets(targetPortals) {
    const allowedTargets = new Set(SPECIAL_NOTICE_PORTALS);
    const targets = Array.isArray(targetPortals) ? targetPortals : [];
    return [...new Set(targets.map((target) => String(target || '').toLowerCase()).filter((target) => allowedTargets.has(target)))];
}

function normalizeNoticeClassGrade(classGrade) {
    return String(classGrade || '').trim();
}

function normalizeNoticeAudienceType(audienceType, targetPortals = [], targetClassGrade = '') {
    const value = String(audienceType || '').trim().toLowerCase();
    if (SPECIAL_NOTICE_AUDIENCES.has(value)) return value;
    if (normalizeNoticeClassGrade(targetClassGrade)) return 'class';
    const targets = normalizeNoticeTargets(targetPortals);
    if (targets.length === SPECIAL_NOTICE_PORTALS.length && SPECIAL_NOTICE_PORTALS.every((target) => targets.includes(target))) {
        return 'school';
    }
    return 'portal';
}

function formatSpecialNotice(record) {
    const raw = record && typeof record.toJSON === 'function' ? record.toJSON() : record;
    let targetPortals = [];
    if (Array.isArray(raw.targetPortals)) {
        targetPortals = raw.targetPortals;
    } else {
        try {
            targetPortals = JSON.parse(raw.targetPortals || '[]');
        } catch (error) {
            targetPortals = [];
        }
    }
    const targetClassGrade = normalizeNoticeClassGrade(raw.targetClassGrade || raw.classGrade || '');
    return {
        ...raw,
        audienceType: normalizeNoticeAudienceType(raw.audienceType, targetPortals, targetClassGrade),
        targetPortals: normalizeNoticeTargets(targetPortals),
        targetClassGrade: targetClassGrade || null
    };
}

module.exports = createHandler({
    DELETE: async ({ req, res, db }) => {
        const id = req.query?.id || req.url.split('/').pop();
        const deletedCount = await db.models.SpecialNotice.destroy({ where: { id } });
        const records = await db.models.SpecialNotice.findAll({
            order: [['updatedAt', 'DESC']]
        });

        sendJson(res, 200, {
            success: true,
            deleted: deletedCount > 0,
            notices: records.map(formatSpecialNotice)
        });
    }
}, { getDb });
