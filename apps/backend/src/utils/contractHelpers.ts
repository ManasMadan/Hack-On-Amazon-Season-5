import { ethers } from "ethers";

// This file acts as a bridge to the pwdr contract functionality
// Import the compiled artifacts directly since we can't import from another package

import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate required environment variables
const validateEnvironment = () => {
  const required = ["BLOCKCHAIN_PRIVATE_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  const network = process.env.BLOCKCHAIN_NETWORK || "local";
  if (!["local", "sepolia", "polygon", "mainnet"].includes(network)) {
    throw new Error(
      `Invalid BLOCKCHAIN_NETWORK: ${network}. Must be one of: local, sepolia, polygon, mainnet`
    );
  }

  // Check for network-specific requirements
  if (network === "sepolia" || network === "mainnet") {
    if (
      !process.env.INFURA_PROJECT_ID &&
      !process.env.ALCHEMY_API_KEY &&
      !process.env.CUSTOM_RPC_URL
    ) {
      throw new Error(
        "For Ethereum networks, provide one of: INFURA_PROJECT_ID, ALCHEMY_API_KEY, or CUSTOM_RPC_URL"
      );
    }
  }
};

// Network configuration from environment variables
const getNetworkConfig = () => {
  validateEnvironment();

  const network = process.env.BLOCKCHAIN_NETWORK || "local";

  // Custom RPC URL takes priority
  if (process.env.CUSTOM_RPC_URL) {
    return {
      rpcUrl: process.env.CUSTOM_RPC_URL,
      chainId: parseInt(process.env.CHAIN_ID || "1337"),
      network,
    };
  }

  const configs = {
    local: {
      rpcUrl: process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545",
      chainId: parseInt(process.env.BLOCKCHAIN_CHAIN_ID || "1337"),
      network: "local",
    },
    sepolia: {
      rpcUrl: process.env.INFURA_PROJECT_ID
        ? `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
        : process.env.ALCHEMY_API_KEY
          ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
          : "https://rpc.sepolia.org",
      chainId: 11155111,
      network: "sepolia",
    },
    polygon: {
      rpcUrl:
        process.env.POLYGON_RPC_URL || process.env.INFURA_PROJECT_ID
          ? `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
          : process.env.ALCHEMY_API_KEY
            ? `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
            : "https://polygon-rpc.com/",
      chainId: 137,
      network: "polygon",
    },
    mainnet: {
      rpcUrl: process.env.INFURA_PROJECT_ID
        ? `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
        : process.env.ALCHEMY_API_KEY
          ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
          : "https://eth.llamarpc.com",
      chainId: 1,
      network: "mainnet",
    },
  };

  return configs[network as keyof typeof configs] || configs.local;
};

// Get contract artifact
function getDisputeResolverArtifact() {
  const artifactPath =
    process.env.CONTRACT_ARTIFACT_PATH ||
    path.join(
      __dirname,
      "../../../pwdr/artifacts/contracts/DisputeResolver.sol/DisputeResolver.json"
    );

  if (fs.existsSync(artifactPath)) {
    return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  }
  throw new Error(
    `Contract artifact not found at ${artifactPath}. Please compile the contract first using 'hardhat compile' in the pwdr directory`
  );
}

// Helper function to get provider and signer
export const getProviderAndSigner = () => {
  const networkConfig = getNetworkConfig();

  // Create provider with optional configuration
  const providerOptions: any = {};

  // Add rate limiting if specified
  if (process.env.RPC_RATE_LIMIT) {
    providerOptions.staticNetwork = ethers.Network.from(networkConfig.chainId);
  }

  const provider = new ethers.JsonRpcProvider(
    networkConfig.rpcUrl,
    undefined,
    providerOptions
  );

  // Get private key from environment
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("BLOCKCHAIN_PRIVATE_KEY environment variable not set");
  }

  // Validate private key format
  if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
    throw new Error(
      "BLOCKCHAIN_PRIVATE_KEY must be a valid hex string starting with 0x"
    );
  }

  const signer = new ethers.Wallet(privateKey, provider);

  return {
    provider,
    signer,
    networkConfig: {
      ...networkConfig,
      gasPrice: process.env.BLOCKCHAIN_GAS_PRICE
        ? BigInt(process.env.BLOCKCHAIN_GAS_PRICE)
        : undefined,
      gasLimit: process.env.BLOCKCHAIN_GAS_LIMIT
        ? BigInt(process.env.BLOCKCHAIN_GAS_LIMIT)
        : undefined,
    },
  };
};

