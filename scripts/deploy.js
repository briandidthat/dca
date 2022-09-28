const { assert } = require("chai");
const { ethers } = require("hardhat");
const axios = require("axios");

async function main() {
  const [dev, user] = await ethers.getSigners();

  const Library = await ethers.getContractFactory("ChamberLibrary");
  const library = await Library.deploy();
  await library.deployed();

  console.log("ChamberLibrary deployed.");

  const ChamberFactory = await ethers.getContractFactory("ChamberFactory", {
    libraries: {
      ChamberLibrary: library.address,
    },
  });

  const chamberFactory = await ChamberFactory.deploy();
  await chamberFactory.deployed();

  console.log("ChamberFactory deployed. Owner: " + dev.address);

  const owner = await chamberFactory.owner();
  assert(owner === dev.address);

  let chamberDeployment = await chamberFactory.connect(user).deployChamber({
    value: ethers.utils.parseEther("0.05"),
  });

  chamberDeployment = await chamberDeployment.wait();
  const chamberAddr = chamberDeployment.events[1].args[0];

  console.log("Chamber deployed. Address: " + chamberAddr);

  const chamber = await ethers.getContractAt("Chamber", chamberAddr);

  const chamberOwner = await chamber.getOwner();
  assert(chamberOwner === user.address);

  const status = await chamber.getStatus();
  console.log("Chamber status: " + status);

  console.log("Depositing 1 ETH to chamber");
  await chamber
    .connect(user)
    .depositETH({ value: ethers.utils.parseEther("1") });

  const balance = await ethers.provider.getBalance(chamber.address);
  console.log("Chamber Balance after deposit: " + balance);

  const wethAmount = ethers.utils.parseEther("0.5");

  const response = await axios.get(
    `https://api.0x.org/swap/v1/quote?sellToken=ETH&buyToken=DAI&sellAmount=${wethAmount.toString()}`
  );

  const quote = response.data;

  console.log(quote);
  // const swap = await chamber
  //   .connect(user)
  //   .executeSwap(
  //     quote.sellTokenAddress,
  //     quote.buyTokenAddress,
  //     wethAmount,
  //     quote.allowanceTarget,
  //     quote.to,
  //     quote.data
  //   );

  // console.log(await swap.wait());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
