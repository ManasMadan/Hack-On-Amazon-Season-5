import { ethers } from "ethers";
import * as path from "path";
import * as fs from "fs";

export interface DisputeResolverInterface {
  submitEvidence(
    paymentId: string,
    ipfsHash: string
  ): Promise<ethers.ContractTransactionResponse>;
  vote(
    paymentId: string,
    isFraud: boolean
  ): Promise<ethers.ContractTransactionResponse>;
  resolveDispute(
    paymentId: string
  ): Promise<ethers.ContractTransactionResponse>;
  getEvidence(paymentId: string): Promise<string[]>;
  disputes(paymentId: string): Promise<{
    paymentId: string;
    evidenceHashes: string[];
    isResolved: boolean;
    isFraud: boolean;
  }>;
}

function getContractArtifact() {
  const artifactPath = path.join(
    __dirname,
    "../../artifacts/contracts/DisputeResolver.sol/DisputeResolver.json"
  );
  if (fs.existsSync(artifactPath)) {
    return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  }
  throw new Error(
    "Contract artifact not found. Please compile the contract first using 'hardhat compile'"
  );
}

export class DisputeResolverContract {
  private contract: ethers.Contract;

  constructor(
    contractAddress: string,
    provider: ethers.Provider,
    signer?: ethers.Signer
  ) {
    const artifact = getContractArtifact();
    this.contract = new ethers.Contract(
      contractAddress,
      artifact.abi,
      signer || provider
    );
  }

  async submitEvidence(
    paymentId: string,
    ipfsHash: string
  ): Promise<ethers.ContractTransactionResponse> {
    return await this.contract.submitEvidence(paymentId, ipfsHash);
  }

  async vote(
    paymentId: string,
    isFraud: boolean
  ): Promise<ethers.ContractTransactionResponse> {
    return await this.contract.vote(paymentId, isFraud);
  }

  async resolveDispute(
    paymentId: string
  ): Promise<ethers.ContractTransactionResponse> {
    return await this.contract.resolveDispute(paymentId);
  }

  async getEvidence(paymentId: string): Promise<string[]> {
    return await this.contract.getEvidence(paymentId);
  }

  async getDispute(paymentId: string): Promise<{
    paymentId: string;
    evidenceHashes: string[];
    isResolved: boolean;
    isFraud: boolean;
  }> {
    const dispute = await this.contract.disputes(paymentId);
    return {
      paymentId: dispute.paymentId,
      evidenceHashes: dispute.evidenceHashes,
      isResolved: dispute.isResolved,
      isFraud: dispute.isFraud,
    };
  }

  getAddress(): string {
    return this.contract.target as string;
  }

  static async deploy(signer: ethers.Signer): Promise<{
    contract: DisputeResolverContract;
    address: string;
    deploymentTx: ethers.ContractTransactionResponse;
  }> {
    const artifact = getContractArtifact();
    const factory = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      signer
    );

    const deployedContract = await factory.deploy();
    await deployedContract.waitForDeployment();

    const address = await deployedContract.getAddress();
    const contract = new DisputeResolverContract(
      address,
      signer.provider!,
      signer
    );

    return {
      contract,
      address,
      deploymentTx: deployedContract.deploymentTransaction()!,
    };
  }
}

export function getDisputeResolverArtifact() {
  return getContractArtifact();
}
