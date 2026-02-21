import { RealtimeChannel } from '@supabase/supabase-js';
import { Bill } from '@/types';
import { supabase } from '@/utils/supabase';

type BillRow = {
  id: string;
  patientId?: string;
  patient_id?: string;
  patientName?: string;
  patient_name?: string;
  date: string;
  items: Bill['items'] | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: Bill['status'];
  paymentMethod?: string | null;
  payment_method?: string | null;
};

type BillInput = Omit<Bill, 'id'>;

export type PatientOption = {
  id: string;
  name: string;
};

const TABLE_BILLS = 'bills';
const TABLE_PATIENTS = 'patients';

const normalizeBill = (row: BillRow): Bill => ({
  id: row.id,
  patientId: row.patientId || row.patient_id || '',
  patientName: row.patientName || row.patient_name || '',
  date: row.date,
  items: Array.isArray(row.items) ? row.items : [],
  subtotal: Number(row.subtotal || 0),
  discount: Number(row.discount || 0),
  tax: Number(row.tax || 0),
  total: Number(row.total || 0),
  status: row.status,
  paymentMethod: row.paymentMethod || row.payment_method || undefined,
});

const mapBillForWrite = (input: Partial<BillInput>) => ({
  patientId: input.patientId,
  patientName: input.patientName,
  date: input.date,
  items: input.items ?? [],
  subtotal: input.subtotal ?? 0,
  discount: input.discount ?? 0,
  tax: input.tax ?? 0,
  total: input.total ?? 0,
  status: input.status ?? 'pending',
  paymentMethod: input.paymentMethod ?? null,
});

const mapBillForWriteSnake = (input: Partial<BillInput>) => ({
  patient_id: input.patientId,
  patient_name: input.patientName,
  date: input.date,
  items: input.items ?? [],
  subtotal: input.subtotal ?? 0,
  discount: input.discount ?? 0,
  tax: input.tax ?? 0,
  total: input.total ?? 0,
  status: input.status ?? 'pending',
  payment_method: input.paymentMethod ?? null,
});

export async function fetchBills(): Promise<Bill[]> {
  const { data, error } = await supabase
    .from(TABLE_BILLS)
    .select('id, patientId, patientName, date, items, subtotal, discount, tax, total, status, paymentMethod')
    .order('date', { ascending: false });

  if (error) throw error;
  return (data as BillRow[]).map(normalizeBill);
}

export async function createBill(input: BillInput): Promise<Bill> {
  const firstTry = await supabase
    .from(TABLE_BILLS)
    .insert([mapBillForWrite(input)])
    .select('*')
    .single();

  if (!firstTry.error) {
    return normalizeBill(firstTry.data as BillRow);
  }

  const secondTry = await supabase
    .from(TABLE_BILLS)
    .insert([mapBillForWriteSnake(input)])
    .select('*')
    .single();

  if (secondTry.error) throw secondTry.error;
  return normalizeBill(secondTry.data as BillRow);
}

export async function updateBill(id: string, input: Partial<BillInput>): Promise<Bill> {
  const firstTry = await supabase
    .from(TABLE_BILLS)
    .update(mapBillForWrite(input))
    .eq('id', id)
    .select('*')
    .single();

  if (!firstTry.error) {
    return normalizeBill(firstTry.data as BillRow);
  }

  const secondTry = await supabase
    .from(TABLE_BILLS)
    .update(mapBillForWriteSnake(input))
    .eq('id', id)
    .select('*')
    .single();

  if (secondTry.error) throw secondTry.error;
  return normalizeBill(secondTry.data as BillRow);
}

export async function removeBill(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE_BILLS).delete().eq('id', id);
  if (error) throw error;
}

export async function fetchPatientsForBilling(): Promise<PatientOption[]> {
  const firstTry = await supabase.from(TABLE_PATIENTS).select('id, name');
  if (!firstTry.error && firstTry.data) {
    return ((firstTry.data as PatientOption[]) || []).map((item) => ({
      id: item.id,
      name: item.name,
    }));
  }

  const secondTry = await supabase.from(TABLE_PATIENTS).select('id, full_name');
  if (secondTry.error) throw secondTry.error;

  return ((secondTry.data as Array<{ id: string; full_name: string }>) || []).map((item) => ({
    id: item.id,
    name: item.full_name,
  }));
}

export function subscribeBills(callback: () => void): () => void {
  const channel: RealtimeChannel = supabase
    .channel('billing-bills-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_BILLS }, callback)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
