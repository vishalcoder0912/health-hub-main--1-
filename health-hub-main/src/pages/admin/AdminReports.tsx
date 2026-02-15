import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getData, mockBills, mockPatients, mockAppointments } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Download, FileText, TrendingUp, Users, DollarSign } from 'lucide-react';
import { exportToCSV, exportToPDF, exportToExcel, generateTableHTML } from '@/lib/exportUtils';

export function AdminReports() {
  const bills = getData('bills', mockBills);
  const patients = getData('patients', mockPatients);
  const appointments = getData('appointments', mockAppointments);

  const revenueData = [
    { month: 'Jan', revenue: 12500 },
    { month: 'Feb', revenue: 15000 },
    { month: 'Mar', revenue: 18000 },
    { month: 'Apr', revenue: 16500 },
    { month: 'May', revenue: 21000 },
    { month: 'Jun', revenue: 19500 },
  ];

  const departmentData = [
    { name: 'Cardiology', patients: 45 },
    { name: 'Neurology', patients: 32 },
    { name: 'Orthopedics', patients: 28 },
    { name: 'Pediatrics', patients: 38 },
    { name: 'Emergency', patients: 56 },
  ];

  const paymentMethodData = [
    { name: 'Cash', value: 35 },
    { name: 'Credit Card', value: 40 },
    { name: 'Insurance', value: 25 },
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

  const handleExportAll = () => {
    const reportData = patients.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      gender: p.gender,
      bloodGroup: p.bloodGroup,
    }));
    exportToCSV(reportData, 'hospital_report');
  };

  const handleDownloadReport = (reportName: string, reportType: string) => {
    if (reportType === 'PDF') {
      if (reportName === 'Monthly Financial Report') {
        const tableContent = generateTableHTML(
          ['Month', 'Revenue'],
          revenueData.map(r => [r.month, `₹${r.revenue}`])
        );
        exportToPDF('Monthly Financial Report', tableContent, 'financial_report');
      } else if (reportName === 'Department Performance') {
        const tableContent = generateTableHTML(
          ['Department', 'Patients'],
          departmentData.map(d => [d.name, d.patients])
        );
        exportToPDF('Department Performance Report', tableContent, 'department_report');
      }
    } else if (reportType === 'Excel') {
      if (reportName === 'Patient Statistics') {
        exportToExcel(patients.map(p => ({
          Name: p.name,
          Email: p.email,
          Phone: p.phone,
          Gender: p.gender,
          BloodGroup: p.bloodGroup,
        })), 'patient_statistics');
      } else if (reportName === 'Staff Attendance') {
        exportToExcel([
          { Staff: 'Dr. Michael Chen', Role: 'Doctor', Present: 22, Absent: 2 },
          { Staff: 'Dr. Emily Watson', Role: 'Doctor', Present: 21, Absent: 3 },
          { Staff: 'Lisa Thompson', Role: 'Nurse', Present: 24, Absent: 0 },
          { Staff: 'Jennifer Adams', Role: 'Receptionist', Present: 23, Absent: 1 },
        ], 'staff_attendance');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reports & Analytics</h2>
          <p className="text-muted-foreground">Hospital performance metrics and insights</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="march">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="january">January</SelectItem>
              <SelectItem value="february">February</SelectItem>
              <SelectItem value="march">March</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportAll}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">₹52,450</p>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{patients.length}</p>
              <p className="text-xs text-muted-foreground">Total Patients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{appointments.length}</p>
              <p className="text-xs text-muted-foreground">Appointments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">+15.3%</p>
              <p className="text-xs text-muted-foreground">Growth Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patients by Department</CardTitle>
            <CardDescription>Distribution of patients across departments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="patients" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Distribution of payment methods used</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Reports</CardTitle>
            <CardDescription>Download pre-generated reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: 'Monthly Financial Report', type: 'PDF' },
              { name: 'Patient Statistics', type: 'Excel' },
              { name: 'Department Performance', type: 'PDF' },
              { name: 'Staff Attendance', type: 'Excel' },
            ].map((report) => (
              <div key={report.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{report.name}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleDownloadReport(report.name, report.type)}>
                  <Download className="h-4 w-4 mr-2" />
                  {report.type}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
