'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate, getErrorMessage, statusColor } from '@/lib/utils';
import { Modal, PageLoader, EmptyState, Pagination, Badge, Table } from '@/components/ui';
import { Plus, Search, UserPlus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

interface Patient {
  id: string;
  patient_number: string;
  first_name: string;
  last_name: string;
  gender: string;
  age: number;
  blood_group: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface RegisterForm {
  firstName: string; lastName: string; dateOfBirth: string;
  gender: string; bloodGroup: string; phone: string;
  email: string; address: string;
  emergencyContactName: string; emergencyContactPhone: string;
  allergies: string;
}

const defaultForm: RegisterForm = {
  firstName: '', lastName: '', dateOfBirth: '', gender: '',
  bloodGroup: '', phone: '', email: '', address: '',
  emergencyContactName: '', emergencyContactPhone: '', allergies: '',
};

export default function PatientsPage() {
  const { isRole } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<RegisterForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
const [editingId, setEditingId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/patients', {
        params: { search: debouncedSearch, page, limit: 20, active: true },
      });
      setPatients(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/patients', form);
      toast.success('Patient registered successfully');
      setShowModal(false);
      setForm(defaultForm);
      fetchPatients();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };
 const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to remove this patient?')) return;

  try {
    await api.delete(`/patients/${id}`);
    toast.success('Patient removed');
    fetchPatients();
  } catch (e) {
    toast.error(getErrorMessage(e));
  }
};
const openEditModal = async (id: string) => {
  try {
    const res = await api.get(`/patients/${id}`);
    const p = res.data.data;

    setEditingId(id);

    setForm({
      firstName: p.first_name || '',
      lastName: p.last_name || '',
      dateOfBirth: p.date_of_birth?.substring(0, 10) || '',
      gender: p.gender || '',
      bloodGroup: p.blood_group || '',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      emergencyContactName: p.emergency_contact_name || '',
      emergencyContactPhone: p.emergency_contact_phone || '',
      allergies: p.allergies || '',
    });

    setShowEditModal(true);
  } catch (e) {
    toast.error(getErrorMessage(e));
  }
};

const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (!editingId) return;

  setSubmitting(true);

  try {
    await api.put(`/patients/${editingId}`, form);
    toast.success('Patient updated');
    setShowEditModal(false);
    setEditingId(null);
    setForm(defaultForm);
    fetchPatients();
  } catch (e) {
    toast.error(getErrorMessage(e));
  } finally {
    setSubmitting(false);
  }
};

  const F = (field: keyof RegisterForm) => (
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  );

  const canManage = isRole('admin', 'receptionist');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, ID or phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-2">
          <button onClick={fetchPatients} className="btn-secondary">
            <RefreshCw size={16} />
          </button>
          {canManage && (
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <UserPlus size={16} /> Register Patient
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <PageLoader />
        ) : patients.length === 0 ? (
          <EmptyState
            message="No patients found"
            action={canManage ? (
              <button onClick={() => setShowModal(true)} className="btn-primary">
                <Plus size={16} /> Register First Patient
              </button>
            ) : undefined}
          />
        ) : (
          <>
            <Table>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-th">Patient ID</th>
                  <th className="table-th">Name</th>
                  <th className="table-th hidden md:table-cell">Gender / Age</th>
                  <th className="table-th hidden lg:table-cell">Blood Group</th>
                  <th className="table-th hidden md:table-cell">Phone</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Registered</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
               <tr key={p.id} className="table-row">
  <td className="table-td font-mono text-blue-600 text-xs">{p.patient_number}</td>

  <td className="table-td">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
        {p.first_name[0]}{p.last_name[0]}
      </div>
      <span className="font-medium">{p.first_name} {p.last_name}</span>
    </div>
  </td>

  <td className="table-td hidden md:table-cell capitalize">
    {p.gender || '—'} {p.age ? `· ${p.age}y` : ''}
  </td>

  <td className="table-td hidden lg:table-cell">
    {p.blood_group || '—'}
  </td>

  <td className="table-td hidden md:table-cell">
    {p.phone || '—'}
  </td>

  <td className="table-td">
    <Badge
      status={p.is_active ? 'active' : 'cancelled'}
      label={p.is_active ? 'Active' : 'Inactive'}
    />
  </td>

  {/* ✅ YOU WERE MISSING THIS */}
  <td className="table-td text-gray-400 text-xs">
    {formatDate(p.created_at)}
  </td>

  <td className="table-td">
    <div className="flex gap-2">
      <Link
        href={`/patients/${p.id}`}
        className="text-xs text-blue-600 hover:underline font-medium"
      >
        View
      </Link>

      {isRole('admin') && (
        <>
          <button
           onClick={() => openEditModal(p.id)}
            className="text-xs text-green-600 hover:underline font-medium"
          >
            Edit
          </button>

          <button
            onClick={() => handleDelete(p.id)}
            className="text-xs text-red-600 hover:underline font-medium"
          >
            Delete
          </button>
        </>
      )}
    </div>
  </td>
</tr>
                ))}
              </tbody>
            </Table>
            <div className="px-4 pb-4">
              <Pagination
                page={page}
                totalPages={Math.ceil(total / 20)}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Register Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Register New Patient" size="lg">
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input className="input" required value={form.firstName} onChange={F('firstName')} />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input className="input" required value={form.lastName} onChange={F('lastName')} />
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input type="date" className="input" value={form.dateOfBirth} onChange={F('dateOfBirth')} />
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={F('gender')}>
                <option value="">Select</option>
                <option>male</option><option>female</option><option>other</option>
              </select>
            </div>
            <div>
              <label className="label">Blood Group</label>
              <select className="input" value={form.bloodGroup} onChange={F('bloodGroup')}>
                <option value="">Unknown</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" value={form.phone} onChange={F('phone')} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={F('email')} />
            </div>
            <div>
              <label className="label">Emergency Contact</label>
              <input className="input" placeholder="Name" value={form.emergencyContactName} onChange={F('emergencyContactName')} />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input" rows={2} value={form.address} onChange={F('address')} />
          </div>
          <div>
            <label className="label">Allergies</label>
            <input className="input" placeholder="e.g. Penicillin, Peanuts" value={form.allergies} onChange={F('allergies')} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </Modal>
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Patient" size="lg">
  <form onSubmit={handleEditSubmit} className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="label">First Name *</label>
        <input className="input" required value={form.firstName} onChange={F('firstName')} />
      </div>

      <div>
        <label className="label">Last Name *</label>
        <input className="input" required value={form.lastName} onChange={F('lastName')} />
      </div>

      <div>
        <label className="label">Date of Birth</label>
        <input type="date" className="input" value={form.dateOfBirth} onChange={F('dateOfBirth')} />
      </div>

      <div>
        <label className="label">Gender</label>
        <select className="input" value={form.gender} onChange={F('gender')}>
          <option value="">Select</option>
          <option>male</option>
          <option>female</option>
          <option>other</option>
        </select>
      </div>

      <div>
        <label className="label">Blood Group</label>
        <select className="input" value={form.bloodGroup} onChange={F('bloodGroup')}>
          <option value="">Unknown</option>
          {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}
        </select>
      </div>

      <div>
        <label className="label">Phone</label>
        <input className="input" type="tel" value={form.phone} onChange={F('phone')} />
      </div>

      <div>
        <label className="label">Email</label>
        <input className="input" type="email" value={form.email} onChange={F('email')} />
      </div>

      <div>
        <label className="label">Emergency Contact</label>
        <input className="input" value={form.emergencyContactName} onChange={F('emergencyContactName')} />
      </div>
    </div>

    <div>
      <label className="label">Address</label>
      <textarea className="input" rows={2} value={form.address} onChange={F('address')} />
    </div>

    <div>
      <label className="label">Allergies</label>
      <input className="input" value={form.allergies} onChange={F('allergies')} />
    </div>

    <div className="flex gap-3 pt-2">
      <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary flex-1">
        Cancel
      </button>

      <button type="submit" className="btn-primary flex-1" disabled={submitting}>
        {submitting ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  </form>
</Modal>
    </div>
  );
}
