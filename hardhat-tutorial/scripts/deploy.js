const { ethers } = require("hardhat");
require("dotenv").config({ path: ".env"});
const { CRYPTO_DEVS_NFT_CONTRACT_ADDRESS } = require("../constants");

async function main() {
    // address Crypto Devs NFT contract 
    const cryptoDevsNFTContract = CRYPTO_DEVS_NFT_CONTRACT_ADDRESS;

    // contract factory - abstraction for deploying contract
    const cryptoDevsTokenContract = await ethers.getContractFactory(
        "CryptoDevToken"
    );

    //deploy with NFT contract as a parameter -> in constructor of contract
    const deployedCryptoDevsTokenContract = await cryptoDevsTokenContract.deploy(
        cryptoDevsNFTContract
    );

    //print address of deployed contract
    console.log(
        "Crypto Devs Token Contract Address",
        deployedCryptoDevsTokenContract.address
    );
}

//call main function and catch error
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });