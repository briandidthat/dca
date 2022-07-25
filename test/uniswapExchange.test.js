const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { expectRevert } = require("@openzeppelin/test-helpers");
const { WHALE, uniswapExchangeFixture, tokenFixture } = require("./utils");

describe("UniswapExchange", () => {
  let accounts, dev, whale;
  let exchange;
  let weth, dai, usdc;
  const daiAmount = 100n * 10n ** 18n;
  const usdcAmount = 100n * 10n ** 6n;
  const ethAmount = 5n * 10n ** 18n;

  beforeEach(async () => {
    [dev, user, ...accounts] = await ethers.getSigners();
    exchange = await uniswapExchangeFixture();
    const tokens = await tokenFixture();

    dai = tokens.dai;
    weth = tokens.weth;
    usdc = tokens.usdc;

    // unlock USDC/DAI Whale account
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WHALE],
    });

    whale = await ethers.getSigner(WHALE);

    // transfer 100 USDC & 100 DAI from whale to dev
    await dai.connect(whale).transfer(user.address, daiAmount);
    await usdc.connect(whale).transfer(user.address, usdcAmount);
  });

  it("owner: Should deploy contract with dev as owner", async () => {
    const owner = await exchange.owner.call();
    expect(owner).to.equal(dev.address);
  });

  it("Should give the user address 100 DAI, 100 USDC to trade", async () => {
    expect(await dai.balanceOf(user.address)).to.be.gte(daiAmount);
    expect(await usdc.balanceOf(user.address)).to.be.gte(usdcAmount);
  });

  it("swapForWETH: Should swap 100 DAI for WETH", async () => {
    const balanceBefore = await weth.balanceOf(user.address);
    await dai.connect(user).approve(exchange.address, daiAmount);
    await exchange.connect(user).swapForWETH(daiAmount, dai.address);

    expect(await weth.balanceOf(user.address)).to.be.gt(balanceBefore);
  });

  it("swapForWETH: Should swap 100 USDC for WETH", async () => {
    const balanceBefore = await weth.balanceOf(user.address);
    await usdc.connect(user).approve(exchange.address, usdcAmount);
    await exchange.connect(user).swapForWETH(usdcAmount, usdc.address);

    expect(await weth.balanceOf(user.address)).to.gt(balanceBefore);
  });

  it("swapForWETH: Should revert due to depositing incorrect coin", async () => {
    await weth.connect(user).deposit({ value: ethAmount });
    await weth.connect(user).approve(exchange.address, ethAmount);
    await expectRevert(
      exchange.connect(user).swapForWETH(ethAmount, weth.address),
      "Invalid token"
    );
  });
});
