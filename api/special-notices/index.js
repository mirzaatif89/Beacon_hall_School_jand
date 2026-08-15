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

function shouldDeliverSpecialNotice(notice, portal, classGrade = '') {
    const audienceType = normalizeNoticeAudienceType(notice.audienceType, notice.targetPortals, notice.targetClassGrade);
    const normalizedPortal = String(portal || '').toLowerCase();
    if (!normalizedPortal) return true;
    if (audienceType === 'school') return SPECIAL_NOTICE_PORTALS.includes(normalizedPortal);
    if (audienceType === 'class') {
        if (normalizedPortal !== 'student') return false;
        return normalizeNoticeClassGrade(notice.targetClassGrade).toLowerCase() === normalizeNoticeClassGrade(classGrade).toLowerCase();
    }
    return normalizeNoticeTargets(notice.targetPortals).includes(normalizedPortal);
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
    GET: async ({ req, res, db }) => {
        const portal = String(req.query?.portal || '').toLowerCase();
        const classGrade = String(req.query?.classGrade || req.query?.class || '').trim();
        const records = await db.models.SpecialNotice.findAll({
            where: portal ? { status: 'executed' } : {},
            order: [['updatedAt', 'DESC']]
        });
        const notices = records.map(formatSpecialNotice)
            .filter((notice) => !portal || shouldDeliverSpecialNotice(notice, portal, classGrade));

        sendJson(res, 200, { success: true, notices });
    },
    POST: async ({ res, db, body }) => {
        const title = String(body?.title || '').trim();
        const message = String(body?.message || '').trim();
        const targetPortals = normalizeNoticeTargets(body?.targetPortals);
        const targetClassGrade = normalizeNoticeClassGrade(body?.targetClassGrade || body?.classGrade || '');
        const audienceType = normalizeNoticeAudienceType(body?.audienceType, targetPortals, targetClassGrade);
        const status = body?.status === 'executed' ? 'executed' : 'draft';

        if (!title || !message) {
            const error = new Error('Notice title and message are required.');
            error.statusCode = 400;
            throw error;
        }

        if (audienceType === 'portal' && !targetPortals.length) {
            const error = new Error('Select at least one portal before saving this notice.');
            error.statusCode = 400;
            throw error;
        }

        if (audienceType === 'class' && !targetClassGrade) {
            const error = new Error('Select a class before saving this notice.');
            error.statusCode = 400;
            throw error;
        }

        if (status === 'executed' && audienceType === 'portal' && !targetPortals.length) {
            const error = new Error('Select at least one portal before executing.');
            error.statusCode = 400;
            throw error;
        }

        const storedTargets = audienceType === 'school'
            ? SPECIAL_NOTICE_PORTALS
            : audienceType === 'class'
                ? ['student']
                : targetPortals;

        const notice = {
            id: body?.id || `NOTICE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title,
            message,
            audienceType,
            targetPortals: JSON.stringify(storedTargets),
            targetClassGrade: audienceType === 'class' ? targetClassGrade : null,
            status,
            executedAt: status === 'executed' ? (body?.executedAt || new Date()) : null,
            createdAtLabel: body?.createdAtLabel || new Date().toLocaleString('en-GB')
        };

        await db.models.SpecialNotice.upsert(notice);
        const records = await db.models.SpecialNotice.findAll({
            order: [['updatedAt', 'DESC']]
        });

        sendJson(res, 200, {
            success: true,
            notice: formatSpecialNotice(notice),
            notices: records.map(formatSpecialNotice)
        });
    }
}, { getDb });
