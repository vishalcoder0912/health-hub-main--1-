import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable, Column } from '@/components/crud/DataTable';
import { DeleteDialog } from '@/components/crud/DeleteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { LabTest } from '@/types';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import {
  createDoctorLabTest,
  deleteDoctorLabTest,
  fetchDoctorLabTests,
  fetchPatientOptions,
  subscribeDoctorPortal,
  updateDoctorLabTest,
} from '@/services/doctor.service';

export function DoctorLabTests() {
  const { user } = useAuth();
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [deleteTestId, setDeleteTestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    patientId: '',
    testName: '',
    testType: '',
    status: 'requested' as LabTest['status'],
    notes: '',
  });

  const testTypes = ['Hematology', 'Biochemistry', 'Radiology', 'Microbiology', 'Immunology'];

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [tests, patientRows] = await Promise.all([
        fetchDoctorLabTests(user?.id),
        fetchPatientOptions(),
      ]);

      setLabTests(tests);
      setPatients(patientRows);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load lab tests';
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

  const filteredTests = useMemo(
    () =>
      labTests.filter(
        (test) =>
          test.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          test.testName.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [labTests, searchQuery]
  );

  const columns: Column<LabTest>[] = [
    { key: 'id', header: 'Test ID', render: (test) => <Badge variant="outline">{test.id.toUpperCase()}</Badge> },
    { key: 'patientName', header: 'Patient', render: (test) => <span className="font-medium">{test.patientName}</span> },
    { key: 'testName', header: 'Test Name' },
    { key: 'testType', header: 'Type', render: (test) => <Badge variant="secondary">{test.testType}</Badge> },
    { key: 'requestDate', header: 'Date', render: (test) => new Date(test.requestDate).toLocaleDateString() },
    { key: 'status', header: 'Status', render: (test) => <StatusBadge status={test.status} /> },
  ];

  const resetForm = () => {
    setEditingTest(null);
    setFormData({ patientId: '', testName: '', testType: '', status: 'requested', notes: '' });
  };

  const handleAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (test: LabTest) => {
    setEditingTest(test);
    setFormData({
      patientId: test.patientId,
      testName: test.testName,
      testType: test.testType,
      status: test.status,
      notes: test.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = (test: LabTest) => {
    setDeleteTestId(test.id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTestId) return;

    try {
      await deleteDoctorLabTest(deleteTestId);
      toast.success('Lab test deleted successfully');
      setIsDeleteOpen(false);
      setDeleteTestId(null);
      await loadData();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete lab test');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const patient = patients.find((item) => item.id === formData.patientId);
    if (!patient) {
      toast.error('Please select a patient');
      return;
    }

    const payload: Omit<LabTest, 'id'> = {
      patientId: patient.id,
      patientName: patient.name,
      doctorId: user?.id || '',
      doctorName: user?.name || 'Doctor',
      testName: formData.testName,
      testType: formData.testType,
      status: formData.status,
      requestDate: editingTest?.requestDate || new Date().toISOString().split('T')[0],
      completedDate: editingTest?.completedDate,
      result: editingTest?.result,
      reportUrl: editingTest?.reportUrl,
      cost: editingTest?.cost ?? 0,
      notes: formData.notes || undefined,
    };

    try {
      setIsSaving(true);

      if (editingTest) {
        await updateDoctorLabTest(editingTest.id, payload);
        toast.success('Lab test updated successfully');
      } else {
        await createDoctorLabTest(payload);
        toast.success('Lab test requested successfully');
      }

      setIsFormOpen(false);
      resetForm();
      await loadData();
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Failed to save lab test');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="text-sm text-destructive">{error}</div>}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading lab tests...</div>
      ) : filteredTests.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">No lab tests found.</div>
      ) : (
        <DataTable
          title="Lab Tests"
          description="Request and manage lab tests"
          data={filteredTests}
          columns={columns}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by patient or test name..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          addButtonLabel="Request Test"
        />
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTest ? 'Edit Lab Test' : 'Request Lab Test'}</DialogTitle>
            <DialogDescription>
              {editingTest ? 'Update lab test details.' : 'Request a new lab test for a patient.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={formData.patientId} onValueChange={(value) => setFormData({ ...formData, patientId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>{patient.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Test Name</Label>
                <Input
                  value={formData.testName}
                  onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                  placeholder="e.g., Complete Blood Count"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Test Type</Label>
                <Select value={formData.testType} onValueChange={(value) => setFormData({ ...formData, testType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select test type" />
                  </SelectTrigger>
                  <SelectContent>
                    {testTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editingTest && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as LabTest['status'] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="requested">Requested</SelectItem>
                      <SelectItem value="sample-collected">Sample Collected</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes for the lab..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : editingTest ? 'Update' : 'Request'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Lab Test"
        description="Are you sure you want to delete this lab test request?"
      />
    </div>
  );
}
