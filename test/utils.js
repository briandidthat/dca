const { ethers } = require("hardhat");

const WHALE = "0x7a8edc710ddeadddb0b539de83f3a306a621e823";
const USDT_WHALE = "0xa929022c9107643515f5c777ce9a910f0d1e490c";

const DAI = "0x6b175474e89094c44da98b954eedeac495271d0f";
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const USDT = "0xdac17f958d2ee523a2206206994597c13d831ec7";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const cDAI = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643";
const cUSDC = "0x39AA39c021dfbaE8faC545936693aC917d5E7563";
const cETH = "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5";

const TOKEN_DETAILS = {
  networks: {
    mainnet: {
      DAI,
      USDC,
      WETH,
      cDAI,
      cUSDC,
      cETH,
    },
  },
};

const tokenLibraryFixture = async () => {
  const Library = await ethers.getContractFactory("TokenLibrary");
  const library = await Library.deploy();
  await library.deployed();

  return library;
};

const tokenFixture = async () => {
  const dai = await ethers.getContractAt("IERC20", DAI);
  const weth = await ethers.getContractAt("IWETH", WETH);
  const usdc = await ethers.getContractAt("IERC20", USDC);
  const usdt = await ethers.getContractAt("IERC20", USDT);

  const cDai = await ethers.getContractAt("ICERC20", cDAI);
  const cEth = await ethers.getContractAt("ICETH", cETH);
  const cUsdc = await ethers.getContractAt("ICERC20", cUSDC);

  return { dai, weth, usdc, usdt, cDai, cEth, cUsdc };
};

const chamberFactoryFixture = async () => {
  const Chamber = await ethers.getContractFactory("Chamber");
  const ChamberFactory = await ethers.getContractFactory("ChamberFactory");

  const chamberFactory = await ChamberFactory.deploy();

  await chamberFactory.deployed();

  return {
    chamberFactory,
  };
};

module.exports = {
  tokenFixture,
  chamberFactoryFixture,
  TOKEN_DETAILS,
  WHALE,
  USDT_WHALE,
};
