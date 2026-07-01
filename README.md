# ZK Health Data Sharing Framework

**A Patient-Centric Medical Data Sharing Framework with Zero-Knowledge Consent Management and Anti-Resale Mechanism**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-green)](https://soliditylang.org/)
[![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-lightgrey)](https://ethereum.org/)

---

## 🏥 Overview

This project is a **patient-centric medical data sharing framework** that integrates:

- **Zero-Knowledge Proofs (ZK-SNARKs)** – Multi-condition eligibility verification (age, diagnosis, lab) without exposing private data
- **Blockchain Smart Contracts** – Consent management, access tokens, and anti-resale enforcement on Ethereum Sepolia
- **Self-Sovereign Identity (SSI)** – Patients control their own Verifiable Credentials
- **IPFS Storage** – Decentralized data storage via Pinata
- **FHIR Interoperability** – Import real hospital data via Synthea JSON files

## 🎯 Key Features

- ✅ Multi-condition ZK circuit (age range + diagnosis inclusion + lab range)
- ✅ Single-use access token anti-resale mechanism
- ✅ 4 role-based dashboards (Hospital, Patient, Researcher, Auditor)
- ✅ 3-way payment split (70% Patient, 20% Hospital, 10% Platform)
- ✅ Complete audit trail on blockchain
- ✅ FHIR interoperability for real-world data

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| Blockchain | Ethereum Sepolia Testnet |
| Smart Contracts | Solidity 0.8.19 |
| ZK Framework | Circom 2.0, SnarkJS |
| Frontend | React.js, ethers.js |
| Identity | DID:key, JWT |
| Storage | IPFS via Pinata |
| Data Format | FHIR R4 (Synthea) |

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| Proof Generation Time | 12-24 seconds |
| Proof Verification Gas | ~213,456 gas |
| Consent Creation Gas | ~87,234 gas |
| Token Mint Gas | ~124,567 gas |

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- MetaMask browser extension
- Sepolia testnet ETH

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/zk-health-demo.git
cd zk-health-demo

# Install dependencies
npm install

# Configure Pinata API keys in src/utils/ipfs.js
# Configure MetaMask accounts

# Start the application
npm start

# Project Structure
zk-health-demo/
├── contracts/          # Solidity smart contracts
├── circuits/           # Circom ZK circuits
├── src/
│   ├── components/     # React components (Hospital, Patient, Researcher, Auditor)
│   ├── utils/          # Utilities (IPFS, FHIR, proof generation)
│   └── contracts/      # ABI files
├── public/circuits/    # Compiled WASM and ZKEY files
└── README.md
# Contact Address
AccessToken	0x882007Be4354AB0FcC4D49acb4D462ff69a2D586
ConsentManager	0x38501C6C3A3eE36EF052105D2d7601d8c2607230
Verifier	0x36D9271959C1067CB4c4adf19D0A803375D6BE87
DataAccessV2	0x7EaD99F1F3E6c886E1890d04B61b864f668104E9
AntiResale	0x46e28d644B96DaBaA691076323450bB7D1EBA2E8


# Thesis Submission
This project was developed as part of a Bachelor of Science in Information and Communication Engineering thesis at Bangladesh University of Professionals, under the supervision of Abu Sayed Md. Mostafizur Rahaman, Professor at Jahangirnagar University.


#License
MIT