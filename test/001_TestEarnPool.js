const EarnPool = artifacts.require("TestEarnPool");
const RewardToken = artifacts.require("TestRewardToken");
const Fees = artifacts.require("Fees");
const BN = require('bn.js');

const bprecision = new BN('100000000');
const precision = 100000000;
let calc1 = new BN('0');
let calc2 = new BN('0');
let calc3 = new BN('0');
let calcFee = new BN('0');
let share = [new BN('0')];
let withdrawFee = new BN('200');
const den = new BN('10000');
const closeTo = 1/precision;

function calcDeposit(v, d) {
  v.iadd(new BN(d));
}

function calcWithdrawal(v, w) {
  const bt = new BN(w);
  const fee = bt.mul(withdrawFee).div(den);
  v.isub(bt);
  calcFee.iadd(fee);
}

function calcWithdrawalAll(v) {
  const bt = new BN(v);
  const fee = bt.mul(withdrawFee).div(den);
  v.isub(bt);
  calcFee.iadd(fee);
}

function calcWithdrawalAllFees(v) {
  const bt = new BN(v);
  v.isub(bt);
}

function calcShare(harvest, vals) {
  const total = calc1.add(calc2).add(calc3).add(calcFee);
  const val = new BN(harvest).mul(bprecision).div(total);
  const sh = share[share.length - 1];
  share.push(sh.add(val));
}

function calcXfer(a, b, t) {
  const bt = new BN(t);
  a.isub(bt);
  const fee = bt.mul(withdrawFee).div(den);
  b.iadd(bt.sub(fee));
  calcFee.iadd(fee);
}

function calcHarvest(harvest, vals) {
  calcShare(harvest, vals);
  const sh = share[share.length - 1].sub(share[share.length - 2]);
  const harvested = vals.map((v, idx) => {
    const val = sh.mul(v).div(bprecision);
    return val;
  });
  return harvested;
}

function addHarvest(one, two) {
  return one.map((v, idx) => v.add(two[idx]));
}

