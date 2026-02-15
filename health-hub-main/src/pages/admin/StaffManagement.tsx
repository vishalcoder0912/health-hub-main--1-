import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Edit, UserCheck, UserX, Clock, Calendar, LogIn, LogOut } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { mockUsers } from '@/lib/mockData';
import { User } from '@/types';
import { toast } from 'sonner';
import { 
  StaffAttendance, 
  AttendanceStatus,
  STAFF_ATTENDANCE_KEY, 
  attendanceStatusColors, 
  getTodayDate 
} from '@/types/attendance';

export function StaffManagement() {
  // Using the same localStorage key as Reception portal for synchronization
  const { data: users } = useLocalStorage<User>('users', mockUsers);
  const { data: attendance, setData: setAttendance } = useLocalStorage<StaffAttendance>(STAFF_ATTENDANCE_KEY, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(getTodayDate());
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffAttendance | null>(null);

  // Get staff members only (exclude admin and patient)
  const staffRoles = ['doctor', 'nurse', 'receptionist', 'pharmacy', 'laboratory', 'billing'];
  const staffMembers = users.filter(u => staffRoles.includes(u.role));

  // Get attendance for selected date
  const getStaffAttendance = (staffId: string) => {
    return attendance.find(a => a.oddbodyId === staffId && a.date === dateFilter);
  };

  // Get staff with their attendance for selected date
  const getStaffWithAttendance = () => {
    return staffMembers.map(staff => {
      const attendanceRecord = getStaffAttendance(staff.id);
      return {
        ...staff,
        attendance: attendanceRecord || null,
      };
    });
  };

  const staffWithAttendance = getStaffWithAttendance();

  // Filter staff
  const filteredStaff = staffWithAttendance.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'not-arrived') return matchesSearch && !staff.attendance;
    return matchesSearch && staff.attendance?.status === statusFilter;
  });

  // Stats for selected date
  const dateAttendance = attendance.filter(a => a.date === dateFilter);
  const stats = {
    present: dateAttendance.filter(a => a.status === 'present').length,
    absent: dateAttendance.filter(a => a.status === 'absent').length,
    leave: dateAttendance.filter(a => a.status === 'leave').length,
    halfDay: dateAttendance.filter(a => a.status === 'half-day').length,
    checkedIn: dateAttendance.filter(a => a.checkIn && !a.checkOut).length,
    checkedOut: dateAttendance.filter(a => a.checkIn && a.checkOut).length,
    notArrived: staffMembers.length - dateAttendance.length,
  };

  const handleEditAttendance = (staff: typeof staffWithAttendance[0]) => {
    if (staff.attendance) {
      setEditingStaff(staff.attendance);
    } else {
      // Create new attendance record for editing
      setEditingStaff({
        oddbodyId: staff.id,
        oddbodyName: staff.name,
        role: staff.role,
        department: staff.department,
        status: 'absent',
        date: dateFilter,
      });
    }
    setIsEditOpen(true);
  };

  const handleSaveAttendance = () => {
    if (!editingStaff) return;

    const existingIndex = attendance.findIndex(
      a => a.oddbodyId === editingStaff.oddbodyId && a.date === editingStaff.date
    );

    if (existingIndex >= 0) {
      const updated = [...attendance];
      updated[existingIndex] = editingStaff;
      setAttendance(updated);
    } else {
      setAttendance([...attendance, editingStaff]);
    }

    toast.success('Attendance updated successfully');
    setIsEditOpen(false);
    setEditingStaff(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Staff Attendance Management</h2>
        <p className="text-muted-foreground">
          View and manage staff attendance records. Staff check-in is done at Reception.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            <LogIn className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.checkedIn}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Checked Out</CardTitle>
            <LogOut className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.checkedOut}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.leave}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Half Day</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.halfDay}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Not Arrived</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.notArrived}</div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Staff Attendance Records</CardTitle>
              <CardDescription>
                Attendance for {dateFilter === getTodayDate() ? 'Today' : dateFilter}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-[180px]"
              />
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
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
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="leave">On Leave</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                  <SelectItem value="not-arrived">Not Arrived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No staff records found
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">{staff.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{staff.role}</Badge>
                    </TableCell>
                    <TableCell>{staff.department || '-'}</TableCell>
                    <TableCell>
                      {staff.attendance ? (
                        <Badge className={`${attendanceStatusColors[staff.attendance.status]} capitalize`}>
                          {staff.attendance.status}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Not arrived</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {staff.attendance?.checkIn ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <Clock className="h-3 w-3" />
                          {staff.attendance.checkIn}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {staff.attendance?.checkOut ? (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Clock className="h-3 w-3" />
                          {staff.attendance.checkOut}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditAttendance(staff)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Attendance Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Attendance</DialogTitle>
            <DialogDescription>
              Update attendance status for {editingStaff?.oddbodyName} on {editingStaff?.date}
            </DialogDescription>
          </DialogHeader>
          {editingStaff && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editingStaff.status}
                  onValueChange={(v) => setEditingStaff({ ...editingStaff, status: v as AttendanceStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="leave">On Leave</SelectItem>
                    <SelectItem value="half-day">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(editingStaff.status === 'present' || editingStaff.status === 'half-day') && (
                <>
                  <div className="space-y-2">
                    <Label>Check In Time</Label>
                    <Input
                      type="time"
                      value={editingStaff.checkIn || ''}
                      onChange={(e) => setEditingStaff({ ...editingStaff, checkIn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Check Out Time</Label>
                    <Input
                      type="time"
                      value={editingStaff.checkOut || ''}
                      onChange={(e) => setEditingStaff({ ...editingStaff, checkOut: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAttendance}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
