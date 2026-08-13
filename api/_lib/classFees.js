const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'eduCore_secret_key_2026';

function requireAdmin(req) {
    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
        const error = new Error('Admin access required.');
        error.statusCode = 401;
        throw error;
    }

    try {
        const user = jwt.verify(token, JWT_SECRET);
        if (String(user.role || '').toLowerCase() !== 'admin') {
            const error = new Error('Admin access required.');
            error.statusCode = 403;
            throw error;
        }
        return user;
    } catch (error) {
        if (error.statusCode) throw error;
        const authError = new Error('Admin access required.');
        authError.statusCode = 401;
        throw authError;
    }
}

function normalizeClassFee(record = {}, preserveId = false) {
    const className = String(record.className || record.name || '').trim();
    const sessionFrom = String(record.sessionFrom || '').trim();
    const sessionTo = String(record.sessionTo || '').trim();
    if (!className) {
        const error = new Error('Class is required.');
        error.statusCode = 400;
        throw error;
    }
    if (!/^\d{4}-\d{2}$/.test(sessionFrom) || !/^\d{4}-\d{2}$/.test(sessionTo) || sessionFrom > sessionTo) {
        const error = new Error('A valid session From and To is required.');
        error.statusCode = 400;
        throw error;
    }

    const classKey = className.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
    return {
        id: preserveId && record.id ? String(record.id) : `CLASS-FEE-${classKey.replace(/[^a-z0-9]+/g, '-')}`,
        className,
        monthlyFee: Number(record.monthlyFee || record.amount || 0) || 0,
        annualCharges: Number(record.annualCharges || record.annualFee || 0) || 0,
        feeFrequency: 'Monthly',
        feeMonth: '',
        feeYear: '',
        sessionFrom,
        sessionTo,
        updatedAtLabel: new Date().toLocaleString('en-GB')
    };
}

async function syncClassFeeToStudents(db, record, previousMonthlyFee = 0, transaction) {
    const targetClass = String(record.className || '').trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
    const students = await db.models.Student.findAll({ transaction });
    for (const student of students) {
        const studentClass = String(student.classGrade || '').trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
        if (studentClass !== targetClass) continue;
        const studentFee = Number(student.monthlyFee || 0) || 0;
        const isCustom = student.monthlyFeeCustom === true;
        const isFree = student.freeStudy === true || Boolean(String(student.zeroFeeReason || '').trim());
        const followsClassDefault = studentFee <= 0 || (Number(previousMonthlyFee || 0) > 0 && studentFee === Number(previousMonthlyFee));
        if (isCustom || isFree || !followsClassDefault) continue;
        await student.update({ monthlyFee: String(record.monthlyFee || 0), feeFrequency: 'Monthly' }, { transaction });
    }
}

module.exports = { normalizeClassFee, requireAdmin, syncClassFeeToStudents };
