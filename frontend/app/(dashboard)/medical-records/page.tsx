'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { Modal, PageLoader, EmptyState, Table } from '@/components/ui';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function MedicalRecordsPage() {
  const { isRole } = useAuth();

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [viewRecord, setViewRecord] = useState<any>(null);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const [showAddPrescription, setShowAddPrescription] = useState<any>(null);
  const [showVitals, setShowVitals] = useState(false);

  const [appointments, setAppointments] = useState<any[]>([]);

  const [form, setForm] = useState({
    patientId: '',
    appointmentId: '',
    visitDate: new Date().toISOString().split('T')[0],
    chiefComplaint: '',
    diagnosis: '',
    treatmentPlan: '',
    consultationNotes: '',
    followUpDate: '',
  });

  const [prescForm, setPrescForm] = useState({
    medicineName: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  });

  const [vitalsForm, setVitalsForm] = useState({
    patientId: '',
    medicalRecordId: '',
    temperature: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    pulseRate: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
  });

  const [submitting, setSubmitting] = useState(false);

  // Professional hospital rule:
  // Doctor creates/edits records. Nurse/Admin can record vitals.
  const canCreate = isRole('doctor');
  const canRecordVitals = isRole('admin', 'doctor', 'nurse');

  useEffect(() => {
    if (!patientSearch) {
      setPatients([]);
      return;
    }

    const t = setTimeout(() => {
      api
        .get('/patients', { params: { search: patientSearch, limit: 8 } })
        .then((r) => setPatients(r.data.data))
        .catch(() => {});
    }, 300);

    return () => clearTimeout(t);
  }, [patientSearch]);

  const fetchRecords = async (patientId: string) => {
    setLoading(true);

    try {
      const histRes = await api.get(`/patients/${patientId}/history`);
      setRecords(histRes.data.data.medicalRecords || []);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (patientId = '') => {
    setForm({
      patientId,
      appointmentId: '',
      visitDate: new Date().toISOString().split('T')[0],
      chiefComplaint: '',
      diagnosis: '',
      treatmentPlan: '',
      consultationNotes: '',
      followUpDate: '',
    });
    setEditingRecord(null);
  };

  const selectPatient = (p: any) => {
    setSelectedPatient(p);
    setPatientSearch(`${p.first_name} ${p.last_name} (${p.patient_number})`);
    setPatients([]);

    resetForm(p.id);
    fetchRecords(p.id);

    // Load all appointments for this patient, not only confirmed ones
    api
      .get('/appointments', {
        params: { patientId: p.id, limit: 10 },
      })
      .then((r) => setAppointments(r.data.data))
      .catch(() => {});
  };

  const loadRecord = async (id: string) => {
    try {
      const res = await api.get(`/medical-records/${id}`);
      setViewRecord(res.data.data);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const openCreate = () => {
    if (!selectedPatient) return;

    resetForm(selectedPatient.id);
    setShowCreate(true);
  };

  const openEdit = async (record: any) => {
    try {
      const res = await api.get(`/medical-records/${record.id}`);
      const r = res.data.data;

      setEditingRecord(r);

      setForm({
        patientId: selectedPatient?.id || r.patient_id || '',
        appointmentId: r.appointment_id || '',
        visitDate: r.visit_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        chiefComplaint: r.chief_complaint || '',
        diagnosis: r.diagnosis || '',
        treatmentPlan: r.treatment_plan || '',
        consultationNotes: r.consultation_notes || '',
        followUpDate: r.follow_up_date?.split('T')[0] || '',
      });

      setShowCreate(true);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingRecord?.id) {
        await api.put(`/medical-records/${editingRecord.id}`, form);
        toast.success('Medical record updated');
      } else {
        await api.post('/medical-records', form);
        toast.success('Medical record created');
      }

      setShowCreate(false);
      setEditingRecord(null);

      if (selectedPatient) {
        fetchRecords(selectedPatient.id);
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post(`/medical-records/${showAddPrescription.id}/prescriptions`, prescForm);

      toast.success('Prescription added');

      setShowAddPrescription(null);
      setPrescForm({
        medicineName: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
      });

      loadRecord(showAddPrescription.id);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/medical-records/vitals', vitalsForm);

      toast.success('Vitals recorded');
      setShowVitals(false);

      setVitalsForm({
        patientId: selectedPatient?.id || '',
        medicalRecordId: '',
        temperature: '',
        bloodPressureSystolic: '',
        bloodPressureDiastolic: '',
        pulseRate: '',
        oxygenSaturation: '',
        weight: '',
        height: '',
      });
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Select Patient</p>

        <div className="relative">
          <input
            className="input"
            placeholder="Search patient by name or ID..."
            value={patientSearch}
            onChange={(e) => {
              setPatientSearch(e.target.value);
              setSelectedPatient(null);
              setRecords([]);
            }}
          />

          {patients.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {patients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b last:border-0"
                  onClick={() => selectPatient(p)}
                >
                  <span className="font-medium">
                    {p.first_name} {p.last_name}
                  </span>
                  <span className="text-blue-600 font-mono text-xs ml-2">
                    {p.patient_number}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedPatient && (
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              {selectedPatient.first_name} {selectedPatient.last_name}
            </p>
            <p className="text-xs text-blue-600 font-mono">
              {selectedPatient.patient_number}
            </p>
          </div>

          <div className="flex gap-2">
            {canRecordVitals && (
              <button
                onClick={() => {
                  setVitalsForm((f) => ({
                    ...f,
                    patientId: selectedPatient.id,
                  }));
                  setShowVitals(true);
                }}
                className="btn-secondary text-sm"
              >
                Record Vitals
              </button>
            )}

            {canCreate && (
              <button onClick={openCreate} className="btn-primary">
                <Plus size={16} /> New Record
              </button>
            )}
          </div>
        </div>
      )}

      {selectedPatient && (
        <div className="card">
          {loading ? (
            <PageLoader />
          ) : records.length === 0 ? (
            <EmptyState
              message="No medical records for this patient"
              action={
                canCreate ? (
                  <button onClick={openCreate} className="btn-primary">
                    <Plus size={16} /> Create First Record
                  </button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="table-th">Visit Date</th>
                  <th className="table-th">Doctor</th>
                  <th className="table-th hidden md:table-cell">Chief Complaint</th>
                  <th className="table-th">Diagnosis</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>

              <tbody>
                {records.map((r: any) => (
                  <tr key={r.id} className="table-row">
                    <td className="table-td text-xs">{formatDate(r.visit_date)}</td>
                    <td className="table-td">{r.doctor_name || '—'}</td>
                    <td className="table-td hidden md:table-cell text-gray-400 max-w-xs truncate">
                      {r.chief_complaint || '—'}
                    </td>
                    <td className="table-td max-w-xs truncate">{r.diagnosis || '—'}</td>
                    <td className="table-td">
                      <button
                        onClick={() => loadRecord(r.id)}
                        className="text-xs text-blue-600 hover:underline mr-3"
                      >
                        View
                      </button>

                      {canCreate && (
                        <button
                          onClick={() => openEdit(r)}
                          className="text-xs text-green-600 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}

      {!selectedPatient && (
        <div className="card">
          <EmptyState message="Search and select a patient to view their medical records" />
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setEditingRecord(null);
        }}
        title={editingRecord ? 'Edit Medical Record' : 'New Medical Record'}
        size="lg"
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Visit Date</label>
              <input
                type="date"
                className="input"
                value={form.visitDate}
                onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Link Appointment</label>
              <select
                className="input"
                value={form.appointmentId}
                onChange={(e) => setForm((f) => ({ ...f, appointmentId: e.target.value }))}
                disabled={!!editingRecord}
              >
                <option value="">None</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatDate(a.appointment_date)} — {a.appointment_time?.substring(0, 5)} — {a.status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Chief Complaint</label>
            <input
              className="input"
              value={form.chiefComplaint}
              onChange={(e) => setForm((f) => ({ ...f, chiefComplaint: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Diagnosis</label>
            <textarea
              className="input"
              rows={2}
              value={form.diagnosis}
              onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Treatment Plan</label>
            <textarea
              className="input"
              rows={2}
              value={form.treatmentPlan}
              onChange={(e) => setForm((f) => ({ ...f, treatmentPlan: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Consultation Notes</label>
            <textarea
              className="input"
              rows={3}
              value={form.consultationNotes}
              onChange={(e) => setForm((f) => ({ ...f, consultationNotes: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Follow-up Date</label>
            <input
              type="date"
              className="input"
              value={form.followUpDate}
              onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value }))}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setEditingRecord(null);
              }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>

            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Saving...' : editingRecord ? 'Update Record' : 'Create Record'}
            </button>
          </div>
        </form>
      </Modal>

      {viewRecord && (
        <Modal open={!!viewRecord} onClose={() => setViewRecord(null)} title="Medical Record" size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Visit Date" value={formatDate(viewRecord.visit_date)} />
              <Info label="Doctor" value={viewRecord.doctor_name || '—'} />
              {viewRecord.follow_up_date && (
                <Info label="Follow-up" value={formatDate(viewRecord.follow_up_date)} />
              )}
            </div>

            {viewRecord.chief_complaint && (
              <Section title="Chief Complaint">{viewRecord.chief_complaint}</Section>
            )}

            {viewRecord.diagnosis && <Section title="Diagnosis">{viewRecord.diagnosis}</Section>}

            {viewRecord.treatment_plan && (
              <Section title="Treatment Plan">{viewRecord.treatment_plan}</Section>
            )}

            {viewRecord.consultation_notes && (
              <Section title="Consultation Notes">{viewRecord.consultation_notes}</Section>
            )}

            {viewRecord.vitalSigns && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Latest Vitals</p>
                <div className="p-3 bg-green-50 rounded-lg text-sm grid grid-cols-2 gap-2">
                  <Info label="Temperature" value={`${viewRecord.vitalSigns.temperature || '—'} °C`} />
                  <Info
                    label="Blood Pressure"
                    value={`${viewRecord.vitalSigns.blood_pressure_systolic || '—'}/${viewRecord.vitalSigns.blood_pressure_diastolic || '—'}`}
                  />
                  <Info label="Pulse" value={`${viewRecord.vitalSigns.pulse_rate || '—'} bpm`} />
                  <Info label="Weight" value={`${viewRecord.vitalSigns.weight || '—'} kg`} />
                </div>
              </div>
            )}

            {viewRecord.prescriptions?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Prescriptions ({viewRecord.prescriptions.length})
                </p>

                <div className="space-y-2">
                  {viewRecord.prescriptions.map((p: any) => (
                    <div key={p.id} className="p-3 bg-blue-50 rounded-lg text-sm">
                      <p className="font-medium text-blue-900">{p.medicine_name}</p>
                      <p className="text-blue-700">
                        {p.dosage || '—'} · {p.frequency || '—'} · {p.duration || '—'}
                      </p>
                      {p.instructions && (
                        <p className="text-blue-500 text-xs mt-1">{p.instructions}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {canCreate && (
                <button
                  onClick={() => setShowAddPrescription(viewRecord)}
                  className="btn-secondary flex-1 text-sm"
                >
                  <Plus size={14} /> Add Prescription
                </button>
              )}

              {canCreate && (
                <button
                  onClick={() => {
                    setViewRecord(null);
                    openEdit(viewRecord);
                  }}
                  className="btn-primary flex-1 text-sm"
                >
                  Edit Record
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {showAddPrescription && (
        <Modal
          open={!!showAddPrescription}
          onClose={() => setShowAddPrescription(null)}
          title="Add Prescription"
        >
          <form onSubmit={handleAddPrescription} className="space-y-4">
            <div>
              <label className="label">Medicine Name *</label>
              <input
                className="input"
                required
                value={prescForm.medicineName}
                onChange={(e) => setPrescForm((f) => ({ ...f, medicineName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Dosage</label>
                <input
                  className="input"
                  placeholder="e.g. 500mg"
                  value={prescForm.dosage}
                  onChange={(e) => setPrescForm((f) => ({ ...f, dosage: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Frequency</label>
                <input
                  className="input"
                  placeholder="e.g. Twice daily"
                  value={prescForm.frequency}
                  onChange={(e) => setPrescForm((f) => ({ ...f, frequency: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Duration</label>
                <input
                  className="input"
                  placeholder="e.g. 7 days"
                  value={prescForm.duration}
                  onChange={(e) => setPrescForm((f) => ({ ...f, duration: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="label">Instructions</label>
              <textarea
                className="input"
                rows={2}
                value={prescForm.instructions}
                onChange={(e) => setPrescForm((f) => ({ ...f, instructions: e.target.value }))}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddPrescription(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>

              <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Prescription'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <Modal open={showVitals} onClose={() => setShowVitals(false)} title="Record Vital Signs">
        <form onSubmit={handleVitals} className="space-y-4">
          <div>
            <label className="label">Attach to Medical Record</label>
            <select
              className="input"
              value={vitalsForm.medicalRecordId}
              onChange={(e) => setVitalsForm((f) => ({ ...f, medicalRecordId: e.target.value }))}
            >
              <option value="">Patient only</option>
              {records.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {formatDate(r.visit_date)} — {r.diagnosis || 'No diagnosis'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={vitalsForm.temperature}
                onChange={(e) => setVitalsForm((f) => ({ ...f, temperature: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Pulse Rate (bpm)</label>
              <input
                type="number"
                className="input"
                value={vitalsForm.pulseRate}
                onChange={(e) => setVitalsForm((f) => ({ ...f, pulseRate: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">BP Systolic</label>
              <input
                type="number"
                className="input"
                placeholder="120"
                value={vitalsForm.bloodPressureSystolic}
                onChange={(e) =>
                  setVitalsForm((f) => ({ ...f, bloodPressureSystolic: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="label">BP Diastolic</label>
              <input
                type="number"
                className="input"
                placeholder="80"
                value={vitalsForm.bloodPressureDiastolic}
                onChange={(e) =>
                  setVitalsForm((f) => ({ ...f, bloodPressureDiastolic: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="label">SpO2 (%)</label>
              <input
                type="number"
                step="0.1"
                max="100"
                className="input"
                value={vitalsForm.oxygenSaturation}
                onChange={(e) =>
                  setVitalsForm((f) => ({ ...f, oxygenSaturation: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="label">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={vitalsForm.weight}
                onChange={(e) => setVitalsForm((f) => ({ ...f, weight: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Height (cm)</label>
              <input
                type="number"
                className="input"
                value={vitalsForm.height}
                onChange={(e) => setVitalsForm((f) => ({ ...f, height: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setShowVitals(false)} className="btn-secondary flex-1">
              Cancel
            </button>

            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Vitals'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <p className="text-xs font-semibold text-gray-500 mb-1">{title}</p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{children}</p>
    </div>
  );
}
