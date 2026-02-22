import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatsCard } from '@/components/StatsCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  FlaskConical,
  Pill,
  Bell,
  ClipboardList,
  Clock,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

import { DoctorAppointments } from './DoctorAppointments';
import { DoctorPatients } from './DoctorPatients';
import { DoctorLabTests } from './DoctorLabTests';
import { DoctorPrescriptions } from './DoctorPrescriptions';
import { DoctorMedicalRecords } from './DoctorMedicalRecords';
import { DoctorNotifications } from './DoctorNotifications';
import { Appointment, LabTest } from '@/types';
import { DoctorPrescription, fetchDoctorAppointments, fetchDoctorLabTests, fetchDoctorPrescriptions, subscribeDoctorPortal } from '@/services/doctor.service';
import { getAll } from '@/services/base.service';

const navItems = [
  { title: 'Dashboard', href: '/doctor', icon: LayoutDashboard },
  { title: 'Appointments', href: '/doctor/appointments', icon: Calendar },
  { title: 'Patients', href: '/doctor/patients', icon: Users },
  { title: 'Lab Tests', href: '/doctor/lab-tests', icon: FlaskConical },
  { title: 'Prescriptions', href: '/doctor/prescriptions', icon: Pill },
  { title: 'Medical Records', href: '/doctor/records', icon: FileText },
  { title: 'Notifications', href: '/doctor/notifications', icon: Bell },
];

function DoctorOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientsCount, setPatientsCount] = useState(0);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [prescriptions, setPrescriptions] = useState<DoctorPrescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadOverview = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [appointmentRows, patientRows, labRows, prescriptionRows] = await Promise.all([
          fetchDoctorAppointments(user?.id),
          getAll<{ id: string }>('patients'),
          fetchDoctorLabTests(user?.id),
          fetchDoctorPrescriptions(user?.id),
        ]);

        if (!active) return;

        setAppointments(appointmentRows);
        setPatientsCount((patientRows.data ?? []).length);
        setLabTests(labRows);
        setPrescriptions(prescriptionRows);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load doctor dashboard';
        if (!active) return;
        setError(message);
        toast.error(message);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadOverview();
    const unsubscribe = subscribeDoctorPortal(user?.id, () => {
      void loadOverview();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.id]);

  const today = new Date().toISOString().split('T')[0];

  const todayAppointments = useMemo(
    () => appointments.filter((item) => item.date === today),
    [appointments, today]
  );

  const completedToday = useMemo(
    () => todayAppointments.filter((item) => item.status === 'completed').length,
    [todayAppointments]
  );

  const pendingLabReports = useMemo(
    () => labTests.filter((item) => item.status !== 'completed').length,
    [labTests]
  );

  const activePrescriptions = useMemo(
    () => prescriptions.filter((item) => item.status === 'active').length,
    [prescriptions]
  );

  return (
    <div className="space-y-6">
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Welcome back, {user?.name}</h2>
              <p className="text-primary-foreground/80 mt-1">
                {user?.specialization || 'Doctor'} | {user?.department || 'General'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-primary-foreground/70">Today's Date</p>
              <p className="text-lg font-semibold">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Today's Appointments"
          value={isLoading ? '-' : todayAppointments.length}
          description={`${completedToday} completed`}
          icon={Calendar}
        />
        <StatsCard
          title="Total Patients"
          value={isLoading ? '-' : patientsCount}
          description="Hospital registry"
          icon={Users}
        />
        <StatsCard
          title="Pending Lab Reports"
          value={isLoading ? '-' : pendingLabReports}
          description="Awaiting review"
          icon={FlaskConical}
        />
        <StatsCard
          title="Active Prescriptions"
          value={isLoading ? '-' : activePrescriptions}
          description="Current treatment plans"
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Today's Appointments</CardTitle>
              <CardDescription>Your scheduled patients for today</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/doctor/appointments')}>
              <Calendar className="h-4 w-4 mr-2" />
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading appointments...</div>
            ) : todayAppointments.length === 0 ? (
              <div className="text-sm text-muted-foreground">No appointments today.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        <Badge variant="outline">#{appointment.tokenNumber || '-'}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{appointment.patientName}</TableCell>
                      <TableCell>{appointment.time}</TableCell>
                      <TableCell className="capitalize">{appointment.type}</TableCell>
                      <TableCell>
                        <StatusBadge status={appointment.status} />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => navigate('/doctor/appointments')}>
                          {appointment.status === 'scheduled' ? 'Start' : 'View'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/doctor/prescriptions')}>
                <Pill className="h-4 w-4 mr-2" />
                Write Prescription
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/doctor/lab-tests')}>
                <FlaskConical className="h-4 w-4 mr-2" />
                Request Lab Test
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/doctor/records')}>
                <FileText className="h-4 w-4 mr-2" />
                View Patient History
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/doctor/patients')}>
                <UserCheck className="h-4 w-4 mr-2" />
                Manage Patients
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-sm font-medium">Pending Labs</p>
                <p className="text-xs text-muted-foreground mt-1">{pendingLabReports} lab report(s) require attention</p>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-sm font-medium">Appointments Today</p>
                <p className="text-xs text-muted-foreground mt-1">{todayAppointments.length} scheduled consultation(s)</p>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-sm font-medium">Active Prescriptions</p>
                <p className="text-xs text-muted-foreground mt-1">{activePrescriptions} active prescription(s)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DoctorDashboard() {
  return (
    <DashboardLayout navItems={navItems} title="Doctor Dashboard">
      <Routes>
        <Route index element={<DoctorOverview />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="patients" element={<DoctorPatients />} />
        <Route path="lab-tests" element={<DoctorLabTests />} />
        <Route path="prescriptions" element={<DoctorPrescriptions />} />
        <Route path="records" element={<DoctorMedicalRecords />} />
        <Route path="notifications" element={<DoctorNotifications />} />
      </Routes>
    </DashboardLayout>
  );
}
