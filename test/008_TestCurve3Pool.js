const IWETH = artifacts.require("IWETH");
const IERC20 = artifacts.require("IERC20");
const IUniswapV2Pair = artifacts.require("IUniswapV2Pair");
const UniswapHelper = artifacts.require("UniswapHelper");
const CurveHelper = artifacts.require("CurveHelper");
const IUniswapV2Router02 = artifacts.require("IUniswapV2Router02");
const IUniswapV2Factory = artifacts.require("IUniswapV2Factory");
const PuulFees = artifacts.require("PuulFees");
const Curve3Pool = artifacts.require("Curve3Pool");
const Curve3PoolFarm = artifacts.require("Curve3PoolFarm");
const PuulRewardFeesEndpoint = artifacts.require("PuulRewardFeesEndpoint");
const PuulRewardsFeeToken = artifacts.require("PuulRewardsFeeToken");
const PuulWithdrawalFeesEndpoint = artifacts.require("PuulWithdrawalFeesEndpoint");
const PuulWithdrawalFeeToken = artifacts.require("PuulWithdrawalFeeToken");
const PuulStakingPool = artifacts.require("PuulStakingPool");
const PuulToken = artifacts.require("PuulToken");
const PuulStakingPoolEndpoint = artifacts.require("PuulStakingPoolEndpoint");
const Limits = artifacts.require("Limits");
const RewardDistributor = artifacts.require("RewardDistributor");

const BN = require('bn.js');

