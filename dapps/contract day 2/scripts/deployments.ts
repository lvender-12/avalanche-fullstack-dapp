import { viem } from "hardhat";

import Artifact from "../artifacts/contracts/simple-storage.sol/SimpleStorage.json";

async function main() {

    //wallet client (signer)
    const [walletClient] = await viem.getWalletClients();

    //public client (read-only)
    const publicClient = await viem.getPublicClient();

    console.log("Deploying with account: ", walletClient.account.address);

    //deploy contract
    const hash = await walletClient.deployContract({
        abi: Artifact.abi,
        bytecode: Artifact.bytecode as `0x${string}`, // ✔ perbaikan typo
        args: [],
    });

    console.log("Deployment tx hash : ", hash);

    //wait fot confirm
    const receipt = await publicClient.waitForTransactionReceipt({
        hash,
    });

    console.log("✅ SimpeleStorage deploy at : ", receipt.contractAddress);
}

main().catch((error)=>{
    console.error(error);
    process.exitCode= 1;
});