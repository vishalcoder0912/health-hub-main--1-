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

type EntityBase = {
  id: string;
  name: string;
};

interface SupabaseCrudTemplateProps<TRead extends EntityBase, TCreate extends Record<string, unknown>> {
  table: string;
  title: string;
  description: string;
  columns?: Column<TRead>[];
  mapCreatePayload?: (input: { name: string }) => TCreate;
  mapUpdatePayload?: (input: { name: string }) => Partial<TCreate>;
}

export function SupabaseCrudTemplate<TRead extends EntityBase, TCreate extends Record<string, unknown>>({
  table,
  title,
  description,
  columns,
  mapCreatePayload,
  mapUpdatePayload,
}: SupabaseCrudTemplateProps<TRead, TCreate>) {
  const [rows, setRows] = useState<TRead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<TRead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const resolvedColumns: Column<TRead>[] =
    columns || [{ key: 'name', header: 'Name' } as Column<TRead>];

  const filteredRows = useMemo(
    () => rows.filter((row) => row.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [rows, searchQuery]
  );

  const loadRows = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getAll<TRead>(table);
      if (result.error || !result.data) {
        setError(result.error || `Failed to fetch ${table}`);
        return;
      }

      setRows(result.data);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : `Failed to fetch ${table}`;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [table]);

  useEffect(() => {
    void loadRows();

    const channel = supabase
      .channel(`template-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        void loadRows();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          toast.error(`Realtime connection failed for ${title}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRows, table, title]);

  const onAdd = () => {
    setEditing(null);
    setName('');
    setIsFormOpen(true);
  };

  const onEdit = (row: TRead) => {
    setEditing(row);
    setName(row.name);
    setIsFormOpen(true);
  };

  const onDelete = (row: TRead) => {
    setDeleteId(row.id);
    setIsDeleteOpen(true);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const value = name.trim();
    if (!value) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);

    if (editing) {
      const payload = mapUpdatePayload ? mapUpdatePayload({ name: value }) : ({ name: value } as Partial<TCreate>);
      const result = await update<TRead, TCreate>(table, editing.id, payload);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Updated successfully');
      }
    } else {
      const payload = mapCreatePayload ? mapCreatePayload({ name: value }) : ({ name: value } as TCreate);
      const result = await create<TRead, TCreate>(table, payload);

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
      ) : filteredRows.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">No data found.</div>
      ) : (
        <DataTable
          title={title}
          description={description}
          data={filteredRows}
          columns={resolvedColumns}
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
