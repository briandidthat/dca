const { ethers, web3 } = require("hardhat");

const ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT = "0xdac17f958d2ee523a2206206994597c13d831ec7";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const WHALE = "0x7a8edc710ddeadddb0b539de83f3a306a621e823";
const USDT_WHALE = "0xa929022c9107643515f5c777ce9a910f0d1e490c";

const TOKEN_DETAILS = {
  networks: {
    mainnet: {
      DAI,
      USDC,
      WETH,
    },
  },
};

const EVENTS = {
  vault: {
    NEW_OPERATOR: "NewOperator",
    DEPOSIT: "Deposit",
    WITHDRAW: "Withdraw",
    NEW_STRATEGY: "NewStrategy",
    UPDATE_STRATEGY: "UpdateStrategy",
    EXECUTE_STRATEGY: "ExecuteStrategy",
    DEPRECATE_STRATEGY: "DeprecateStrategy",
    DELETE_STRATEGY: "DeleteStrategy",
    REACTIVATE_STRATEGY: "ReactivateStrategy",
    EXECUTE_SWAP: "ExecuteSwap"
  },
  vaultFactory: {
    NEW_VAULT: "NewVault",
    FEE_CHANGE: "FeeChange"
  },
  storageFacility: {
    LOGGER: "Logger",
    NEW_FACTORY: "NewFactory"
  }
};

function createQueryString(url, params) {
  return (
    url +
    Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join("&")
  );
}

async function vaultLibraryFixture() {
  const Library = await ethers.getContractFactory("VaultLibrary");
  const library = await Library.deploy();
  await library.deployed();

  return library;
}

async function tokenFixture() {
  const dai = await ethers.getContractAt("IERC20", DAI);
  const weth = await ethers.getContractAt("IWeth", WETH);
  const usdc = await ethers.getContractAt("IERC20", USDC);
  const usdt = await ethers.getContractAt("IERC20", USDT);

  return { dai, weth, usdc, usdt };
}

async function vaultFactoryFixture(storageFacility) {
  const library = await vaultLibraryFixture();
  const [deployer, _, treasury] = await ethers.getSigners();

  const VaultFactory = await ethers.getContractFactory("VaultFactory", {
    libraries: {
      VaultLibrary: library.address,
    },
  });

  const vaultFactory = await VaultFactory.connect(deployer).deploy(
    treasury.address,
    storageFacility
  );
  await vaultFactory.deployed();

  return vaultFactory;
}

async function storageFacilityFixture() {
  const [deployer] = await ethers.getSigners();

  const StorageFacility = await ethers.getContractFactory("StorageFacility");
  const storageFacility = await StorageFacility.connect(deployer).deploy();
  await storageFacility.deployed();
  return storageFacility;
}

function getHash(...args) {
  return web3.utils.soliditySha3(...args);
}

function getEventObject(target, events) {
  let event = null;
  events.map((item) => {
    if (item.event === target) {
      event = item;
    }
  });
  return event;
}

module.exports = {
  WHALE,
  EVENTS,
  USDT_WHALE,
  TOKEN_DETAILS,
  getHash,
  getEventObject,
  tokenFixture,
  createQueryString,
  vaultFactoryFixture,
  storageFacilityFixture
};
