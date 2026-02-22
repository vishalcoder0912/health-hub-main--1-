import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { Plus, Search, FileText, Activity, Stethoscope, Calendar, User, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DoctorMedicalRecord,
  createDoctorMedicalRecord,
  deleteDoctorMedicalRecord,
  fetchDoctorMedicalRecords,
  fetchPatientOptions,
  subscribeDoctorPortal,
  updateDoctorMedicalRecord,
} from '@/services/doctor.service';

function createSymptomId() {
  return `sym-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function DoctorMedicalRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState<DoctorMedicalRecord[]>([]);
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<DoctorMedicalRecord | null>(null);
  const [symptomInput, setSymptomInput] = useState('');
  const [symptoms, setSymptoms] = useState<Array<{ id: string; value: string }>>([]);

  const [formData, setFormData] = useState({
    patientId: '',
    visitType: 'consultation' as DoctorMedicalRecord['visitType'],
    chiefComplaint: '',
    vitals: { bloodPressure: '', temperature: '', pulse: '', weight: '', height: '' },
    diagnosis: '',
    treatment: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [recordRows, patientRows] = await Promise.all([
        fetchDoctorMedicalRecords(user?.id),
        fetchPatientOptions(),
      ]);

      setRecords(recordRows);
      setPatients(patientRows);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load medical records';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadData();
    const unsubscribe = subscribeDoctorPortal(user?.id, () => {
      void loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [loadData, user?.id]);

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          record.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.diagnosis.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [records, searchQuery]
  );

  const groupedRecords = useMemo(
    () =>
      filteredRecords.reduce((acc, record) => {
        if (!acc[record.patientId]) {
          acc[record.patientId] = { patientName: record.patientName, records: [] as DoctorMedicalRecord[] };
        }
        acc[record.patientId].records.push(record);
        return acc;
      }, {} as Record<string, { patientName: string; records: DoctorMedicalRecord[] }>),
    [filteredRecords]
  );

  const resetForm = () => {
    setEditingRecord(null);
    setSymptomInput('');
    setSymptoms([]);
    setFormData({
      patientId: '',
      visitType: 'consultation',
      chiefComplaint: '',
      vitals: { bloodPressure: '', temperature: '', pulse: '', weight: '', height: '' },
      diagnosis: '',
      treatment: '',
      notes: '',
    });
  };

  const openCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEdit = (record: DoctorMedicalRecord) => {
    setEditingRecord(record);
    setSymptoms(record.symptoms.map((value) => ({ id: createSymptomId(), value })));
    setFormData({
      patientId: record.patientId,
      visitType: record.visitType,
      chiefComplaint: record.chiefComplaint,
      vitals: record.vitals,
      diagnosis: record.diagnosis,
      treatment: record.treatment,
      notes: record.notes,
    });
    setIsFormOpen(true);
  };

  const handleAddSymptom = () => {
    const value = symptomInput.trim();
    if (!value) return;

    setSymptoms((prev) => [...prev, { id: createSymptomId(), value }]);
    setSymptomInput('');
  };

  const handleRemoveSymptom = (id: string) => {
    setSymptoms((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoctorMedicalRecord(id);
      toast.success('Medical record deleted successfully');
      await loadData();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete medical record');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const patient = patients.find((item) => item.id === formData.patientId);
    if (!patient) {
      toast.error('Please select a patient');
      return;
    }

    const payload: Omit<DoctorMedicalRecord, 'id'> = {
      patientId: patient.id,
      patientName: patient.name,
      doctorId: user?.id || '',
      doctorName: user?.name || 'Doctor',
      date: editingRecord?.date || new Date().toISOString().split('T')[0],
      visitType: formData.visitType,
      chiefComplaint: formData.chiefComplaint,
      symptoms: symptoms.map((item) => item.value),
      vitals: formData.vitals,
      diagnosis: formData.diagnosis,
      treatment: formData.treatment,
      notes: formData.notes,
    };

    try {
      setIsSaving(true);

      if (editingRecord) {
        await updateDoctorMedicalRecord(editingRecord.id, payload);
        toast.success('Medical record updated successfully');
      } else {
        await createDoctorMedicalRecord(payload);
        toast.success('Medical record created successfully');
      }

      setIsFormOpen(false);
      resetForm();
      await loadData();
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Failed to save medical record');
    } finally {
      setIsSaving(false);
    }
  };

  const getVisitTypeBadge = (type: DoctorMedicalRecord['visitType']) => {
    const variants: Record<DoctorMedicalRecord['visitType'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
      consultation: 'default',
      'follow-up': 'secondary',
      emergency: 'destructive',
      'routine-checkup': 'outline',
    };

    return <Badge variant={variants[type]}>{type.replace('-', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Medical Records</h2>
          <p className="text-muted-foreground">View and create patient medical records</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Record
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search records by patient or diagnosis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 max-w-sm"
        />
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading medical records...</div>
      ) : Object.keys(groupedRecords).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">No medical records found</CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-4">
          {Object.entries(groupedRecords).map(([patientId, group]) => (
            <AccordionItem key={patientId} value={patientId} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{group.patientName}</p>
                    <p className="text-sm text-muted-foreground">{group.records.length} record(s)</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {group.records.map((record) => (
                    <Card key={record.id}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{new Date(record.date).toLocaleDateString()}</span>
                            {getVisitTypeBadge(record.visitType)}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEdit(record)}>Edit</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(record.id)}>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                        <CardTitle className="text-base mt-2">{record.chiefComplaint}</CardTitle>
                        <CardDescription>{record.patientName}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-muted rounded-lg">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">BP</p>
                            <p className="font-medium text-sm">{record.vitals.bloodPressure}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Temp</p>
                            <p className="font-medium text-sm">{record.vitals.temperature}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Pulse</p>
                            <p className="font-medium text-sm">{record.vitals.pulse}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Weight</p>
                            <p className="font-medium text-sm">{record.vitals.weight}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Height</p>
                            <p className="font-medium text-sm">{record.vitals.height}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {record.symptoms.map((symptom) => (
                            <Badge key={`${record.id}-${symptom}`} variant="outline" className="text-xs">{symptom}</Badge>
                          ))}
                        </div>

                        <div className="grid gap-2">
                          <div className="flex items-start gap-2">
                            <Stethoscope className="h-4 w-4 text-primary mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">Diagnosis</p>
                              <p className="text-sm">{record.diagnosis}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Activity className="h-4 w-4 text-primary mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">Treatment</p>
                              <p className="text-sm">{record.treatment}</p>
                            </div>
                          </div>
                          {record.notes && (
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-primary mt-0.5" />
                              <div>
                                <p className="text-xs text-muted-foreground">Notes</p>
                                <p className="text-sm">{record.notes}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Medical Record' : 'New Medical Record'}</DialogTitle>
            <DialogDescription>Create a medical record for a patient visit</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Patient</Label>
                  <Select value={formData.patientId} onValueChange={(value) => setFormData({ ...formData, patientId: value })}>
                    <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => <SelectItem key={patient.id} value={patient.id}>{patient.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Visit Type</Label>
                  <Select value={formData.visitType} onValueChange={(value) => setFormData({ ...formData, visitType: value as DoctorMedicalRecord['visitType'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="routine-checkup">Routine Checkup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Chief Complaint</Label>
                <Input
                  value={formData.chiefComplaint}
                  onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                  placeholder="Main reason for visit"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Symptoms</Label>
                <div className="flex gap-2">
                  <Input
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    placeholder="Add a symptom"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSymptom();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddSymptom}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {symptoms.map((symptom) => (
                    <Badge key={symptom.id} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveSymptom(symptom.id)}>
                      {symptom.value} x
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold">Vitals</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Blood Pressure</Label>
                    <Input
                      value={formData.vitals.bloodPressure}
                      onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, bloodPressure: e.target.value } })}
                      placeholder="120/80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temperature</Label>
                    <Input
                      value={formData.vitals.temperature}
                      onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, temperature: e.target.value } })}
                      placeholder="98.6 F"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pulse</Label>
                    <Input
                      value={formData.vitals.pulse}
                      onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, pulse: e.target.value } })}
                      placeholder="72 bpm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight</Label>
                    <Input
                      value={formData.vitals.weight}
                      onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, weight: e.target.value } })}
                      placeholder="70 kg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height</Label>
                    <Input
                      value={formData.vitals.height}
                      onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, height: e.target.value } })}
                      placeholder="175 cm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Diagnosis</Label>
                <Input
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  placeholder="Enter diagnosis"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Treatment</Label>
                <Textarea
                  value={formData.treatment}
                  onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                  placeholder="Treatment plan"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : editingRecord ? 'Update' : 'Save Record'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
