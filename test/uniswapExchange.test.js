const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { TOKEN_DETAILS, USDT_WHALE, WHALE } = require("./utils");

const { DAI, USDC, USDT, WETH } = TOKEN_DETAILS.networks.mainnet;

describe("UniswapExchange", async () => {
  let accounts, dev, whale, usdtWhale;
  let exchange;
  let weth, dai, usdt, usdc;
  const daiAmount = 100n * 10n ** 18n;
  const usdcAmount = 100n * 10n ** 6n;
  const usdtAmount = 100n * 10n ** 6n;

  beforeEach(async () => {
    [dev, user, ...accounts] = await ethers.getSigners();
    const Library = await ethers.getContractFactory("TokenLibrary");
    const library = await Library.deploy();
    await library.deployed();
    const Exchange = await ethers.getContractFactory("UniswapExchange", dev, {
      libraries: {
        TokenLibrary: library.address,
      },
    });
    exchange = await Exchange.deploy();
    await exchange.deployed();

    dai = await ethers.getContractAt("IERC20", DAI);
    weth = await ethers.getContractAt("IWETH", WETH);
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

  it("Should give the user address 100 DAI, 100 USDC and 100 USDT to trade", async () => {
    expect(await dai.balanceOf(user.address)).to.gte(daiAmount);
    expect(await usdc.balanceOf(user.address)).to.gte(usdcAmount);
    expect(await usdt.balanceOf(user.address)).to.gte(usdtAmount);
  });

  it("swapForWETH: Should swap 100 DAI for WETH", async () => {
    const balanceBefore = await weth.balanceOf(user.address);
    await dai.connect(user).approve(exchange.address, daiAmount);
    await exchange.connect(user).swapForWETH(daiAmount, DAI);

    expect(await weth.balanceOf(user.address)).to.gte(balanceBefore);
  });

  it("swapForWETH: Should swap 100 USDC for WETH", async () => {
    const balanceBefore = await weth.balanceOf(user.address);
    await usdc.connect(user).approve(exchange.address, usdcAmount);
    await exchange.connect(user).swapForWETH(usdcAmount, USDC);

    expect(await weth.balanceOf(user.address)).to.gte(balanceBefore);
  });

  it("swapForWETH: Should swap 100 USDT for WETH", async () => {
    const balanceBefore = await weth.balanceOf(user.address);
    await usdt.connect(user).approve(exchange.address, usdtAmount);
    await exchange.connect(user).swapForWETH(usdtAmount, USDT);

    expect(await weth.balanceOf(user.address)).to.gte(balanceBefore);
  });
});
