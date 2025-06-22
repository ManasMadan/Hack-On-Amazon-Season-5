import { ethers } from "ethers";
import { DisputeResolverContract } from "./disputeResolver";

export async function deployDisputeResolver(signer: ethers.Signer): Promise<{
  contract: DisputeResolverContract;
  address: string;
  deploymentTx: ethers.ContractTransactionResponse;
}> {
  return await DisputeResolverContract.deploy(signer);
}

export async function connectToDisputeResolver(
  contractAddress: string,
  provider: ethers.Provider,
  signer?: ethers.Signer
): Promise<DisputeResolverContract> {
  return new DisputeResolverContract(contractAddress, provider, signer);
}
