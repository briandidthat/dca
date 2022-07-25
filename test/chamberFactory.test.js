const { expect } = require("chai");
const { ethers } = require("hardhat");
const { chamberFactoryFixture } = require("./utils");

describe("ChamberFactory", () => {
  let accounts, dev;
  let chamber, chamberFactory, compoundManager, uniswapExchange;

  beforeEach(async () => {
    [dev, user, ...accounts] = await ethers.getSigners();
    const contracts = await chamberFactoryFixture();

    chamber = contracts.chamber;
    chamberFactory = contracts.chamberFactory;

    let tx = await chamberFactory.connect(user).deployChamber();
    let receipt = await tx.wait();

    // get the chamber we just deployed using the address from logs
    chamber = await ethers.getContractAt(
      "IChamber",
      receipt.events[0].args.instance
    );
  });

  it("deploy: Owner - Should deploy chamber with user as owner", async () => {
    const owner = await chamber.getOwner();
    expect(owner).to.equal(user.address);
  });

  it("deployChamber: Event - Should emit a NewChamber event on deployment", async () => {
    await expect(chamberFactory.connect(dev).deployChamber()).to.emit(
      chamberFactory,
      "NewChamber"
    );
  });

  it("deployChamber: Revert - Should revert due to user having a chamber already", async () => {
    await expect(
      chamberFactory.connect(user).deployChamber()
    ).to.be.revertedWith("User already has a chamber");
  });

  it("getChamber: Should return the correct chamber by user", async () => {
    const details = await chamberFactory.getChamber(user.address);
    expect(details.owner).to.equal(user.address);
    expect(details.instance).to.equal(chamber.address);
    expect(details.initialized).to.equal(true);
  });

  it("getInstanceCount: Should return 1 as count since we deployed 1 chamber", async () => {
    const instances = await chamberFactory.getInstanceCount();
    expect(instances).to.equal(1);
  });
});
