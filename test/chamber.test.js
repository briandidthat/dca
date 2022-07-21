const { expect } = require("chai");
const { ethers, network, waffle } = require("hardhat");
const { TOKEN_DETAILS, WHALE } = require("./utils");

const { DAI, USDC, WETH, cDAI, cUSDC, cETH } = TOKEN_DETAILS.networks.mainnet;

describe("Chamber", () => {
  let accounts, dev, whale;
  let chamber;
  let weth, dai, usdc;

  const daiAmount = 100n * 10n ** 18n;
  const usdcAmount = 100n * 10n ** 6n;
  const ethAmount = 5n * 10n ** 18n;

  beforeEach(async () => {
    [dev, user, ...accounts] = await ethers.getSigners();
    const Library = await ethers.getContractFactory("TokenLibrary");
    const library = await Library.deploy();
    await library.deployed();

    const Chamber = await ethers.getContractFactory("Chamber");

    chamber = await Chamber.deploy();
    await chamber.deployed();

    dai = await ethers.getContractAt("IERC20", DAI);
    weth = await ethers.getContractAt("IWETH", WETH);
    usdc = await ethers.getContractAt("IERC20", USDC);

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

  it("initialize: Should initialize chamber with user as owner", async () => {});

  it("deposit: Should deposit DAI into chamber and update balance", async () => {});

  it("deposit: Should deposit USDC into chamber and update balance", async () => {});

  it("withdraw: Should withdraw DAI from chamber", async () => {});

  it("withdraw: Should withdraw USDC from chamber", async () => {});
});
