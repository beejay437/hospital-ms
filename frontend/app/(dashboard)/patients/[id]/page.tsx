'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatDate, formatDateTime, formatCurrency, getErrorMessage, statusColor } from '@/lib/utils';
import { PageLoader, Badge } from '@/components/ui';
import { ArrowLeft, User, Phone, Mail, MapPin, Heart, Calendar, BedDouble, Receipt, FileText, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      api.get(`/patients/${id}`),
      api.get(`/patients/${id}/history`),
    ])
      .then(([pr, hr]) => {
        setPatient(pr.data.data);
        setHistory(hr.data.data);
      })
      .catch(e => {
        toast.error(getErrorMessage(e));
        router.push('/patients');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (!patient) return null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'appointments', label: `Appointments (${history?.appointments?.length || 0})` },
    { id: 'records', label: `Medical Records (${history?.medicalRecords?.length || 0})` },
    { id: 'admissions', label: `Admissions (${history?.admissions?.length || 0})` },
    { id: 'vitals', label: 'Vitals' },
    { id: 'billing', label: `Invoices (${history?.invoices?.length || 0})` },
  ];

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back */}
      <button onClick={() => router.push('/patients')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft size={16} /> Back to Patients
      </button>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {patient.first_name[0]}{patient.last_name[0]}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{patient.first_name} {patient.last_name}</h2>
              <Badge status={patient.is_active ? 'active' : 'cancelled'} label={patient.is_active ? 'Active' : 'Inactive'} />
            </div>
            <p className="text-sm font-mono text-blue-600 mb-3">{patient.patient_number}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <InfoItem icon={User} label="Age / Gender" value={`${patient.age || '—'}y · ${patient.gender || '—'}`} />
              <InfoItem icon={Heart} label="Blood Group" value={patient.blood_group || '—'} />
              <InfoItem icon={Phone} label="Phone" value={patient.phone || '—'} />
              <InfoItem icon={Mail} label="Email" value={patient.email || '—'} />
            </div>
            {patient.address && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <MapPin size={14} /> {patient.address}
              </div>
            )}
          </div>
        </div>
        {patient.allergies && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-xs font-semibold text-red-700 mb-0.5">⚠ Allergies</p>
            <p className="text-sm text-red-800">{patient.allergies}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard title="Personal Details">
              <Row label="Full Name" value={`${patient.first_name} ${patient.last_name}`} />
              <Row label="Date of Birth" value={formatDate(patient.date_of_birth)} />
              <Row label="Gender" value={patient.gender} capitalize />
              <Row label="Blood Group" value={patient.blood_group} />
            </InfoCard>
            <InfoCard title="Contact Info">
              <Row label="Phone" value={patient.phone} />
              <Row label="Email" value={patient.email} />
              <Row label="Address" value={patient.address} />
              <Row label="Emergency Contact" value={patient.emergency_contact_name} />
              <Row label="Emergency Phone" value={patient.emergency_contact_phone} />
            </InfoCard>
            <InfoCard title="Medical Info">
              <Row label="Allergies" value={patient.allergies} />
              <Row label="Notes" value={patient.notes} />
            </InfoCard>
            <InfoCard title="Registration">
              <Row label="Patient Number" value={patient.patient_number} mono />
              <Row label="Registered" value={formatDateTime(patient.created_at)} />
            </InfoCard>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="card overflow-hidden">
            {!history?.appointments?.length ? (
              <p className="text-sm text-gray-400 text-center py-10">No appointment history</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th">Doctor</th>
                    <th className="table-th hidden sm:table-cell">Specialty</th>
                    <th className="table-th">Status</th>
                    <th className="table-th hidden md:table-cell">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {history.appointments.map((a: any) => (
                    <tr key={a.id} className="table-row">
                      <td className="table-td text-xs">{formatDate(a.appointment_date)} {a.appointment_time?.substring(0,5)}</td>
                      <td className="table-td">{a.doctor_name}</td>
                      <td className="table-td hidden sm:table-cell text-gray-400">{a.specialty}</td>
                      <td className="table-td"><Badge status={a.status} /></td>
                      <td className="table-td hidden md:table-cell text-gray-400 max-w-xs truncate">{a.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'records' && (
          <div className="card overflow-hidden">
            {!history?.medicalRecords?.length ? (
              <p className="text-sm text-gray-400 text-center py-10">No medical records</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th">Doctor</th>
                    <th className="table-th hidden md:table-cell">Complaint</th>
                    <th className="table-th">Diagnosis</th>
                  </tr>
                </thead>
                <tbody>
                  {history.medicalRecords.map((r: any) => (
                    <tr key={r.id} className="table-row">
                      <td className="table-td text-xs">{formatDate(r.visit_date)}</td>
                      <td className="table-td">{r.doctor_name}</td>
                      <td className="table-td hidden md:table-cell text-gray-400 max-w-xs truncate">{r.chief_complaint || '—'}</td>
                      <td className="table-td max-w-xs truncate">{r.diagnosis || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'admissions' && (
          <div className="card overflow-hidden">
            {!history?.admissions?.length ? (
              <p className="text-sm text-gray-400 text-center py-10">No admission history</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="table-th">Admitted</th>
                    <th className="table-th">Ward / Bed</th>
                    <th className="table-th">Status</th>
                    <th className="table-th hidden md:table-cell">Discharge</th>
                  </tr>
                </thead>
                <tbody>
                  {history.admissions.map((a: any) => (
                    <tr key={a.id} className="table-row">
                      <td className="table-td text-xs">{formatDateTime(a.admission_date)}</td>
                      <td className="table-td">{a.ward_name} · {a.bed_number}</td>
                      <td className="table-td"><Badge status={a.status} /></td>
                      <td className="table-td hidden md:table-cell text-xs text-gray-400">
                        {a.actual_discharge_date ? formatDate(a.actual_discharge_date) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'vitals' && (
          <div className="card overflow-x-auto">
            {!history?.vitalSigns?.length ? (
              <p className="text-sm text-gray-400 text-center py-10">No vitals recorded</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th">Temp</th>
                    <th className="table-th">BP</th>
                    <th className="table-th">Pulse</th>
                    <th className="table-th">SpO2</th>
                    <th className="table-th">Weight</th>
                    <th className="table-th">BMI</th>
                  </tr>
                </thead>
                <tbody>
                  {history.vitalSigns.map((v: any) => (
                    <tr key={v.id} className="table-row">
                      <td className="table-td text-xs">{formatDateTime(v.recorded_at)}</td>
                      <td className="table-td">{v.temperature ? `${v.temperature}°${v.temperature_unit}` : '—'}</td>
                      <td className="table-td">{v.blood_pressure_systolic ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}` : '—'}</td>
                      <td className="table-td">{v.pulse_rate ? `${v.pulse_rate} bpm` : '—'}</td>
                      <td className="table-td">{v.oxygen_saturation ? `${v.oxygen_saturation}%` : '—'}</td>
                      <td className="table-td">{v.weight ? `${v.weight} kg` : '—'}</td>
                      <td className="table-td">{v.bmi || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="card overflow-hidden">
            {!history?.invoices?.length ? (
              <p className="text-sm text-gray-400 text-center py-10">No invoices</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="table-th">Invoice #</th>
                    <th className="table-th">Total</th>
                    <th className="table-th">Paid</th>
                    <th className="table-th">Balance</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.invoices.map((inv: any) => (
                    <tr key={inv.id} className="table-row">
                      <td className="table-td font-mono text-xs text-blue-600">
                        <Link href={`/billing/${inv.id}`}>{inv.invoice_number}</Link>
                      </td>
                      <td className="table-td">{formatCurrency(inv.total)}</td>
                      <td className="table-td">{formatCurrency(inv.amount_paid)}</td>
                      <td className="table-td font-medium text-red-600">{formatCurrency(inv.balance)}</td>
                      <td className="table-td"><Badge status={inv.status} /></td>
                      <td className="table-td text-xs text-gray-400">{formatDate(inv.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: any) {
  return (
    <div>
      <p className="text-xs text-gray-400 flex items-center gap-1"><Icon size={12} />{label}</p>
      <p className="font-medium text-gray-900 capitalize">{value || '—'}</p>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-gray-900 mb-3 text-sm border-b pb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, capitalize, mono }: { label: string; value?: string | null; capitalize?: boolean; mono?: boolean }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 w-36 flex-shrink-0">{label}</span>
      <span className={`text-gray-900 ${capitalize ? 'capitalize' : ''} ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}
