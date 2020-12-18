const PuulToken = artifacts.require("PuulToken");
const PuulRewardsFeeToken = artifacts.require("PuulRewardsFeeToken");
const PuulStakingPool = artifacts.require("PuulStakingPool");
const PuulWithdrawalFeeToken = artifacts.require("PuulWithdrawalFeeToken");
const PuulFees = artifacts.require("PuulFees");
const Timelock12Hours = artifacts.require("Timelock12Hours");
const Timelock1Day = artifacts.require("Timelock1Day");
const PICKLE_WETHStakingFarm = artifacts.require("PICKLE_WETHStakingFarm");
const PICKLE_WETHPool = artifacts.require("PICKLE_WETHPool");
const PuulStakingPoolEndpoint = artifacts.require("PuulStakingPoolEndpoint")
const PuulRewardFeesEndpoint = artifacts.require("PuulRewardFeesEndpoint");
const PuulWithdrawalFeesEndpoint = artifacts.require("PuulWithdrawalFeesEndpoint");

const BN = require('bn.js');
const { assert } = require('chai');

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

  const logEtherBalance = async (msg, token, to) => {
    const bal = await token.balanceOf(to); 
    logEther(msg, bal);
    return bal;
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
    timelock12 = await Timelock12Hours.deployed();
  });

  it("Change Fee Tests", async () => {

    console.log(`
      Change the fees
    `)

    const puulRewardFeesEndpoint = await PuulRewardFeesEndpoint.deployed();
    const puulWithdrawalFeesEndpoint = await PuulWithdrawalFeesEndpoint.deployed();
    // await fees.setRewardFee(puulRewardFeesEndpoint.address, 300); // 3% 
    // await fees.setWithdrawalFee(puulWithdrawalFeesEndpoint.address, 200); // 2%

    try {
      const block = await web3.eth.getBlock('latest')
      const t = block.timestamp + TIME_12H + TIME_1H; // current time + 12 hours + 1 hour
      console.log('eta', t);
      const eta = new BN(t.toString()) // seconds 
      const value = new BN('0')
      const sigRew = 'setRewardFee(address,uint256)'
      const sigWth = 'setWithdrawalFee(address,uint256)'
      const dataRew = encodeParameters(['address', 'uint256'], [puulRewardFeesEndpoint.address, 1000]) // 10%
      const dataWth = encodeParameters(['address', 'uint256'], [puulWithdrawalFeesEndpoint.address, 150]) // 1.5%
      await timelock12.queueTransaction(fees.address, value, sigRew, dataRew, eta)
      await timelock12.queueTransaction(fees.address, value, sigWth, dataWth, eta)
      await timeTravel(TIME_1D)
      let rewardFee = await fees.getRewardFee();
      let withdrawalFee = await fees.getWithdrawalFee();
      console.log('reward fee bef     ', rewardFee.toString())
      console.log('withdrawal fee bef', withdrawalFee.toString())
      await timelock12.executeTransaction(fees.address, value, sigRew, dataRew, eta)
      await timelock12.executeTransaction(fees.address, value, sigWth, dataWth, eta)
      rewardFee = await fees.getRewardFee();
      withdrawalFee = await fees.getWithdrawalFee();
      console.log('reward fee aft    ', rewardFee.toString())
      console.log('withdrawal fee aft', withdrawalFee.toString())
      assert.isTrue(Number(rewardFee.toString()) === 1000)
      assert.isTrue(Number(withdrawalFee.toString()) === 150)
    } catch (e) {
      console.log('timelock failed', e)
      assert.isTrue(2, 1, 'timelock failed');
    }

  });

});