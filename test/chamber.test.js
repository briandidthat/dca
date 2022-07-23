const { expect } = require("chai");
const { ethers, network, waffle } = require("hardhat");
const { WHALE, contractFixture } = require("./utils");

describe("Chamber", () => {
  let accounts, dev, whale;
  let chamber;
  let weth, dai, usdc;
  let cEth, cUsdc, cDai;

  const daiAmount = 100n * 10n ** 18n;
  const usdcAmount = 100n * 10n ** 6n;
  const ethAmount = 5n * 10n ** 18n;

  beforeEach(async () => {
    [dev, user, ...accounts] = await ethers.getSigners();
    const { contracts, tokens } = await contractFixture();

    chamber = contracts.chamber;
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

    // transfer 100 USDC & 100 DAI from whale to dev
    await dai.connect(whale).transfer(user.address, daiAmount);
    await usdc.connect(whale).transfer(user.address, usdcAmount);
  });

  it("deposit: Should deposit DAI into chamber and update balance", async () => {});

  it("deposit: Should deposit USDC into chamber and update balance", async () => {});

  it("withdraw: Should withdraw DAI from chamber", async () => {});

  it("withdraw: Should withdraw USDC from chamber", async () => {});

  it("withdraw: Should withdraw ETH from chamber", async () => {});
});
