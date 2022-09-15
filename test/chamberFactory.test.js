const { expect } = require("chai");
const { ethers } = require("hardhat");
const { chamberFactoryFixture } = require("./utils");

describe("ChamberFactory", () => {
  let accounts, user, dev;
  let chamber, chamberFactory;

  const ethAmount = ethers.utils.parseEther("5"); // 5 ETH
  const chamberFee = ethers.utils.parseEther("0.05"); // 0.5 ETH

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
  // ========================= OWNER =============================

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

  it("deployChamber: Revert - Should revert on attempt to deploy a 6th chamber", async () => {
    await chamberFactory.connect(user).deployChamber({ value: chamberFee }); // 2
    await chamberFactory.connect(user).deployChamber({ value: chamberFee }); // 3
    await chamberFactory.connect(user).deployChamber({ value: chamberFee }); // 4
    await chamberFactory.connect(user).deployChamber({ value: chamberFee }); // 5
    
    const chambers = await chamberFactory.getChambers(user.address);
    
    expect(chambers.length).to.be.equal(5);
    await expect(
      chamberFactory.connect(user).deployChamber({ value: chamberFee })
    ).to.be.revertedWith("You have reached max chamber amount");
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

  // ========================= GET CHAMBERS =============================

  it("getChamber: Should return the correct chamber by user", async () => {
    const details = await chamberFactory.getChambers(user.address);
    expect(details.length).to.equal(1);
    expect(details[0].owner).to.be.equal(user.address);
    expect(details[0].instance).to.equal(chamber.address);
  });

  it("getChamber: Revert - Should revert due to no existing chamber for owner", async () => {
    await expect(chamberFactory.getChambers(dev.address)).to.be.revertedWith(
      "No chamber for that address"
    );
  });

  // ========================= GET INSTANCE COUNT =============================

  it("getInstanceCount: Should return 1 as count since we deployed 1 chamber", async () => {
    const instances = await chamberFactory.getInstanceCount();
    expect(instances).to.equal(1);
  });
});
