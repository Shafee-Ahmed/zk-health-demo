const snarkjs = require("snarkjs");

async function getProof() {
    const input = {
        patientAge: 45,
        patientDiagnosis: 16096,
        patientLab: 94,
        minAge: 30,
        maxAge: 70,
        allowedDiagnoses: [16096, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        labMin: 70,
        labMax: 120
    };

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        './main.wasm',
        './circuit_final.zkey'
    );

    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);

    // Try direct parse; if fails, wrap in outer brackets
    let parsed;
    try {
        parsed = JSON.parse(calldata);
    } catch (e) {
        parsed = JSON.parse('[' + calldata + ']');
    }

    const [a, b, c, inputs] = parsed;

    console.log('a:', JSON.stringify(a, null, 2));
    console.log('b:', JSON.stringify(b, null, 2));
    console.log('c:', JSON.stringify(c, null, 2));
    console.log('inputs:', JSON.stringify(inputs, null, 2));
}

getProof().catch(console.error);