const snarkjs = require("snarkjs");
const fs = require("fs");

// ===== CHECK IF FILES EXIST =====
const WASM_PATH = "./main.wasm";
const ZKEY_PATH = "./circuit_final.zkey";

if (!fs.existsSync(WASM_PATH)) {
    console.error(`❌ WASM file not found at: ${WASM_PATH}`);
    console.log("Make sure you have copied main.wasm to the testing folder.");
    process.exit(1);
}
if (!fs.existsSync(ZKEY_PATH)) {
    console.error(`❌ ZKEY file not found at: ${ZKEY_PATH}`);
    console.log("Make sure you have copied circuit_final.zkey to the testing folder.");
    process.exit(1);
}

// Load your patient data
const patients = JSON.parse(fs.readFileSync("./synthea_patients.json", "utf8"));

// Researcher query (adjust as needed)
const query = {
    minAge: 30,
    maxAge: 70,
    allowedDiagnoses: [59621, 16096, 40055, 22429],
    labMin: 70,
    labMax: 120
};

async function measureProofTime(patient, index) {
    const input = {
        patientAge: patient.age,
        patientDiagnosis: patient.diagnosis,
        patientLab: patient.lab,
        minAge: query.minAge,
        maxAge: query.maxAge,
        allowedDiagnoses: [...query.allowedDiagnoses],
        labMin: query.labMin,
        labMax: query.labMax
    };

    // Pad allowedDiagnoses to 10
    while (input.allowedDiagnoses.length < 10) {
        input.allowedDiagnoses.push(0);
    }

    const start = process.hrtime.bigint();

    // Using the files in the current directory
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        WASM_PATH,
        ZKEY_PATH
    );

    const end = process.hrtime.bigint();
    const timeMs = Number(end - start) / 1_000_000;

    return {
        id: patient.id || `patient_${index + 1}`,
        age: patient.age,
        diagnosis: patient.diagnosis,
        lab: patient.lab,
        timeMs,
        seconds: (timeMs / 1000).toFixed(2),
        proof,
        publicSignals
    };
}

async function runBenchmark() {
    console.log("========================================");
    console.log("🔬 ZK Proof Generation Benchmark");
    console.log("========================================\n");

    console.log("Patient Data:");
    console.log("ID\tAge\tDiag\tLab");
    patients.forEach((p, i) => {
        console.log(`${p.id || `patient_${i+1}`}\t${p.age}\t${p.diagnosis}\t${p.lab}`);
    });
    console.log("\n----------------------------------------\n");

    console.log("Generating proofs...\n");

    const results = [];
    for (let i = 0; i < patients.length; i++) {
        const patient = patients[i];
        process.stdout.write(`  ${patient.id || `patient_${i+1}`}... `);
        const result = await measureProofTime(patient, i);
        results.push(result);
        console.log(`✅ ${result.seconds}s`);
    }

    // Calculate stats
    const times = results.map(r => r.timeMs);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    console.log("\n----------------------------------------");
    console.log("📊 Results Summary");
    console.log("----------------------------------------");
    console.log(`Patients tested: ${results.length}`);
    console.log(`Min time:        ${(min / 1000).toFixed(2)}s`);
    console.log(`Max time:        ${(max / 1000).toFixed(2)}s`);
    console.log(`Average time:    ${(avg / 1000).toFixed(2)}s`);
    console.log("----------------------------------------\n");

    console.log("Detailed Results:");
    console.log("ID\t\tTime (s)");
    console.log("----------------------------------------");
    results.forEach(r => {
        console.log(`${r.id.padEnd(15)}\t${r.seconds}`);
    });
    console.log("----------------------------------------");

    // Save results to file
    const output = {
        timestamp: new Date().toISOString(),
        query: query,
        patients: results.map(r => ({
            id: r.id,
            age: r.age,
            diagnosis: r.diagnosis,
            lab: r.lab,
            timeSeconds: parseFloat(r.seconds)
        })),
        summary: {
            count: results.length,
            minSeconds: parseFloat((min / 1000).toFixed(2)),
            maxSeconds: parseFloat((max / 1000).toFixed(2)),
            avgSeconds: parseFloat((avg / 1000).toFixed(2))
        }
    };

    fs.writeFileSync("benchmark_results.json", JSON.stringify(output, null, 2));
    console.log("\n✅ Results saved to benchmark_results.json");
}

runBenchmark().catch(console.error);