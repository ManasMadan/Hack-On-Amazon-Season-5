# PWDR - Payment Dispute Resolution System

**Smart Contract-based Dispute Resolution for Payment Fraud Detection**

A blockchain-based system for managing payment disputes, evidence submission, and fraud resolution.

## Features

- Submit evidence for payment disputes via IPFS hashes
- Vote on whether payments are fraudulent
- Resolve disputes with finality
- Query dispute evidence and status

## Setup

1. Install dependencies:

```bash
bun install
```

2. Compile the smart contract:

```bash
bunx hardhat compile
```

3. Set up environment variables:

```bash
# Create .env file
echo "PRIVATE_KEY=your_private_key_here" > .env
```

## Usage

### Deploy Contract

```bash
# Deploy to Ganache
bunx hardhat run scripts/deploy.ts --network ganache

# Deploy to Hardhat Network
bunx hardhat run scripts/deploy.ts --network hardhat
```

### Use in tRPC Backend

```typescript
import {
  DisputeResolverContract,
  deployDisputeResolver,
} from "@/apps/pwdr/src";
import { ethers } from "ethers";

// Deploy new contract
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const { contract, address } = await deployDisputeResolver(signer);

// Connect to existing contract
const contract = new DisputeResolverContract(
  "0x5FbDB2315678afecb367f032d93F642f64180aa3", // contract address
  provider,
  signer
);

// Submit evidence
await contract.submitEvidence("payment123", "QmHash1234");

// Vote on dispute
await contract.vote("payment123", true); // true = fraudulent

// Resolve dispute
await contract.resolveDispute("payment123");

// Get evidence
const evidence = await contract.getEvidence("payment123");

// Get dispute details
const dispute = await contract.getDispute("payment123");
```

## Smart Contract Functions

### `submitEvidence(paymentId, ipfsHash)`

- Submit evidence for a payment dispute
- `paymentId`: Unique identifier for the payment
- `ipfsHash`: IPFS hash of the evidence file

### `vote(paymentId, isFraud)`

- Vote on whether a payment is fraudulent
- `paymentId`: Unique identifier for the payment
- `isFraud`: Boolean indicating if payment is fraudulent

### `resolveDispute(paymentId)`

- Mark a dispute as resolved
- `paymentId`: Unique identifier for the payment

### `getEvidence(paymentId)`

- Returns array of IPFS hashes containing evidence for the dispute

### `disputes(paymentId)`

- Returns complete dispute information including evidence and resolution status

## Tech Stack

- **Solidity** - Smart contract development
- **Hardhat** - Development environment
- **ethers.js v6** - Blockchain interaction
- **TypeScript** - Type-safe development