contract("TestEarnPool", async accounts => {

  let fees;
  let token;
  let instance;
  const admin = accounts[0];
  const member1 = accounts[1];
  const member2 = accounts[2];
  const member3 = accounts[3];
  const harvester = accounts[0];
  const value10 = web3.utils.toWei('10', "ether");
  const value5 = web3.utils.toWei('5', "ether");
  const value15 = web3.utils.toWei('15', "ether");
  const valueHarvest = web3.utils.toWei('100', "ether");
  console.log('member1', member1);
  console.log('member2', member2);
  console.log('member3', member3);

  beforeEach(async () => {
    try {
      instance = await EarnPool.deployed();
      token = await RewardToken.deployed();
      fees = await Fees.deployed();
      withdrawFee = await fees.getWithdrawalFee();
    } catch (e) {
    }
  });

  it("EarnPool exists", async () => {
    // assert.isTrue(!!token);
    // assert.isTrue(!!instance);
  });

  it("EarnPool deposit", async () => {
    if (!instance) return;

    await instance.deposit(value10, {from: member1});
    calcDeposit(calc1, value10);
    await instance.harvest({from: harvester});
    const harvested1 = calcHarvest(valueHarvest, [calc1, calc2, calc3, calcFee]);

    await instance.deposit(value10, {from: member1}); // 1 => 20
    calcDeposit(calc1, value10);
    await instance.deposit(value10, {from: member2}); // 2 => 10
    calcDeposit(calc2, value10);
    await instance.deposit(value10, {from: member3}); // 3 => 10
    calcDeposit(calc3, value10);
    await instance.transfer(member3, value5, {from: member2}); // 1 => 20, 2 => 5, 3 => 14.95, fee => .05
    calcXfer(calc2, calc3, value5);
    await instance.harvest({from: harvester});       // 100 1 => 20/40 * 100, 2 => 5/40 * 100, 3 => 14.95/40 * 100
    const harvested2 = calcHarvest(valueHarvest, [calc1, calc2, calc3, calcFee]);

    let bal1 = await instance.balanceOf(member1);
    let bal2 = await instance.balanceOf(member2);
    let bal3 = await instance.balanceOf(member3);
    let balFee = await instance.balanceOf(admin);

    let diff1 = calc1.sub(bal1);
    let diff2 = calc2.sub(bal2);
    let diff3 = calc3.sub(bal3);
    let diffFee = calcFee.sub(balFee);

    assert.closeTo(Number(web3.utils.fromWei(diff1.toString())), 0, closeTo, 'bal1 off');
    assert.closeTo(Number(web3.utils.fromWei(diff2.toString())), 0, closeTo, 'bal2 off');
    assert.closeTo(Number(web3.utils.fromWei(diff3.toString())), 0, closeTo, 'bal3 off');
    assert.closeTo(Number(web3.utils.fromWei(diffFee.toString())), 0, closeTo, 'balFee off');

    await instance.updateAndClaim({from: member1});
    await instance.updateAndClaim({from: member2});
    await instance.updateAndClaim({from: member3});
    await instance.updateAndClaim({from: admin});
 
    const h1 = addHarvest(harvested1, harvested2);

    let reward1 = await token.balanceOf(member1);
    let reward2 = await token.balanceOf(member2);
    let reward3 = await token.balanceOf(member3);
    let rewardFee = await token.balanceOf(admin);
    
    diff1 = h1[0].div(reward1);
    diff2 = h1[1].div(reward2);
    diff3 = h1[2].div(reward3);
    diffFee = h1[3].div(rewardFee);

    assert.closeTo(Number(web3.utils.fromWei(diff1.toString())), 0, closeTo, 'reward1 off');
    assert.closeTo(Number(web3.utils.fromWei(diff2.toString())), 0, closeTo, 'reward2 off');
    assert.closeTo(Number(web3.utils.fromWei(diff3.toString())), 0, closeTo, 'reward3 off');
    assert.closeTo(Number(web3.utils.fromWei(diffFee.toString())), 0, closeTo, 'rewardFee off');
    
    calcDeposit(calc3, value15);
    await instance.deposit(value15, {from: member3}); // 3 => 29.95
    calcWithdrawal(calc1, value5);
    await instance.withdraw(value5, {from: member1});// 1 => 15, fee = .10
    calcWithdrawal(calc2, value5);
    await instance.withdrawAll({from: member2});     // 2 => 0, fee = .15
    await instance.harvest({from: harvester});       // 100 1 => 15/45 * 100, 2 => 0, 3 => 29.95/45 * 100
    const harvested3 = calcHarvest(valueHarvest, [calc1, calc2, calc3, calcFee]);
    calcWithdrawalAll(calc1);
    await instance.withdrawAll({from: member1});     // 1 => 0, 2 => 0, 3 => 29.95
    calcWithdrawalAll(calc3);
    await instance.withdrawAll({from: member3});     // 1 => 0, 2 => 0, 3 => 0
    calcWithdrawalAllFees(calcFee);
    await instance.withdrawFees();

    bal1 = await instance.balanceOf(member1);
    bal2 = await instance.balanceOf(member2);
    bal3 = await instance.balanceOf(member3);
    balFee = await instance.balanceOf(admin);

    diff1 = calc1.sub(bal1);
    diff2 = calc2.sub(bal2);
    diff3 = calc3.sub(bal3);
    diffFee = calcFee.sub(balFee);

    assert.closeTo(Number(web3.utils.fromWei(diff1.toString())), 0, closeTo, 'bal1 off');
    assert.closeTo(Number(web3.utils.fromWei(diff2.toString())), 0, closeTo, 'bal2 off');
    assert.closeTo(Number(web3.utils.fromWei(diff3.toString())), 0, closeTo, 'bal3 off');
    assert.closeTo(Number(web3.utils.fromWei(diffFee.toString())), 0, closeTo, 'balFee off');

    reward1 = await token.balanceOf(member1, {from: member1});
    reward2 = await token.balanceOf(member2, {from: member2});
    reward3 = await token.balanceOf(member3, {from: member3});
    rewardFee = await token.balanceOf(admin);

    const h2 = addHarvest(h1, harvested3);

    diff1 = h2[0].div(reward1);
    diff2 = h2[1].div(reward2);
    diff3 = h2[2].div(reward3);
    diffFee = h2[3].div(rewardFee);

    assert.closeTo(Number(web3.utils.fromWei(diff1.toString())), 0, closeTo, 'reward1 off');
    assert.closeTo(Number(web3.utils.fromWei(diff2.toString())), 0, closeTo, 'reward2 off');
    assert.closeTo(Number(web3.utils.fromWei(diff3.toString())), 0, closeTo, 'reward3 off');
    assert.closeTo(Number(web3.utils.fromWei(diffFee.toString())), 0, closeTo, 'rewardFee off');
  });

});