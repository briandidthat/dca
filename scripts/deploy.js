const { assert } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const [dev, user] = await hre.ethers.getSigners();

  const Library = await ethers.getContractFactory("TokenLibrary");
  const library = await Library.deploy();
  await library.deployed();

  console.log("TokenLibrary deployed.");

  const ChamberFactory = await ethers.getContractFactory("ChamberFactory", {
    libraries: {
      TokenLibrary: library.address,
    },
  });

  const chamberFactory = await ChamberFactory.deploy();
  await chamberFactory.deployed();

  console.log("ChamberFactory deployed. Owner: " + dev.address);

  const owner = await chamberFactory.owner();
  assert(owner === dev.address);

  let chamberDeployment = await chamberFactory.connect(user).deployChamber({
    value: hre.ethers.utils.parseEther("0.05"),
  });

  chamberDeployment = await chamberDeployment.wait();
  const chamberAddr = chamberDeployment.events[1].args[0];

  console.log("Chamber deployed. Address: " + chamberAddr);

  const chamber = await hre.ethers.getContractAt("Chamber", chamberAddr);

  const chamberOwner = await chamber.getOwner();
  assert(chamberOwner === user.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
