'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { formatDate, formatTime, getErrorMessage } from '@/lib/utils';
import { Modal, PageLoader, EmptyState, Pagination, Badge, Table, SectionHeader } from '@/components/ui';
import { Plus, Search, RefreshCw, Calendar, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_number: string;
  doctor_name: string;
  specialty: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason: string;
}

const statusOptions = ['scheduled','confirmed','completed','cancelled','no_show'];

export default function AppointmentsPage() {
  const { isRole } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [form, setForm] = useState({
    patientId: '', doctorId: '', appointmentDate: '', appointmentTime: '',
    durationMinutes: 30, reason: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments', {
        params: { date: dateFilter || undefined, status: statusFilter || undefined, page, limit: 25 },
      });
      setAppointments(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter, page]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    api.get('/staff/doctors').then(r => setDoctors(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!patientSearch) return;
    const t = setTimeout(() => {
      api.get('/patients', { params: { search: patientSearch, limit: 10 } })
        .then(r => setPatients(r.data.data)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  const openCreate = () => {
    setEditAppt(null);
    setForm({ patientId: '', doctorId: '', appointmentDate: new Date().toISOString().split('T')[0], appointmentTime: '', durationMinutes: 30, reason: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (a: Appointment) => {
    setEditAppt(a);
    setForm({
      patientId: a.patient_id,
      doctorId: '',
      appointmentDate: a.appointment_date,
      appointmentTime: a.appointment_time?.substring(0, 5) || '',
      durationMinutes: 30,
      reason: a.reason || '',
      notes: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editAppt) {
        await api.put(`/appointments/${editAppt.id}`, {
          appointmentDate: form.appointmentDate,
          appointmentTime: form.appointmentTime,
          status: (e.target as any).status?.value,
          reason: form.reason,
        });
        toast.success('Appointment updated');
      } else {
        await api.post('/appointments', form);
        toast.success('Appointment created');
      }
      setShowModal(false);
      fetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      await api.put(`/appointments/${id}`, { status });
      toast.success('Status updated');
      fetch();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const canManage = isRole('admin', 'receptionist');

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Calendar size={16} className="text-gray-400 flex-shrink-0" />
          <input
            type="date"
            className="input flex-1"
            value={dateFilter}
            onChange={e => { setDateFilter(e.target.value); setPage(1); }}
          />
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="text-xs text-gray-400 hover:text-gray-700">
              Clear
            </button>
          )}
        </div>
        <select
          className="input sm:w-40"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          {statusOptions.map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={fetch} className="btn-secondary">
            <RefreshCw size={16} />
          </button>
          {canManage && (
            <button onClick={openCreate} className="btn-primary">
              <Plus size={16} /> New Appointment
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? <PageLoader /> : appointments.length === 0 ? (
          <EmptyState message="No appointments found" action={
            canManage ? <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Schedule</button> : undefined
          } />
        ) : (
          <>
            <Table>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-th">Time</th>
                  <th className="table-th">Patient</th>
                  <th className="table-th hidden md:table-cell">Doctor</th>
                  <th className="table-th hidden lg:table-cell">Specialty</th>
                  <th className="table-th">Status</th>
                  <th className="table-th hidden md:table-cell">Reason</th>
                  {canManage && <th className="table-th">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {appointments.map(a => (
                  <tr key={a.id} className="table-row">
                    <td className="table-td">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-gray-400" />
                        <span className="font-mono text-xs">{formatTime(a.appointment_time)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(a.appointment_date)}</p>
                    </td>
                    <td className="table-td">
                      <p className="font-medium">{a.patient_name}</p>
                      <p className="text-xs text-blue-600 font-mono">{a.patient_number}</p>
                    </td>
                    <td className="table-td hidden md:table-cell">{a.doctor_name}</td>
                    <td className="table-td hidden lg:table-cell text-gray-400">{a.specialty}</td>
                    <td className="table-td">
                      {canManage ? (
                        <select
                          className="text-xs border rounded-lg px-2 py-1 focus:outline-none"
                          value={a.status}
                          onChange={e => changeStatus(a.id, e.target.value)}
                        >
                          {statusOptions.map(s => <option key={s}>{s}</option>)}
                        </select>
                      ) : (
                        <Badge status={a.status} />
                      )}
                    </td>
                    <td className="table-td hidden md:table-cell text-gray-400 max-w-xs truncate">{a.reason || '—'}</td>
                    {canManage && (
                      <td className="table-td">
                        <button onClick={() => openEdit(a)} className="text-xs text-blue-600 hover:underline">Edit</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="px-4 pb-4">
              <Pagination page={page} totalPages={Math.ceil(total / 25)} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editAppt ? 'Edit Appointment' : 'Schedule Appointment'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editAppt && (
            <div>
              <label className="label">Patient *</label>
              <input
                className="input mb-1"
                placeholder="Search patient name..."
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
              />
              {patients.length > 0 && !form.patientId && (
                <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                  {patients.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-0"
                      onClick={() => { setForm(f => ({ ...f, patientId: p.id })); setPatientSearch(`${p.first_name} ${p.last_name} (${p.patient_number})`); setPatients([]); }}
                    >
                      {p.first_name} {p.last_name} — <span className="text-blue-600 font-mono text-xs">{p.patient_number}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!editAppt && (
            <div>
              <label className="label">Doctor *</label>
              <select className="input" required value={form.doctorId} onChange={e => setForm(f => ({ ...f, doctorId: e.target.value }))}>
                <option value="">Select Doctor</option>
                {doctors.map(d => (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    Dr. {d.first_name} {d.last_name} — {d.specialty}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" required value={form.appointmentDate} onChange={e => setForm(f => ({ ...f, appointmentDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Time *</label>
              <input type="time" className="input" required value={form.appointmentTime} onChange={e => setForm(f => ({ ...f, appointmentTime: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Reason</label>
            <input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </div>

          {editAppt && (
            <div>
              <label className="label">Status</label>
              <select name="status" className="input" defaultValue={editAppt.status}>
                {statusOptions.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Saving...' : editAppt ? 'Update' : 'Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
