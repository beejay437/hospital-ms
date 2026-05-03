'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { formatDateTime, formatCurrency, getErrorMessage } from '@/lib/utils';
import { Modal, PageLoader, EmptyState, Pagination, Badge, Table } from '@/components/ui';
import { Plus, Search, RefreshCw, AlertTriangle, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function PharmacyPage() {
  const { isRole } = useAuth();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showTxn, setShowTxn] = useState<any>(null);
  const [form, setForm] = useState({ name: '', genericName: '', category: '', unit: 'tablet', unitPrice: 0, reorderLevel: 10, currentStock: 0, description: '' });
  const [txnForm, setTxnForm] = useState({ transactionType: 'stock_in', quantity: 1, reference: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/pharmacy', {
        params: { search: debouncedSearch, lowStock: lowStockOnly ? 'true' : undefined, page, limit: 20 },
      });
      setMedicines(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, [debouncedSearch, lowStockOnly, page]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/pharmacy', form);
      toast.success('Medicine added');
      setShowCreate(false);
      setForm({ name: '', genericName: '', category: '', unit: 'tablet', unitPrice: 0, reorderLevel: 10, currentStock: 0, description: '' });
      fetch();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setSubmitting(false); }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/pharmacy/transactions', { medicineId: showTxn.id, ...txnForm });
      toast.success('Stock updated');
      setShowTxn(null);
      fetch();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setSubmitting(false); }
  };

  const canManage = isRole('admin', 'pharmacist');

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search medicines..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <button
          onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }}
          className={`btn items-center gap-2 ${lowStockOnly ? 'btn-danger' : 'btn-secondary'}`}
        >
          <AlertTriangle size={14} />
          {lowStockOnly ? 'All Medicines' : 'Low Stock Only'}
        </button>
        <button onClick={fetch} className="btn-secondary"><RefreshCw size={16} /></button>
        {canManage && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> Add Medicine
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card">
        {loading ? <PageLoader /> : medicines.length === 0 ? (
          <EmptyState message="No medicines found" />
        ) : (
          <>
            <Table>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-th">Medicine</th>
                  <th className="table-th hidden md:table-cell">Generic Name</th>
                  <th className="table-th hidden lg:table-cell">Category</th>
                  <th className="table-th">Stock</th>
                  <th className="table-th hidden sm:table-cell">Reorder Lvl</th>
                  <th className="table-th hidden md:table-cell">Unit Price</th>
                  <th className="table-th">Status</th>
                  {canManage && <th className="table-th">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {medicines.map((m: any) => (
                  <tr key={m.id} className="table-row">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.is_low_stock ? 'bg-red-500' : 'bg-green-500'}`} />
                        <div>
                          <p className="font-medium">{m.name}</p>
                          <p className="text-xs text-gray-400">{m.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td hidden md:table-cell text-gray-500">{m.generic_name || '—'}</td>
                    <td className="table-td hidden lg:table-cell">
                      {m.category && <span className="badge bg-gray-100 text-gray-700">{m.category}</span>}
                    </td>
                    <td className="table-td">
                      <span className={`font-bold text-base ${m.is_low_stock ? 'text-red-600' : 'text-gray-900'}`}>
                        {m.current_stock}
                      </span>
                      {m.is_low_stock && <p className="text-xs text-red-400">Low!</p>}
                    </td>
                    <td className="table-td hidden sm:table-cell text-gray-400">{m.reorder_level}</td>
                    <td className="table-td hidden md:table-cell">{formatCurrency(m.unit_price)}</td>
                    <td className="table-td">
                      <Badge status={m.is_active ? 'active' : 'cancelled'} label={m.is_active ? 'Active' : 'Inactive'} />
                    </td>
                    {canManage && (
                      <td className="table-td">
                        <button
                          onClick={() => { setShowTxn(m); setTxnForm({ transactionType: 'stock_in', quantity: 1, reference: '', notes: '' }); }}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          Stock In/Out
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="px-4 pb-4">
              <Pagination page={page} totalPages={Math.ceil(total / 20)} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {/* Create Medicine Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Medicine" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Medicine Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Generic Name</label>
              <input className="input" value={form.genericName} onChange={e => setForm(f => ({ ...f, genericName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input" placeholder="e.g. Antibiotic" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                {['tablet','capsule','syrup','injection','cream','drops','bag','sachet','inhaler'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Unit Price (₦)</label>
              <input type="number" className="input" min={0} step={0.01} value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Opening Stock</label>
              <input type="number" className="input" min={0} value={form.currentStock} onChange={e => setForm(f => ({ ...f, currentStock: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Reorder Level</label>
              <input type="number" className="input" min={0} value={form.reorderLevel} onChange={e => setForm(f => ({ ...f, reorderLevel: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Medicine'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Transaction Modal */}
      {showTxn && (
        <Modal open={!!showTxn} onClose={() => setShowTxn(null)} title="Stock Transaction">
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="font-semibold text-blue-900">{showTxn.name}</p>
            <p className="text-sm text-blue-600">Current Stock: <strong>{showTxn.current_stock} {showTxn.unit}s</strong></p>
          </div>
          <form onSubmit={handleTransaction} className="space-y-4">
            <div>
              <label className="label">Transaction Type</label>
              <select className="input" value={txnForm.transactionType} onChange={e => setTxnForm(f => ({ ...f, transactionType: e.target.value }))}>
                <option value="stock_in">Stock In (Receive)</option>
                <option value="stock_out">Stock Out (Issue)</option>
                <option value="adjustment">Adjustment (Set absolute)</option>
                <option value="dispensed">Dispensed to Patient</option>
              </select>
            </div>
            <div>
              <label className="label">
                {txnForm.transactionType === 'adjustment' ? 'New Stock Level' : 'Quantity'} *
              </label>
              <input type="number" className="input" required min={1} value={txnForm.quantity}
                onChange={e => setTxnForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Reference</label>
              <input className="input" placeholder="Invoice / PO number" value={txnForm.reference}
                onChange={e => setTxnForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={txnForm.notes} onChange={e => setTxnForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowTxn(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                {submitting ? 'Saving...' : 'Update Stock'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
