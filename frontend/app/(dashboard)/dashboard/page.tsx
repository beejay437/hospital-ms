'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatCurrency, formatDate, formatTime, getErrorMessage, statusColor } from '@/lib/utils';
import { StatCard, PageLoader, Badge } from '@/components/ui';
import { Users, Calendar, BedDouble, Pill, DollarSign, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';


interface DashboardData {
  stats: {
    totalPatients: number;
    todayAppointments: number;
    activeAdmissions: number;
    availableBeds: number;
    lowStockMedicines: number;
    monthRevenue: number;
  };
  recentPatients: any[];
  todayAppointments: any[];
  activeAdmissions: any[];
  lowStockAlerts: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/summary')
      .then(r => setData(r.data.data))
      .catch(e => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return null;

  const { stats } = data;

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Patients" value={stats.totalPatients} icon={Users} color="blue" />
        <StatCard label="Today's Appointments" value={stats.todayAppointments} icon={Calendar} color="indigo" />
        <StatCard label="Active Admissions" value={stats.activeAdmissions} icon={BedDouble} color="orange" />
        <StatCard label="Available Beds" value={stats.availableBeds} icon={BedDouble} color="green" />
        <StatCard label="Low Stock Items" value={stats.lowStockMedicines} icon={Pill} color="red" />
        <StatCard label="Month Revenue" value={formatCurrency(stats.monthRevenue)} icon={DollarSign} color="purple" sub="This month" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Today's Appointments</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data.todayAppointments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No appointments today</p>
            ) : (
              data.todayAppointments.map((appt: any) => (
                <div key={appt.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="text-xs font-mono text-gray-500 w-16 flex-shrink-0">
                    {formatTime(appt.appointment_time)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{appt.patient_name}</p>
                    <p className="text-xs text-gray-500 truncate">{appt.doctor_name} · {appt.specialty}</p>
                  </div>
                  <Badge status={appt.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Admissions */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Active Admissions</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data.activeAdmissions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No active admissions</p>
            ) : (
              data.activeAdmissions.map((adm: any) => (
                <div key={adm.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BedDouble size={16} className="text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{adm.patient_name}</p>
                    <p className="text-xs text-gray-500">{adm.ward_name} · Bed {adm.bed_number}</p>
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(adm.admission_date)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        {stats.lowStockMedicines > 0 && (
          <div className="card lg:col-span-2">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <h3 className="font-semibold text-gray-900">Low Stock Alerts</h3>
              <span className="ml-auto badge bg-red-100 text-red-700">{stats.lowStockMedicines} items</span>
            </div>
            <div className="divide-y divide-gray-50">
              {data.lowStockAlerts.map((med: any) => (
                <div key={med.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Pill size={16} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{med.name}</p>
                    <p className="text-xs text-gray-500">Reorder level: {med.reorder_level} {med.unit}s</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{med.current_stock}</p>
                    <p className="text-xs text-gray-400">{med.unit}s left</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Patients */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Patients</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentPatients.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                  {p.first_name[0]}{p.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.first_name} {p.last_name}</p>
                  <p className="text-xs text-gray-500">{p.patient_number}</p>
                </div>
                <p className="text-xs text-gray-400">{formatDate(p.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
