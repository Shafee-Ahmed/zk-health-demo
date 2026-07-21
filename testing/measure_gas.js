const { ethers } = require("ethers");
const fs = require("fs");
const snarkjs = require("snarkjs");

// ==================== CONFIGURATION ====================
const PRIVATE_KEY = "319c6e447fcfc24597dd56a571fd1869fab4f5425b550ee1d4373ceecae7fdc0";

// Contract Addresses (Sepolia)
const CONSENT_MANAGER_ADDRESS = "0x38501C6C3A3eE36EF052105D2d7601d8c2607230";
const DATA_ACCESS_V2_ADDRESS = "0x7EaD99F1F3E6c886E1890d04B61b864f668104E9";
const ACCESS_TOKEN_ADDRESS = "0x882007Be4354AB0FcC4D49acb4D462ff69a2D586";
const ANTI_RESALE_ADDRESS = "0x46e28d644B96DaBaA691076323450bB7D1EBA2E8";

// ===== FIX: Get ABI as array properly =====
// Option 1: If your ABI exports as array
const consentManagerABI = require("../src/contracts/consentManagerABI.js");
const dataAccessV2ABI = require("../src/contracts/dataAccessV2ABI.js");
const accessTokenABI = require("../src/contracts/accessTokenABI.js");
const antiResaleABI = require("../src/contracts/antiResaleABI.js");

// If ABI is exported as { default: [...] }, extract it
const getABI = (abi) => {
    if (Array.isArray(abi)) return abi;
    if (abi && abi.default && Array.isArray(abi.default)) return abi.default;
    if (typeof abi === 'string') return JSON.parse(abi);
    return abi;
};

const CONSENT_ABI = getABI(consentManagerABI);
const DATA_ACCESS_ABI = getABI(dataAccessV2ABI);
const ACCESS_TOKEN_ABI = getABI(accessTokenABI);
const ANTI_RESALE_ABI = getABI(antiResaleABI);

// Debug: Check if ABIs are valid
console.log("✅ ABI loaded - ConsentManager:", Array.isArray(CONSENT_ABI) ? "OK" : "FAILED");

// Patient data
const patient = { age: 45, diagnosis: 16096, lab: 94 };
const query = { 
    minAge: 30, 
    maxAge: 70, 
    allowedDiagnoses: [16096], 
    labMin: 70, 
    labMax: 120 
};

const RPC_URL = "https://ethereum-sepolia.publicnode.com";
// ========================================================

async function generateProof() {
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
    while (input.allowedDiagnoses.length < 10) input.allowedDiagnoses.push(0);

    console.log("   Generating ZK proof...");
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "./main.wasm",
        "./circuit_final.zkey"
    );

    // ===== FIX: Robust calldata parsing =====
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    
    // Extract JSON part between first [ and last ]
    const startIdx = calldata.indexOf('[');
    const endIdx = calldata.lastIndexOf(']');
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        throw new Error('Invalid calldata format');
    }
    const jsonStr = calldata.substring(startIdx, endIdx + 1);
    const [a, b, c, inputs] = JSON.parse(jsonStr);
    
    return { a, b, c, inputs };
}

async function measureGas() {
    console.log("========================================");
    console.log("⛽ Gas Cost Measurement on Sepolia");
    console.log("========================================\n");

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`Connected: ${signer.address}`);
    const balance = await signer.getBalance();
    console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH\n`);

    const results = [];

    // 1. Consent Creation
    console.log("1️⃣ Measuring Consent Creation Gas...");
    try {
        const consentManager = new ethers.Contract(CONSENT_MANAGER_ADDRESS, CONSENT_ABI, signer);
        const dataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`test_${Date.now()}`));
        const policyHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("policy_test"));
        const tx = await consentManager.createConsent(dataHash, policyHash, "ipfs://test");
        const receipt = await tx.wait();
        const gasUsed = receipt.gasUsed.toString();
        results.push({ operation: "Consent Creation", gas: gasUsed });
        console.log(`   ✅ ${gasUsed} gas\n`);
    } catch (err) {
        console.log(`   ❌ Failed: ${err.message}\n`);
    }

    // 2. Generate Proof
    console.log("2️⃣ Generating ZK Proof...");
    let proofData;
    try {
        proofData = await generateProof();
        console.log(`   ✅ Proof generated\n`);
    } catch (err) {
        console.log(`   ❌ Failed: ${err.message}\n`);
        return;
    }

    // 3. Request Access
    console.log("3️⃣ Measuring Request Access Gas...");
    try {
        const consentManager = new ethers.Contract(CONSENT_MANAGER_ADDRESS, CONSENT_ABI, signer);
        const dataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`access_${Date.now()}`));
        const policyHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("policy_access"));
        const txConsent = await consentManager.createConsent(dataHash, policyHash, "ipfs://test");
        const receiptConsent = await txConsent.wait();
        const consentId = receiptConsent.events.find(e => e.event === "ConsentCreated").args.consentId;
        console.log(`   Consent created: ${consentId}`);

        const dataAccessV2 = new ethers.Contract(DATA_ACCESS_V2_ADDRESS, DATA_ACCESS_ABI, signer);
        const tx = await dataAccessV2.requestAccessWithZK(
            consentId,
            proofData.a,
            proofData.b,
            proofData.c,
            proofData.inputs,
            "ipfs://test",
            86400
        );
        const receipt = await tx.wait();
        const gasUsed = receipt.gasUsed.toString();
        results.push({ operation: "Proof Verification + Token Mint", gas: gasUsed });
        console.log(`   ✅ ${gasUsed} gas\n`);

        const event = receipt.events.find(e => e.event === "AccessGranted");
        const tokenId = event ? event.args.tokenId.toString() : "unknown";
        console.log(`   Token ID: ${tokenId}\n`);

        // 4. Token Use
        if (tokenId !== "unknown") {
            console.log("4️⃣ Measuring Token Use Gas...");
            const antiResale = new ethers.Contract(ANTI_RESALE_ADDRESS, ANTI_RESALE_ABI, signer);
            const tx = await antiResale.useTokenWithAntiResale(tokenId);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed.toString();
            results.push({ operation: "Token Use (AntiResale)", gas: gasUsed });
            console.log(`   ✅ ${gasUsed} gas\n`);
        }
    } catch (err) {
        console.log(`   ❌ Failed: ${err.message}\n`);
    }

    console.log("========================================");
    console.log("📊 Gas Cost Summary");
    console.log("========================================");
    results.forEach(r => {
        console.log(`${r.operation.padEnd(35)} ${r.gas} gas`);
    });
    console.log("========================================\n");

    fs.writeFileSync("gas_benchmark_results.json", JSON.stringify({
        timestamp: new Date().toISOString(),
        network: "Sepolia",
        signer: signer.address,
        results: results
    }, null, 2));
    console.log("✅ Results saved to gas_benchmark_results.json");
}

measureGas().catch(console.error);