contract("Curve3Pool", async accounts => {
  let instance;
  let helper;
  let factory = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
  let weth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  let usdc = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  let dai = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  let usdt = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  let lp = '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490';
  let crv = '0xD533a949740bb3306d119CC777fa900bA034cd52';
  const BASE_FEE = new BN('10000');


  let WETH;
  let USDC;
  let USDT;
  let DAI;
  let LP;
  let CRV;
  let puulFees;
  let IERC20WETH;
  let UNI_ROUTER;
  let UNI_FACTORY;
  let withdrawFee;
  const admin = accounts[0];
  const member1 = accounts[1];
  const member2 = accounts[2];
  const harvester = accounts[0];
  const developer = admin;
  console.log('admin', admin);
  console.log('member1', member1);
  console.log('member2', member2);
  console.log('developer', developer);

  function sleep(s) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
  }

  const oneDay = 86400;
  const oneWeek = oneDay * 7;

  const mineBlock = function () {
    return new Promise((resolve, reject) => {
      const id = new Date().getTime()
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id,
      }, (err2, res) => (err2 ? reject(err2) : resolve(res)));
    })
  }

  const etherFromWei = (wei) => {
    return web3.utils.fromWei(wei.toString())
  }

  const picoetherFromWei = (wei) => {
    return web3.utils.fromWei(wei.toString(), 'picoether')
  }

  const logEther = (msg, wei) => {
    console.log(msg, etherFromWei(wei));
  }

  const logPicoether = (msg, wei) => {
    console.log(msg, picoetherFromWei(wei));
  }

  const logEtherBalance = async (msg, token, to) => {
    const bal = await token.balanceOf(to); 
    logEther(msg, bal);
    return bal;
  }

  const logPicoetherBalance = async (msg, token, to) => {
    const bal = await token.balanceOf(to); 
    logPicoether(msg, bal);
    return bal;
  }

  const logUSDTBalance = async (msg, to) => {
    const bal = await USDT.balanceOf(to); 
    logPicoether(msg, bal);
    return bal;
  }

  const logDAIBalance = async (msg, to) => {
    const bal = await DAI.balanceOf(to); 
    logEther(msg, bal);
    return bal;
  }

  const logUSDCBalance = async (msg, to) => {
    const bal = await USDC.balanceOf(to); 
    logPicoether(msg, bal);
    return bal;
  }

  const slippage = (amount, slippage) => amount.sub(amount.mul(slippage).div(new BN('10000')));

  const getLiquidityValue = (liquidity, reserve, supply) => liquidity.mul(reserve).div(supply);


  const toWei = (val) => web3.utils.toWei(val);
  const toPicoEther = (val) => web3.utils.toWei(val, 'picoether');

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
        const id = new Date().getTime() + result;
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

  let limits;
  let farm;
  let puulToken;
  let distributor;
  let withdrawalFeesEndpoint;
  let rewardFeesEndpoint;
  let withdrawalFeesToken;
  let rewardFeesToken;
  let dep = toPicoEther('2000')

  const approve = async (token, to, from, amt = web3.utils.toWei('100000')) => {
    const allowance = await token.allowance(from, to);
    if (allowance.isZero())
      await token.approve(to, amt, {from});

  }

  let initialized = false;
  async function initialize() {
    if (initialized) return;
    initialized = true;
    helper = await UniswapHelper.deployed();
    puulFees = await PuulFees.deployed();
    withdrawFee = await puulFees.getWithdrawalFee();  
    instance = await Curve3Pool.deployed();
    farm = await Curve3PoolFarm.deployed();
    limits = await Limits.deployed();
    distributor = await RewardDistributor.deployed();
    puulToken = await PuulToken.deployed();
    await logEtherBalance('puul token balance before', puulToken, developer);

    WETH = await IWETH.at(weth);
    IERC20WETH = await IERC20.at(weth);
    USDC = await IERC20.at(usdc);
    USDT = await IERC20.at(usdt);
    DAI = await IERC20.at(dai);
    LP = await IERC20.at(lp);
    CRV = await IERC20.at(crv);
    UNI_FACTORY = await IUniswapV2Factory.at(factory);
    await approve(LP, instance.address, member1);
    await approve(IERC20WETH, instance.address, member1);
    await approve(IERC20WETH, instance.address, admin);
    UNI_ROUTER = await IUniswapV2Router02.at('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D');
    await approve(IERC20WETH, UNI_ROUTER.address, member1);
    await approve(IERC20WETH, UNI_ROUTER.address, admin);
    await approve(USDT, instance.address, member1, toPicoEther('10000000000'));
    await approve(USDT, instance.address, admin, toPicoEther('10000000000'));
    let balance = await IERC20WETH.balanceOf(member1);
    console.log('balance', balance);
    const amount = web3.utils.toWei('40');
    await WETH.deposit({from: member1, value: amount});
    await WETH.deposit({from: admin, value: amount});
    balance = await IERC20WETH.balanceOf(member1);
    await logEtherBalance(`weth balance`, IERC20WETH, member1);
    assert.isFalse(balance.isZero(), 'not enough weth');

    withdrawalFeesEndpoint = await PuulWithdrawalFeesEndpoint.deployed();
    rewardFeesEndpoint = await PuulRewardFeesEndpoint.deployed();
    // The fee tokens
    withdrawalFeesToken = await PuulWithdrawalFeeToken.deployed();
    rewardFeesToken = await PuulRewardsFeeToken.deployed();

  }

  beforeEach(async () => {
    await initialize();

  });

  it("fund Curve3Pool with USDT", async () => {

    console.log(`
      Convert some WETH to USDT
    `);
    try {
      const amt = web3.utils.toWei('10');
      logEther('swapping', amt);
      const weus = await UNI_FACTORY.getPair(weth, usdt);
      const wpair = await IUniswapV2Pair.at(weus);
      const res = await wpair.getReserves();
      console.log('reserves', etherFromWei(res[0]), picoetherFromWei(res[1]));
      await logUSDTBalance('usdt balance before', member1);
      await logEtherBalance('member1 WETH balance', IERC20WETH, member1);
      await UNI_ROUTER.swapExactTokensForTokens(amt, 0, [weth, usdt], member1, Date.now() + 1800, {from: member1});
      const startingUSDT = await USDT.balanceOf(member1);
      logPicoether('usdt balance before', startingUSDT);
      await UNI_ROUTER.swapExactTokensForTokens(amt, 0, [weth, usdt], admin, Date.now() + 1800);
    } catch (e) {
      console.log('weth to usdt failed', e)
    }

    console.log(`
      Add some PUUL tokens to the Reward Distributor
    `);
    await logEtherBalance('developer PUUL    bef dist', puulToken, developer);
    puulToken.transfer(distributor.address, toWei('1000'));
    await logEtherBalance('developer   PUUL    aft dist', puulToken, developer);
    await logEtherBalance('distributor PUUL    bef farm', puulToken, distributor.address);
    await distributor.addFarm(farm.address, { from: harvester});

    console.log(`
      Deposit into the Curve3Pool using USDT.
    `);
    dep = toPicoEther('4000')
    console.log('usdt depositing', picoetherFromWei(dep));

    await logPicoetherBalance('member1 USDT balance', USDT, member1);
    await logEtherBalance('member1 WETH balance', IERC20WETH, member1);

    try {
      const slip = new BN('100');
      const min = await instance.getMinAmount(usdt, dep, slip);
      logEther('min', min);
      await instance.deposit(usdt, dep, min, {from: member1});
    } catch (e) {
      console.log('deposit', e);
      assert.equal(2, 1, 'deposit failed');
    }
    const afterDeposit = await USDT.balanceOf(member1);
    logPicoether('usdt balance after deposit', afterDeposit);
    await logEtherBalance('share', instance, member1)

    console.log(`
      Check that the pool balance equals the share balance.
   `);
    let lpbal = await LP.balanceOf(instance.address);
    let poolbal = await instance.balanceOf(member1);
    await logUSDTBalance('usdt balance instance', instance.address);
    await logUSDTBalance('usdt balance helper', helper.address);
    logEther('pool balance', poolbal);
    const diffbal = poolbal.sub(lpbal);
    assert.equal(Number(diffbal.toString()), 0, 'pool tokens should equal lp tokens');

    console.log(`
      Withdraw part into an LP token.
    `);

    try {
      await logEtherBalance('3pool balance before withdraw', LP, member1);
      await instance.withdrawLP(toWei('1000'), {from: member1});
    } catch (e) {
      console.log('withdrawLP', e);
      assert.equal(2, 1, 'withdrawLP failed');
    }
    await logEtherBalance('3pool balance after withdraw', LP, member1);

    console.log(`
      Deposit the LP tokens back.
    `);
    try {
      const bal3 = await logEtherBalance('3pool balance before deposit', LP, member1);
      await instance.depositLP(bal3, {from: member1});
    } catch (e) {
      console.log('depositLP', e);
      assert.equal(2, 1, 'depositLP failed');
    }
    await logEtherBalance('3pool balance after deposit', LP, member1);

    console.log(`
      Transfer half of the pool tokens to member2. 
      Amount should be one half minus the withdrawal fee.
    `);
    const xfer = poolbal.div(new BN('2'));
    await instance.transfer(member2, xfer, {from: member1});
    const xferAfterFee = xfer.sub(xfer.mul(withdrawFee).div(BASE_FEE));
    let xferBal = await instance.balanceOf(member2);
    logEther('xfer to member 2', xferBal);
    let diff = xferBal.sub(xferAfterFee);
    xferBal = await instance.balanceOf(member1);
    logEther('xfer to member1', xferBal);
    console.log('diff', diff.toString());
    assert.equal(Number(diff.toString()), 0, 'xfer balance should remove fee');

    console.log(`
      Farm the farm. Mine 2000 blocks, then harvest the rewards. 
    `);
    await instance.harvest();
    await timeTravel(14*oneDay);
    for (let i = 0; i < 2000; i++) {
      await mineBlock(); 
    }
    // Send some PUUL rewards to the farm
    await distributor.sendRewardsToFarm(farm.address, puulToken.address, toWei('500'), { from: harvester})
    await logEtherBalance('farm        PUUL    aft farm', puulToken, farm.address);
    await logEtherBalance('distributor PUUL    aft farm', puulToken, distributor.address);

    await instance.harvest();
    console.log('rewardFeesEndpoint', rewardFeesEndpoint.address);
    await logEtherBalance('rewardFeesEndpoint crv', CRV, rewardFeesEndpoint.address);
    await logEtherBalance('instance crv', CRV, instance.address);
    await logEtherBalance('rewardFeesEndpoint puul', puulToken, rewardFeesEndpoint.address);
    await logEtherBalance('instance puul', puulToken, instance.address);

    console.log(`
      Convert the rewards to USDC 
    `);
    let min = [];
    let amounts = [];
    let rewards = await instance.rewards();
    console.log('rewards', rewards);
    let slpr = new BN('500');
    for (let i = 0; i < rewards.length; i++) {
      const reward = rewards[i];
      const tok = await IERC20.at(reward);
      let bal = reward == puulToken.address ? new BN('0') : (await tok.balanceOf(rewardFeesEndpoint.address));
      amounts.push(bal);
      const out = bal.isZero() ? new BN('0') : (await helper.estimateOut(reward, usdc, bal));
      min.push(slippage(out, slpr));
    }
    await rewardFeesEndpoint.convertRewardFees(instance.address, helper.address, amounts, min);
    await logUSDCBalance('rewardFeesEndpoint usdc', rewardFeesEndpoint.address);
    await logEtherBalance('rewardFeesEndpoint crv', CRV, rewardFeesEndpoint.address);
    await logEtherBalance('rewardFeesEndpoint puul', puulToken, rewardFeesEndpoint.address);

    console.log(`
      Claim the rewards from member2.
    `);
    await instance.updateAndClaim({from: member2});
    await logEtherBalance('crv balance member2 after claim', CRV, member2);
    await logEtherBalance('puul balance member2 after claim', puulToken, member2);

    console.log(`
      Claim the rewards from member1. The CRV rewards are converted to usdc.
    `);
    await logUSDCBalance('usdc balance member1', member1);
    await instance.updateRewards({from: member1}); //need to interact to update rewards
    const owed = await instance.owedRewards({from: member1});
    owed.forEach(o => logEther('owed member1', o));

    min = []
    amounts = []
    rewards = await instance.rewards();
    for (let i = 0; i < rewards.length; i++) {
      const reward = rewards[i];
      let bal = reward == puulToken.address ? new BN('0') : owed[i];
      amounts.push(bal);
      const out = bal.isZero() ? new BN('0') : (await helper.estimateOut(reward, usdc, bal));
      min.push(slippage(out, slpr));
    }

    await instance.claimToToken(usdc, amounts, min, {from: member1});
    const claim = await logUSDCBalance('usdc balance member1 after claimToToken', member1);
    assert.isFalse(claim.isZero(), 'should have gotten some usdc');
    await instance.updateAndClaim({from: member1});
    await logEtherBalance('puul balance member1 after claim', puulToken, member1);

    console.log(`
      Withdraw all the tokens from the pool for member1. Convert to DAI.
    `);
    let slip = new BN('100');
    let bal = await instance.balanceOf(member1);
    let minw = await instance.estimateWithdrawUsd(dai, bal, slip, { from: member1 });
    logEther('minw', minw);
    logEtherBalance('lp bef', LP, instance.address);
    await logEtherBalance('dai balance member1 bef', DAI, member1);
    await instance.withdrawUsd(dai, bal, minw, { from: member1 });
    await logEtherBalance('dai balance member1 aft', DAI, member1);

    console.log(`
      Withdraw all the tokens from the pool for member2. Convert to USDT.
    `);
    bal = await instance.balanceOf(member2);
    minw = await instance.estimateWithdrawUsd(usdt, bal, slip, { from: member2 });
    logPicoether('minw', minw);
    await logUSDTBalance('usdt balance member2 bef', member2);
    await instance.withdrawUsd(usdt, bal, minw, { from: member2 });
    await logUSDTBalance('usdt balance member2 aft', member2);

    console.log(`
      The only thing left in the MPH/WETH pool should be the withdrawal fees.
    `);
    const withdrawal = await puulFees.withdrawal();
    let totalSupply = await instance.totalSupply();
    let withdrawFees = await instance.balanceOf(withdrawal);
    logEther('withdraw total supply', totalSupply);
    logEther('withdraw withdrawal fees', withdrawFees);
    assert.equal(Number(totalSupply.toString()), Number(withdrawFees.toString()), 'totalSupply should equal withdrawal fees');

    console.log(`
      The reward fees are already in the rewardFeesEndpoint, but we need to get the 
      withdrawal fees. This gets the withdrawal fees from the curve3pool, converts 
      to USDC, and adds them to the withdrawal fees endpoint. After this, there 
      should not be anything left in the pool.
    `);
    
    bal = await instance.balanceOf(withdrawal);
    minw = await instance.estimateWithdrawUsdWithoutFees(usdt, bal, slip);
    logPicoether('minw', minw);

    await withdrawalFeesEndpoint.withdrawFees(instance.address, bal, minw, 0, 0, 0);
    await logUSDCBalance('withdrawalFeesEndpoint usdc', withdrawalFeesEndpoint.address);
    await logUSDCBalance('rewardFeesEndpoint usdc', rewardFeesEndpoint.address);
    totalSupply = await instance.totalSupply();
    withdrawFees = await instance.balanceOf(withdrawal);
    logEther('withdraw total supply', totalSupply);
    logEther('withdraw withdrawal fees', withdrawFees);
    assert.equal(Number(totalSupply.toString()), 0, 'totalSupply should equal 0');
    assert.equal(0, Number(withdrawFees.toString()), 'withdrawal fees should be 0');
    lpbal = await LP.balanceOf(instance.address);
    assert.equal(0, Number(lpbal.toString()), 'should be no lp tokens');

    console.log(`
      At this point all the fees are in the endpoint/farms, except the reward fees due
      from the owned withdrawal fees. There should be a small amount from the tranfer
      of member1 to member2. Get those and convert to usdc.
    `);

    await withdrawalFeesEndpoint.updateAndClaim(instance.address);
    logEtherBalance('withdrawFeesEndpoint crv', CRV, withdrawalFeesEndpoint.address);
    min = [];
    amounts = [];
    rewards = await instance.rewards();
    console.log('rewards', rewards);
    slpr = new BN('500');
    for (let i = 0; i < rewards.length; i++) {
      const reward = rewards[i];
      const tok = await IERC20.at(reward);
      const bal = reward === puulToken.address ? new BN('0') : (await tok.balanceOf(withdrawalFeesEndpoint.address));
      amounts.push(bal);
      const out = bal.isZero() ? new BN('0') : (await helper.estimateOut(reward, usdc, bal));
      min.push(slippage(out, slpr));
    }
    console.log('min', min);
    await logUSDCBalance('withdrawalFeesEndpoint usdc before convert withdrawal reward fees', withdrawalFeesEndpoint.address);
    await withdrawalFeesEndpoint.convertRewardFees(instance.address, helper.address, amounts, min);
    await logUSDCBalance('withdrawalFeesEndpoint usdc before convert withdrawal reward fees', withdrawalFeesEndpoint.address);
    await logEtherBalance('withdrawalFeesEndpoint crv', CRV, withdrawalFeesEndpoint.address);
    await logEtherBalance('withdrawalFeesEndpoint puul', puulToken, withdrawalFeesEndpoint.address);

    console.log(`
      At this point all the fees are in the endpoint/farms. We can harvest them 
      into the fee tokens, and then the dev portion of the fees is claimed.
    `);
    await logUSDCBalance('rewardFeesEndpoint usdc before harvest', rewardFeesEndpoint.address);
    await rewardFeesToken.harvest();
    await logUSDCBalance('rewardFeesEndpoint usdc after harvest', rewardFeesEndpoint.address);
    await logUSDCBalance('rewardFeesToken usdc after harvest', rewardFeesToken.address);

    await logEtherBalance('puul reward dev balance before claim', puulToken, developer);
    await logUSDCBalance('usdc reward dev balance before claim', developer);
    await rewardFeesToken.updateRewards({from: developer});
    let owedre = await rewardFeesToken.owedRewards({from: developer});
    owedre.forEach(o => logEther('owed', o));
    await rewardFeesToken.updateAndClaim({from: developer});
    await logUSDCBalance('usdc reward dev balance after claim', developer);
    await logEtherBalance('puul reward dev balance after claim', puulToken, developer);

    await logUSDCBalance('withdrawalFeesEndpoint usdc before harvest into token', withdrawalFeesEndpoint.address);
    await withdrawalFeesToken.harvest();    
    await logUSDCBalance('withdrawalFeesEndpoint usdc after harvest into token', withdrawalFeesEndpoint.address);
    await logUSDCBalance('withdrawFeesToken usdc after harvest', withdrawalFeesToken.address);

    await logUSDCBalance('usdc withdrawal dev balance before claim', developer);
    await logEtherBalance('puul reward dev balance before claim', puulToken, developer);
    await withdrawalFeesToken.updateAndClaim({from: developer});
    await logUSDCBalance('usdc withdrawal dev balance after claim', developer);
    await logEtherBalance('puul reward dev balance after claim', puulToken, developer);

    console.log(`
      The fees are now in the fee tokens. Some of those tokens are owned by 
      the staking pool endpoint/farm. We need to claim those into the 
      staking token endpoint. Everything is already converted to USDC.
    `);

    const stakingToken = await PuulStakingPool.deployed();
    const stakingTokenEndpoint = await PuulStakingPoolEndpoint.deployed();
    const stakingTokenRewards = await stakingToken.rewards();
    console.log('stakingToken rewards', stakingTokenRewards);
    assert.equal(stakingTokenRewards.length, 2, 'PuulStakingPool rewards should be 2');
    assert.include([usdc, puulToken.address], stakingTokenRewards[0], 'stakingTokenRewards rewards token should include usdc and puul');
    assert.include([usdc, puulToken.address], stakingTokenRewards[1], 'stakingTokenRewards rewards token should include usdc and puul');

    await logUSDCBalance('stakingTokenEndpoint usdc before updateAndClaim withdrawal', stakingTokenEndpoint.address);
    stakingTokenEndpoint.updateAndClaim(withdrawalFeesToken.address);
    await logUSDCBalance('stakingTokenEndpoint usdc after updateAndClaim withdrawal', stakingTokenEndpoint.address);
    // const pending = await rewardFeesToken.getPendingRewards(stakingTokenEndpoint.address);
    // pending.forEach(reward => logPicoether('pending', reward))
    stakingTokenEndpoint.updateAndClaim(rewardFeesToken.address);
    const allusdc = await logUSDCBalance('stakingTokenEndpoint usdc after updateAndClaim rewards', stakingTokenEndpoint.address);

    console.log(`
      All the USDC is in the stakingToken endpoint/farm. Stake some tokens, 
      harvest the rewards from the endpoint/farm, and then claim the rewards.
    `);
    await logEtherBalance('withdrawalFeesEndpoint puul token balance start', puulToken, withdrawalFeesEndpoint.address);
    await puulToken.approve(stakingToken.address, toWei('1000000'));
    await stakingToken.deposit(toWei('1000'), {from: developer});
    await logEtherBalance('withdrawalFeesEndpoint PUUL after deposit', puulToken, withdrawalFeesEndpoint.address);
    await logEtherBalance('stakingToken           PUUL after deposit', puulToken, stakingToken.address);
    await stakingToken.harvest();
    await logEtherBalance('withdrawalFeesEndpoint PUUL after harvest', puulToken, withdrawalFeesEndpoint.address);
    await logEtherBalance('stakingToken           PUUL after harvest', puulToken, stakingToken.address);
    const before = await logUSDCBalance('developer usdc before updateAndClaim rewards', developer);
    await logEtherBalance('developer PUUL before harvest', puulToken, developer);
    await stakingToken.updateAndClaim({from: developer});
    const after = await logUSDCBalance('developer usdc after updateAndClaim rewards', developer);
    await logEtherBalance('developer PUUL after harvest', puulToken, developer);
    const extra = await logUSDCBalance('stakingToken usdc after updateAndClaim rewards', stakingToken.address);
    total = after.sub(before).add(extra).sub(allusdc);
    assert.equal(Number(total.toString()), 0, 'all reward usdc should be accounted for');

    console.log(`
      Withdraw from the staking token pool. This will generate some withdrawal 
      fees that are owned by the withdrawalFees endpoint.
    `);
    await logEtherBalance('developer              PUUL before withdrawal   ', puulToken, developer);
    await logEtherBalance('withdrawalFeesEndpoint PUUL before withdrawal   ', puulToken, withdrawalFeesEndpoint.address);
    await logEtherBalance('stakingToken           PUUL before withdrawal   ', puulToken, stakingToken.address);
    await stakingToken.withdrawAll();
    await logEtherBalance('developer              PUUL after  withdrawal   ', puulToken, developer);
    await logEtherBalance('withdrawalFeesEndpoint PUUL after  withdrawal   ', puulToken, withdrawalFeesEndpoint.address);
    await logEtherBalance('stakingToken           PUUL after  withdrawal   ', puulToken, stakingToken.address);
    await logEtherBalance('withdrawalFeesEndpoint STK  after  withdrawal   ', stakingToken, withdrawalFeesEndpoint.address);
    await withdrawalFeesEndpoint.withdrawFeesRaw(stakingToken.address);
    await logEtherBalance('developer              PUUL after  withdraw fees', puulToken, developer);
    await logEtherBalance('withdrawalFeesEndpoint PUUL after  withdraw fees', puulToken, withdrawalFeesEndpoint.address);
    await logEtherBalance('stakingToken           PUUL after  withdraw fees', puulToken, stakingToken.address);
    await logEtherBalance('withdrawalFeesEndpoint STK  after  withdrawal   ', stakingToken, withdrawalFeesEndpoint.address);

    console.log(`
      The withdrawalFeesEndpoint now owns some puul tokens. Harvest these 
      into the withdrawalFeesToken.
    `);
    await logEtherBalance('withdrawalFeesToken puul token balance before', puulToken, withdrawalFeesToken.address);
    await withdrawalFeesToken.harvest();
    await logEtherBalance('withdrawalFeesEndpoint puul token balance after', puulToken, withdrawalFeesToken.address);
    console.log(`
      Claim the rewards for dev from the withdrawal fees token. 
      These will be PUUL tokens.
    `);
    await logEtherBalance('dev puul token balance before updateAndClaim', puulToken, developer);
    await withdrawalFeesToken.updateAndClaim();
    await logEtherBalance('dev puul token balance after updateAndClaim', puulToken, developer);

    console.log(`
      Stake some puul tokens back into the staking token pool, then 
      harvest and claim the rewards. The rewards are PUUL tokens.
    `);
    await logEtherBalance('puul token balance before deposit', puulToken, stakingToken.address);
    await stakingToken.deposit(toWei('1000'));
    await logEtherBalance('puul token balance after deposit', puulToken, stakingToken.address);
    await logEtherBalance('staking token balance after deposit', stakingToken, developer);
    await stakingTokenEndpoint.updateAndClaim(withdrawalFeesToken.address);
    await stakingToken.harvest();
    await logEtherBalance('puul token balance before puul staking token after harvest', puulToken, stakingToken.address);
    await logEtherBalance('puul token balance before updateAndClaim', puulToken, developer);
    await stakingToken.updateAndClaim();
    await logEtherBalance('puul token balance after after updateAndClaim', puulToken, developer);

    console.log(`
      Withdraw from the staking pool and get the rest of the PUUL tokens.
    `);
    await logEtherBalance('developer              PUULSTK before withdraw', stakingToken, developer);
    await logEtherBalance('stakingToken           PUUL    before withdraw', puulToken, stakingToken.address);
    await stakingToken.withdrawAll();
    await logEtherBalance('developer              PUUL    after  withdraw', puulToken, developer);
    await logEtherBalance('developer              PUULSTK after  withdraw', stakingToken, developer);

  });
});