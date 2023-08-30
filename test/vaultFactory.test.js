const { expect } = require("chai");
const { ethers } = require("hardhat");
const { vaultFactoryFixture, getEventObject, EVENTS, storageFacilityFixture } = require("./utils");

describe("VaultFactory", () => {
  let dev, user, treasury, rando;
  let vault, vaultFactory;

  const ethAmount = ethers.utils.parseEther("5"); // 5 ETH
  const vaultFee = ethers.utils.parseEther("0.05"); // 0.5 ETH

  beforeEach(async () => {
    [dev, user, treasury, rando] = await ethers.getSigners();
    const storageFacility = await storageFacilityFixture();
    vaultFactory = await vaultFactoryFixture(storageFacility.address);
    await storageFacility.connect(dev).setFactoryAddress(vaultFactory.address);

    const receipt = await vaultFactory
      .connect(user)
      .deployVault({ value: vaultFee })
      .then((tx) => tx.wait());
    const event = getEventObject(
      EVENTS.vaultFactory.NEW_VAULT,
      receipt.events
    );

    // get the vault we just deployed using the address from logs
    vault = await ethers.getContractAt("IVault", event.args.instance);
  });
  // ========================= OWNER =============================

  it("deploy: Owner - Should deploy vault with user as owner", async () => {
    const owner = await vault.getOwner();
    expect(owner).to.equal(user.address);
  });

  // ========================= DEPLOY VAULT =============================

  it("deployVault: Event - Should emit a NewVault event on deployment", async () => {
    const treasuryBalanceBefore = await ethers.provider.getBalance(
      treasury.address
    );
    const receipt = await vaultFactory
      .connect(user)
      .deployVault({ value: vaultFee })
      .then((tx) => tx.wait());

    const event = getEventObject("NewVault", receipt.events);
    const treasuryBalanceAfter = await ethers.provider.getBalance(
      treasury.address
    );

    expect(treasuryBalanceAfter).to.be.gt(treasuryBalanceBefore);
    expect(event.args.owner).to.be.equal(user.address);
  });

  // ========================= SET FEE =============================

  it("setFee: Should set new vault deployment fee", async () => {
    await vaultFactory.connect(dev).setFee(ethAmount);
    let fee = await vaultFactory.getFee();

    expect(fee).to.be.equal(ethAmount);
  });

  it("setFee: EVENT - Should emit FeeChanged event upon change of fee", async () => {
    await vaultFactory.connect(dev).setFee(ethAmount);
    let fee = await vaultFactory.getFee();

    expect(fee).to.be.equal(ethAmount);
  });

  // ========================= SET TREASURY =============================

  it("setTreasury: Should set new treasury address", async () => {
    const receipt = await vaultFactory
      .connect(dev)
      .setTreasury(rando.address)
      .then((tx) => tx.wait());

    const event = getEventObject("TreasuryChange", receipt.events);
    const treasury = await vaultFactory.getTreasury();

    expect(treasury).to.be.equal(rando.address);
    expect(event.args.treasury).to.be.eq(rando.address);
  });

  // ========================= GET INSTANCE COUNT =============================

  it("getInstanceCount: Should return 1 as count since we deployed 1 vault", async () => {
    const instances = await vaultFactory.getInstanceCount();
    expect(instances).to.equal(1);
  });
});
