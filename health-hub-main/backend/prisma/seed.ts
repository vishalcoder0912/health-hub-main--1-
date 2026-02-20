import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const users: Array<{
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    phone: string;
    department?: string;
    specialization?: string;
  }> = [
    { id: "admin-1", fullName: "Dr. Suresh Gupta", email: "admin@hospital.com", role: UserRole.admin, phone: "+91-98100-10001" },
    { id: "doctor-1", fullName: "Dr. Anil Sharma", email: "doctor@hospital.com", role: UserRole.doctor, department: "Cardiology", specialization: "Cardiologist", phone: "+91-98100-10002" },
    { id: "doctor-2", fullName: "Dr. Kavita Rao", email: "doctor2@hospital.com", role: UserRole.doctor, department: "Neurology", specialization: "Neurologist", phone: "+91-98100-10003" },
    { id: "receptionist-1", fullName: "Neha Verma", email: "reception@hospital.com", role: UserRole.receptionist, phone: "+91-98100-10004" },
    { id: "nurse-1", fullName: "Rekha Nair", email: "nurse@hospital.com", role: UserRole.nurse, department: "General Ward", phone: "+91-98100-10005" },
    { id: "pharmacy-1", fullName: "Ramesh Iyer", email: "pharmacy@hospital.com", role: UserRole.pharmacy, phone: "+91-98100-10006" },
    { id: "lab-1", fullName: "Deepak Joshi", email: "lab@hospital.com", role: UserRole.laboratory, phone: "+91-98100-10007" },
    { id: "billing-1", fullName: "Pooja Malhotra", email: "billing@hospital.com", role: UserRole.billing, phone: "+91-98100-10008" },
    { id: "patient-1", fullName: "Arjun Mehta", email: "patient@email.com", role: UserRole.patient, phone: "+91-98200-20001" },
    { id: "bloodbank-1", fullName: "Dr. Sanjay Reddy", email: "bloodbank@hospital.com", role: UserRole.bloodbank, phone: "+91-98100-10009" }
  ];

  let adminId = "";
  let doctorId = "";
  for (const user of users) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        passwordHash,
        role: user.role,
        phone: user.phone,
        department: user.department,
        specialization: user.specialization
      }
    });

    if (user.role === UserRole.admin) adminId = created.id;
    if (user.email === "doctor@hospital.com") doctorId = created.id;
  }

  const patient = await prisma.patient.upsert({
    where: { email: "patient@email.com" },
    update: {},
    create: {
      id: "patient-1",
      fullName: "Arjun Mehta",
      email: "patient@email.com",
      phone: "+91-98200-20001",
      dateOfBirth: new Date("1985-06-15"),
      gender: "male",
      bloodGroup: "O+",
      address: "45 MG Road, Connaught Place, New Delhi 110001",
      emergencyContact: "+91-98200-20002"
    }
  });

  const appointmentsCount = await prisma.appointment.count();
  if (appointmentsCount === 0 && doctorId) {
    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId,
        department: "Cardiology",
        date: new Date("2026-02-21"),
        time: "09:00",
        status: "scheduled",
        type: "opd",
        notes: "Seeded sample appointment"
      }
    });
  }

  console.log(`Seed complete. Admin user id: ${adminId}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
