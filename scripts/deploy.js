const { assert } = require("chai");
const { ethers } = require("hardhat");
const {
  WHALE,
  chamberFactoryFixture,
  tokenFixture,
  getHash,
} = require("../test/utils");

async function main() {
  const [dev, user, treasury] = await ethers.getSigners();
  const { dai, usdc, weth } = await tokenFixture();

  const usdcAmount = 100n * 10n ** 6n; // 100 USDC
  const daiAmount = ethers.utils.parseEther("100"); // 100 DAI

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [WHALE],
  });

  const whale = await ethers.getSigner(WHALE);

  // transfer 100 USDC & 100 DAI from whale to dev
  await dai.connect(whale).transfer(user.address, daiAmount);
  await usdc.connect(whale).transfer(user.address, usdcAmount);

  const Library = await ethers.getContractFactory("ChamberLibrary");
  const library = await Library.deploy();
  await library.deployed();

  console.log("ChamberLibrary deployed.");

  const chamberFactory = await chamberFactoryFixture();
  const owner = await chamberFactory.owner();

  console.log(
    `ChamberFactory deployed at: ${chamberFactory.address}. Owner: ${owner}`
  );
  assert(owner === dev.address);

  let chamberDeployment = await chamberFactory.connect(user).deployChamber({
    value: ethers.utils.parseEther("0.05"),
  });

  const treasuryAddr = await chamberFactory.getTreasury();
  console.log(`Treasury address: ${treasuryAddr}`);

  assert(treasuryAddr == treasury.address);

  chamberDeployment = await chamberDeployment.wait();
  const chamberAddr = chamberDeployment.events[1].args[0];

  const chamber = await ethers.getContractAt("Chamber", chamberAddr);
  const chamberOwner = await chamber.getOwner();

  console.log(`Chamber deployed at ${chamber.address}. Owner: ${chamberOwner}`);
  assert(chamberOwner === user.address);

  // give approval to the chamber
  await dai.connect(user).approve(chamber.address, daiAmount);
  await usdc.connect(user).approve(chamber.address, usdcAmount);

  const status = await chamber.getStatus();
  console.log(`Chamber status: ${status}`);

  console.log("Depositing 1 ETH to chamber");
  await chamber
    .connect(user)
    .depositETH({ value: ethers.utils.parseEther("1") });

  const balance = await ethers.provider.getBalance(chamber.address);
  console.log("Chamber Balance after deposit: " + balance);

  console.log(`Depositing ${daiAmount} DAI into Chamber`);
  await chamber.connect(user).deposit(dai.address, daiAmount);

  console.log(
    `Creating Strategy. buyToken=${weth.address}, sellToken: ${dai.address}, amount: ${daiAmount}`
  );

  let tx = await chamber
    .connect(user)
    .createStrategy(weth.address, dai.address, daiAmount, 7)
    .then((tx) => tx.wait());
  let args = tx.events[0].args;
  console.log(`Strategy created at hash: ${args.hashId}`);

  const hashId = getHash(user.address, weth.address, dai.address);
  console.log(`Fetching strategy at hash: ${hashId}`);

  let strategy = await chamber.getStrategy(hashId);
  assert(strategy.buyToken, weth.address);
  assert(strategy.sellToken, dai.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
