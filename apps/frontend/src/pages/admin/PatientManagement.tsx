import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, DollarSign, Clock, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { mockPatients, mockBills } from '@/lib/mockData';
import { Patient, Bill } from '@/types';
import { toast } from 'sonner';

type BillingStatus = 'paid' | 'pending' | 'overdue' | 'partial';

const billingStatusColors: Record<BillingStatus, string> = {
  paid: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
  partial: 'bg-blue-100 text-blue-800 border-blue-200',
};

// Calculate if a bill is overdue (more than 30 days)
const isOverdue = (billDate: string, status: string): boolean => {
  if (status === 'paid') return false;
  const billDateObj = new Date(billDate);
  const today = new Date();
  const daysDiff = Math.floor((today.getTime() - billDateObj.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff > 30;
};

export function PatientManagement() {
  const { data: patients } = useLocalStorage<Patient>('patients', mockPatients);
  const { data: bills, updateItem: updateBill } = useLocalStorage<Bill>('bills', mockBills);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPatientBills, setSelectedPatientBills] = useState<Bill[]>([]);

  // Get patients with their billing status
  const getPatientsWithBilling = () => {
    return patients.map(patient => {
      const patientBills = bills.filter(b => b.patientId === patient.id);
      const totalAmount = patientBills.reduce((sum, b) => sum + b.total, 0);
      const paidAmount = patientBills
        .filter(b => b.status === 'paid')
        .reduce((sum, b) => sum + b.total, 0);
      const pendingBills = patientBills.filter(b => b.status === 'pending' || b.status === 'partial');
      
      let billingStatus: BillingStatus = 'paid';
      if (pendingBills.length > 0) {
        const hasOverdue = pendingBills.some(b => isOverdue(b.date, b.status));
        if (hasOverdue) {
          billingStatus = 'overdue';
        } else if (patientBills.some(b => b.status === 'partial')) {
          billingStatus = 'partial';
        } else {
          billingStatus = 'pending';
        }
      } else if (patientBills.length === 0) {
        billingStatus = 'paid'; // No bills means nothing due
      }

      return {
        ...patient,
        totalAmount,
        paidAmount,
        dueAmount: totalAmount - paidAmount,
        billingStatus,
        billCount: patientBills.length,
      };
    });
  };

  const patientsWithBilling = getPatientsWithBilling();

  // Filter patients
  const filteredPatients = patientsWithBilling.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || patient.billingStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: patientsWithBilling.length,
    paid: patientsWithBilling.filter(p => p.billingStatus === 'paid').length,
    pending: patientsWithBilling.filter(p => p.billingStatus === 'pending').length,
    overdue: patientsWithBilling.filter(p => p.billingStatus === 'overdue').length,
    totalDue: patientsWithBilling.reduce((sum, p) => sum + p.dueAmount, 0),
  };

  const handleViewPatient = (patient: typeof patientsWithBilling[0]) => {
    setSelectedPatient(patient);
    setSelectedPatientBills(bills.filter(b => b.patientId === patient.id));
    setIsViewOpen(true);
  };

  const handleMarkAsPaid = (billId: string) => {
    const bill = bills.find(b => b.id === billId);
    if (bill) {
      updateBill(billId, { status: 'paid', paymentMethod: 'Cash' });
      setSelectedPatientBills(prev => prev.map(b => 
        b.id === billId ? { ...b, status: 'paid', paymentMethod: 'Cash' } : b
      ));
      toast.success('Bill marked as paid');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registered patients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fully Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <p className="text-xs text-muted-foreground">No pending dues</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Total Due Banner */}
      {stats.totalDue > 0 && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-800">Total Outstanding Amount</p>
                <p className="text-2xl font-bold text-orange-900">₹{stats.totalDue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Patient Billing Overview</CardTitle>
              <CardDescription>View and manage patient billing status</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-full sm:w-[200px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Total Bills</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Due Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">{patient.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{patient.email}</p>
                      <p className="text-muted-foreground">{patient.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>{patient.billCount}</TableCell>
                  <TableCell>₹{patient.totalAmount.toLocaleString()}</TableCell>
                  <TableCell className={patient.dueAmount > 0 ? 'text-red-600 font-medium' : ''}>
                    ₹{patient.dueAmount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${billingStatusColors[patient.billingStatus]} capitalize`}>
                      {patient.billingStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleViewPatient(patient)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Patient Bills Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Patient Bills - {selectedPatient?.name}</DialogTitle>
            <DialogDescription>View and manage bills for this patient</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPatientBills.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No bills found for this patient</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPatientBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-mono text-sm">{bill.id}</TableCell>
                      <TableCell>{bill.date}</TableCell>
                      <TableCell>{bill.items.length} items</TableCell>
                      <TableCell>₹{bill.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={`${billingStatusColors[bill.status as BillingStatus] || billingStatusColors.pending} capitalize`}>
                          {bill.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {bill.status !== 'paid' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleMarkAsPaid(bill.id)}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
