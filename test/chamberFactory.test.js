const { expect } = require("chai");
const { ethers } = require("hardhat");
const { chamberFactoryFixture, getEventObject, EVENTS } = require("./utils");

describe("ChamberFactory", () => {
  let dev, user, treasury, rando;
  let chamber, chamberFactory;

  const ethAmount = ethers.utils.parseEther("5"); // 5 ETH
  const chamberFee = ethers.utils.parseEther("0.05"); // 0.5 ETH

  beforeEach(async () => {
    [dev, user, treasury, rando] = await ethers.getSigners();
    chamberFactory = await chamberFactoryFixture();

    const receipt = await chamberFactory
      .connect(user)
      .deployChamber({ value: chamberFee })
      .then((tx) => tx.wait());
    const event = getEventObject(
      EVENTS.chamberFactory.NEW_CHAMBER,
      receipt.events
    );

    // get the chamber we just deployed using the address from logs
    chamber = await ethers.getContractAt("IChamber", event.args.instance);
  });
  // ========================= OWNER =============================

  it("deploy: Owner - Should deploy chamber with user as owner", async () => {
    const owner = await chamber.getOwner();
    expect(owner).to.equal(user.address);
  });

  // ========================= DEPLOY CHAMBER =============================

  it("deployChamber: Event - Should emit a NewChamber event on deployment", async () => {
    const treasuryBalanceBefore = await ethers.provider.getBalance(
      treasury.address
    );
    const receipt = await chamberFactory
      .connect(user)
      .deployChamber({ value: chamberFee })
      .then((tx) => tx.wait());

    const event = getEventObject("NewChamber", receipt.events);
    const treasuryBalanceAfter = await ethers.provider.getBalance(
      treasury.address
    );

    expect(treasuryBalanceAfter).to.be.gt(treasuryBalanceBefore);
    expect(event.args.owner).to.be.equal(user.address);
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

  // ========================= SET TREASURY =============================

  it("setTreasury: Should set new treasury address", async () => {
    const receipt = await chamberFactory
      .connect(dev)
      .setTreasury(rando.address)
      .then((tx) => tx.wait());

    const event = getEventObject("TreasuryChange", receipt.events);
    const treasury = await chamberFactory.getTreasury();

    expect(treasury).to.be.equal(rando.address);
    expect(event.args.treasury).to.be.eq(rando.address);
  });

  // ========================= GET INSTANCE COUNT =============================

  it("getInstanceCount: Should return 1 as count since we deployed 1 chamber", async () => {
    const instances = await chamberFactory.getInstanceCount();
    expect(instances).to.equal(1);
  });
});
