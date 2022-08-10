const axios = require("axios");
const { expect } = require("chai");
const { ethers, network, waffle, web3 } = require("hardhat");
const { WHALE, chamberFactoryFixture, tokenFixture } = require("./utils");

describe("Chamber", () => {
  let accounts, whale, user, attacker;
  let chamber, chamberFactory;
  let weth, cEth, dai, usdc;

  const ethAmount = 5n * 10n ** 18n; // 5 ETH
  const daiAmount = 100n * 10n ** 18n; // 100 DAI
  const usdcAmount = 100n * 10n ** 6n; // 100 USDC
  const chamberFee = ethers.BigNumber.from(web3.utils.toWei("0.05", "ether"));

  beforeEach(async () => {
    [user, attacker, ...accounts] = await ethers.getSigners();
    chamberFactory = await chamberFactoryFixture();
    const tokens = await tokenFixture();

    dai = tokens.dai;
    weth = tokens.weth;
    usdc = tokens.usdc;
    cEth = tokens.cEth;

    let tx = await chamberFactory
      .connect(user)
      .deployChamber({ value: chamberFee });
    let receipt = await tx.wait();

    // get the chamber we just deployed using the address from logs
    chamber = await ethers.getContractAt(
      "IChamber",
      receipt.events[1].args.instance
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

  // ========================= DEPOSIT ERC20 =============================

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

  // ========================= DEPOSIT ETH =============================

  it("depositETH: Should deposit ETH into chamber and update balance", async () => {
    await user.sendTransaction({ to: chamber.address, value: ethAmount });
    let balance = await waffle.provider.getBalance(chamber.address);

    expect(balance).to.be.equal(ethAmount);
  });

  // ========================= WITHDRAW ERC20 =============================

  it("withdraw: Should withdraw DAI from chamber and update balance", async () => {
    await chamber.connect(user).deposit(dai.address, daiAmount);
    await chamber.connect(user).withdraw(dai.address, daiAmount);

    let balance = await chamber.balanceOf(dai.address);

    expect(balance).to.be.equal(0);
  });

  it("withdraw: Should withdraw USDC from chamber and update balance", async () => {
    await chamber.connect(user).deposit(usdc.address, usdcAmount);
    await chamber.connect(user).withdraw(usdc.address, usdcAmount);

    let balance = await chamber.balanceOf(usdc.address);

    expect(balance).to.be.equal(0);
  });

  // ========================= WITHDRAW ETH =============================

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
    expect(userBalanceAfter).to.be.gt(userBalanceBefore);
  });

  // ========================= WITHDRAW ERC20 REVERT =============================

  it("withdraw: Should revert due to caller not being owner", async () => {
    await chamber.connect(user).deposit(usdc.address, usdcAmount);
    await expect(
      chamber.connect(attacker).withdraw(usdc.address, usdcAmount)
    ).to.be.revertedWith("Restricted to Owner");
  });

  // ========================= WITHDRAW ETH REVERT =============================

  it("withdrawETH: Should revert due to caller not being owner", async () => {
    await user.sendTransaction({ to: chamber.address, value: ethAmount });

    await expect(
      chamber.connect(attacker).withdrawETH(ethAmount)
    ).to.be.revertedWith("Restricted to Owner");
  });
  // ========================= SUPPLY ETH =============================

  it("supplyETH: Should supply ETH on compound", async () => {
    await user.sendTransaction({ to: chamber.address, value: ethAmount });
    await chamber.connect(user).supplyETH(ethAmount);

    let cEthBalance = await cEth.balanceOf(chamber.address);

    expect(cEthBalance).to.be.gt(0);
  });

  // ========================= REDEEM ETH =============================

  it("redeemETH: Should redeem ETH from compound", async () => {
    await user.sendTransaction({ to: chamber.address, value: ethAmount });
    await chamber.connect(user).supplyETH(ethAmount);

    let cEthBalance = await cEth.balanceOf(chamber.address);
    let balanceBefore = await waffle.provider.getBalance(chamber.address);

    await chamber.connect(user).redeemETH(cEthBalance);

    let balanceAfter = await waffle.provider.getBalance(chamber.address);

    expect(balanceAfter).to.be.gt(balanceBefore);
  });

  // ========================= EXECUTE SWAP =============================

  it("executeSwap: Should swap DAI to WETH using 0x liquidity", async () => {
    await chamber.connect(user).deposit(dai.address, daiAmount);
    const response = await axios.get(
      "https://api.0x.org/swap/v1/quote?sellToken=DAI&buyToken=WETH&sellAmount=100000000000000000000"
    );

    const quote = response.data;

    await dai.connect(user).approve(quote.allowanceTarget, quote.sellAmount);

    await chamber
      .connect(user)
      .executeSwap(
        quote.sellTokenAddress,
        quote.buyTokenAddress,
        daiAmount,
        quote.allowanceTarget,
        quote.to,
        quote.data
      );

    const chamberWethBalance = await weth.balanceOf(chamber.address);
    const chamberBalance = await chamber.balanceOf(weth.address);

    expect(chamberWethBalance).to.be.gt(0);
    expect(chamberBalance).to.be.equal(chamberWethBalance);
  });

  it("executeSwap: Should swap USDC to WETH using 0x liquidity", async () => {
    await chamber.connect(user).deposit(usdc.address, usdcAmount);
    const response = await axios.get(
      "https://api.0x.org/swap/v1/quote?sellToken=USDC&buyToken=WETH&sellAmount=100000000"
    );

    const quote = response.data;

    await chamber
      .connect(user)
      .executeSwap(
        quote.sellTokenAddress,
        quote.buyTokenAddress,
        usdcAmount,
        quote.allowanceTarget,
        quote.to,
        quote.data
      );

    const chamberWethBalance = await weth.balanceOf(chamber.address);
    const chamberBalance = await chamber.balanceOf(weth.address);

    expect(chamberWethBalance).to.be.gt(0);
    expect(chamberBalance).to.be.equal(chamberWethBalance);
  });

  // ========================= CREATE STRATEGY =============================

  it("createStrategy: Should create a strategy and log the strategy id", async () => {
    const frequency = 7;
    let tx = await chamber
      .connect(user)
      .createStrategy(weth.address, dai.address, daiAmount, frequency);
    let logs = await tx.wait();
    const values = logs.events[0].args;

    expect(values.sid).to.be.equal(0);
    expect(values.amount).to.be.equal(daiAmount);
    expect(values.frequency).to.be.equal(frequency);
  });

  // ========================= EXECUTE STRATEGY =============================
  
  it("executeStrategy: Should execute strategy at position 0", async () => {
    await chamber.connect(user).deposit(usdc.address, usdcAmount);
    await chamber
      .connect(user)
      .createStrategy(weth.address, usdc.address, usdcAmount, 7);

    const response = await axios.get(
      "https://api.0x.org/swap/v1/quote?sellToken=USDC&buyToken=WETH&sellAmount=100000000"
    );

    const quote = response.data;

    await chamber
      .connect(user)
      .executeStrategy(0, quote.allowanceTarget, quote.to, quote.data);

    let strategy = await chamber.getStrategy(0);
    let balance = await weth.balanceOf(chamber.address);

    expect(strategy.lastSwap).to.be.gt(0);
    expect(balance).to.be.gt(0);
  });

  // ========================= SET STATUS =============================
  it("setStatus: Should set the chamber status to DEPRECATED", async () => {
    await chamber.connect(user).setChamberStatus(2);
    let status = await chamber.connect(user).getStatus();

    expect(status).to.be.equal(2);
  })

  // ========================= BALANCE OF =============================

  it("balanceOf: Should return a balance of 50 DAI and 50 USDC", async () => {
    await chamber.connect(user).deposit(dai.address, daiAmount);
    await chamber.connect(user).deposit(usdc.address, usdcAmount);

    const daiWithdrawal = 50n * 10n ** 18n;
    const usdcWithdrawal = 50n * 10n ** 6n;

    await chamber.connect(user).withdraw(dai.address, daiWithdrawal);
    await chamber.connect(user).withdraw(usdc.address, usdcWithdrawal);

    let daiBalance = await chamber.balanceOf(dai.address);
    let usdcBalance = await chamber.balanceOf(usdc.address);

    expect(daiBalance).to.be.equal(daiWithdrawal);
    expect(usdcBalance).to.be.equal(usdcWithdrawal);
  });

  // ========================= GET OWNER =============================
  it("getOwner: Should return the chamber owner address", async () => {
    const owner = await chamber.getOwner();
    expect(owner).to.be.equal(user.address);
  });

  // ========================= GET FACTORY =============================

  it("getFactory: Should return the ChamberFactory address", async () => {
    const factory = await chamber.getFactory();
    expect(factory).to.be.equal(chamberFactory.address);
  });

  // ========================= GET STRATEGIES =============================
  it("getStrategies: Should return a list of Strategies containing 1 strategy", async () => {
    const frequency = 7;
    await chamber
      .connect(user)
      .createStrategy(weth.address, dai.address, daiAmount, frequency);

    const strategies = await chamber.connect(user).getStrategies();
    const strategy = strategies[0];

    expect(strategies.length).to.be.equal(1);
    expect(strategy.sid).to.be.equal(0);
    expect(strategy.amount).to.be.equal(daiAmount);
    expect(strategy.frequency).to.be.equal(frequency);
  });
});
