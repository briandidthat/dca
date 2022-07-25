const { expect } = require("chai");
const { ethers, network, waffle } = require("hardhat");
const { WHALE, compoundManagerFixture, tokenFixture } = require("./utils");

describe("compoundManager", () => {
  let compoundManager;
  let whale, contract;
  let weth, dai, usdc;
  let cEth, cUsdc, cDai;

  const daiAmount = 100n * 10n ** 18n;
  const usdcAmount = 100n * 10n ** 6n;
  const ethAmount = 5n * 10n ** 18n;

  beforeEach(async () => {
    [dev, user, contract, ...accounts] = await ethers.getSigners();
    compoundManager = await compoundManagerFixture();
    const tokens = await tokenFixture();

    dai = tokens.dai;
    weth = tokens.weth;
    usdc = tokens.usdc;
    cEth = tokens.cEth;
    cDai = tokens.cDai;
    cUsdc = tokens.cUsdc;

    // unlock USDC/DAI Whale account
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WHALE],
    });

    whale = await ethers.getSigner(WHALE);

    // transfer 100 USDC & 100 DAI from whale to user
    await dai.connect(whale).transfer(user.address, daiAmount);
    await usdc.connect(whale).transfer(user.address, usdcAmount);
  });

  // ========================= SUPPLY =============================

  it("supplyETH: Should deposit ETH on Compound and give user a cETH balance", async () => {
    // supply ETH to compound
    await compoundManager
      .connect(contract)
      .supplyETH(user.address, { value: daiAmount });
    const balance = await cEth.balanceOf(user.address);

    // should be greater than 0
    expect(balance).to.be.gte(0);
  });

  it("supplyStablecoin: Should deposit DAI on Compound and give user a cDAI balance", async () => {
    await dai.connect(user).transfer(contract.address, daiAmount);
    await dai.connect(contract).approve(compoundManager.address, daiAmount);
    // supply DAI tokens to compound
    await compoundManager
      .connect(contract)
      .supplyStablecoin(dai.address, daiAmount, user.address);
    // should be greater than 0
    expect(await cDai.balanceOf(user.address)).to.gt(0);
  });

  it("supplyStablecoin: Should deposit USDC on Compound and give user a cUSDC balance", async () => {
    // deposit USDC into vault contract to be supplied to Compound
    await usdc.connect(user).transfer(contract.address, usdcAmount);
    await usdc.connect(contract).approve(compoundManager.address, usdcAmount);
    // supply USDC tokens to compound
    await compoundManager
      .connect(contract)
      .supplyStablecoin(usdc.address, usdcAmount, user.address);
    // should be greater than 0
    expect(await cUsdc.balanceOf(user.address)).to.be.gt(0);
  });

  // ========================= REDEEM =============================

  it("redeemETH: Should redeem cETH from Compound and return ETH to user", async () => {
    // deposit ETH in vault contract to be supplied to Compound
    await user.sendTransaction({ to: contract.address, value: ethAmount });

    // supply ETH to compound
    await compoundManager
      .connect(contract)
      .supplyETH(user.address, { value: ethAmount });

    const cEthBalance = await cEth.balanceOf(user.address);
    const balanceBefore = await waffle.provider.getBalance(user.address);

    // redeem ETH from compound
    await compoundManager
      .connect(contract)
      .redeemETH(cEthBalance, user.address);
    const balanceAfter = await waffle.provider.getBalance(user.address);

    expect(balanceAfter).to.be.gte(balanceBefore);
  });

  it("redeemStablecoin: Should redeem cDAI from Compound and return DAI to user", async () => {
    // deposit USDC into vault contract to be supplied to Compound
    await dai.connect(user).transfer(contract.address, daiAmount);
    await dai.connect(contract).approve(compoundManager.address, daiAmount);
    // supply DAI tokens to compound
    await compoundManager
      .connect(contract)
      .supplyStablecoin(dai.address, daiAmount, user.address);

    let cTokenBalance = await cDai.balanceOf(contract.address);
    // redeem DAI from compound
    await compoundManager
      .connect(contract)
      .redeemStablecoin(cDai.address, cTokenBalance, user.address);
    // should be greater than deposited amount due to interest
    expect(await dai.balanceOf(user.address)).to.be.gt(daiAmount);
  });

  it("redeemStablecoin: Should redeem cUSDC from Compound and return USDC to user", async () => {
    // deposit USDC into vault contract to be supplied to Compound
    await usdc.connect(user).transfer(contract.address, usdcAmount);
    await usdc.connect(contract).approve(compoundManager.address, usdcAmount);
    // supply USDC tokens to compound
    await compoundManager
      .connect(contract)
      .supplyStablecoin(usdc.address, usdcAmount, user.address);

    const cTokenBalance = await cUsdc.balanceOf(contract.address);

    await compoundManager
      .connect(contract)
      .redeemStablecoin(cUsdc.address, cTokenBalance, user.address);
    // should be greater than 0
    expect(await usdc.balanceOf(user.address)).to.be.gt(usdcAmount);
  });

  // ========================= EVENTS ==============================
  it("event: Supply", async () => {
    // deposit USDC into vault contract to be supplied to Compound
    await usdc.connect(user).transfer(contract.address, usdcAmount);
    await usdc.connect(contract).approve(compoundManager.address, usdcAmount);

    await expect(
      compoundManager
        .connect(contract)
        .supplyStablecoin(usdc.address, usdcAmount, user.address)
    ).to.emit(compoundManager, "Supply");
  });

  it("event: Redeem", async () => {
    // deposit USDC into vault contract to be supplied to Compound
    await usdc.connect(user).transfer(contract.address, usdcAmount);
    await usdc.connect(contract).approve(compoundManager.address, usdcAmount);
    // supply USDC tokens to compound
    await compoundManager
      .connect(contract)
      .supplyStablecoin(usdc.address, usdcAmount, user.address);

    const cTokenBalance = await cUsdc.balanceOf(contract.address);

    await expect(
      compoundManager
        .connect(contract)
        .redeemStablecoin(cUsdc.address, cTokenBalance, user.address)
    ).to.emit(compoundManager, "Redeem");
  });

  // ========================= REVERT ==============================
});
