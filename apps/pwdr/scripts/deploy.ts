import { ethers, run } from "hardhat";

export async function main() {
  await run("compile");

  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying contracts with the account:",
    await deployer.getAddress()
  );

  const Resolver = await ethers.getContractFactory("DisputeResolver");
  const resolver = await Resolver.deploy();
  await resolver.waitForDeployment();

  const address = await resolver.getAddress();
  console.log("Contract deployed at:", address);

  return address;
}

main().catch(console.error);
