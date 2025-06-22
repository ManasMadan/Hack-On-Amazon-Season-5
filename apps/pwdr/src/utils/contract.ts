import { ethers } from "ethers";
import * as contractJson from "../../artifacts/contracts/DisputeResolver.sol/DisputeResolver.json";

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const CONTRACT_ADDRESS = "0x..."; // <- your deployed address here

export const disputeContract = new ethers.Contract(
  CONTRACT_ADDRESS,
  contractJson.abi,
  signer
);
