import { RealtimeChannel } from "@supabase/supabase-js";
import { Bill } from "@/types";
import {
  createCollectionItem,
  deleteCollectionItem,
  fetchCollection,
  updateCollectionItem
} from "@/services/collections.service";
import { supabase } from "@/utils/supabase";

type BillRow = {
  id: string;
  patientId?: string;
  patient_id?: string;
  patientName?: string;
  patient_name?: string;
  date: string;
  items: Bill["items"] | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: Bill["status"];
  paymentMethod?: string | null;
  payment_method?: string | null;
  insuranceClaim?: boolean | null;
  insurance_claim?: boolean | null;
};

type BillInput = Omit<Bill, "id">;

export type PatientOption = {
  id: string;
  name: string;
};

const normalizeBill = (row: BillRow): Bill => ({
  id: row.id,
  patientId: row.patientId || row.patient_id || "",
  patientName: row.patientName || row.patient_name || "",
  date: row.date,
  items: Array.isArray(row.items) ? row.items : [],
  subtotal: Number(row.subtotal || 0),
  discount: Number(row.discount || 0),
  tax: Number(row.tax || 0),
  total: Number(row.total || 0),
  status: row.status,
  paymentMethod: row.paymentMethod || row.payment_method || undefined,
  insuranceClaim: row.insuranceClaim ?? row.insurance_claim ?? undefined
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
  status: input.status ?? "pending",
  paymentMethod: input.paymentMethod ?? null,
  insuranceClaim: input.insuranceClaim ?? false
});

export async function fetchBills(): Promise<Bill[]> {
  const rows = await fetchCollection<BillRow>("bills");
  return rows.map(normalizeBill).sort((a, b) => b.date.localeCompare(a.date));
}

export async function createBill(input: BillInput): Promise<Bill> {
  const row = await createCollectionItem<BillRow>("bills", mapBillForWrite(input) as unknown as BillRow);
  return normalizeBill(row);
}

export async function updateBill(id: string, input: Partial<BillInput>): Promise<Bill> {
  const row = await updateCollectionItem<BillRow>(
    "bills",
    id,
    mapBillForWrite(input) as unknown as Partial<BillRow>
  );
  return normalizeBill(row);
}

export async function removeBill(id: string): Promise<void> {
  await deleteCollectionItem("bills", id);
}

export async function fetchPatientsForBilling(): Promise<PatientOption[]> {
  const rows = await fetchCollection<{ id: string; name?: string; fullName?: string }>("patients");
  return rows.map((item) => ({
    id: item.id,
    name: item.name || item.fullName || ""
  }));
}

export function subscribeBills(callback: () => void): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`billing-bills-changes-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "bills" }, callback)
    .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, callback)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "data_collections", filter: "key=eq.bills" },
      callback
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "DataCollection", filter: "key=eq.bills" },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
