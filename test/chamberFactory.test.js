const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { WHALE, contractFixture } = require("./utils");

describe("ChamberFactory", () => {
  let accounts, dev;
  let chamber, chamberFactory, compoundManager, uniswapExchange;

  beforeEach(async () => {
    [dev, user, ...accounts] = await ethers.getSigners();
    const { contracts } = await contractFixture();
    chamber = contracts.chamber;
    chamberFactory = contracts.chamberFactory;
    compoundManager = contracts.compoundManager;
    uniswapExchange = contracts.uniswapExchange;

    let tx = await chamberFactory.connect(user).deployChamber();
    let receipt = await tx.wait();

    chamber = await ethers.getContractAt(
      "IChamber",
      receipt.events[0].args.instance
    );
  });

  it("deploy: Owner - Should deploy chamber with user as owner", async () => {
    const owner = await chamber.getOwner();
    expect(owner).to.equal(user.address);
  });

  it("deploy: Event - Should emit a NewChamber event on deployment", async () => {
    await expect(chamberFactory.connect(dev).deployChamber()).to.emit(
      chamberFactory,
      "NewChamber"
    );
  });

  it("deploy: Revert - Should revert due to user having a chamber already", async () => {
    await expect(
      chamberFactory.connect(user).deployChamber()
    ).to.be.revertedWith("User already has a chamber");
  });

  it("getChamber: Should return the correct chamber by user", async () => {
    const details = await chamberFactory.getChamber(user.address);
    expect(details.owner).to.equal(user.address);
    expect(details.instance).to.equal(chamber.address);
  });
});
