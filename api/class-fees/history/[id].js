const { createHandler, sendJson } = require('../../_lib/http');
const { getDb } = require('../../_lib/db');
const { normalizeClassFee, requireAdmin, syncClassFeeToStudents } = require('../../_lib/classFees');

module.exports = createHandler({
    PUT: async ({ req, res, db, body }) => {
        requireAdmin(req);
        const id = String(req.query?.id || '').trim();
        const historyRecord = await db.models.ClassFeeHistory.findByPk(id);
        if (!historyRecord) {
            const error = new Error('Fee history record not found.');
            error.statusCode = 404;
            throw error;
        }

        const record = normalizeClassFee({ ...historyRecord.toJSON(), ...(body || {}) });
        await db.transaction(async (transaction) => {
            const previous = await db.models.ClassFee.findByPk(record.id, { transaction });
            await historyRecord.update({ ...record, id }, { transaction });
            await db.models.ClassFee.upsert(record, { transaction });
            await syncClassFeeToStudents(db, record, previous?.monthlyFee || 0, transaction);
        });

        const classFees = await db.models.ClassFee.findAll({ order: [['className', 'ASC']] });
        const classFeeHistory = await db.models.ClassFeeHistory.findAll({ order: [['updatedAt', 'DESC']] });
        sendJson(res, 200, { success: true, classFees, classFeeHistory });
    },
    DELETE: async ({ req, res, db }) => {
        requireAdmin(req);
        const id = String(req.query?.id || '').trim();
        const deleted = await db.models.ClassFeeHistory.destroy({ where: { id } });
        if (!deleted) {
            const error = new Error('Fee history record not found.');
            error.statusCode = 404;
            throw error;
        }

        const classFees = await db.models.ClassFee.findAll({ order: [['className', 'ASC']] });
        const classFeeHistory = await db.models.ClassFeeHistory.findAll({ order: [['updatedAt', 'DESC']] });
        sendJson(res, 200, { success: true, classFees, classFeeHistory });
    }
}, { getDb });
