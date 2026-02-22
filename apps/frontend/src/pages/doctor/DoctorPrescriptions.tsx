import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Printer, Eye, Search, Pill, X, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DoctorPrescription,
  DoctorPrescriptionItem,
  createDoctorPrescription,
  deleteDoctorPrescription,
  fetchDoctorPrescriptions,
  fetchPatientOptions,
  subscribeDoctorPortal,
  updateDoctorPrescription,
} from '@/services/doctor.service';
import { fetchCollection } from '@/services/collections.service';
import { Medicine } from '@/types';

function makeItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type PrescriptionItemWithId = DoctorPrescriptionItem & { id: string };

export function DoctorPrescriptions() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<DoctorPrescription[]>([]);
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPrescription, setEditingPrescription] = useState<DoctorPrescription | null>(null);
  const [viewingPrescription, setViewingPrescription] = useState<DoctorPrescription | null>(null);

  const [formData, setFormData] = useState({
    patientId: '',
    diagnosis: '',
    notes: '',
    status: 'active' as DoctorPrescription['status'],
    items: [] as PrescriptionItemWithId[],
  });

  const [currentItem, setCurrentItem] = useState<PrescriptionItemWithId>({
    id: makeItemId(),
    medicineId: '',
    medicineName: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [prescriptionRows, patientRows, medicineRows] = await Promise.all([
        fetchDoctorPrescriptions(user?.id),
        fetchPatientOptions(),
        fetchCollection<Medicine>('medicines'),
      ]);

      setPrescriptions(prescriptionRows);
      setPatients(patientRows);
      setMedicines(medicineRows ?? []);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load prescriptions';
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

  const filteredPrescriptions = useMemo(
    () =>
      prescriptions.filter(
        (item) =>
          item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.diagnosis.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [prescriptions, searchQuery]
  );

  const resetForm = () => {
    setEditingPrescription(null);
    setFormData({ patientId: '', diagnosis: '', notes: '', status: 'active', items: [] });
    setCurrentItem({
      id: makeItemId(),
      medicineId: '',
      medicineName: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
    });
  };

  const handleAddMedicine = () => {
    if (!currentItem.medicineId || !currentItem.dosage) {
      toast.error('Please select medicine and enter dosage');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, currentItem],
    }));

    setCurrentItem({
      id: makeItemId(),
      medicineId: '',
      medicineName: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
    });
  };

  const handleRemoveMedicine = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const openCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEdit = (prescription: DoctorPrescription) => {
    setEditingPrescription(prescription);
    setFormData({
      patientId: prescription.patientId,
      diagnosis: prescription.diagnosis,
      notes: prescription.notes,
      status: prescription.status,
      items: prescription.items.map((item) => ({ ...item, id: makeItemId() })),
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoctorPrescription(id);
      toast.success('Prescription deleted successfully');
      await loadData();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete prescription');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (formData.items.length === 0) {
      toast.error('Please add at least one medicine');
      return;
    }

    const patient = patients.find((item) => item.id === formData.patientId);
    if (!patient) {
      toast.error('Please select a patient');
      return;
    }

    const payload: Omit<DoctorPrescription, 'id'> = {
      patientId: patient.id,
      patientName: patient.name,
      doctorId: user?.id || '',
      doctorName: user?.name || 'Doctor',
      date: editingPrescription?.date || new Date().toISOString().split('T')[0],
      diagnosis: formData.diagnosis,
      notes: formData.notes,
      status: formData.status,
      items: formData.items.map(({ id, ...item }) => item),
    };

    try {
      setIsSaving(true);

      if (editingPrescription) {
        await updateDoctorPrescription(editingPrescription.id, payload);
        toast.success('Prescription updated successfully');
      } else {
        await createDoctorPrescription(payload);
        toast.success('Prescription created successfully');
      }

      setIsFormOpen(false);
      resetForm();
      await loadData();
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Failed to save prescription');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = (prescription: DoctorPrescription) => {
    const printContent = `
      <html>
        <head>
          <title>Prescription - ${prescription.patientName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #0891b2; }
            .header { border-bottom: 2px solid #0891b2; padding-bottom: 20px; margin-bottom: 20px; }
            .info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f0f9ff; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>MediCare Hospital</h1>
            <p>Medical Prescription</p>
          </div>
          <div class="info">
            <p><strong>Patient:</strong> ${prescription.patientName}</p>
            <p><strong>Date:</strong> ${new Date(prescription.date).toLocaleDateString()}</p>
            <p><strong>Diagnosis:</strong> ${prescription.diagnosis}</p>
            <p><strong>Doctor:</strong> ${prescription.doctorName}</p>
          </div>
          <table>
            <tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr>
            ${prescription.items
              .map(
                (item) => `
              <tr>
                <td>${item.medicineName}</td>
                <td>${item.dosage}</td>
                <td>${item.frequency}</td>
                <td>${item.duration}</td>
                <td>${item.instructions}</td>
              </tr>
            `
              )
              .join('')}
          </table>
          <p style="margin-top: 20px;"><strong>Notes:</strong> ${prescription.notes}</p>
          <p style="margin-top: 40px;">_________________________<br/>Doctor's Signature</p>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Prescriptions</h2>
          <p className="text-muted-foreground">Create and manage patient prescriptions</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Prescription
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search prescriptions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 max-w-sm"
        />
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading prescriptions...</div>
      ) : filteredPrescriptions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">No prescriptions found</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPrescriptions.map((prescription) => (
            <Card key={prescription.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{prescription.patientName}</CardTitle>
                    <CardDescription>{prescription.diagnosis}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={prescription.status === 'active' ? 'default' : 'secondary'}>{prescription.status}</Badge>
                    <span className="text-sm text-muted-foreground">{new Date(prescription.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {prescription.items.map((item) => (
                    <Badge key={`${prescription.id}-${item.medicineId}-${item.dosage}`} variant="outline" className="gap-1">
                      <Pill className="h-3 w-3" />
                      {item.medicineName} - {item.dosage}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => { setViewingPrescription(prescription); setIsViewOpen(true); }}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(prescription)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handlePrint(prescription)}>
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(prescription.id)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPrescription ? 'Edit Prescription' : 'New Prescription'}</DialogTitle>
            <DialogDescription>Create or update a prescription for a patient</DialogDescription>
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
                  <Label>Diagnosis</Label>
                  <Input
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    required
                  />
                </div>
              </div>

              {editingPrescription && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as DoctorPrescription['status'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold">Add Medicines</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Medicine</Label>
                    <Select
                      value={currentItem.medicineId}
                      onValueChange={(value) => {
                        const selected = medicines.find((medicine) => medicine.id === value);
                        setCurrentItem({ ...currentItem, medicineId: value, medicineName: selected?.name || '' });
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select medicine" /></SelectTrigger>
                      <SelectContent>
                        {medicines.map((medicine) => <SelectItem key={medicine.id} value={medicine.id}>{medicine.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dosage</Label>
                    <Input
                      value={currentItem.dosage}
                      onChange={(e) => setCurrentItem({ ...currentItem, dosage: e.target.value })}
                      placeholder="e.g., 500mg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={currentItem.frequency} onValueChange={(value) => setCurrentItem({ ...currentItem, frequency: value })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Once daily">Once daily</SelectItem>
                        <SelectItem value="Twice daily">Twice daily</SelectItem>
                        <SelectItem value="Three times daily">Three times daily</SelectItem>
                        <SelectItem value="Every 6 hours">Every 6 hours</SelectItem>
                        <SelectItem value="As needed">As needed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Input
                      value={currentItem.duration}
                      onChange={(e) => setCurrentItem({ ...currentItem, duration: e.target.value })}
                      placeholder="e.g., 7 days"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instructions</Label>
                    <Input
                      value={currentItem.instructions}
                      onChange={(e) => setCurrentItem({ ...currentItem, instructions: e.target.value })}
                      placeholder="e.g., After meals"
                    />
                  </div>
                </div>
                <Button type="button" variant="secondary" onClick={handleAddMedicine}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Medicine
                </Button>
              </div>

              {formData.items.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Prescription Items</h4>
                  <div className="space-y-2">
                    {formData.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="font-medium">{item.medicineName}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">{item.dosage} | {item.frequency}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveMedicine(item.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional instructions or notes..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : editingPrescription ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
          </DialogHeader>
          {viewingPrescription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Patient</Label>
                  <p className="font-medium">{viewingPrescription.patientName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{new Date(viewingPrescription.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Diagnosis</Label>
                  <p className="font-medium">{viewingPrescription.diagnosis}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Doctor</Label>
                  <p className="font-medium">{viewingPrescription.doctorName}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Medicines</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingPrescription.items.map((item) => (
                      <TableRow key={`${viewingPrescription.id}-${item.medicineId}-${item.dosage}`}>
                        <TableCell className="font-medium">{item.medicineName}</TableCell>
                        <TableCell>{item.dosage}</TableCell>
                        <TableCell>{item.frequency}</TableCell>
                        <TableCell>{item.duration}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {viewingPrescription.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p>{viewingPrescription.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button onClick={() => handlePrint(viewingPrescription)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
