const fs = require('fs');
const path = require('path');

// Path to your Synthea output (EXACT path)
const FHIR_FOLDER = 'D:/study/Thesis/zk-circuits/synthea/output/fhir/';
const OUTPUT_FILE = './synthea_patients.json';

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

function extractDiagnosisCode(bundle) {
    const conditions = bundle.entry.filter(e => e.resource && e.resource.resourceType === 'Condition');
    if (conditions.length === 0) return 0;
    const coding = conditions[0].resource.code?.coding?.[0];
    if (coding && coding.code) {
        return parseInt(coding.code.replace(/\D/g, '').slice(0, 5)) || 0;
    }
    return 0;
}

function extractLabValue(bundle) {
    const glucoseLOINC = '2339-0';
    const observations = bundle.entry.filter(e => 
        e.resource && 
        e.resource.resourceType === 'Observation' &&
        e.resource.code?.coding?.some(c => c.code === glucoseLOINC)
    );
    if (observations.length === 0) return 100;
    const obs = observations[0].resource;
    const value = obs.valueQuantity?.value;
    return value ? Math.round(value) : 100;
}

function extractAllPatients() {
    if (!fs.existsSync(FHIR_FOLDER)) {
        console.error(`❌ Folder not found: ${FHIR_FOLDER}`);
        console.log('Please make sure your Synthea output folder exists.');
        return;
    }

    const files = fs.readdirSync(FHIR_FOLDER).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} JSON files.`);

    const patients = [];

    files.forEach((file, index) => {
        try {
            const content = fs.readFileSync(path.join(FHIR_FOLDER, file), 'utf8');
            const bundle = JSON.parse(content);

            const patientEntry = bundle.entry.find(e => e.resource && e.resource.resourceType === 'Patient');
            if (!patientEntry) return;

            const patientResource = patientEntry.resource;
            const birthDate = patientResource.birthDate;
            if (!birthDate) return;

            const age = calculateAge(birthDate);
            const diagnosis = extractDiagnosisCode(bundle);
            const lab = extractLabValue(bundle);

            patients.push({
                id: `patient_${index + 1}`,
                file: file,
                age: age,
                diagnosis: diagnosis,
                lab: lab,
                gender: patientResource.gender || 'unknown'
            });

        } catch (err) {
            console.error(`Error processing ${file}:`, err.message);
        }
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(patients, null, 2));
    console.log(`✅ Saved ${patients.length} patients to ${OUTPUT_FILE}`);

    console.log('\n📊 Sample extracted patients:');
    patients.slice(0, 5).forEach(p => {
        console.log(`- ${p.id}: Age ${p.age}, Diagnosis ${p.diagnosis}, Lab ${p.lab}, Gender ${p.gender}`);
    });
}

extractAllPatients();