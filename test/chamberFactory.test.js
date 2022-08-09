const { expect } = require("chai");
const { ethers } = require("hardhat");
const { chamberFactoryFixture } = require("./utils");

describe("ChamberFactory", () => {
  let accounts, dev;
  let chamber, chamberFactory;

  const chamberFee = ethers.BigNumber.from(web3.utils.toWei("0.05", "ether"));
  const ethAmount = 5n * 10n ** 18n; // 5 ETH

  beforeEach(async () => {
    [dev, user, ...accounts] = await ethers.getSigners();
    chamberFactory = await chamberFactoryFixture();

    let tx = await chamberFactory
      .connect(user)
      .deployChamber({ value: chamberFee });
    let receipt = await tx.wait();

    // get the chamber we just deployed using the address from logs
    chamber = await ethers.getContractAt(
      "IChamber",
      receipt.events[1].args.instance
    );
  });
  // ========================= DEPLOY =============================

  it("deploy: Owner - Should deploy chamber with user as owner", async () => {
    const owner = await chamber.getOwner();
    expect(owner).to.equal(user.address);
  });

  // ========================= DEPLOY CHAMBER =============================

  it("deployChamber: Event - Should emit a NewChamber event on deployment", async () => {
    await expect(
      chamberFactory.connect(dev).deployChamber({ value: chamberFee })
    ).to.emit(chamberFactory, "NewChamber");
  });

  it("deployChamber: Should return the users existing chamber", async () => {
    let tx = await chamberFactory
      .connect(user)
      .deployChamber({ value: chamberFee });
    let logs = await tx.wait();
    const existing = logs.events[0].args.instance;
    expect(existing).to.be.equal(chamber.address);
  });

  // ========================= SET FEE =============================
  it("setFee: Should set new chamber deployment fee", async () => {
    await chamberFactory.connect(dev).setFee(ethAmount);
    let fee = await chamberFactory.getFee();

    expect(fee).to.be.equal(ethAmount);
  });

  it("setFee: EVENT - Should emit FeeChanged event upon change of fee", async () => {
    await chamberFactory.connect(dev).setFee(ethAmount);
    let fee = await chamberFactory.getFee();

    expect(fee).to.be.equal(ethAmount);
  });

  // ========================= GET CHAMBER =============================

  it("getChamber: Should return the correct chamber by user", async () => {
    const details = await chamberFactory.getChamber(user.address);
    expect(details.owner).to.equal(user.address);
    expect(details.instance).to.equal(chamber.address);
  });

  it("getChamber: Revert - Should revert due to no existing chamber for owner", async () => {
    await expect(chamberFactory.getChamber(dev.address)).to.be.revertedWith(
      "No chamber for that address"
    );
  });

  // ========================= GET INSTANCE COUNT =============================

  it("getInstanceCount: Should return 1 as count since we deployed 1 chamber", async () => {
    const instances = await chamberFactory.getInstanceCount();
    expect(instances).to.equal(1);
  });
});
