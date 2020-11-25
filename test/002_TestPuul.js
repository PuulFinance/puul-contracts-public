const PuulToken = artifacts.require("PuulToken");
const PuulRewardsFeeToken = artifacts.require("PuulRewardsFeeToken");
const PuulStakingPool = artifacts.require("PuulStakingPool");
const PuulWithdrawalFeeToken = artifacts.require("PuulWithdrawalFeeToken");
const PuulFees = artifacts.require("PuulFees");

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
  let withdrawFee;
  let poolFarmRewardFees;
  let poolFarmWithdrawalFees;
  let puulRewardFeesEndpoint;
  let puulWithdrawalFeesEndpoint;

  const admin = accounts[0];
  const member1 = accounts[1];

  function sleep(s) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
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
  });

  it("PUUL Tests", async () => {

  });

});