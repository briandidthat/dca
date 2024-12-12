const wethToDaiQuoteMock = {
  blockNumber: "20264686",
  buyAmount: "300409869",
  buyToken: "0x6b175474e89094c44da98b954eedeac495271d0f",
  fees: {
    integratorFee: {
      amount: "301163",
      token: "0x6b175474e89094c44da98b954eedeac495271d0f",
      type: "volume",
    },
    zeroExFee: {
      amount: "451744",
      token: "0x6b175474e89094c44da98b954eedeac495271d0f",
      type: "volume",
    },
    gasFee: null,
  },
  issues: {
    allowance: null,
    balance: null,
    simulationIncomplete: false,
    invalidSourcesPassed: [],
  },
  liquidityAvailable: true,
  minBuyAmount: "297405770",
  permit2: null,
  route: {
    fills: [
      {
        from: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        to: "0x6b175474e89094c44da98b954eedeac495271d0f",
        source: "SushiSwap",
        proportionBps: "10000",
      },
    ],
    tokens: [
      {
        address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        symbol: "WETH",
      },
      {
        address: "0x6b175474e89094c44da98b954eedeac495271d0f",
        symbol: "DAI",
      },
    ],
  },
  sellAmount: "100000",
  sellToken: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  totalNetworkFee: "415281807360000",
  transaction: {
    to: "0x7f6cee965959295cc64d0e6c00d99d6532d8e86b",
    data: "0x1fff991f000000000000000000000...000000000000",
    gas: "221184",
    gasPrice: "1877540000",
    value: "100000",
  },
};

module.exports = { wethToDaiQuoteMock };
