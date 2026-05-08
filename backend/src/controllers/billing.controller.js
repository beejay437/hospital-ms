const { query } = require('../config/database');
const { generateInvoiceNumber } = require('../utils/generators');
const { success, created, notFound, badRequest, paginate } = require('../utils/response');

const getUserId = (req) => req.user?.id || null;

const listInvoices = async (req, res, next) => {
  try {
    const { status, patientId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    if (status) {
      params.push(status);
      where += ` AND i.status = $${params.length}`;
    }

    if (patientId) {
      params.push(patientId);
      where += ` AND i.patient_id = $${params.length}`;
    }

    const countRes = await query(`SELECT COUNT(*) FROM invoices i ${where}`, params);

    params.push(limit, offset);

    const dataRes = await query(
      `SELECT i.id, i.invoice_number, i.subtotal, i.discount, i.tax, i.total,
              i.amount_paid, i.balance, i.status, i.due_date, i.created_at,
              p.first_name || ' ' || p.last_name AS patient_name, p.patient_number
       FROM invoices i
       JOIN patients p ON i.patient_id = p.id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return paginate(res, dataRes.rows, parseInt(countRes.rows[0].count), page, limit);
  } catch (err) {
    next(err);
  }
};

const getInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoiceRes = await query(
      `SELECT i.*,
              p.first_name || ' ' || p.last_name AS patient_name,
              p.patient_number, p.phone, p.email, p.address,
              u.first_name || ' ' || u.last_name AS created_by_name
       FROM invoices i
       JOIN patients p ON i.patient_id = p.id
       LEFT JOIN users u ON i.created_by = u.id
       WHERE i.id = $1`,
      [id]
    );

    if (!invoiceRes.rows.length) return notFound(res, 'Invoice not found');

    const itemsRes = await query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at`,
      [id]
    );

    const paymentsRes = await query(
      `SELECT py.*, u.first_name || ' ' || u.last_name AS received_by_name
       FROM payments py
       LEFT JOIN users u ON py.received_by = u.id
       WHERE py.invoice_id = $1 ORDER BY py.payment_date`,
      [id]
    );

    return success(res, {
      ...invoiceRes.rows[0],
      items: itemsRes.rows,
      payments: paymentsRes.rows,
    });
  } catch (err) {
    next(err);
  }
};

const createInvoice = async (req, res, next) => {
  try {
    const {
      patientId,
      appointmentId,
      admissionId,
      items,
      discount = 0,
      tax = 0,
      dueDate,
      notes,
    } = req.body;

    if (!items || !items.length) {
      return badRequest(res, 'Invoice must have at least one item');
    }

    const patRes = await query(`SELECT id FROM patients WHERE id = $1`, [patientId]);
    if (!patRes.rows.length) return notFound(res, 'Patient not found');

    const invoiceNumber = await generateInvoiceNumber();

    const subtotal = items.reduce(
      (sum, item) => sum + parseFloat(item.unitPrice || 0) * parseFloat(item.quantity || 0),
      0
    );

    const total = subtotal - parseFloat(discount || 0) + parseFloat(tax || 0);
    const balance = total;

    const invRes = await query(
      `INSERT INTO invoices (
        invoice_number, patient_id, appointment_id, admission_id,
        subtotal, discount, tax, total, balance, due_date, notes, created_by, status
      )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'unpaid')
       RETURNING *`,
      [
        invoiceNumber,
        patientId,
        appointmentId || null,
        admissionId || null,
        subtotal,
        discount || 0,
        tax || 0,
        total,
        balance,
        dueDate || null,
        notes || null,
        getUserId(req),
      ]
    );

    const invoice = invRes.rows[0];

    for (const item of items) {
      const itemTotal = parseFloat(item.unitPrice || 0) * parseFloat(item.quantity || 0);

      await query(
        `INSERT INTO invoice_items (invoice_id, description, category, quantity, unit_price, total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          invoice.id,
          item.description,
          item.category || null,
          item.quantity || 1,
          item.unitPrice || 0,
          itemTotal,
        ]
      );
    }

    return created(res, invoice, 'Invoice created');
  } catch (err) {
    next(err);
  }
};

const addInvoiceItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, category, quantity = 1, unitPrice } = req.body;

    const invRes = await query(`SELECT * FROM invoices WHERE id = $1`, [id]);
    if (!invRes.rows.length) return notFound(res, 'Invoice not found');
    if (invRes.rows[0].status === 'cancelled') {
      return badRequest(res, 'Cannot modify a cancelled invoice');
    }

    const itemTotal = parseFloat(unitPrice || 0) * parseFloat(quantity || 0);

    await query(
      `INSERT INTO invoice_items (invoice_id, description, category, quantity, unit_price, total)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, description, category || null, quantity || 1, unitPrice || 0, itemTotal]
    );

    const totRes = await query(
      `SELECT SUM(total) AS subtotal FROM invoice_items WHERE invoice_id = $1`,
      [id]
    );

    const subtotal = parseFloat(totRes.rows[0].subtotal || 0);
    const inv = invRes.rows[0];
    const newTotal = subtotal - parseFloat(inv.discount || 0) + parseFloat(inv.tax || 0);
    const newBalance = newTotal - parseFloat(inv.amount_paid || 0);

    await query(
      `UPDATE invoices SET subtotal=$1, total=$2, balance=$3, updated_at=NOW() WHERE id=$4`,
      [subtotal, newTotal, newBalance, id]
    );

    return success(res, null, 'Item added');
  } catch (err) {
    next(err);
  }
};

const recordPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod = 'cash', referenceNumber, notes } = req.body;

    const invRes = await query(`SELECT * FROM invoices WHERE id = $1`, [id]);
    if (!invRes.rows.length) return notFound(res, 'Invoice not found');

    const inv = invRes.rows[0];

    if (inv.status === 'cancelled') return badRequest(res, 'Cannot record payment for a cancelled invoice');
    if (inv.status === 'paid') return badRequest(res, 'Invoice is already fully paid');

    const paymentAmount = parseFloat(amount || 0);

    if (paymentAmount <= 0) return badRequest(res, 'Payment amount must be positive');

    if (paymentAmount > parseFloat(inv.balance || 0)) {
      return badRequest(res, `Payment exceeds outstanding balance of ${inv.balance}`);
    }

    await query(
      `INSERT INTO payments (invoice_id, patient_id, amount, payment_method, reference_number, notes, received_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        id,
        inv.patient_id,
        paymentAmount,
        paymentMethod,
        referenceNumber || null,
        notes || null,
        getUserId(req),
      ]
    );

    const newAmountPaid = parseFloat(inv.amount_paid || 0) + paymentAmount;
    const newBalance = parseFloat(inv.total || 0) - newAmountPaid;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    const updatedInv = await query(
      `UPDATE invoices SET amount_paid=$1, balance=$2, status=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [newAmountPaid, newBalance, newStatus, id]
    );

    return success(res, updatedInv.rows[0], 'Payment recorded');
  } catch (err) {
    next(err);
  }
};

const cancelInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const inv = await query(`SELECT status FROM invoices WHERE id = $1`, [id]);
    if (!inv.rows.length) return notFound(res, 'Invoice not found');
    if (inv.rows[0].status === 'paid') return badRequest(res, 'Cannot cancel a paid invoice');

    const result = await query(
      `UPDATE invoices SET status='cancelled', updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [id]
    );

    return success(res, result.rows[0], 'Invoice cancelled');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listInvoices,
  getInvoice,
  createInvoice,
  addInvoiceItem,
  recordPayment,
  cancelInvoice,
};
