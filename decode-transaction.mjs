// Script to decode contract transaction input data
import { ethers } from 'ethers';

// ABI for the submitEvidence function
const contractABI = [
    {
        "inputs": [
            {"name": "paymentId", "type": "string"},
            {"name": "ipfsHash", "type": "string"}
        ],
        "name": "submitEvidence",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

function decodeTransactionData(inputData) {
    try {
        const iface = new ethers.Interface(contractABI);
        const decoded = iface.parseTransaction({ data: inputData });
        
        console.log("=== Decoded Transaction Data ===");
        console.log("Function called:", decoded.name);
        console.log("Payment ID:", decoded.args[0]);
        console.log("IPFS Hash:", decoded.args[1]);
        
        console.log("\n=== Evidence Storage Explanation ===");
        console.log("The IPFS hash is stored ON-CHAIN in the smart contract.");
        console.log("This hash acts as a 'pointer' to the actual evidence content stored on IPFS.");
        console.log("The evidence content itself is NOT stored on-chain (too expensive).");
        console.log("Instead, the hash ensures integrity - if the evidence is tampered with, the hash would change.");
        console.log("Anyone can use this hash to retrieve the evidence from IPFS and verify its authenticity.");
        
        return {
            functionName: decoded.name,
            paymentId: decoded.args[0],
            ipfsHash: decoded.args[1]
        };
    } catch (error) {
        console.error("Error decoding transaction:", error.message);
        return null;
    }
}

// Get input data from command line argument
const inputData = process.argv[2];
if (!inputData) {
    console.log("Usage: node decode-transaction.mjs <transaction-input-data>");
    console.log("Example: node decode-transaction.mjs 0x8c0d89cd...");
    process.exit(1);
}

decodeTransactionData(inputData);
