const today = "2024-03-15";

export const defaultCollections: Record<string, unknown> = {
  users: [
    { id: "admin-1", email: "admin@hospital.com", name: "Dr. Suresh Gupta", role: "admin", phone: "+91-98100-10001", createdAt: "2024-01-01" },
    { id: "doctor-1", email: "doctor@hospital.com", name: "Dr. Anil Sharma", role: "doctor", department: "Cardiology", specialization: "Cardiologist", phone: "+91-98100-10002", createdAt: "2024-01-15" },
    { id: "doctor-2", email: "doctor2@hospital.com", name: "Dr. Kavita Rao", role: "doctor", department: "Neurology", specialization: "Neurologist", phone: "+91-98100-10003", createdAt: "2024-02-01" },
    { id: "receptionist-1", email: "reception@hospital.com", name: "Neha Verma", role: "receptionist", phone: "+91-98100-10004", createdAt: "2024-01-20" },
    { id: "nurse-1", email: "nurse@hospital.com", name: "Rekha Nair", role: "nurse", department: "General Ward", phone: "+91-98100-10005", createdAt: "2024-02-10" },
    { id: "pharmacy-1", email: "pharmacy@hospital.com", name: "Ramesh Iyer", role: "pharmacy", phone: "+91-98100-10006", createdAt: "2024-01-25" },
    { id: "lab-1", email: "lab@hospital.com", name: "Deepak Joshi", role: "laboratory", phone: "+91-98100-10007", createdAt: "2024-02-05" },
    { id: "billing-1", email: "billing@hospital.com", name: "Pooja Malhotra", role: "billing", phone: "+91-98100-10008", createdAt: "2024-02-15" },
    { id: "patient-1", email: "patient@email.com", name: "Arjun Mehta", role: "patient", phone: "+91-98200-20001", createdAt: "2024-03-01" },
    { id: "bloodbank-1", email: "bloodbank@hospital.com", name: "Dr. Sanjay Reddy", role: "bloodbank", phone: "+91-98100-10009", createdAt: "2024-02-20" }
  ],
  patients: [
    { id: "patient-1", name: "Arjun Mehta", email: "patient@email.com", phone: "+91-98200-20001", dateOfBirth: "1985-06-15", gender: "male", bloodGroup: "O+", address: "45 MG Road, New Delhi", emergencyContact: "+91-98200-20002", medicalHistory: [], createdAt: "2024-03-01" },
    { id: "patient-2", name: "Meera Joshi", email: "meera.j@email.com", phone: "+91-98200-20003", dateOfBirth: "1990-03-22", gender: "female", bloodGroup: "A+", address: "Mumbai", emergencyContact: "+91-98200-20004", medicalHistory: [], createdAt: "2024-03-05" }
  ],
  appointments: [
    { id: "apt-1", patientId: "patient-1", patientName: "Arjun Mehta", doctorId: "doctor-1", doctorName: "Dr. Anil Sharma", department: "Cardiology", date: today, time: "09:00", status: "scheduled", type: "opd", tokenNumber: 1 },
    { id: "apt-2", patientId: "patient-2", patientName: "Meera Joshi", doctorId: "doctor-1", doctorName: "Dr. Anil Sharma", department: "Cardiology", date: today, time: "09:30", status: "scheduled", type: "opd", tokenNumber: 2 }
  ],
  medicines: [
    { id: "med-1", name: "Amoxicillin 500mg", genericName: "Amoxicillin", category: "Antibiotics", manufacturer: "Cipla Ltd", batchNumber: "AMX-2024-001", expiryDate: "2025-06-30", quantity: 500, unitPrice: 12.5, reorderLevel: 100 }
  ],
  labTests: [
    { id: "lab-1", patientId: "patient-1", patientName: "Arjun Mehta", doctorId: "doctor-1", doctorName: "Dr. Anil Sharma", testName: "Complete Blood Count", testType: "Hematology", status: "completed", requestDate: "2024-03-14", completedDate: "2024-03-14", result: "Normal", cost: 500 }
  ],
  bills: [
    { id: "bill-1", patientId: "patient-1", patientName: "Arjun Mehta", date: today, items: [{ description: "Consultation Fee", quantity: 1, unitPrice: 500, total: 500 }], subtotal: 500, discount: 0, tax: 50, total: 550, status: "paid", paymentMethod: "UPI" }
  ],
  beds: [
    { id: "bed-1", wardId: "ward-1", wardName: "General Ward A", bedNumber: "A-101", status: "available" }
  ],
  departments: [
    { id: "dept-1", name: "Cardiology", head: "Dr. Anil Sharma", description: "Heart care", doctorCount: 5, nurseCount: 8 },
    { id: "dept-2", name: "Neurology", head: "Dr. Kavita Rao", description: "Neuro care", doctorCount: 4, nurseCount: 6 }
  ],
  vitals: [
    { id: "vital-1", patientId: "patient-1", nurseId: "nurse-1", recordedAt: "2024-03-15T08:00:00", bloodPressure: "120/80", temperature: 98.6, pulse: 72, respiratoryRate: 16, oxygenSaturation: 98, weight: 75 }
  ],
  bloodInventory: [
    { id: "bi-1", bloodGroup: "A+", units: 25, lastUpdated: today, lowStockThreshold: 10 }
  ],
  bloodDonors: [
    { id: "donor-1", name: "Rajesh Kumar", phone: "+91-98765-43210", email: "rajesh.k@email.com", bloodGroup: "O+", dateOfBirth: "1990-05-12", gender: "male", address: "Delhi", eligibleToDonate: true, lastDonationDate: "2024-01-10", nextEligibleDate: "2024-04-10", totalDonations: 8, createdAt: "2023-01-15" }
  ],
  bloodCollections: [],
  bloodTests: [],
  bloodStorage: [],
  bloodIssues: [],
  bloodRequests: [],
  bloodActivityLogs: [],
  staffAttendance: [],
  refillRequests: [],
  medicineReturns: [],
  prescriptions: [],
  systemSettings: {},
  userNotifications: {},
  userPasswords: {},
  userProfiles: {}
};

export const defaultCollectionKeys = Object.keys(defaultCollections);
