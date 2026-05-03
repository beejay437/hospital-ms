'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { formatDate, formatDateTime, getErrorMessage } from '@/lib/utils';
import { Modal, PageLoader, EmptyState, Pagination, Badge, Table } from '@/components/ui';
import { Plus, RefreshCw, BedDouble } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function AdmissionsPage() {
  const { isRole } = useAuth();
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [showAdmit, setShowAdmit] = useState(false);
  const [showDischarge, setShowDischarge] = useState<any>(null);
  const [wards, setWards] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [form, setForm] = useState({ patientId: '', bedId: '', admittingDoctorId: '', reason: '', expectedDischargeDate: '' });
  const [dischargeSummary, setDischargeSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admissions', { params: { status: statusFilter, page, limit: 20 } });
      setAdmissions(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, [statusFilter, page]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    api.get('/admissions/wards').then(r => setWards(r.data.data));
    api.get('/staff/doctors').then(r => setDoctors(r.data.data));
  }, []);

  useEffect(() => {
    if (!form.bedId) { setBeds([]); return; }
  }, []);

  const loadBeds = async (wardId: string) => {
    const res = await api.get('/admissions/beds', { params: { wardId, status: 'available' } });
    setBeds(res.data.data);
  };

  useEffect(() => {
    if (!patientSearch) return;
    const t = setTimeout(() => {
      api.get('/patients', { params: { search: patientSearch, limit: 8 } }).then(r => setPatients(r.data.data));
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admissions', form);
      toast.success('Patient admitted');
      setShowAdmit(false);
      setForm({ patientId: '', bedId: '', admittingDoctorId: '', reason: '', expectedDischargeDate: '' });
      fetch();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setSubmitting(false); }
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/admissions/${showDischarge.id}/discharge`, { dischargeSummary });
      toast.success('Patient discharged');
      setShowDischarge(null);
      fetch();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setSubmitting(false); }
  };

  const canManage = isRole('admin', 'receptionist', 'nurse', 'doctor');

  return (
    <div className="space-y-5">
      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-2">
          {['active', 'discharged'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`btn capitalize ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={fetch} className="btn-secondary"><RefreshCw size={16} /></button>
          {canManage && (
            <button onClick={() => setShowAdmit(true)} className="btn-primary">
              <Plus size={16} /> Admit Patient
            </button>
          )}
        </div>
      </div>

      {/* Wards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {wards.map((w: any) => (
          <div key={w.id} className="card p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">{w.name}</p>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-gray-900">{w.available_beds}</span>
              <span className="text-xs text-gray-400 mb-0.5">/ {w.total_beds} free</span>
            </div>
            <div className="flex gap-2 mt-1 text-xs">
              <span className="text-green-600">{w.available_beds} avail</span>
              <span className="text-red-500">{w.occupied_beds} occ</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        {loading ? <PageLoader /> : admissions.length === 0 ? (
          <EmptyState message={`No ${statusFilter} admissions`} />
        ) : (
          <Table>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Patient</th>
                <th className="table-th hidden md:table-cell">Ward / Bed</th>
                <th className="table-th hidden lg:table-cell">Doctor</th>
                <th className="table-th">Admitted</th>
                <th className="table-th">Status</th>
                {canManage && statusFilter === 'active' && <th className="table-th">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {admissions.map((a: any) => (
                <tr key={a.id} className="table-row">
                  <td className="table-td">
                    <p className="font-medium">{a.patient_name}</p>
                    <p className="text-xs text-blue-600 font-mono">{a.patient_number}</p>
                  </td>
                  <td className="table-td hidden md:table-cell">
                    <p>{a.ward_name}</p>
                    <p className="text-xs text-gray-400">Bed {a.bed_number} ({a.bed_type})</p>
                  </td>
                  <td className="table-td hidden lg:table-cell">{a.doctor_name || '—'}</td>
                  <td className="table-td text-xs">{formatDateTime(a.admission_date)}</td>
                  <td className="table-td"><Badge status={a.status} /></td>
                  {canManage && statusFilter === 'active' && (
                    <td className="table-td">
                      <button
                        onClick={() => { setShowDischarge(a); setDischargeSummary(''); }}
                        className="text-xs text-orange-600 hover:underline font-medium"
                      >
                        Discharge
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {/* Admit Modal */}
      <Modal open={showAdmit} onClose={() => setShowAdmit(false)} title="Admit Patient" size="md">
        <form onSubmit={handleAdmit} className="space-y-4">
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
            <label className="label">Ward *</label>
            <select className="input" required onChange={e => { loadBeds(e.target.value); setForm(f => ({ ...f, bedId: '' })); }}>
              <option value="">Select Ward</option>
              {wards.map((w: any) => (
                <option key={w.id} value={w.id}>{w.name} ({w.available_beds} beds available)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Bed *</label>
            <select className="input" required value={form.bedId} onChange={e => setForm(f => ({ ...f, bedId: e.target.value }))}>
              <option value="">Select Bed</option>
              {beds.map((b: any) => (
                <option key={b.id} value={b.id}>{b.bed_number} ({b.bed_type}) — {b.ward_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Admitting Doctor</label>
            <select className="input" value={form.admittingDoctorId} onChange={e => setForm(f => ({ ...f, admittingDoctorId: e.target.value }))}>
              <option value="">Select Doctor</option>
              {doctors.map(d => (
                <option key={d.doctor_id} value={d.doctor_id}>Dr. {d.first_name} {d.last_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Reason for Admission *</label>
            <textarea className="input" rows={2} required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </div>

          <div>
            <label className="label">Expected Discharge Date</label>
            <input type="date" className="input" value={form.expectedDischargeDate} onChange={e => setForm(f => ({ ...f, expectedDischargeDate: e.target.value }))} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAdmit(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Admitting...' : 'Admit Patient'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Discharge Modal */}
      {showDischarge && (
        <Modal open={!!showDischarge} onClose={() => setShowDischarge(null)} title="Discharge Patient">
          <div className="mb-4 p-3 bg-orange-50 rounded-lg">
            <p className="font-semibold text-orange-900">{showDischarge.patient_name}</p>
            <p className="text-sm text-orange-700">{showDischarge.ward_name} · Bed {showDischarge.bed_number}</p>
            <p className="text-xs text-orange-500 mt-1">Admitted: {formatDateTime(showDischarge.admission_date)}</p>
          </div>
          <form onSubmit={handleDischarge} className="space-y-4">
            <div>
              <label className="label">Discharge Summary</label>
              <textarea className="input" rows={4} placeholder="Enter discharge notes, follow-up instructions..."
                value={dischargeSummary} onChange={e => setDischargeSummary(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDischarge(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-danger flex-1" disabled={submitting}>
                {submitting ? 'Discharging...' : 'Confirm Discharge'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
