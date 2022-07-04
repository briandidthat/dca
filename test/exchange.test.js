const { expect } = require("chai");
const { ethers } = require("hardhat");

const DAI = "0x6b175474e89094c44da98b954eedeac495271d0f";
const WETH9 = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const USDT = "0xdac17f958d2ee523a2206206994597c13d831ec7";

describe("Exchange", async () => {
  let accounts;
  let exchange;
  let weth, dai, usdt, usdc;

  beforeEach(async () => {
    accounts = await ethers.getSigners();

    const Exchange = await ethers.getContractFactory("Exchange");
    exchange = await Exchange.deploy({ from: accounts[0] });
    await exchange.deployed();

    weth = await ethers.getContractAt("IWETH9", WETH9);
    dai = await ethers.getContractAt("IERC20", DAI);
    usdc = await ethers.getContractAt("IERC20", USDC);
    usdt = await ethers.getContractAt("IERC20", USDT);
  });

  it("swapExactInputSingle", async () => {
    const amountIn = 10n ** 18n;

    await weth.deposit({ value: amountIn });
    await weth.approve(exchange.address, amountIn);

    await exchange.swapExactInputSingle(amountIn);

    console.log(dai.balanceOf(accounts[0].address));
  });
});
