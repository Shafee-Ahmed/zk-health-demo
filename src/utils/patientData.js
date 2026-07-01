// Simulated database of patients and their data
// In real life, this would be on-chain or in a secure registry
const patientDirectory = [
  {
    address: "0x7d1c488930A7D7B23B36302C2cfB96515e0B9D2E".toLowerCase(),
    data: {
      age: 45,
      diagnosis: 16096,
      lab: 94
    }
  },
  {
    address: "0xF213fe9EF47F025a6a0F26D9BBF1403Dd80fAB18".toLowerCase(),
    data: {
      age: 52,
      diagnosis: 59621,
      lab: 110
    }
  },
  {
    address: "0xd3C0D4b47A2Bf8998A7bDa04A0248a8F4579D052".toLowerCase(),
    data: {
      age: 38,
      diagnosis: 40055,
      lab: 85
    }
  }
];

export const getAllPatients = () => {
  return patientDirectory.map(p => ({
    address: p.address,
    // Don't reveal data - just return address
  }));
};

export const checkPatientEligibility = (patientAddress, query) => {
  const patient = patientDirectory.find(p => p.address === patientAddress.toLowerCase());
  if (!patient) return false;
  
  const meetsAge = patient.data.age >= query.minAge && patient.data.age <= query.maxAge;
  const meetsDiagnosis = query.allowedDiagnoses.includes(patient.data.diagnosis);
  const meetsLab = patient.data.lab >= query.labMin && patient.data.lab <= query.labMax;
  
  return meetsAge && meetsDiagnosis && meetsLab;
};

// For generating proofs (simulated)
export const generateProofForPatient = (patientAddress, query) => {
  const patient = patientDirectory.find(p => p.address === patientAddress.toLowerCase());
  if (!patient) return null;
  
  // In real app, this would call snarkjs
  // For demo, return mock proof if eligible
  const meetsAge = patient.data.age >= query.minAge && patient.data.age <= query.maxAge;
  const meetsDiagnosis = query.allowedDiagnoses.includes(patient.data.diagnosis);
  const meetsLab = patient.data.lab >= query.labMin && patient.data.lab <= query.labMax;
  
  if (meetsAge && meetsDiagnosis && meetsLab) {
    // Return mock proof (same as before)
    return {
      a: ["0x00ab09fbe4938d74f1c23180515872094509ccbc0837f183153b5ae0e276a236","0x06e4685e5d02b04d22fd5a3df92494efdf33969b0e61ae9c2d7978c66169be2f"],
      b: [["0x1dfb4606a09ee2dd089ce7a58e55cf5969e089d4ff01e99bb31328852f1297b4","0x29f2d66bec0b5182ac94355fc98202f1a3a9c0d8d7de8d1ed7c516d0208882b7"],["0x1fc8f65f43d7517d69277503155ec553af95b23bfe28a509de6a526e7f648030","0x034db8480d814db3e44e15030035278d6a49596329c2fd30c848b17fdf0f39ad"]],
      c: ["0x122f08679a0f06ed07e43387d96652063503fea1cbe53bdd55969945d3ce3f89","0x06bea9632f77ef8f23c959d53fcda9f03d1d1e124904bb93cdc9599ca2fff40d"],
      inputs: ["0x0000000000000000000000000000000000000000000000000000000000000001","0x000000000000000000000000000000000000000000000000000000000000001e","0x0000000000000000000000000000000000000000000000000000000000000046","0x000000000000000000000000000000000000000000000000000000000000e8e5","0x0000000000000000000000000000000000000000000000000000000000003ee0","0x0000000000000000000000000000000000000000000000000000000000009c77","0x000000000000000000000000000000000000000000000000000000000000579d","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000046","0x0000000000000000000000000000000000000000000000000000000000000078"]
    };
  }
  return null;
};