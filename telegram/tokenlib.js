// A library for common on-chain data. Currently just price data.
const config = require("./config.json");
const Web3 = require("web3");
const web3 = new Web3(config.WEB3_PROVIDER_URL);
const BigNumber = require("bignumber.js");
const tokenAbi = require("./abis/GenericToken.json");
const tokenContract = new web3.eth.Contract(
  tokenAbi,
  config.ADDRESS_TOKEN
);

class TokenStats {

  decimals = 9; // gets overriden at run-time

  constructor() {
    this.init();
  }

  init = async function () {
    this.numDecimals = await this.getDecimals();
  }

  getBurnedTokens = async function() {
    return (await tokenContract.methods
      .balanceOf(config.BURN_ADDRESS)
      .call())
      /Math.pow(10,this.numDecimals);
  }
  getTotalSupply = async function () {
    return (await tokenContract.methods
      .totalSupply()
      .call())
      /Math.pow(10,this.numDecimals);
  }
  getDecimals = async function () {
    return await tokenContract.methods
      .decimals()
      .call();    
  }
  getDollarFormatted = function (rawDollar) {
    return '$' + rawDollar.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  }
}

class TokenPrice {
  pancakeswapFactoryAbi = require("./abis/PancakeFactoryV2.json");
  pancakeswapPairAbi = require("./abis/PancakePair.json");
  pancakeswapFactoryV1 = new web3.eth.Contract(
    this.pancakeswapFactoryAbi,
    config.PANCAKESWAP_FACTORY_ADDR_V1
  );
  pancakeswapFactoryV2 = new web3.eth.Contract(
    this.pancakeswapFactoryAbi,
    config.PANCAKESWAP_FACTORY_ADDR_V2
  );

  constructor() {
    this.init();
  }

  init = async function () {
    this.tokenDecimals = await tokenContract.methods
      .decimals()
      .call();
      this.contractPairsA = [];
      this.contractPairsB = [];

      if (config.ENABLE_PANCAKESWAP_V1) {
        // PCS V1, pairA = TOKEN/BNB
        this.contractPairsA.push(await this.getContractPair(this.pancakeswapFactoryV1, config.ADDRESS_TOKEN, config.ADDRESS_BNB));

        // PCS V1, pairB = BNB/USDT
        this.contractPairsB.push(await this.getContractPair(this.pancakeswapFactoryV1, config.ADDRESS_BNB, config.ADDRESS_USDT));
      }
      
      if (config.ENABLE_PANCAKESWAP_V2) {
        // PCS V2, pairA = TOKEN/BNB
        this.contractPairsA.push(await this.getContractPair(this.pancakeswapFactoryV2, config.ADDRESS_TOKEN, config.ADDRESS_BNB));

        // PCS V2, pairB = BNB/USDT
        this.contractPairsB.push (await this.getContractPair(this.pancakeswapFactoryV2, config.ADDRESS_BNB, config.ADDRESS_USDT));
      }
      
  };

  getContractPair = async function (factory, address0, address1) {
    const pairAddress = await factory.methods
      .getPair(address0, address1)
      .call();

    const contract = new web3.eth.Contract(this.pancakeswapPairAbi, pairAddress);
    const token0 = await contract.methods.token0().call();
    contract.addressOrderReversed = token0.toLowerCase() !== address0.toLowerCase();
    return contract;
  };

  // Price is reserve1/reserve0. However, sometimes we want to take the average of all of the pairs in the
  // event there are multiple liquidity pools. This helps in those cases.
  getAveragedPriceFromReserves = function (callContractAndResultList) {
    const reserve0 = callContractAndResultList
      .reduce(
        (a, b) => a.plus(new BigNumber(b.result[b.contract.addressOrderReversed ? "1" : "0"])),
        new BigNumber(0)
    );
    const reserve1 = callContractAndResultList
      .reduce(
        (a, b) => a.plus(new BigNumber(b.result[b.contract.addressOrderReversed ? "0" : "1"])),
        new BigNumber(0)
    );
    return reserve1.dividedBy(reserve0);
  };

  // web3.eth.BatchRequest allows us to batch requests, but each of the requests
  // have their own callback and return individually. It makes it a little hard to manage like this.
  // This is just a Promise that returns the entire result once they've all completed.
  batchCalls = function (callAndContractList) {
    return new Promise((resolve, reject) => {
      let operations = callAndContractList.map((c) => ({
        call: c.call,
        contract: c.contract,
        completed: false,
        result: null,
      }));

      const callback = function (callAndContract, error, response) {
        if (error) {
          reject(error);
        }

        const currentOperation = operations.find((c) => c.call === callAndContract.call);
        currentOperation.completed = true;
        currentOperation.result = response;

        if (operations.every((o) => o.completed)) {
          resolve(operations);
        }
      };

      let batch = new web3.eth.BatchRequest();
      callAndContractList.forEach((cc) => {
        batch.add(cc.call.call.request((e, r) => callback(cc, e, r)));
      });

      batch.execute();
    });
  };

  getLatestPrice = async function () {
    const reservesResultsA = await this.batchCalls(
      this.contractPairsA.map((cp) => ({call: cp.methods.getReserves(), contract: cp }))
    );

    const reservesResultsB = await this.batchCalls(
      this.contractPairsB.map((cp) => ({call: cp.methods.getReserves(), contract: cp }))
    );

    // Calculate average price for TOKEN/BNB pair from reserves for PCS V1/V2
    const pairPriceA = this.getAveragedPriceFromReserves(reservesResultsA);

    // Calculate average price for BNB/USDT pair from reserves for PCS V1/V2
    const pairPriceB = this.getAveragedPriceFromReserves(reservesResultsB);

    // Multiply pair A by pair B to get the USD value
    let price = pairPriceA.multipliedBy(pairPriceB);

    // number is still a whole number, apply the proper decimal places from the contract (9)
    return price.dividedBy(Math.pow(10, 18-this.tokenDecimals));
  };
}

module.exports.TokenPrice = TokenPrice;
module.exports.TokenStats = TokenStats;
