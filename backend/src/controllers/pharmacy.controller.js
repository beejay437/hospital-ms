const { query, getClient } = require('../config/database');
const { success, created, notFound, badRequest, paginate } = require('../utils/response');

const getUserId = (req) => req.user?.id || null;

const listMedicines = async (req, res, next) => {
  try {
    const { search = '', lowStock, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE is_active = true';

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (name ILIKE $${params.length} OR generic_name ILIKE $${params.length} OR category ILIKE $${params.length})`;
    }

    if (lowStock === 'true') {
      where += ` AND current_stock <= reorder_level`;
    }

    const countRes = await query(`SELECT COUNT(*) FROM medicines ${where}`, params);

    params.push(limit, offset);

    const dataRes = await query(
      `SELECT *, (current_stock <= reorder_level) AS is_low_stock
       FROM medicines ${where}
       ORDER BY name
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return paginate(res, dataRes.rows, parseInt(countRes.rows[0].count), page, limit);
  } catch (err) {
    next(err);
  }
};

const getMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT *, (current_stock <= reorder_level) AS is_low_stock
       FROM medicines
       WHERE id = $1`,
      [id]
    );

    if (!result.rows.length) return notFound(res, 'Medicine not found');

    const txns = await query(
      `SELECT it.*, u.first_name || ' ' || u.last_name AS performed_by_name
       FROM inventory_transactions it
       LEFT JOIN users u ON it.performed_by = u.id
       WHERE it.medicine_id = $1
       ORDER BY it.transaction_date DESC
       LIMIT 20`,
      [id]
    );

    return success(res, { ...result.rows[0], recentTransactions: txns.rows });
  } catch (err) {
    next(err);
  }
};

const createMedicine = async (req, res, next) => {
  try {
    const {
      name,
      genericName,
      category,
      unit,
      unitPrice,
      reorderLevel,
      currentStock,
      description,
    } = req.body;

    const result = await query(
      `INSERT INTO medicines (
        name, generic_name, category, unit, unit_price,
        reorder_level, current_stock, description
      )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        name,
        genericName || null,
        category || null,
        unit || 'tablet',
        unitPrice || 0,
        reorderLevel || 10,
        currentStock || 0,
        description || null,
      ]
    );

    if (parseInt(currentStock || 0) > 0) {
      await query(
        `INSERT INTO inventory_transactions (
          medicine_id, transaction_type, quantity, unit_price,
          reference, notes, performed_by
        )
         VALUES ($1,'stock_in',$2,$3,'Initial stock','Opening stock entry',$4)`,
        [result.rows[0].id, currentStock, unitPrice || 0, getUserId(req)]
      );
    }

    return created(res, result.rows[0], 'Medicine created');
  } catch (err) {
    next(err);
  }
};

const updateMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;

    const {
      name,
      genericName,
      category,
      unit,
      unitPrice,
      reorderLevel,
      description,
      isActive,
    } = req.body;

    const existing = await query(`SELECT id FROM medicines WHERE id = $1`, [id]);
    if (!existing.rows.length) return notFound(res, 'Medicine not found');

    const result = await query(
      `UPDATE medicines SET
        name = COALESCE($1, name),
        generic_name = COALESCE($2, generic_name),
        category = COALESCE($3, category),
        unit = COALESCE($4, unit),
        unit_price = COALESCE($5, unit_price),
        reorder_level = COALESCE($6, reorder_level),
        description = COALESCE($7, description),
        is_active = COALESCE($8, is_active),
        updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        name,
        genericName,
        category,
        unit,
        unitPrice,
        reorderLevel,
        description,
        isActive !== undefined ? isActive : null,
        id,
      ]
    );

    return success(res, result.rows[0], 'Medicine updated');
  } catch (err) {
    next(err);
  }
};

const stockTransaction = async (req, res, next) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const {
      medicineId,
      transactionType,
      quantity,
      unitPrice,
      reference,
      notes,
    } = req.body;

    const medRes = await client.query(`SELECT * FROM medicines WHERE id = $1`, [medicineId]);
    if (!medRes.rows.length) return notFound(res, 'Medicine not found');

    const medicine = medRes.rows[0];
    const qty = parseInt(quantity);

    if (qty <= 0) return badRequest(res, 'Quantity must be positive');

    let newStock = parseInt(medicine.current_stock);

    if (transactionType === 'stock_in') {
      newStock += qty;
    } else if (['stock_out', 'dispensed'].includes(transactionType)) {
      if (medicine.current_stock < qty) {
        return badRequest(res, `Insufficient stock. Available: ${medicine.current_stock}`);
      }
      newStock -= qty;
    } else if (transactionType === 'adjustment') {
      newStock = qty;
    }

    await client.query(
      `INSERT INTO inventory_transactions (
        medicine_id, transaction_type, quantity, unit_price,
        reference, notes, performed_by
      )
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        medicineId,
        transactionType,
        qty,
        unitPrice || medicine.unit_price,
        reference || null,
        notes || null,
        getUserId(req),
      ]
    );

    await client.query(
      `UPDATE medicines SET current_stock = $1, updated_at = NOW()
       WHERE id = $2`,
      [newStock, medicineId]
    );

    await client.query('COMMIT');

    return success(
      res,
      { medicineId, newStock, transactionType, quantity: qty },
      'Stock updated'
    );
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

const getLowStockAlerts = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, generic_name, category, current_stock, reorder_level, unit,
              (reorder_level - current_stock) AS shortage
       FROM medicines
       WHERE current_stock <= reorder_level AND is_active = true
       ORDER BY shortage DESC`
    );

    return success(res, result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listMedicines,
  getMedicine,
  createMedicine,
  updateMedicine,
  stockTransaction,
  getLowStockAlerts,
};
