import { useMemo, useState } from 'react';
import { DataTable, Column } from '@/components/crud/DataTable';
import { DeleteDialog } from '@/components/crud/DeleteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSupabaseCrud } from '@/hooks/useSupabaseCrud';
import type { DepartmentRow } from '@/lib/supabase/database.types';
import { toast } from 'sonner';

export function DepartmentManagement() {
  const { data: departments, isLoading, error, create, update, remove } = useSupabaseCrud('departments', {
    orderBy: { column: 'name', ascending: true },
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentRow | null>(null);
  const [deleteDeptId, setDeleteDeptId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });

  const filteredDepartments = useMemo(
    () =>
      departments.filter(
        (d) =>
          d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (d.code && d.code.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [departments, searchQuery]
  );

  const columns: Column<DepartmentRow>[] = [
    { key: 'name', header: 'Department', render: (d) => <span className="font-medium">{d.name}</span> },
    { key: 'code', header: 'Code' },
    { key: 'description', header: 'Description' },
  ];

  const handleAdd = () => {
    setEditingDept(null);
    setFormData({ name: '', code: '', description: '' });
    setIsFormOpen(true);
  };

  const handleEdit = (dept: DepartmentRow) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description ?? '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = (dept: DepartmentRow) => {
    setDeleteDeptId(dept.id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteDeptId) return;
    setIsSaving(true);
    const { error: err } = await remove(deleteDeptId);
    setIsSaving(false);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success('Department deleted successfully');
    setIsDeleteOpen(false);
    setDeleteDeptId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    const code = formData.code.trim();
    if (!name || !code) {
      toast.error('Name and code are required');
      return;
    }
    setIsSaving(true);
    if (editingDept) {
      const { data, error: err } = await update(editingDept.id, {
        name,
        code,
        description: formData.description.trim() || null,
      });
      setIsSaving(false);
      if (err) {
        toast.error(err);
        return;
      }
      toast.success('Department updated successfully');
    } else {
      const { data, error: err } = await create({
        name,
        code,
        description: formData.description.trim() || null,
      });
      setIsSaving(false);
      if (err) {
        toast.error(err);
        return;
      }
      toast.success('Department created successfully');
    }
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      <DataTable
        title="Department Management"
        description="Manage hospital departments (Supabase)"
        data={filteredDepartments}
        columns={columns}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name or code..."
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        addButtonLabel="Add Department"
        isLoading={isLoading}
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'Add New Department'}</DialogTitle>
            <DialogDescription>
              {editingDept ? 'Update department details.' : 'Create a new department.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Department Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. CARDIO, ER"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : editingDept ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Department"
        description="Are you sure you want to delete this department?"
      />
    </div>
  );
}
