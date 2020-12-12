const PuulToken = artifacts.require("PuulToken");
const PuulRewardsFeeToken = artifacts.require("PuulRewardsFeeToken");
const PuulStakingPool = artifacts.require("PuulStakingPool");
const PuulWithdrawalFeeToken = artifacts.require("PuulWithdrawalFeeToken");
const PuulFees = artifacts.require("PuulFees");
const Timelock12Hours = artifacts.require("Timelock12Hours");
const Timelock1Day = artifacts.require("Timelock1Day");

const BN = require('bn.js');

contract("Puul Token, Fees", async accounts => {
  let weth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  let usdc = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const BASE_FEE = new BN('10000');

  let PUUL;
  let PUULREW;
  let PUULWTH;
  let PUULSTK;
  let WETH;
  let USDC;
  let fees;
  let timelock;
  let withdrawFee;
  let poolFarmRewardFees;
  let poolFarmWithdrawalFees;
  let puulRewardFeesEndpoint;
  let puulWithdrawalFeesEndpoint;

  const admin = accounts[0];
  const member1 = accounts[1];
  const developer = admin;
  const TIME_12H = 60 * 60 * 12;
  const TIME_1H = 60 * 60
  const TIME_1D = TIME_1H * 24

  function sleep(s) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
  }

  function encodeParameters(types, values) {
    return web3.eth.abi.encodeParameters(types, values);
  }

  const toWei = (val) => web3.utils.toWei(val);

  const etherFromWei = (wei) => {
    return web3.utils.fromWei(wei.toString())
  }

  const picoetherFromWei = (wei) => {
    return web3.utils.fromWei(wei.toString(), 'picoether')
  }

  const logEther = (msg, wei) => {
    console.log(msg, etherFromWei(wei));
  }

  const timeTravel = function (time) {
    return new Promise((resolve, reject) => {
      const id = new Date().getTime()
      console.log('evm_increaseTime bef', id, time);
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time], // 86400 is num seconds in day
        id
      }, (err, result) => {
        if(err){ return reject(err) }
        const id = new Date().getTime();
        console.log('evm_increaseTime aft', id);
        // resolve(result);
        web3.currentProvider.send({
          jsonrpc: '2.0',
          method: 'evm_mine',
          id,
        }, (err2, res) => (err2 ? reject(err2) : resolve(result)));
      });
    })
  }

  beforeEach(async () => {
    PUUL = await PuulToken.deployed();
    console.log('PUUL', PUUL.address);
    PUULREW = await PuulRewardsFeeToken.deployed();
    console.log('PUULREW', PUULREW.address);
    PUULWTH = await PuulWithdrawalFeeToken.deployed();
    console.log('PUULWTH', PUULWTH.address);
    PUULSTK = await PuulStakingPool.deployed();
    console.log('PUULSTK', PUULSTK.address);
    fees = await PuulFees.deployed();
    console.log('PUUL Fees', fees.address);
    timelock = await Timelock1Day.deployed();
  });

  it("PUUL Tests", async () => {
    console.log(`
      Mint some PUUL with the timelock contract
    `)
    const block = await web3.eth.getBlock('latest')
    const t = block.timestamp + TIME_1D + TIME_1H; // current time + 12 hours + 1 hour
    console.log('eta', t);
    const eta = new BN(t.toString()) // seconds 
    const value = new BN('0')
    const sig = 'mint(address,uint256)'
    const data = encodeParameters(['address', 'uint256'], [developer, toWei('123456')])
    try {
      await timelock.queueTransaction(PUUL.address, value, sig, data, eta)
      await timeTravel(TIME_1D*2)
      const bef = await PUUL.balanceOf(developer);
      logEther('PUUL balance bef', bef)
      await timelock.executeTransaction(PUUL.address, value, sig, data, eta)
      const aft = await PUUL.balanceOf(developer);
      logEther('PUUL balance aft', aft)
    } catch (e) {
      console.log('timelock queue failed', e)
    }

  });

});