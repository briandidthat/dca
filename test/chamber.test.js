const axios = require("axios");
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const {
  WHALE,
  EVENTS,
  getHash,
  chamberFactoryFixture,
  tokenFixture,
  createQueryString,
  getEventObject,
} = require("./utils");

ZEROX_URL = process.env.ZEROX_URL;
ZEROX_API_KEY = process.env.ZEROX_API_KEY;

describe("Chamber", () => {
  let accounts, whale, user, operator, attacker;
  let chamber, chamberFactory;
  let weth, dai, usdc;

  const STRATEGY_HASH = getHash("First Strategy");
  const STRATEGY2_HASH = getHash("Second Strategy");

  const usdcAmount = 100n * 10n ** 6n; // 100 USDC
  const ethAmount = ethers.utils.parseEther("5"); // 5 ETH
  const daiAmount = ethers.utils.parseEther("100"); // 100 DAI
  const chamberFee = ethers.utils.parseEther("0.05"); // 0.05 ETH

  axios.defaults.headers.common["0x-api-key"] = ZEROX_API_KEY;

  beforeEach(async () => {
    [user, operator, attacker, ...accounts] = await ethers.getSigners();
    chamberFactory = await chamberFactoryFixture();
    const tokens = await tokenFixture();

    dai = tokens.dai;
    weth = tokens.weth;
    usdc = tokens.usdc;
    cEth = tokens.cEth;

    let receipt = await chamberFactory
      .connect(user)
      .deployChamber({ value: chamberFee })
      .then((tx) => tx.wait());

    const event = getEventObject(
      EVENTS.chamberFactory.NEW_CHAMBER,
      receipt.events
    );
    // get the chamber we just deployed using the address from logs
    chamber = await ethers.getContractAt("IChamber", event.args.instance);

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

  // // ========================= DEPOSIT ERC20 =============================

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
    await chamber.connect(user).depositETH({ value: ethAmount });
    let balance = await ethers.provider.getBalance(chamber.address);

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

  it("withdraw: Should revert due to caller not being owner", async () => {
    await chamber.connect(user).deposit(usdc.address, usdcAmount);
    await expect(
      chamber.connect(attacker).withdraw(usdc.address, usdcAmount)
    ).to.be.revertedWith("Restricted to Owner");
  });

  // ========================= WITHDRAW ETH =============================

  it("withdrawETH: Should withdraw ETH from chamber", async () => {
    await user.sendTransaction({ to: chamber.address, value: ethAmount });

    let userBalanceBefore = await ethers.provider.getBalance(user.address);
    let chamberBalanceBefore = await ethers.provider.getBalance(
      chamber.address
    );

    await chamber.connect(user).withdrawETH(ethAmount);

    let userBalanceAfter = await ethers.provider.getBalance(user.address);
    let chamberBalanceAfter = await ethers.provider.getBalance(chamber.address);

    expect(chamberBalanceBefore).to.be.equal(ethAmount);
    expect(chamberBalanceAfter).to.be.equal(0);
    expect(userBalanceAfter).to.be.gt(userBalanceBefore);
  });

  it("withdrawETH: Should revert due to caller not being owner", async () => {
    await user.sendTransaction({ to: chamber.address, value: ethAmount });

    await expect(
      chamber.connect(attacker).withdrawETH(ethAmount)
    ).to.be.revertedWith("Restricted to Owner");
  });

  // ========================= WRAP ETH =============================
  it("wrapETH: Should wrap ETH and update WETH Balance", async () => {
    await chamber.connect(user).depositETH({ value: ethAmount });
    await chamber.connect(user).wrapETH(ethAmount);

    const wethBalance = await weth.balanceOf(chamber.address);
    const ethBalance = await ethers.provider.getBalance(chamber.address);

    expect(wethBalance).to.be.equal(ethAmount);
    expect(ethBalance).to.be.equal(0);
  });

  // ========================= UNWRAP ETH =============================
  it("unwrapETH: Should unwrap ETH and update WETH Balance", async () => {
    await chamber.connect(user).depositETH({ value: ethAmount });
    await chamber.connect(user).wrapETH(ethAmount);
    await chamber.connect(user).unwrapETH(ethAmount);

    const wethBalance = await weth.balanceOf(chamber.address);
    const ethBalance = await ethers.provider.getBalance(chamber.address);

    expect(wethBalance).to.be.equal(0);
    expect(ethBalance).to.be.equal(ethAmount);
  });

  // ========================= EXECUTE SWAP =============================

  it("executeSwap: Should swap DAI to WETH using 0x liquidity", async () => {
    await chamber.connect(user).deposit(dai.address, daiAmount);

    const url = createQueryString(ZEROX_URL, {
      sellToken: "DAI",
      buyToken: "WETH",
      sellAmount: daiAmount.toString(),
    });

    const response = await axios.get(url);
    const quote = response.data;

    await dai.connect(user).approve(quote.allowanceTarget, quote.sellAmount);

    let receipt = await chamber
      .connect(user)
      .executeSwap(
        quote.sellTokenAddress,
        quote.buyTokenAddress,
        daiAmount,
        quote.allowanceTarget,
        quote.to,
        quote.data
      )
      .then((tx) => tx.wait());

    const event = getEventObject(EVENTS.chamber.EXECUTE_SWAP, receipt.events);

    const chamberWethBalance = await weth.balanceOf(chamber.address);
    const chamberBalance = await chamber.balanceOf(weth.address);

    expect(chamberWethBalance).to.be.gt(0);
    expect(chamberBalance).to.be.equal(chamberWethBalance);
    expect(event.args.sellToken).to.be.equal(dai.address);
    expect(event.args.buyToken).to.be.equal(weth.address);
    expect(event.args.amount).to.be.equal(daiAmount);
  });

  it("executeSwap: Should swap USDC to WETH using 0x liquidity", async () => {
    await chamber.connect(user).deposit(usdc.address, usdcAmount);
    const url = createQueryString(ZEROX_URL, {
      sellToken: "USDC",
      buyToken: "WETH",
      sellAmount: usdcAmount.toString(),
    });

    const response = await axios.get(url);
    const quote = response.data;

    const receipt = await chamber
      .connect(user)
      .executeSwap(
        quote.sellTokenAddress,
        quote.buyTokenAddress,
        usdcAmount,
        quote.allowanceTarget,
        quote.to,
        quote.data
      )
      .then((tx) => tx.wait());

    const event = getEventObject(EVENTS.chamber.EXECUTE_SWAP, receipt.events);

    const chamberWethBalance = await weth.balanceOf(chamber.address);
    const chamberBalance = await chamber.balanceOf(weth.address);

    expect(chamberWethBalance).to.be.gt(0);
    expect(chamberBalance).to.be.equal(chamberWethBalance);
    expect(event.args.sellToken).to.be.equal(usdc.address);
    expect(event.args.buyToken).to.be.equal(weth.address);
    expect(event.args.amount).to.be.equal(usdcAmount); 
  });

  it("executeSwap: Should swap WETH to USDC using 0x liquidity", async () => {
    await chamber.connect(user).depositETH({ value: ethAmount });

    const sellAmount = ethers.utils.parseEther("1");
    await chamber.connect(user).wrapETH(sellAmount);

    const url = createQueryString(ZEROX_URL, {
      sellToken: "WETH",
      buyToken: "USDC",
      sellAmount: sellAmount.toString(),
    });

    const response = await axios.get(url);
    const quote = response.data;

    const receipt = await chamber
      .connect(user)
      .executeSwap(
        quote.sellTokenAddress,
        quote.buyTokenAddress,
        usdcAmount,
        quote.allowanceTarget,
        quote.to,
        quote.data
      )
      .then((tx) => tx.wait());

    const event = getEventObject(EVENTS.chamber.EXECUTE_SWAP, receipt.events);
    const usdcBalance = await usdc.balanceOf(chamber.address);
    const ethBalance = await ethers.provider.getBalance(chamber.address);

    expect(usdcBalance).to.be.gt(0);
    expect(ethBalance).to.be.gt(sellAmount);
    expect(ethBalance).to.be.lt(ethAmount);
    expect(event.args.sellToken).to.be.equal(weth.address);
    expect(event.args.buyToken).to.be.equal(usdc.address);
    expect(event.args.amount).to.be.equal(usdcAmount);
  });
  // ========================= CREATE STRATEGY =============================

  it("createStrategy: Should create a strategy and log the strategy id", async () => {
    await chamber.connect(user).deposit(dai.address, daiAmount);

    const frequency = 7;

    let receipt = await chamber
      .connect(user)
      .createStrategy(STRATEGY_HASH, weth.address, dai.address, daiAmount, frequency)
      .then((tx) => tx.wait());

    const event = getEventObject(EVENTS.chamber.NEW_STRATEGY, receipt.events);

    expect(event.args.hashId).to.be.equal(STRATEGY_HASH);
    expect(event.args.amount).to.be.equal(daiAmount);
    expect(event.args.frequency).to.be.equal(frequency);
  });

  // ========================= UPDATE STRATEGY =============================

  it("updateStrategy: Should update the strategy at the given hash if found", async () => {
    const frequency = 1;
    await chamber.connect(user).deposit(usdc.address, usdcAmount);

    await chamber
      .connect(user)
      .createStrategy(STRATEGY_HASH, weth.address, usdc.address, usdcAmount, frequency);

    const strategy = await chamber.connect(user).getStrategy(STRATEGY_HASH);
    const updatedFrequency = 10;
    const updatedAmount = usdcAmount + usdcAmount;

    const receipt = await chamber
      .connect(user)
      .updateStrategy({
        idx: strategy.idx,
        hashId: strategy.hashId,
        buyToken: strategy.buyToken,
        sellToken: strategy.sellToken,
        frequency: updatedFrequency,
        amount: updatedAmount,
        timestamp: strategy.timestamp,
        swapCount: strategy.swapCount,
        lastSwap: strategy.lastSwap,
        status: strategy.status,
      })
      .then((tx) => tx.wait());

    const event = getEventObject(EVENTS.chamber.UPDATE_STRATEGY, receipt.events);

    const updatedStrategy = await chamber
      .connect(user)
      .getStrategy(strategy.hashId);

    expect(updatedStrategy.amount).to.be.equal(updatedAmount);
    expect(updatedStrategy.frequency).to.be.equal(updatedFrequency);
    expect(event.args.hashId).to.be.equal(STRATEGY_HASH);
  });

  // ========================= DEPRECATE STRATEGY =============================

  it("deprecateStrategy: Should deprecate the strategy at the given hash if found", async () => {
    await chamber.connect(user).deposit(usdc.address, usdcAmount);
    await chamber
      .connect(user)
      .createStrategy(STRATEGY_HASH, weth.address, usdc.address, usdcAmount, 1);

    const receipt = await chamber
      .connect(user)
      .deprecateStrategy(STRATEGY_HASH)
      .then((tx) => tx.wait());

    const event = getEventObject(EVENTS.chamber.DEPRECATE_STRATEGY, receipt.events);
    const deprecatedStrategy = await chamber.connect(user).getStrategy(STRATEGY_HASH);
    const activeStrategies = await chamber.getActiveStrategies();

    expect(deprecatedStrategy.status).to.be.equal(1); // 1 == DEACTIVATED
    expect(activeStrategies.length).to.be.equal(0); // should be 0 active strats
    expect(event.args.hashId).to.be.equal(STRATEGY_HASH);
  });

  // ========================= DELETE STRATEGY ================================

  it("deleteStrategy: Should create another strategy at same hash after deleting", async () => {
    await chamber.connect(user).deposit(usdc.address, usdcAmount);
    await chamber
      .connect(user)
      .createStrategy(STRATEGY_HASH, weth.address, usdc.address, usdcAmount, 1);
    // delete the strategy we just created
    const receipt = await chamber
      .connect(user)
      .deleteStrategy(STRATEGY_HASH)
      .then((tx) => tx.wait());
    const event = getEventObject(EVENTS.chamber.DELETE_STRATEGY, receipt.events);
    // create another strategy at the same hash
    await chamber
      .connect(user)
      .createStrategy(STRATEGY_HASH, weth.address, usdc.address, usdcAmount, 7);
    // get all trategies, should be only 1
    const strategies = await chamber.getStrategies();

    expect(strategies.length).to.be.equal(1); // should be 1 active strategy
    expect(event.args.hashId).to.be.equal(STRATEGY_HASH);
  });

  // ========================= EXECUTE STRATEGY =============================

  it("executeStrategy: Should execute strategy by owner", async () => {
    await chamber.connect(user).deposit(usdc.address, usdcAmount);
    await chamber
      .connect(user)
      .createStrategy(STRATEGY_HASH, weth.address, usdc.address, usdcAmount, 7);

    const url = createQueryString(ZEROX_URL, {
      sellToken: "USDC",
      buyToken: "WETH",
      sellAmount: usdcAmount.toString(),
    });
    const response = await axios.get(url);

    const quote = response.data;

    const receipt = await chamber
      .connect(user)
      .executeStrategy(STRATEGY_HASH, quote.allowanceTarget, quote.to, quote.data)
      .then((tx) => tx.wait());

    const event = getEventObject(EVENTS.chamber.EXECUTE_STRATEGY, receipt.events);

    const strategy = await chamber.getStrategy(STRATEGY_HASH);
    const balance = await weth.balanceOf(chamber.address);

    expect(balance).to.be.gt(0);
    expect(strategy.lastSwap).to.be.gt(0);
    expect(strategy.swapCount).to.be.eq(1);
    expect(event.args.hashId).to.be.equal(STRATEGY_HASH);
  });

  it("executeStrategy: Should execute strategy by operator", async () => {
    await chamber.connect(user).deposit(usdc.address, usdcAmount);
    await chamber.connect(user).setOperator(operator.address);
    await chamber
      .connect(user)
      .createStrategy(STRATEGY_HASH, weth.address, usdc.address, usdcAmount, 7);

    const url = createQueryString(ZEROX_URL, {
      sellToken: "USDC",
      buyToken: "WETH",
      sellAmount: usdcAmount.toString(),
    });
    const response = await axios.get(url);

    const quote = response.data;

    const receipt = await chamber
      .connect(operator)
      .executeStrategy(STRATEGY_HASH, quote.allowanceTarget, quote.to, quote.data)
      .then((tx) => tx.wait());

    const event = getEventObject(EVENTS.chamber.EXECUTE_STRATEGY, receipt.events);

    const strategy = await chamber.getStrategy(STRATEGY_HASH);
    const balance = await weth.balanceOf(chamber.address);

    expect(balance).to.be.gt(0);
    expect(strategy.lastSwap).to.be.gt(0);
    expect(event.args.hashId).to.be.equal(STRATEGY_HASH);
  });

  // ========================= SET STATUS =============================
  it("setStatus: Should set the chamber status to DEPRECATED", async () => {
    await chamber.connect(user).setChamberStatus(2);
    let status = await chamber.connect(user).getStatus();

    expect(status).to.be.equal(2);
  });

  // ========================= SET OPERATOR =============================
  it("setOperator: Should set the operator address", async () => {
    let tx = await chamber
      .connect(user)
      .setOperator(operator.address)
      .then((tx) => tx.wait());

    const event = getEventObject(EVENTS.chamber.NEW_OPERATOR, tx.events);

    const operatorAddr = await chamber.getOperator();
    expect(operatorAddr).to.be.equal(operator.address);
    expect(event.args.operator).to.be.equal(operatorAddr);
  });

  // ========================= BALANCE OF =============================

  it("balanceOf: Should return a balance of 50 DAI and 50 USDC", async () => {
    await chamber.connect(user).deposit(dai.address, daiAmount);
    await chamber.connect(user).deposit(usdc.address, usdcAmount);

    const usdcWithdrawal = 50n * 10n ** 6n;
    const daiWithdrawal = ethers.utils.parseEther("50");

    await chamber.connect(user).withdraw(dai.address, daiWithdrawal);
    await chamber.connect(user).withdraw(usdc.address, usdcWithdrawal);

    let daiBalance = await chamber.balanceOf(dai.address);
    let usdcBalance = await chamber.balanceOf(usdc.address);

    expect(daiBalance).to.be.equal(daiWithdrawal);
    expect(usdcBalance).to.be.equal(usdcWithdrawal);
  });

  // ========================= GET STRATEGY =============================
  it("getStrategy: Should return the strategy at the given hash if found", async () => {
    const frequency = 1;
    await chamber.connect(user).deposit(usdc.address, usdcAmount);

    await chamber
      .connect(user)
      .createStrategy(STRATEGY_HASH, weth.address, usdc.address, usdcAmount, frequency);

    const strategy = await chamber.connect(user).getStrategy(STRATEGY_HASH);

    expect(strategy.hashId).to.be.equal(STRATEGY_HASH);
    expect(strategy.lastSwap).to.be.equal(0);
    expect(strategy.amount).to.be.equal(usdcAmount);
    expect(strategy.frequency).to.be.equal(frequency);
  });

  // ========================= GET ALL STRATEGIES =============================
  it("getStrategies: Should return a list of Strategies containing 2 strategies", async () => {
    await chamber.connect(user).deposit(dai.address, daiAmount);
    await chamber.connect(user).deposit(usdc.address, usdcAmount);

    const frequency = 7;
    await chamber
      .connect(user)
      .createStrategy(STRATEGY_HASH, weth.address, dai.address, daiAmount, frequency);

    await chamber
      .connect(user)
      .createStrategy(STRATEGY2_HASH, weth.address, usdc.address, usdcAmount, frequency);

    const strategies = await chamber.connect(user).getStrategies();
    const strategy = strategies[0];

    expect(strategies.length).to.be.equal(2);
    expect(strategy.amount).to.be.equal(daiAmount);
    expect(strategy.frequency).to.be.equal(frequency);
  });

  // ========================= GET ACTIVE STRATEGIES =============================
  it("getActiveStrategies: Should return a list of active strategies", async () => {
    await chamber.connect(user).deposit(usdc.address, usdcAmount);
    await chamber.connect(user).deposit(dai.address, daiAmount);

    await chamber
      .connect(user)
      .createStrategy(STRATEGY_HASH, weth.address, usdc.address, usdcAmount, 1); // 1 strategy
    await chamber
      .connect(user)
      .createStrategy(STRATEGY2_HASH, weth.address, dai.address, daiAmount, 1); // 2nd strategy

    await chamber.connect(user).deprecateStrategy(STRATEGY_HASH);

    const activeStrategies = await chamber.getActiveStrategies();

    expect(activeStrategies.length).to.be.equal(1); // should be 1 active strats
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
});
