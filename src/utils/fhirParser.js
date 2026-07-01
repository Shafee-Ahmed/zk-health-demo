/**
 * FHIR Parser for Synthea patient bundles
 * Extracts age, diagnosis code, and any numeric lab value.
 */
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export const parseFHIRBundle = (bundle) => {
  try {
    // 1. Find Patient resource
    const patientEntry = bundle.entry.find(e => e.resource?.resourceType === 'Patient');
    if (!patientEntry) throw new Error('No Patient resource found');
    const patient = patientEntry.resource;

    // 2. Calculate age from birthDate
    const birthDate = patient.birthDate;
    if (!birthDate) throw new Error('Patient has no birthDate');
    const age = calculateAge(birthDate);
    if (!age) throw new Error('Could not calculate age');

    // 3. Find first Condition (diagnosis)
    const conditionEntry = bundle.entry.find(e => e.resource?.resourceType === 'Condition');
    let diagnosis = null;
    if (conditionEntry) {
      const coding = conditionEntry.resource.code?.coding?.[0];
      if (coding && coding.code) {
        diagnosis = parseInt(coding.code.replace(/\D/g, '')) || null;
      }
    }
    if (!diagnosis) throw new Error('No diagnosis code found');

    // 4. Find ANY numeric lab observation (if glucose not present)
    let lab = null;
    const observationEntries = bundle.entry.filter(e => e.resource?.resourceType === 'Observation');
    for (const entry of observationEntries) {
      const value = entry.resource.valueQuantity?.value;
      if (value && typeof value === 'number') {
        lab = Math.round(value);
        break; // take first numeric lab found
      }
    }
    if (!lab) throw new Error('No numeric lab value found');

    return { age, diagnosis, lab, patientId: patient.id, gender: patient.gender };
  } catch (error) {
    console.error('FHIR parsing error:', error.message);
    throw error;
  }
};