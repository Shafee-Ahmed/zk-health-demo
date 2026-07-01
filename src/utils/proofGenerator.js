import { groth16 } from 'snarkjs';

export const generateRealProof = async (patientData, query) => {
  console.log('Generating real ZK proof with:', { patientData, query });
  
  // Pad allowedDiagnoses to length 10
  const paddedDiagnoses = [...query.allowedDiagnoses];
  while (paddedDiagnoses.length < 10) {
    paddedDiagnoses.push(0);
  }
  
  const input = {
    patientAge: patientData.age,
    patientDiagnosis: patientData.diagnosis,
    patientLab: patientData.lab,
    minAge: query.minAge,
    maxAge: query.maxAge,
    allowedDiagnoses: paddedDiagnoses,
    labMin: query.labMin,
    labMax: query.labMax
  };
  
  console.log('Circuit input:', input);
  
  try {
    // Load wasm and zkey files from public folder
    const wasmPath = '/circuits/main_js/main.wasm';
    const zkeyPath = '/circuits/keys/circuit_final.zkey';
    
    console.log('Loading wasm from:', wasmPath);
    console.log('Loading zkey from:', zkeyPath);
    
    // Generate proof using groth16
    const { proof, publicSignals } = await groth16.fullProve(
      input,
      wasmPath,
      zkeyPath
    );
    
    console.log('Proof generated successfully');
    console.log('Public signals:', publicSignals);
    
    // Format for Solidity
    const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
    const normalizedCalldata = calldata.trim();
    console.log('Calldata length:', normalizedCalldata.length);

    // snarkjs can return either:
    // 1) a full JSON array: [[...],[...],[...],[...]]
    // 2) comma-separated top-level arrays: [...],[...],[...],[...]
    // Try both formats.
    let parsed;
    try {
      parsed = JSON.parse(normalizedCalldata);
    } catch {
      parsed = JSON.parse(`[${normalizedCalldata}]`);
    }
    
    // parsed should be an array of 4 elements
    if (!Array.isArray(parsed) || parsed.length !== 4) {
      throw new Error('Invalid calldata format (expected 4 proof sections)');
    }
    
    const [a, b, c, inputs] = parsed;
    
    // Validate each part
    if (!Array.isArray(a) || a.length !== 2) {
      throw new Error('Invalid proof component a');
    }
    if (!Array.isArray(b) || b.length !== 2 || !Array.isArray(b[0]) || b[0].length !== 2) {
      throw new Error('Invalid proof component b');
    }
    if (!Array.isArray(c) || c.length !== 2) {
      throw new Error('Invalid proof component c');
    }
    if (!Array.isArray(inputs) || inputs.length !== 15) {
      throw new Error('Invalid inputs array');
    }
    
    console.log('✅ Proof parsed successfully');
    
    return { a, b, c, inputs, publicSignals };
  } catch (err) {
    console.error('Proof generation error:', err);
    throw new Error(`Proof generation failed: ${err.message}`);
  }
};

// Helper to check if patient meets criteria (for UI feedback)
export const checkEligibility = (patientData, query) => {
  const meetsAge = patientData.age >= query.minAge && patientData.age <= query.maxAge;
  const meetsDiagnosis = query.allowedDiagnoses.includes(patientData.diagnosis);
  const meetsLab = patientData.lab >= query.labMin && patientData.lab <= query.labMax;
  return meetsAge && meetsDiagnosis && meetsLab;
};