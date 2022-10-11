require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require("hardhat-gas-reporter");

require("dotenv").config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("balance", "Prints balance of user", async (taskArgs, hre) => {
  const [account] = await hre.ethers.getSigners();
  console.log(await hre.ethers.provider.getBalance(account.address));
});

module.exports = {
  gasReporter: {
    currency: "USD",
    coinmarketcap: process.env.CMC_API_KEY,
  },
  solidity: "0.8.15",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      gas: 2100000,
      gasPrice: 8365186212,
    },
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_URL,
        blockNumber: 15706783,
      },
    },
  },
};
