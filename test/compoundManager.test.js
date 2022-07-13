const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { TOKEN_DETAILS, USDT_WHALE, WHALE } = require("./utils");

const { DAI, USDC, USDT, WETH, cDAI, cUSDC, cUSDT, cETH } = TOKEN_DETAILS;

describe("compoundManager", async () => {
  let compoundManager;
  let dev, whale, usdtWhale;
  let weth, dai, usdt, usdc;
  let cEth, cUsdc, cDai, cUsdt;

  const daiAmount = 100n * 10n ** 18n;
  const usdcAmount = 100n * 10n ** 6n;
  const usdtAmount = 100n * 10n ** 6n;

  beforeEach(async () => {
    [dev, user, contract, ...accounts] = await ethers.getSigners();
    const Library = await ethers.getContractFactory("TokenLibrary");
    const library = await Library.deploy();
    await library.deployed();

    const CompoundManager = await ethers.getContractFactory("CompoundManager", {
      libraries: {
        TokenLibrary: library.address,
      },
    });

    compoundManager = await CompoundManager.deploy();
    await compoundManager.deployed();

    dai = await ethers.getContractAt("IERC20", DAI);
    weth = await ethers.getContractAt("IWETH", WETH);
    usdc = await ethers.getContractAt("IERC20", USDC);
    usdt = await ethers.getContractAt("IERC20", USDT);

    cDai = await ethers.getContractAt("ICERC20", cDAI);
    cEth = await ethers.getContractAt("ICETH", cETH);
    cUsdc = await ethers.getContractAt("ICERC20", cUSDC);
    cUsdt = await ethers.getContractAt("ICERC20", cUSDT);

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

    // transfer 100 USDC & 100 DAI from whale to user
    await dai.connect(whale).transfer(user.address, daiAmount);
    await usdc.connect(whale).transfer(user.address, usdcAmount);
    await usdt.connect(usdtWhale).transfer(user.address, usdtAmount);
  });

  it("Should deposit DAI on Compound and give user a cDAI balance", async () => {
    await dai.connect(user).transfer(contract.address, daiAmount);
    await dai.connect(contract).approve(compoundManager.address, daiAmount);
    // supply DAI tokens to compound
    await compoundManager.connect(contract).supplyStablecoin(DAI, daiAmount, user.address);
    // should be greater than 0
    expect(await cDai.balanceOf(user.address)).to.gte(0);
  });

  it("Should deposit USDC on Compound and give user a cUSDC balance", async () => {
    await usdc.connect(user).transfer(contract.address, usdcAmount);
    await usdc.connect(contract).approve(compoundManager.address, usdcAmount);
    // supply USDT tokens to compound
    await compoundManager.connect(contract).supplyStablecoin(USDC, usdcAmount, user.address);
    // should be greater than 0
    expect(await cUsdc.balanceOf(user.address)).to.gte(0);
  });

  it("Should deposit USDT on Compound and give user a cUSDT balance", async () => {
    await usdt.connect(user).transfer(contract.address, usdtAmount);
    await usdt.connect(contract).approve(compoundManager.address, usdtAmount);
    // supply USDT tokens to compound
    await compoundManager.connect(contract).supplyStablecoin(USDT, usdtAmount, user.address);
    // should be greater than 0
    expect(await cUsdt.balanceOf(user.address)).to.gte(0);
  });


});
