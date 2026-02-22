/**
 * Patient records CRUD backed by Supabase (Medicare HMS patients table).
 * Use this for easy create/read/update/delete of patients in the database.
 */
import { useMemo, useState } from 'react';
import { DataTable, Column } from '@/components/crud/DataTable';
import { DeleteDialog } from '@/components/crud/DeleteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSupabaseCrud } from '@/hooks/useSupabaseCrud';
import type { PatientRow } from '@/lib/supabase/database.types';
import { toast } from 'sonner';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

export function PatientRecordsSupabase() {
  const { data: patients, isLoading, error, create, update, remove } = useSupabaseCrud('patients', {
    orderBy: { column: 'full_name', ascending: true },
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRow | null>(null);
  const [deletePatientId, setDeletePatientId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    gender: 'male',
    phone: '',
    email: '',
    address: '',
    blood_group: '' as string,
    emergency_contact: '',
  });

  const filteredPatients = useMemo(
    () =>
      patients.filter(
        (p) =>
          p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.phone && p.phone.includes(searchQuery))
      ),
    [patients, searchQuery]
  );

  const columns: Column<PatientRow>[] = [
    { key: 'full_name', header: 'Name', render: (p) => <span className="font-medium">{p.full_name}</span> },
    { key: 'date_of_birth', header: 'DOB' },
    { key: 'gender', header: 'Gender' },
    { key: 'phone', header: 'Phone' },
    { key: 'blood_group', header: 'Blood' },
  ];

  const handleAdd = () => {
    setEditingPatient(null);
    setFormData({
      full_name: '',
      date_of_birth: '',
      gender: 'male',
      phone: '',
      email: '',
      address: '',
      blood_group: '',
      emergency_contact: '',
    });
    setIsFormOpen(true);
  };

  const handleEdit = (p: PatientRow) => {
    setEditingPatient(p);
    setFormData({
      full_name: p.full_name,
      date_of_birth: p.date_of_birth,
      gender: p.gender,
      phone: p.phone ?? '',
      email: p.email ?? '',
      address: p.address ?? '',
      blood_group: p.blood_group ?? '',
      emergency_contact: p.emergency_contact ?? '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = (p: PatientRow) => {
    setDeletePatientId(p.id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletePatientId) return;
    setIsSaving(true);
    const { error: err } = await remove(deletePatientId);
    setIsSaving(false);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success('Patient deleted');
    setIsDeleteOpen(false);
    setDeletePatientId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const full_name = formData.full_name.trim();
    const date_of_birth = formData.date_of_birth;
    const gender = formData.gender;
    if (!full_name || !date_of_birth || !gender) {
      toast.error('Name, date of birth and gender are required');
      return;
    }
    const payload = {
      full_name,
      date_of_birth,
      gender,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      address: formData.address.trim() || null,
      blood_group: formData.blood_group && BLOOD_GROUPS.includes(formData.blood_group as any) ? formData.blood_group : null,
      emergency_contact: formData.emergency_contact.trim() || null,
    };
    setIsSaving(true);
    if (editingPatient) {
      const { error: err } = await update(editingPatient.id, payload);
      setIsSaving(false);
      if (err) {
        toast.error(err);
        return;
      }
      toast.success('Patient updated');
    } else {
      const { error: err } = await create(payload);
      setIsSaving(false);
      if (err) {
        toast.error(err);
        return;
      }
      toast.success('Patient created');
    }
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      <DataTable
        title="Patient Records (Supabase)"
        description="Create, edit and delete patients in the database"
        data={filteredPatients}
        columns={columns}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name, email or phone..."
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        addButtonLabel="Add Patient"
        isLoading={isLoading}
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingPatient ? 'Edit Patient' : 'Add Patient'}</DialogTitle>
            <DialogDescription>
              {editingPatient ? 'Update patient details.' : 'Register a new patient.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Input
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="blood_group">Blood group</Label>
                  <select
                    id="blood_group"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                  >
                    <option value="">—</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact">Emergency contact</Label>
                  <Input
                    id="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : editingPatient ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Patient"
        description="Are you sure you want to delete this patient record?"
      />
    </div>
  );
}
