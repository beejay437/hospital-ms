'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { formatDate, formatCurrency, getErrorMessage } from '@/lib/utils';
import { Modal, PageLoader, EmptyState, Pagination, Badge, Table } from '@/components/ui';
import { Plus, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface InvoiceItem { description: string; category: string; quantity: number; unitPrice: number; }

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [form, setForm] = useState({ patientId: '', dueDate: '', notes: '', discount: 0, tax: 0 });
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', category: '', quantity: 1, unitPrice: 0 }]);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: 'cash', referenceNumber: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/billing', { params: { status: statusFilter || undefined, page, limit: 20 } });
      setInvoices(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, [statusFilter, page]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!patientSearch) return;
    const t = setTimeout(() => {
      api.get('/patients', { params: { search: patientSearch, limit: 8 } }).then(r => setPatients(r.data.data));
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  const loadInvoice = async (id: string) => {
    try {
      const res = await api.get(`/billing/${id}`);
      setViewInvoice(res.data.data);
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const subtotal = items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
  const grandTotal = subtotal - Number(form.discount) + Number(form.tax);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/billing', { ...form, items });
      toast.success('Invoice created');
      setShowCreate(false);
      setItems([{ description: '', category: '', quantity: 1, unitPrice: 0 }]);
      setForm({ patientId: '', dueDate: '', notes: '', discount: 0, tax: 0 });
      fetch();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setSubmitting(false); }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/billing/${showPayment.id}/payments`, paymentForm);
      toast.success('Payment recorded');
      setShowPayment(null);
      if (viewInvoice?.id === showPayment.id) loadInvoice(showPayment.id);
      fetch();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setSubmitting(false); }
  };

  const updateItem = (i: number, field: keyof InvoiceItem, value: any) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {['', 'unpaid', 'partial', 'paid', 'cancelled'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`btn text-xs capitalize ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={fetch} className="btn-secondary"><RefreshCw size={16} /></button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? <PageLoader /> : invoices.length === 0 ? (
          <EmptyState message="No invoices found" action={
            <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> Create Invoice</button>
          } />
        ) : (
          <Table>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Invoice #</th>
                <th className="table-th">Patient</th>
                <th className="table-th hidden md:table-cell">Date</th>
                <th className="table-th">Total</th>
                <th className="table-th hidden sm:table-cell">Paid</th>
                <th className="table-th">Balance</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="table-row">
                  <td className="table-td font-mono text-xs text-blue-600">{inv.invoice_number}</td>
                  <td className="table-td">
                    <p className="font-medium">{inv.patient_name}</p>
                    <p className="text-xs text-gray-400">{inv.patient_number}</p>
                  </td>
                  <td className="table-td hidden md:table-cell text-xs text-gray-400">{formatDate(inv.created_at)}</td>
                  <td className="table-td font-semibold">{formatCurrency(inv.total)}</td>
                  <td className="table-td hidden sm:table-cell text-green-600">{formatCurrency(inv.amount_paid)}</td>
                  <td className="table-td font-medium text-red-600">{formatCurrency(inv.balance)}</td>
                  <td className="table-td"><Badge status={inv.status} /></td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      <button onClick={() => loadInvoice(inv.id)} className="text-xs text-blue-600 hover:underline">View</button>
                      {['unpaid','partial'].includes(inv.status) && (
                        <button onClick={() => { setShowPayment(inv); setPaymentForm({ amount: inv.balance, paymentMethod: 'cash', referenceNumber: '', notes: '' }); }}
                          className="text-xs text-green-600 hover:underline">Pay</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {/* View Invoice Modal */}
      {viewInvoice && (
        <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`Invoice ${viewInvoice.invoice_number}`} size="lg">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-900">{viewInvoice.patient_name}</p>
                <p className="text-xs text-gray-400">{viewInvoice.patient_number}</p>
                {viewInvoice.due_date && <p className="text-xs text-gray-400">Due: {formatDate(viewInvoice.due_date)}</p>}
              </div>
              <Badge status={viewInvoice.status} />
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="py-2 text-left text-xs text-gray-500">Item</th><th className="py-2 text-right text-xs text-gray-500">Qty</th><th className="py-2 text-right text-xs text-gray-500">Price</th><th className="py-2 text-right text-xs text-gray-500">Total</th></tr></thead>
              <tbody>
                {viewInvoice.items?.map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="py-2">{item.description}<span className="text-xs text-gray-400 ml-1">({item.category})</span></td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3} className="py-1 text-right text-gray-500 text-xs">Subtotal</td><td className="py-1 text-right">{formatCurrency(viewInvoice.subtotal)}</td></tr>
                {Number(viewInvoice.discount) > 0 && <tr><td colSpan={3} className="py-1 text-right text-gray-500 text-xs">Discount</td><td className="py-1 text-right text-red-500">-{formatCurrency(viewInvoice.discount)}</td></tr>}
                {Number(viewInvoice.tax) > 0 && <tr><td colSpan={3} className="py-1 text-right text-gray-500 text-xs">Tax</td><td className="py-1 text-right">{formatCurrency(viewInvoice.tax)}</td></tr>}
                <tr className="font-bold border-t"><td colSpan={3} className="py-2 text-right">Total</td><td className="py-2 text-right">{formatCurrency(viewInvoice.total)}</td></tr>
                <tr className="text-green-600"><td colSpan={3} className="py-1 text-right text-xs">Paid</td><td className="py-1 text-right">{formatCurrency(viewInvoice.amount_paid)}</td></tr>
                <tr className="text-red-600 font-bold"><td colSpan={3} className="py-1 text-right text-xs">Balance</td><td className="py-1 text-right">{formatCurrency(viewInvoice.balance)}</td></tr>
              </tfoot>
            </table>
            {viewInvoice.payments?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Payment History</p>
                {viewInvoice.payments.map((p: any) => (
                  <div key={p.id} className="flex justify-between text-xs text-gray-600 py-1 border-b border-gray-50">
                    <span>{formatDate(p.payment_date)} · {p.payment_method}</span>
                    <span className="font-medium text-green-600">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            {['unpaid','partial'].includes(viewInvoice.status) && (
              <button onClick={() => { setShowPayment(viewInvoice); setPaymentForm({ amount: viewInvoice.balance, paymentMethod: 'cash', referenceNumber: '', notes: '' }); }}
                className="btn-primary w-full">Record Payment</button>
            )}
          </div>
        </Modal>
      )}

      {/* Create Invoice Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Invoice" size="xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Patient *</label>
            <input className="input mb-1" placeholder="Search patient..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
            {patients.length > 0 && !form.patientId && (
              <div className="border rounded-lg max-h-36 overflow-y-auto">
                {patients.map(p => (
                  <button key={p.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-0"
                    onClick={() => { setForm(f => ({ ...f, patientId: p.id })); setPatientSearch(`${p.first_name} ${p.last_name}`); setPatients([]); }}>
                    {p.first_name} {p.last_name} — <span className="text-blue-600 font-mono text-xs">{p.patient_number}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="label mb-0">Line Items *</label>
              <button type="button" onClick={() => setItems(i => [...i, { description: '', category: '', quantity: 1, unitPrice: 0 }])}
                className="text-xs text-blue-600 hover:underline">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input className="input col-span-5" placeholder="Description" required value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                  <input className="input col-span-2" placeholder="Category" value={item.category} onChange={e => updateItem(i, 'category', e.target.value)} />
                  <input type="number" className="input col-span-2" placeholder="Qty" min={1} value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} />
                  <input type="number" className="input col-span-2" placeholder="Price" min={0} value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} />
                  <button type="button" onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 col-span-1">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 text-right text-sm">
              <span className="text-gray-500 mr-4">Subtotal: <strong>{formatCurrency(subtotal)}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Discount</label>
              <input type="number" className="input" min={0} value={form.discount} onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Tax</label>
              <input type="number" className="input" min={0} value={form.tax} onChange={e => setForm(f => ({ ...f, tax: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Grand Total</label>
              <p className="font-bold text-lg text-gray-900 mt-2">{formatCurrency(grandTotal)}</p>
            </div>
          </div>

          <div>
            <label className="label">Due Date</label>
            <input type="date" className="input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Creating...' : `Create Invoice (${formatCurrency(grandTotal)})`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      {showPayment && (
        <Modal open={!!showPayment} onClose={() => setShowPayment(null)} title="Record Payment">
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="font-semibold">{showPayment.invoice_number}</p>
            <p className="text-sm text-gray-600">Balance: <strong className="text-red-600">{formatCurrency(showPayment.balance)}</strong></p>
          </div>
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className="label">Amount *</label>
              <input type="number" className="input" required min={0.01} step={0.01} value={paymentForm.amount}
                onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select className="input" value={paymentForm.paymentMethod} onChange={e => setPaymentForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                {['cash','card','bank_transfer','insurance','mobile_money'].map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Reference Number</label>
              <input className="input" placeholder="Transaction ref / receipt number" value={paymentForm.referenceNumber}
                onChange={e => setPaymentForm(f => ({ ...f, referenceNumber: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowPayment(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                {submitting ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
