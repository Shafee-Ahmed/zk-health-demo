// Simulated medical records for patients
// In real life, this would be encrypted on IPFS
const medicalRecords = {
  "0x7d1c488930a7d7b23b36302c2cfb96515e0b9d2e": {
    profile: {
      name: "Maria Rodriguez",
      age: 45,
      gender: "Female",
      bloodType: "O+"
    },
    diagnoses: [
      { code: 16096, name: "Hypertension", diagnosedDate: "2020-03-15", status: "active" }
    ],
    labResults: {
      glucose: [94, 98, 102, 95, 97, 101], // last 6 readings
      hba1c: [5.2, 5.4, 5.3],
      cholesterol: {
        ldl: [110, 108, 112],
        hdl: [48, 52, 50],
        total: [178, 180, 182]
      }
    },
    vitalSigns: {
      bloodPressure: [
        { date: "2024-01-15", systolic: 135, diastolic: 85 },
        { date: "2024-02-15", systolic: 138, diastolic: 88 },
        { date: "2024-03-15", systolic: 132, diastolic: 82 },
        { date: "2024-04-15", systolic: 128, diastolic: 80 }
      ],
      heartRate: [72, 75, 70, 74, 73]
    },
    medications: [
      { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", prescribed: "2020-03-15" },
      { name: "Amlodipine", dosage: "5mg", frequency: "Once daily", prescribed: "2021-06-10" }
    ],
    visits: [
      { date: "2024-01-15", doctor: "Dr. Wilson", notes: "BP elevated, continue medication" },
      { date: "2024-02-15", doctor: "Dr. Wilson", notes: "BP improving" },
      { date: "2024-03-15", doctor: "Dr. Chen", notes: "Stable, refill prescriptions" }
    ],
    allergies: ["Penicillin", "Sulfa"],
    immunizations: [
      { name: "Influenza", date: "2023-10-15" },
      { name: "COVID-19 Booster", date: "2023-11-20" }
    ]
  },
  
  // You can add more patients here
  "0xd3C0D4b47A2Bf8998A7bDa04A0248a8F4579D052": {
    profile: {
      name: "John Smith",
      age: 52,
      gender: "Male",
      bloodType: "A+"
    },
    diagnoses: [
      { code: 59621, name: "Chronic Kidney Disease", diagnosedDate: "2019-08-22", status: "active" },
      { code: 40055, name: "Type 2 Diabetes", diagnosedDate: "2018-05-10", status: "active" }
    ],
    labResults: {
      glucose: [145, 152, 138, 149, 155, 140],
      hba1c: [7.2, 7.5, 7.1],
      creatinine: [1.4, 1.5, 1.4, 1.6]
    },
    vitalSigns: {
      bloodPressure: [
        { date: "2024-01-10", systolic: 142, diastolic: 92 },
        { date: "2024-02-10", systolic: 138, diastolic: 90 },
        { date: "2024-03-10", systolic: 135, diastolic: 88 }
      ],
      heartRate: [78, 80, 76, 82]
    },
    medications: [
      { name: "Metformin", dosage: "500mg", frequency: "Twice daily", prescribed: "2018-05-10" },
      { name: "Lisinopril", dosage: "20mg", frequency: "Once daily", prescribed: "2019-08-22" }
    ]
  }
};

export const getPatientMedicalRecord = (patientAddress) => {
  return medicalRecords[patientAddress.toLowerCase()] || null;
};