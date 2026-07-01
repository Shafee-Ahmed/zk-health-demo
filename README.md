# ZK Health Data Sharing Framework

A patient-centric medical data sharing framework with zero-knowledge consent management and an anti-resale mechanism.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-green)](https://soliditylang.org/)
[![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-lightgrey)](https://ethereum.org/)

## Overview

This project combines blockchain, zero-knowledge proofs, and decentralized storage to let patients control how their medical data is shared.

It includes:

- Zero-knowledge proof checks for multi-condition eligibility validation without exposing private data
- Smart contracts for consent management, access tokens, and anti-resale enforcement on Ethereum Sepolia
- Self-sovereign identity support so patients can manage their own verifiable credentials
- IPFS storage through Pinata for decentralized document hosting
- FHIR interoperability for importing structured hospital data from Synthea JSON files

## Key Features

- Multi-condition ZK circuit for age range, diagnosis inclusion, and lab range checks
- Single-use access token flow with anti-resale protection
- Role-based dashboards for Hospital, Patient, Researcher, and Auditor users
- 3-way payment split: 70% Patient, 20% Hospital, 10% Platform
- Full audit trail recorded on-chain
- FHIR support for real-world healthcare data integration

## Technology Stack

| Layer | Technology |
| --- | --- |
| Blockchain | Ethereum Sepolia Testnet |
| Smart Contracts | Solidity 0.8.19 |
| ZK Framework | Circom 2.0, SnarkJS |
| Frontend | React.js, ethers.js |
| Identity | DID:key, JWT |
| Storage | IPFS via Pinata |
| Data Format | FHIR R4 (Synthea) |

## Performance Snapshot

| Metric | Value |
| --- | --- |
| Proof generation time | 12-24 seconds |
| Proof verification gas | ~213,456 gas |
| Consent creation gas | ~87,234 gas |
| Token mint gas | ~124,567 gas |

## Project Structure

```text
zk_health_demo/
|-- contracts/          Solidity smart contracts
|-- circuits/           Circom ZK circuits
|-- public/
|   `-- circuits/       Compiled WASM and ZKEY files
`-- src/
	|-- components/     React views for Hospital, Patient, Researcher, and Auditor
	|-- contracts/      ABI files
	`-- utils/          IPFS, FHIR, proof generation, and patient data helpers
```

## Quick Start

### Prerequisites

- Node.js 16 or later
- MetaMask browser extension
- Sepolia testnet ETH

### Install and Run

```bash
git clone https://github.com/yourusername/zk-health-demo.git
cd zk-health-demo
npm install
npm start
```

### Configuration Notes

- Add Pinata API keys in `src/utils/ipfs.js`
- Connect MetaMask to the Sepolia network
- Make sure the ZK circuit assets in `public/circuits/` are available before generating proofs

## Deployed Contract Addresses

| Contract | Address |
| --- | --- |
| AccessToken | 0x882007Be4354AB0FcC4D49acb4D462ff69a2D586 |
| ConsentManager | 0x38501C6C3A3eE36EF052105D2d7601d8c2607230 |
| Verifier | 0x36D9271959C1067CB4c4adf19D0A803375D6BE87 |
| DataAccessV2 | 0x7EaD99F1F3E6c886E1890d04B61b864f668104E9 |
| AntiResale | 0x46e28d644B96DaBaA691076323450bB7D1EBA2E8 |

## Thesis Submission

This project was developed as part of a Bachelor of Science in Information and Communication Engineering thesis at Bangladesh University of Professionals, under the supervision of Abu Sayed Md. Mostafizur Rahaman, Professor at Jahangirnagar University.

## License

MIT