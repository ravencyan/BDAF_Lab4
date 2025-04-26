require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { PRIVATE_KEY } = process.env

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    zircuit: {
      url: "https://rpc.zircuit.com", // Replace with actual RPC URL
      accounts: [`0x${PRIVATE_KEY}`] // Replace with your private key
    }
  }
};
