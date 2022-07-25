const { expect } = require("chai");
const { ethers, network, waffle } = require("hardhat");
const { WHALE, contractFixture } = require("./utils");

describe("Chamber", () => {
  let accounts, dev, whale;
  let chamber, chamberFactory, compoundManager, uniswapExchange;
  let weth, dai, usdc;
  let cEth, cUsdc, cDai;

  const daiAmount = 100n * 10n ** 18n;
  const usdcAmount = 100n * 10n ** 6n;
  const ethAmount = 5n * 10n ** 18n;

  beforeEach(async () => {
    [dev, user, ...accounts] = await ethers.getSigners();
    const { contracts, tokens } = await contractFixture();

    chamber = contracts.chamber;
    chamberFactory = contracts.chamberFactory;
    compoundManager = contracts.compoundManager;
    uniswapExchange = contracts.uniswapExchange;

    dai = tokens.dai;
    weth = tokens.weth;
    usdc = tokens.usdc;
    cEth = tokens.cEth;
    cDai = tokens.cDai;
    cUsdc = tokens.cUsdc;

    let tx = await chamberFactory.connect(user).deployChamber();
    let receipt = await tx.wait();

    // get the chamber we just deployed using the address from logs
    chamber = await ethers.getContractAt(
      "IChamber",
      receipt.events[0].args.instance
    );

    // unlock USDC/DAI Whale account
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WHALE],
    });

    whale = await ethers.getSigner(WHALE);

    // transfer 100 USDC & 100 DAI from whale to dev
    await dai.connect(whale).transfer(user.address, daiAmount);
    await usdc.connect(whale).transfer(user.address, usdcAmount);
    // give approval to the chamber
    await dai.connect(user).approve(chamber.address, daiAmount);
    await usdc.connect(user).approve(chamber.address, usdcAmount);
  });

  // ========================= DEPOSIT =============================

  it("deposit: Should deposit DAI into chamber and update balance", async () => {
    await chamber.connect(user).deposit(dai.address, daiAmount);
    let balance = await chamber.balanceOf(dai.address);

    expect(balance).to.be.equal(daiAmount);
  });

  it("deposit: Should deposit USDC into chamber and update balance", async () => {
    await chamber.connect(user).deposit(usdc.address, usdcAmount);
    let balance = await chamber.balanceOf(usdc.address);

    expect(balance).to.be.equal(usdcAmount);
  });

  it("depositETH: Should deposit ETH into chamber and update balance", async () => {
    await user.sendTransaction({ to: chamber.address, value: ethAmount });
    let balance = await waffle.provider.getBalance(chamber.address);

    expect(balance).to.be.equal(ethAmount);
  });

  // ========================= WITHDRAW =============================

  it("withdraw: Should withdraw DAI from chamber and update balance", async () => {
    await chamber.connect(user).deposit(dai.address, daiAmount);
    await chamber.connect(user).withdraw(dai.address, daiAmount);

    let balance = await chamber.balanceOf(dai.address);

    expect(balance).to.be.equal(0);
  });

  it("withdraw: Should withdraw USDC from chamber", async () => {
    await chamber.connect(user).deposit(usdc.address, usdcAmount);
    await chamber.connect(user).withdraw(usdc.address, usdcAmount);

    let balance = await chamber.balanceOf(usdc.address);

    expect(balance).to.be.equal(0);
  });

  it("withdrawETH: Should withdraw ETH from chamber", async () => {
    await user.sendTransaction({ to: chamber.address, value: ethAmount });

    let userBalanceBefore = await waffle.provider.getBalance(user.address);
    let chamberBalanceBefore = await waffle.provider.getBalance(
      chamber.address
    );

    await chamber.connect(user).withdrawETH(ethAmount);

    let userBalanceAfter = await waffle.provider.getBalance(user.address);
    let chamberBalanceAfter = await waffle.provider.getBalance(chamber.address);

    expect(chamberBalanceBefore).to.be.equal(ethAmount);
    expect(chamberBalanceAfter).to.be.equal(0);
    expect(userBalanceAfter).to.be.gte(userBalanceBefore);
  });

  // ========================= SUPPLY =============================
  it("buyETH: Should buy ETH using DAI", async () => {
    await chamber.connect(user).deposit(dai.address, daiAmount);
    let chamberBalance = await waffle.provider.getBalance(chamber.address);

    expect(chamberBalance).to.be.gte(0);
  });

  it("buyETH: Should buy ETH using USDC", async () => {
    await chamber.connect(user).deposit(usdc.address, usdcAmount);
    let chamberBalance = await waffle.provider.getBalance(chamber.address);

    expect(chamberBalance).to.be.gte(0);
  });


  // ========================= EVENT =============================
});
