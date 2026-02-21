import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable, Column } from '@/components/crud/DataTable';
import { DeleteDialog } from '@/components/crud/DeleteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Appointment } from '@/types';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import {
  createDoctorAppointment,
  deleteDoctorAppointment,
  fetchDoctorAppointments,
  fetchPatientOptions,
  updateDoctorAppointment,
} from '@/services/doctor.service';

export function DoctorAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [deleteAptId, setDeleteAptId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    patientId: '',
    date: '',
    time: '',
    type: 'opd' as Appointment['type'],
    status: 'scheduled' as Appointment['status'],
    notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [appointmentRows, patientRows] = await Promise.all([
        fetchDoctorAppointments(user?.id),
        fetchPatientOptions(),
      ]);
      setAppointments(appointmentRows);
      setPatients(patientRows);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load appointments';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadData();

    const channel = supabase
      .channel(`doctor-appointments-${user?.id || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        void loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, user?.id]);

  const filteredAppointments = useMemo(
    () =>
      appointments.filter(
        (a) =>
          a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.doctorName.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [appointments, searchQuery]
  );

  const columns: Column<Appointment>[] = [
    { key: 'tokenNumber', header: 'Token', render: (a) => <Badge variant="outline">#{a.tokenNumber || '-'}</Badge> },
    { key: 'patientName', header: 'Patient', render: (a) => <span className="font-medium">{a.patientName}</span> },
    { key: 'date', header: 'Date' },
    { key: 'time', header: 'Time' },
    { key: 'type', header: 'Type', render: (a) => <Badge variant="secondary" className="capitalize">{a.type}</Badge> },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
  ];

  const resetForm = () => {
    setFormData({
      patientId: '',
      date: '',
      time: '',
      type: 'opd',
      status: 'scheduled',
      notes: '',
    });
    setEditingApt(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (apt: Appointment) => {
    setEditingApt(apt);
    setFormData({
      patientId: apt.patientId,
      date: apt.date,
      time: apt.time,
      type: apt.type,
      status: apt.status,
      notes: apt.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = (apt: Appointment) => {
    setDeleteAptId(apt.id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteAptId) return;
    try {
      await deleteDoctorAppointment(deleteAptId);
      toast.success('Appointment deleted successfully');
      setIsDeleteOpen(false);
      setDeleteAptId(null);
      await loadData();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete appointment');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p.id === formData.patientId);

    if (!patient) {
      toast.error('Please select a patient');
      return;
    }

    try {
      setIsSaving(true);
      const payload: Omit<Appointment, 'id'> = {
        patientId: formData.patientId,
        patientName: patient.name,
        doctorId: user?.id || '',
        doctorName: user?.name || 'Doctor',
        department: user?.department || 'General',
        date: formData.date,
        time: formData.time,
        type: formData.type,
        status: formData.status,
        notes: formData.notes || undefined,
        tokenNumber: editingApt?.tokenNumber || appointments.length + 1,
      };

      if (editingApt) {
        await updateDoctorAppointment(editingApt.id, payload);
        toast.success('Appointment updated successfully');
      } else {
        await createDoctorAppointment(payload);
        toast.success('Appointment created successfully');
      }

      setIsFormOpen(false);
      resetForm();
      await loadData();
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Failed to save appointment');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="text-sm text-destructive">{error}</div>}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading appointments...</div>
      ) : (
        <DataTable
          title="Appointments"
          description="Manage your appointments"
          data={filteredAppointments}
          columns={columns}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by patient or doctor..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          addButtonLabel="New Appointment"
        />
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingApt ? 'Edit Appointment' : 'New Appointment'}</DialogTitle>
            <DialogDescription>
              {editingApt ? 'Update appointment details.' : 'Schedule a new appointment.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={formData.patientId} onValueChange={(v) => setFormData({ ...formData, patientId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as Appointment['type'] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opd">OPD</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as Appointment['status'] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : editingApt ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title="Cancel Appointment"
        description="Are you sure you want to cancel this appointment?"
      />
    </div>
  );
}
