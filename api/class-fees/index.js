const { createHandler, sendJson } = require('../_lib/http');
const { getDb } = require('../_lib/db');
const { normalizeClassFee, requireAdmin, syncClassFeeToStudents } = require('../_lib/classFees');

module.exports = createHandler({
    GET: async ({ res, db }) => {
        const classFees = await db.models.ClassFee.findAll({ order: [['className', 'ASC']] });
        const classFeeHistory = await db.models.ClassFeeHistory.findAll({ order: [['updatedAt', 'DESC']] });
        sendJson(res, 200, { success: true, classFees, classFeeHistory });
    },
    POST: async ({ req, res, db, body }) => {
        requireAdmin(req);
        const incoming = Array.isArray(body) ? body : [body];
        if (!incoming.length) {
            const error = new Error('Class and fee details are required.');
            error.statusCode = 400;
            throw error;
        }

        await db.transaction(async (transaction) => {
            for (const item of incoming) {
                const record = normalizeClassFee(item);
                const previous = await db.models.ClassFee.findByPk(record.id, { transaction });
                await db.models.ClassFee.upsert(record, { transaction });
                await db.models.ClassFeeHistory.create({
                    ...record,
                    id: `CLASS-FEE-HISTORY-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
                }, { transaction });
                await syncClassFeeToStudents(db, record, previous?.monthlyFee || 0, transaction);
            }
        });

        const classFees = await db.models.ClassFee.findAll({ order: [['className', 'ASC']] });
        const classFeeHistory = await db.models.ClassFeeHistory.findAll({ order: [['updatedAt', 'DESC']] });
        sendJson(res, 200, { success: true, classFees, classFeeHistory });
    }
}, { getDb });
