import "hardhat/types/config";
import "hardhat/types/runtime";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    ethers: typeof import("ethers") & {
      getContractFactory: (name: string) => Promise<any>;
      getSigners: () => Promise<any[]>;
    };
  }
}
