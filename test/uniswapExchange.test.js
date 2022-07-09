const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const DAI = "0x6b175474e89094c44da98b954eedeac495271d0f";
const WETH9 = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const USDT = "0xdac17f958d2ee523a2206206994597c13d831ec7";

const WHALE = "0x7a8edc710ddeadddb0b539de83f3a306a621e823";
const USDT_WHALE = "0xa929022c9107643515f5c777ce9a910f0d1e490c";

describe("UniswapExchange", async () => {
  let accounts, dev, whale, usdtWhale;
  let exchange;
  let weth, dai, usdt, usdc;
  const daiAmount = 100n * 10n ** 18n;
  const usdcAmount = 100n * 10n ** 6n;
  const usdtAmount = 100n * 10n ** 6n;

  beforeEach(async () => {
    [dev, user, ...accounts] = await ethers.getSigners();
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

    // unlock USDT Whale account
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USDT_WHALE],
    });

    whale = await ethers.getSigner(WHALE);
    usdtWhale = await ethers.getSigner(USDT_WHALE);
    // transfer 100 USDC & 100 DAI from whale to dev
    await dai.connect(whale).transfer(user.address, daiAmount);
    await usdc.connect(whale).transfer(user.address, usdcAmount);
    await usdt.connect(usdtWhale).transfer(user.address, usdtAmount);
  });

  it("Should deploy contract with dev as owner", async () => {
    const owner = await exchange.owner.call();
    expect(owner).to.equal(dev.address);
  });

  it("Should give the user address 100 USDC & 100 DAI to trade", async () => {
    expect(await dai.balanceOf(user.address)).to.gte(daiAmount);
    expect(await usdc.balanceOf(user.address)).to.gte(usdcAmount);
  });

  it("swapExactInputSingle: Should swap 100 DAI for WETH", async () => {
    const balanceBefore = await weth.balanceOf(user.address);
    await dai.connect(user).approve(exchange.address, daiAmount);
    await exchange.connect(user).swapExactInputSingle(daiAmount, DAI);

    expect(await weth.balanceOf(user.address)).to.gte(balanceBefore);
  });

  it("swapExactInputSingle: Should swap 100 USDC for WETH", async () => {
    const balanceBefore = await weth.balanceOf(user.address);
    await usdc.connect(user).approve(exchange.address, usdcAmount);
    await exchange.connect(user).swapExactInputSingle(usdcAmount, USDC);

    expect(await weth.balanceOf(user.address)).to.gte(balanceBefore);
  });

  it("swapExactInputSingle: Should swap 100 USDT for WETH", async () => {
    const balanceBefore = await weth.balanceOf(user.address);
    await usdt.connect(user).approve(exchange.address, usdtAmount);
    await exchange.connect(user).swapExactInputSingle(usdtAmount, USDT);

    expect(await weth.balanceOf(user.address)).to.gte(balanceBefore);
  });
});
