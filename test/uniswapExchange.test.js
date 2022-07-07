const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const DAI = "0x6b175474e89094c44da98b954eedeac495271d0f";
const WETH9 = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const USDT = "0xdac17f958d2ee523a2206206994597c13d831ec7";

const WHALE = "0x7a8edc710ddeadddb0b539de83f3a306a621e823";

describe("UniswapExchange", async () => {
  let accounts, dev, whale;
  let exchange;
  let weth, dai, usdt, usdc;
  const daiAmount = 100n * 10n ** 18n;
  const usdcAmount = 100n * 10n ** 6n;
  const usdtAmount = 100n * 10n ** 6n;

  beforeEach(async () => {
    [dev, ...accounts] = await ethers.getSigners();
    const Exchange = await ethers.getContractFactory("UniswapExchange", dev);
    exchange = await Exchange.deploy();
    await exchange.deployed();

    weth = await ethers.getContractAt("IWETH", WETH9);
    dai = await ethers.getContractAt("IERC20", DAI);
    usdc = await ethers.getContractAt("IERC20", USDC);
    usdt = await ethers.getContractAt("IERC20", USDT);

    // unlock USDC/DAI Whale account
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WHALE],
    });

    whale = await ethers.getSigner(WHALE);
    // transfer 100 USDC & 100 DAI from whale to dev
    await dai.connect(whale).transfer(dev.address, daiAmount);
    await usdc.connect(whale).transfer(dev.address, usdcAmount);
    
  });

  it("Should give the dev address 100 USDC & 100 DAI to trade", async () => {
    expect(await dai.balanceOf(dev.address)).to.gte(daiAmount);
    expect(await usdc.balanceOf(dev.address)).to.gte(usdcAmount);
  });

  it("Should deploy contract with dev as owner", async () => {
    const owner = await exchange.owner.call();
    expect(owner).to.equal(dev.address);
  });

  it("swapExactInputSingle: Should swap 100 DAI for WETH", async () => {
    const balanceBefore = await weth.balanceOf(dev.address);
    await dai.connect(dev).approve(exchange.address, daiAmount);
    await exchange.connect(dev).swapExactInputSingle(daiAmount, DAI);

    expect(await weth.balanceOf(dev.address)).to.gte(balanceBefore);
  });

  it("swapExactInputSingle: Should swap 100 USDC for WETH", async () => {
    const balanceBefore = await weth.balanceOf(dev.address);
    await usdc.connect(dev).approve(exchange.address, usdcAmount);
    await exchange.connect(dev).swapExactInputSingle(usdcAmount, USDC);

    expect(await weth.balanceOf(dev.address)).to.gte(balanceBefore);
  });

  it("swapExactInputSingle: Should swap 100 USDT for WETH", async () => {
    const balanceBefore = await weth.balanceOf(dev.address);
    await usdt.connect(dev).approve(exchange.address, usdtAmount);
    await exchange.connect(dev).swapExactInputSingle(usdtAmount, USDT);

    expect(await weth.balanceOf(dev.address)).to.gte(balanceBefore);
  });
});
