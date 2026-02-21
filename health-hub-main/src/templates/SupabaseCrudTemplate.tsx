import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable, Column } from '@/components/crud/DataTable';
import { DeleteDialog } from '@/components/crud/DeleteDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { create, getAll, remove, update } from '@/services/base.service';
import { supabase } from '@/utils/supabase';
import { toast } from 'sonner';

type Entity = {
  id: string;
  name: string;
};

interface SupabaseCrudTemplateProps {
  table: string;
  title: string;
  description: string;
}

export function SupabaseCrudTemplate({ table, title, description }: SupabaseCrudTemplateProps) {
  const [rows, setRows] = useState<Entity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Entity | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const columns: Column<Entity>[] = [
    { key: 'name', header: 'Name' },
  ];

  const filteredRows = useMemo(
    () => rows.filter((row) => row.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [rows, searchQuery]
  );

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    const result = await getAll<Entity>(table);
    if (result.error || !result.data) {
      setError(result.error || `Failed to fetch ${table}`);
      setIsLoading(false);
      return;
    }
    setRows(result.data);
    setError(null);
    setIsLoading(false);
  }, [table]);

  useEffect(() => {
    void loadRows();
    const channel = supabase
      .channel(`template-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        void loadRows();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRows, table]);

  const onAdd = () => {
    setEditing(null);
    setName('');
    setIsFormOpen(true);
  };

  const onEdit = (row: Entity) => {
    setEditing(row);
    setName(row.name);
    setIsFormOpen(true);
  };

  const onDelete = (row: Entity) => {
    setDeleteId(row.id);
    setIsDeleteOpen(true);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setIsSaving(true);

    if (editing) {
      const result = await update<Entity>(table, editing.id, { name: name.trim() });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Updated successfully');
      }
    } else {
      const result = await create<Entity>(table, { name: name.trim() } as Entity);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Created successfully');
      }
    }

    setIsSaving(false);
    setIsFormOpen(false);
    setName('');
    setEditing(null);
    await loadRows();
  };

  const onConfirmDelete = async () => {
    if (!deleteId) return;
    const result = await remove(table, deleteId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Deleted successfully');
    setIsDeleteOpen(false);
    setDeleteId(null);
    await loadRows();
  };

  return (
    <div className="space-y-6">
      {error && <div className="text-sm text-destructive">{error}</div>}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <DataTable
          title={title}
          description={description}
          data={filteredRows}
          columns={columns}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
          addButtonLabel="Add"
        />
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Create'} {title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={onConfirmDelete}
        title="Delete Record"
        description="This action cannot be undone."
      />
    </div>
  );
}