// Contract class
export class DisputeResolverContract {
  private contract: ethers.Contract;

  constructor(
    contractAddress: string,
    provider: ethers.Provider,
    signer?: ethers.Signer
  ) {
    const artifact = getDisputeResolverArtifact();
    this.contract = new ethers.Contract(
      contractAddress,
      artifact.abi,
      signer || provider
    );
  }

  // Helper to get transaction options from environment
  private getTransactionOptions() {
    const options: any = {};

    if (process.env.BLOCKCHAIN_GAS_PRICE) {
      options.gasPrice = BigInt(process.env.BLOCKCHAIN_GAS_PRICE);
    }

    if (process.env.BLOCKCHAIN_GAS_LIMIT) {
      options.gasLimit = BigInt(process.env.BLOCKCHAIN_GAS_LIMIT);
    }

    if (process.env.MAX_FEE_PER_GAS) {
      options.maxFeePerGas = BigInt(process.env.MAX_FEE_PER_GAS);
    }

    if (process.env.MAX_PRIORITY_FEE_PER_GAS) {
      options.maxPriorityFeePerGas = BigInt(
        process.env.MAX_PRIORITY_FEE_PER_GAS
      );
    }

    return options;
  }

  async submitEvidence(
    paymentId: string,
    ipfsHash: string
  ): Promise<ethers.ContractTransactionResponse> {
    const options = this.getTransactionOptions();
    return await this.contract.submitEvidence!(paymentId, ipfsHash, options);
  }

  async vote(
    paymentId: string,
    isFraud: boolean
  ): Promise<ethers.ContractTransactionResponse> {
    const options = this.getTransactionOptions();
    return await this.contract.vote!(paymentId, isFraud, options);
  }

  async resolveDispute(
    paymentId: string
  ): Promise<ethers.ContractTransactionResponse> {
    const options = this.getTransactionOptions();
    return await this.contract.resolveDispute!(paymentId, options);
  }

  async getEvidence(paymentId: string): Promise<string[]> {
    return await this.contract.getEvidence!(paymentId);
  }

  async getDispute(paymentId: string): Promise<{
    paymentId: string;
    evidenceHashes: string[];
    isResolved: boolean;
    isFraud: boolean;
  }> {
    const dispute = await this.contract.disputes!(paymentId);
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
    const artifact = getDisputeResolverArtifact();
    const factory = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      signer
    );

    // Get deployment options from environment
    const deployOptions: any = {};

    if (process.env.DEPLOY_GAS_PRICE) {
      deployOptions.gasPrice = BigInt(process.env.DEPLOY_GAS_PRICE);
    } else if (process.env.BLOCKCHAIN_GAS_PRICE) {
      deployOptions.gasPrice = BigInt(process.env.BLOCKCHAIN_GAS_PRICE);
    }

    if (process.env.DEPLOY_GAS_LIMIT) {
      deployOptions.gasLimit = BigInt(process.env.DEPLOY_GAS_LIMIT);
    } else if (process.env.BLOCKCHAIN_GAS_LIMIT) {
      deployOptions.gasLimit = BigInt(process.env.BLOCKCHAIN_GAS_LIMIT);
    }

    if (process.env.DEPLOY_MAX_FEE_PER_GAS) {
      deployOptions.maxFeePerGas = BigInt(process.env.DEPLOY_MAX_FEE_PER_GAS);
    } else if (process.env.MAX_FEE_PER_GAS) {
      deployOptions.maxFeePerGas = BigInt(process.env.MAX_FEE_PER_GAS);
    }

    if (process.env.DEPLOY_MAX_PRIORITY_FEE_PER_GAS) {
      deployOptions.maxPriorityFeePerGas = BigInt(
        process.env.DEPLOY_MAX_PRIORITY_FEE_PER_GAS
      );
    } else if (process.env.MAX_PRIORITY_FEE_PER_GAS) {
      deployOptions.maxPriorityFeePerGas = BigInt(
        process.env.MAX_PRIORITY_FEE_PER_GAS
      );
    }

    const deployedContract = await factory.deploy(deployOptions);
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

// Helper functions
export async function deployDisputeResolver(signer: ethers.Signer) {
  return await DisputeResolverContract.deploy(signer);
}

export async function connectToDisputeResolver(
  contractAddress: string,
  provider: ethers.Provider,
  signer?: ethers.Signer
): Promise<DisputeResolverContract> {
  return new DisputeResolverContract(contractAddress, provider, signer);
}
