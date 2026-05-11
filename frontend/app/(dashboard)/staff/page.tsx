'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { Modal, PageLoader, EmptyState, Pagination, Badge, Table } from '@/components/ui';
import { Plus, Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

const roleOptions = ['admin', 'receptionist', 'doctor', 'nurse', 'pharmacist', 'billing_officer'];

export default function StaffPage() {
  const { user: currentUser } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
  
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    roleName: 'doctor',
    specialty: '',
    licenseNumber: '',
    qualification: '',
    yearsExperience: 0,
    consultationFee: 0,
    availableDays: 'Mon,Tue,Wed,Thu,Fri',
    availableFrom: '08:00',
    availableTo: '17:00',
  });
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.role !== 'admin') {
      toast.error('Access denied');
      window.location.href = '/dashboard';
    }
  }, [currentUser]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchStaff = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;

    setLoading(true);
    try {
      const res = await api.get('/staff', {
       params: {
  role: roleFilter || undefined,
  search: debouncedSearch || undefined,
  page,
  limit: 20,
  active: true,
},
      });
      setStaff(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [currentUser, roleFilter, debouncedSearch, page]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const resetForm = () => {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      roleName: 'doctor',
      specialty: '',
      licenseNumber: '',
      qualification: '',
      yearsExperience: 0,
      consultationFee: 0,
      availableDays: 'Mon,Tue,Wed,Thu,Fri',
      availableFrom: '08:00',
      availableTo: '17:00',
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/staff', form);
      toast.success('Staff member created');
      setShowCreate(false);
      resetForm();
      fetchStaff();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await api.put(`/staff/${id}`, { isActive: !current });
      toast.success(current ? 'Staff deactivated' : 'Staff activated');
      fetchStaff();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };
  const handleDelete = async (id: string) => {
    
  if (!confirm('Delete this staff permanently?')) return;

  try {
    await api.delete(`/staff/${id}`);
    toast.success('Staff deleted');
    fetchStaff();
  } catch (e) {
    toast.error(getErrorMessage(e));
  }
};
const openEdit = async (id: string) => {
  try {
    const res = await api.get(`/staff/${id}`);
    const s = res.data.data;

    setEditingId(id);

    setForm({
      firstName: s.first_name || '',
      lastName: s.last_name || '',
      email: s.email || '',
      password: '',
      phone: s.phone || '',
      roleName: s.role || 'doctor',
      specialty: s.specialty || '',
      licenseNumber: s.license_number || '',
      qualification: s.qualification || '',
      yearsExperience: s.years_experience || 0,
      consultationFee: s.consultation_fee || 0,
      availableDays: s.available_days || 'Mon,Tue,Wed,Thu,Fri',
      availableFrom: s.available_from || '08:00',
      availableTo: s.available_to || '17:00',
    });

    setShowEdit(true);
  } catch (e) {
    toast.error(getErrorMessage(e));
  }
};

const handleEdit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!editingId) return;

  setSubmitting(true);

  try {
    await api.put(`/staff/${editingId}`, form);
    toast.success('Staff updated');
    setShowEdit(false);
    setEditingId(null);
    fetchStaff();
  } catch (e) {
    toast.error(getErrorMessage(e));
  } finally {
    setSubmitting(false);
  }
};


  const F = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({
      ...f,
      [field]:
        field === 'yearsExperience' || field === 'consultationFee'
          ? Number(e.target.value)
          : e.target.value,
    }));

  if (currentUser && currentUser.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500">Create, manage, activate, and deactivate staff accounts.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search staff..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          className="input sm:w-48"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Roles</option>
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r.replace('_', ' ')}
            </option>
          ))}
        </select>

        <button onClick={fetchStaff} className="btn-secondary">
          <RefreshCw size={16} />
        </button>

        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      <div className="card">
        {loading ? (
          <PageLoader />
        ) : staff.length === 0 ? (
          <EmptyState
            message="No staff found"
            action={
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                <Plus size={16} /> Add Staff
              </button>
            }
          />
        ) : (
          <>
            <Table>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-th">Staff Member</th>
                  <th className="table-th">Role</th>
                  <th className="table-th hidden lg:table-cell">Specialty</th>
                  <th className="table-th hidden md:table-cell">Phone</th>
                  <th className="table-th hidden lg:table-cell">Joined</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s: any) => (
                  <tr key={s.id} className="table-row">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">
                          {s.first_name?.[0]}
                          {s.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium">
                            {s.first_name} {s.last_name}
                          </p>
                          <p className="text-xs text-gray-400">{s.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="table-td">
                      <span className="badge bg-indigo-50 text-indigo-700 capitalize">
                        {s.role.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="table-td hidden lg:table-cell text-gray-400">{s.specialty || '—'}</td>
                    <td className="table-td hidden md:table-cell text-gray-400">{s.phone || '—'}</td>
                    <td className="table-td hidden lg:table-cell text-xs text-gray-400">
                      {formatDate(s.created_at)}
                    </td>
                    <td className="table-td">
                      <Badge
                        status={s.is_active ? 'active' : 'cancelled'}
                        label={s.is_active ? 'Active' : 'Inactive'}
                      />
                    </td>
                   <td className="table-td">
  {s.id !== currentUser?.id && (
    <div className="flex gap-2">

      {/* EDIT BUTTON */}
      <button
        onClick={() => openEdit(s.id)}
        className="text-xs text-green-600 hover:underline font-medium"
      >
        Edit
      </button>

      {/* DELETE BUTTON */}
      <button
        onClick={() => handleDelete(s.id)}
        className="text-xs text-red-600 hover:underline font-medium"
      >
        Delete
      </button>

    </div>
  )}
</td>
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

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Staff Member" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input className="input" required value={form.firstName} onChange={F('firstName')} />
            </div>

            <div>
              <label className="label">Last Name *</label>
              <input className="input" required value={form.lastName} onChange={F('lastName')} />
            </div>

            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" required value={form.email} onChange={F('email')} />
            </div>

            <div>
              <label className="label">Password *</label>
              <input
                type="password"
                className="input"
                required
                minLength={8}
                value={form.password}
                onChange={F('password')}
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" value={form.phone} onChange={F('phone')} />
            </div>

            <div>
              <label className="label">Role *</label>
              <select className="input" required value={form.roleName} onChange={F('roleName')}>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.roleName === 'doctor' && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Doctor Details</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Specialty *</label>
                  <input
                    className="input"
                    required
                    value={form.specialty}
                    onChange={F('specialty')}
                    placeholder="e.g. Cardiology"
                  />
                </div>

                <div>
                  <label className="label">License Number</label>
                  <input className="input" value={form.licenseNumber} onChange={F('licenseNumber')} />
                </div>

                <div>
                  <label className="label">Qualification</label>
                  <input
                    className="input"
                    value={form.qualification}
                    onChange={F('qualification')}
                    placeholder="MBBS, MD..."
                  />
                </div>

                <div>
                  <label className="label">Years Experience</label>
                  <input
                    type="number"
                    className="input"
                    min={0}
                    value={form.yearsExperience}
                    onChange={F('yearsExperience')}
                  />
                </div>

                <div>
                  <label className="label">Consultation Fee (₦)</label>
                  <input
                    type="number"
                    className="input"
                    min={0}
                    value={form.consultationFee}
                    onChange={F('consultationFee')}
                  />
                </div>

                <div>
                  <label className="label">Available Days</label>
                  <input
                    className="input"
                    value={form.availableDays}
                    onChange={F('availableDays')}
                    placeholder="Mon,Tue,Wed,Thu,Fri"
                  />
                </div>

                <div>
                  <label className="label">Available From</label>
                  <input type="time" className="input" value={form.availableFrom} onChange={F('availableFrom')} />
                </div>

                <div>
                  <label className="label">Available To</label>
                  <input type="time" className="input" value={form.availableTo} onChange={F('availableTo')} />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Staff'}
            </button>
          </div>
          
        </form>
      </Modal>
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Staff" size="lg">
  <form onSubmit={handleEdit} className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="label">First Name</label>
        <input className="input" value={form.firstName} onChange={F('firstName')} />
      </div>

      <div>
        <label className="label">Last Name</label>
        <input className="input" value={form.lastName} onChange={F('lastName')} />
      </div>

      <div>
        <label className="label">Phone</label>
        <input className="input" value={form.phone} onChange={F('phone')} />
      </div>
<div>
  <label className="label">Email</label>
  <input
    type="email"
    className="input"
    value={form.email}
    onChange={F('email')}
  />
</div>

<div>
  <label className="label">New Password</label>
  <input
    type="password"
    className="input"
    value={form.password}
    onChange={F('password')}
    placeholder="Leave blank to keep current password"
  />
</div>
      <div>
        <label className="label">Role</label>
        <select className="input" value={form.roleName} onChange={F('roleName')}>
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>
    </div>

    {form.roleName === 'doctor' && (
      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Doctor Details</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Specialty</label>
            <input className="input" value={form.specialty} onChange={F('specialty')} />
          </div>

          <div>
            <label className="label">License Number</label>
            <input className="input" value={form.licenseNumber} onChange={F('licenseNumber')} />
          </div>

          <div>
            <label className="label">Qualification</label>
            <input className="input" value={form.qualification} onChange={F('qualification')} />
          </div>

          <div>
            <label className="label">Years Experience</label>
            <input type="number" className="input" value={form.yearsExperience} onChange={F('yearsExperience')} />
          </div>

          <div>
            <label className="label">Consultation Fee</label>
            <input type="number" className="input" value={form.consultationFee} onChange={F('consultationFee')} />
          </div>
        </div>
      </div>
    )}

    <div className="flex gap-3 pt-2">
      <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary flex-1">
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
