const IWETH = artifacts.require("IWETH");
const IERC20 = artifacts.require("IERC20");
const IUniswapV2Pair = artifacts.require("IUniswapV2Pair");
const UniswapHelper = artifacts.require("UniswapHelper");
const IUniswapV2Router02 = artifacts.require("IUniswapV2Router02");
const IUniswapV2Factory = artifacts.require("IUniswapV2Factory");
const PuulFees = artifacts.require("PuulFees");
const VOX_USDCPool = artifacts.require("VOX_USDCPool");
const PuulRewardFeesEndpoint = artifacts.require("PuulRewardFeesEndpoint");
const PuulRewardsFeeToken = artifacts.require("PuulRewardsFeeToken");
const PuulWithdrawalFeesEndpoint = artifacts.require("PuulWithdrawalFeesEndpoint");
const PuulWithdrawalFeeToken = artifacts.require("PuulWithdrawalFeeToken");
const PuulStakingPool = artifacts.require("PuulStakingPool");
const PuulToken = artifacts.require("PuulToken");
const PuulStakingPoolEndpoint = artifacts.require("PuulStakingPoolEndpoint");
const Limits = artifacts.require("Limits");

const BN = require('bn.js');

contract("VOX_USDCFarm", async accounts => {
  let instance;
  let helper;
  let factory = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
  let weth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  let pair = '0xe37D2Af2d33049935038826046bC03a62A3A1426'; // VOX/USDC
  let usdc = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  let dai = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  let usdt = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  let token = '0x12D102F06da35cC0111EB58017fd2Cd28537d0e1'; // VOX
  const BASE_FEE = new BN('10000');


  let WETH;
  let PAIR;
  let USDC;
  let USDT;
  let DAI;
  let TOKEN;
  let puulFees;
  let IERC20WETH;
  let UNI_ROUTER;
  let UNI_FACTORY;
  let withdrawFee;
  const admin = accounts[0];
  const member1 = accounts[1];
  const member2 = accounts[2];
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
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time], // 86400 is num seconds in day
        id
      }, (err, result) => {
        if(err){ return reject(err) }
        console.log('evm_increaseTime', result);
        // resolve(result);
        web3.currentProvider.send({
          jsonrpc: '2.0',
          method: 'evm_mine',
          id: result + 1,
        }, (err2, res) => (err2 ? reject(err2) : resolve(result)));
      });
    })
  }

  let token0;
  let token1;
  let limits;
  const slpSwap = new BN('1000'); // 2% slippage
  const slpA = new BN('500'); // 2% slippage
  const slpB = new BN('500'); // 2% slippage
  const slpRemA = new BN('500'); // 2% slippage
  const slpRemB = new BN('500'); // 2% slippage
  
  let withdrawalFeesEndpoint;
  let rewardFeesEndpoint;
  let withdrawalFeesToken;
  let rewardFeesToken;
  let dep = toPicoEther('2000')
  let outs;
  let tok0Min;
  let tok1Min;
  let respair;

  const approve = async (token, to, from, amt = web3.utils.toWei('100000')) => {
    const allowance = await token.allowance(from, to);
    // console.log('allowance', token)
    // console.log('allowance', to)
    // logEther('allowance', allowance)
    if (allowance.isZero())
      await token.approve(to, amt, {from});

  }

  let initialized = false;
  async function initialize() {
    if (initialized) return;
    initialized = true;
    PAIR = await IUniswapV2Pair.at(pair);
    helper = await UniswapHelper.deployed();
    puulFees = await PuulFees.deployed();
    withdrawFee = await puulFees.getWithdrawalFee();  
    instance = await VOX_USDCPool.deployed();
    limits = await Limits.deployed();

    WETH = await IWETH.at(weth);
    IERC20WETH = await IERC20.at(weth);
    USDC = await IERC20.at(usdc);
    USDT = await IERC20.at(usdt);
    DAI = await IERC20.at(dai);
    TOKEN = await IERC20.at(token);
    token0 = await PAIR.token0();
    token1 = await PAIR.token1();
    console.log('token0', token0);
    console.log('token1', token1);
    UNI_FACTORY = await IUniswapV2Factory.at(factory);
    await approve(IERC20WETH, instance.address, member1);
    await approve(TOKEN, instance.address, member1);
    await approve(IERC20WETH, instance.address, admin);
    await approve(TOKEN, instance.address, admin);
    // await IERC20WETH.approve(instance.address, web3.utils.toWei('100000'), {from: member1});
    UNI_ROUTER = await IUniswapV2Router02.at('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D');
    await approve(TOKEN, UNI_ROUTER.address, member1);
    await approve(IERC20WETH, UNI_ROUTER.address, member1);
    await approve(IERC20WETH, UNI_ROUTER.address, admin);
    // await IERC20WETH.approve(UNI_ROUTER.address, web3.utils.toWei('100000'), {from: member1});
    // await IERC20WETH.approve(UNI_ROUTER.address, web3.utils.toWei('100000'), {from: admin});
    await approve(USDT, instance.address, member1, toPicoEther('10000000000'));
    await approve(USDT, instance.address, admin, toPicoEther('10000000000'));
    //await USDT.approve(instance.address, toPicoEther('10000000000'), {from: member1});
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

  it("fund vox/weth Uniswap pool with single sided weth, then usdt", async () => {
    // The endpoints for the fees. These are farms that feed the rewards to the fee tokens

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
      Deposit into the VOX/WETH pool using USDT.
    `);
    // await limits.setMaxDeposit(instance.address, toWei('0')); // reset max deposit
    dep = toPicoEther('500')
    console.log('usdt depositing', picoetherFromWei(dep));
    respair = await PAIR.getReserves();
    console.log('vox_usdc reserves', etherFromWei(respair[0]), etherFromWei(respair[1]));

    await logPicoetherBalance('member1 USDT balance', USDT, member1);
    await logEtherBalance('member1 WETH balance', IERC20WETH, member1);
    outs = await helper.estimateOuts([usdt, token, usdt, usdc], [dep, dep]);
    logEther('out0', outs[0]);
    logEther('out1', outs[1]);
    tok0Min = slippage(outs[0], slpSwap);
    tok1Min = slippage(outs[1], slpSwap);
    logEther('tok0Min', tok0Min);
    logEther('tok1Min', tok1Min);

    try {
      await instance.depositFromToken(usdt, dep, dep, tok0Min, tok1Min, slpA, slpB, slpRemA, slpRemB, {from: member1});
      assert.equal(1, 1, 'should succeed');
    } catch (e) {
      console.log('depositFromToken', e);
      assert.equal(2, 1, 'failes if it gets here');
    }
    const afterDeposit = await USDT.balanceOf(member1);
    logPicoether('usdt balance after deposit', afterDeposit);
    await logEtherBalance('share', instance, member1)

    console.log(`
      Deposit Single Sided from VOX
    `);
    await UNI_ROUTER.swapExactTokensForTokens(toWei('2'), 0, [weth, token], member1, Date.now() + 1800, {from: member1});
    const voxbal = await logEtherBalance('vox balance before single sided', TOKEN, member1)

    const vdep = voxbal.div(new BN('2'))

    let outv = await helper.estimateOut(token, usdc, vdep);
    logEther('out', outv);
    let tokMinv = slippage(outv, slpSwap);
    logEther('tokMin', tokMinv);

    try {
      logEther('vox balance sending', vdep)
      await instance.depositSingleSided(token, vdep, vdep, tokMinv, slpA, slpB, slpRemA, slpRemB, {from: member1});
      await logEtherBalance('vox balance after single sided', TOKEN, member1)
    } catch (e) {
      console.log('vox deposit failed', e);
      assert.equal(2, 1, 'depositSingleSided failed');
    }
    let voxaft = await logEtherBalance('vox balance after single sided', TOKEN, member1)
    await logEtherBalance('share', instance, member1)

    console.log(`
      Check that the pool balance equals the VOX/WETH pair balance.
   `);
    let pairbal = await PAIR.balanceOf(instance.address);
    let poolbal = await instance.balanceOf(member1);
    logEther('vox_usdc balance', pairbal);
    await logUSDTBalance('usdt balance instance', instance.address);
    await logUSDTBalance('usdt balance helper', helper.address);
    logEther('pool balance', poolbal);
    const diffbal = poolbal.sub(pairbal);
    assert.equal(Number(diffbal.toString()), 0, 'pool tokens should equal lp tokens');

    console.log(`
      Transfer half of the VOX/WETH pool tokens to member2. 
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
      Farm the VOX/WETH farm. Mine 2000 blocks, then harvest the rewards. 
    `);
    await instance.harvest();
    for (let i = 0; i < 2000; i++) {
      await mineBlock(); 
    }
    await instance.harvest();
    console.log('rewardFeesEndpoint', rewardFeesEndpoint.address);
    await logEtherBalance('rewardFeesEndpoint vox', TOKEN, rewardFeesEndpoint.address);

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
      const bal = await tok.balanceOf(rewardFeesEndpoint.address);
      amounts.push(bal);
      const out = await helper.estimateOut(reward, usdc, bal);
      min.push(slippage(out, slpr));
    }
    console.log('min', min);
    await rewardFeesEndpoint.convertRewardFees(instance.address, helper.address, amounts, min);
    await logUSDCBalance('rewardFeesEndpoint usdc', rewardFeesEndpoint.address);

    console.log(`
      Claim the rewards from member2. The rewards are converted to usdc.
    `);
    await logUSDCBalance('usdc balance member2', member2);
    await instance.updateRewards({from: member2}); //need to interact to update rewards
    const owed2 = await instance.owedRewards({from: member2});
    owed2.forEach(o => logEther('owed member2', o));
    outs = await helper.estimateOuts([token, usdc], [owed2[0]]);
    logEther('out0', outs[0]);

    const minc2 = outs.map(out => out.sub(out.mul(slpr).div(BASE_FEE)));
    minc2.forEach(o => logEther('min', o));
    await instance.claimToToken(usdc, owed2, minc2, {from: member2});
    const claim2 = await logUSDCBalance('usdc balance member2 after claimToToken', member2);
    assert.isFalse(claim2.isZero(), 'should have gotten some usdc');

    console.log(`
      Claim the rewards from member1. The rewards are converted to usdc.
    `);
    await logUSDCBalance('usdc balance member1', member1);
    await instance.updateRewards({from: member1}); //need to interact to update rewards
    const owed = await instance.owedRewards({from: member1});
    owed.forEach(o => logEther('owed member1', o));
    outs = await helper.estimateOuts([token, usdc], [owed[0]]);
    logEther('out0', outs[0]);

    const minc = outs.map(out => out.sub(out.mul(slpr).div(BASE_FEE)));
    minc.forEach(o => logEther('min', o));
    await instance.claimToToken(usdc, owed, minc, {from: member1});
    const claim = await logUSDCBalance('usdc balance member1 after claimToToken', member1);
    assert.isFalse(claim.isZero(), 'should have gotten some usdc');

    console.log(`
      Withdraw all the tokens from the VOX/WETH pool for member1. Convert to USDT.
    `);
    let bal = await instance.balanceOf(member1)
    let total = await PAIR.totalSupply();
    let reser = await PAIR.getReserves();
    let tok0 = getLiquidityValue(bal, reser[0], total);
    let tok1 = getLiquidityValue(bal, reser[1], total);
    logEther('res0', reser[0]);
    logEther('tok0', tok0);
    logEther('res1', reser[1]);
    logEther('tok1', tok1);
    let slp1 = new BN('300')
    let liq0Min = slippage(tok0, slp1);
    let liq1Min = slippage(tok1, slp1);
    logEther('liq0Min', liq0Min);
    logEther('liq1Min', liq1Min);
    await instance.withdrawToToken(bal, dai, liq0Min, liq1Min, 1000, 1000, {from: member1});
    await logDAIBalance('dai balance member1 after withdrawAllToToken', member1);

    console.log(`
      Withdraw all the tokens from the VOX/WETH pool for member2. Convert to USDT.
    `);
    bal = await instance.balanceOf(member2)
    logEther('member2', bal);
    total = await PAIR.totalSupply();
    logEther('pair', total);
    let tbal = await instance.totalSupply()
    logEther('totalSupply', tbal);
    reser = await PAIR.getReserves();
    tok0 = getLiquidityValue(bal, reser[0], total);
    tok1 = getLiquidityValue(bal, reser[1], total);
    logEther('res0', reser[0]);
    logEther('tok0', tok0);
    logEther('res1', reser[1]);
    logEther('tok1', tok1);
    slp1 = new BN('300')
    liq0Min = slippage(tok0, slp1);
    liq1Min = slippage(tok1, slp1);
    logEther('liq0Min', liq0Min); 
    logEther('liq1Min', liq1Min);
    
    await logUSDTBalance('usdt balance before withdrawAllToToken admin', member2);
    await instance.withdrawToToken(bal, usdt, liq0Min, liq1Min, 300, 300, {from: member2});
    await logUSDTBalance('usdt balance after withdrawAllToToken admin', member2);

    console.log(`
      The only thing left in the VOX/WETH pool should be the withdrawal fees.
    `);
    const withdrawal = await puulFees.withdrawal();
    let totalSupply = await instance.totalSupply();
    let withdrawFees = await instance.balanceOf(withdrawal);
    logEther('withdraw total supply', totalSupply);
    logEther('withdraw withdrawal fees', withdrawFees);
    assert.equal(Number(totalSupply.toString()), Number(withdrawFees.toString()), 'totalSupply should equal withdrawal fees');

    console.log(`
      The reward fees are already in the rewardFeesEndpoint, but we need to get the 
      withdrawal fees. This gets the withdrawal fees from the vox/weth pool, converts 
      to USDC, and adds them to the withdrawal fees endpoint. After this, there 
      should not be anything left in the vox/weth pool.
    `);
    
    bal = await instance.balanceOf(withdrawal);
    total = await PAIR.totalSupply();
    reser = await PAIR.getReserves();
    tok0 = getLiquidityValue(bal, reser[0], total);
    tok1 = getLiquidityValue(bal, reser[1], total);
    logEther('res0', reser[0]);
    logEther('tok0', tok0);
    logEther('res1', reser[1]);
    logEther('tok1', tok1);
    slp1 = new BN('300')
    liq0Min = slippage(tok0, slp1);
    liq1Min = slippage(tok1, slp1);
    logEther('liq0Min', liq0Min);
    logEther('liq1Min', liq1Min);

    await withdrawalFeesEndpoint.withdrawFees(instance.address, bal, liq0Min, liq1Min, slp1, slp1);
    await logUSDCBalance('withdrawalFeesEndpoint usdc', withdrawalFeesEndpoint.address);
    await logUSDCBalance('rewardFeesEndpoint usdc', rewardFeesEndpoint.address);
    totalSupply = await instance.totalSupply();
    withdrawFees = await instance.balanceOf(withdrawal);
    logEther('withdraw total supply', totalSupply);
    logEther('withdraw withdrawal fees', withdrawFees);
    assert.equal(Number(totalSupply.toString()), 0, 'totalSupply should equal 0');
    assert.equal(0, Number(withdrawFees.toString()), 'withdrawal fees should be 0');
    pairbal = await PAIR.balanceOf(instance.address);
    assert.equal(0, Number(pairbal.toString()), 'should be no pair tokens');

    console.log(`
      At this point all the fees are in the endpoint/farms, except the reward fees due
      from the owned withdrawal fees. There should be a small amount from the tranfer
      of member1 to member2. Get those and convert to usdc.
    `);

    await withdrawalFeesEndpoint.updateAndClaim(instance.address);
    logEtherBalance('withdrawFeesEndpoint vox', TOKEN, withdrawalFeesEndpoint.address);
    min = [];
    amounts = [];
    rewards = await instance.rewards();
    console.log('rewards', rewards);
    slpr = new BN('500');
    for (let i = 0; i < rewards.length; i++) {
      const reward = rewards[i];
      const tok = await IERC20.at(reward);
      const bal = await tok.balanceOf(withdrawalFeesEndpoint.address);
      amounts.push(bal);
      const out = await helper.estimateOut(reward, usdc, bal);
      min.push(slippage(out, slpr));
    }
    console.log('min', min);
    await logUSDCBalance('withdrawalFeesEndpoint usdc before convert withdrawal reward fees', withdrawalFeesEndpoint.address);
    await withdrawalFeesEndpoint.convertRewardFees(instance.address, helper.address, amounts, min);
    await logUSDCBalance('withdrawalFeesEndpoint usdc before convert withdrawal reward fees', withdrawalFeesEndpoint.address);

    console.log(`
      There should be no rewards left in the pool, except maybe some left over from rounding.
      We track these when the rewards are calculated, but it's still possible for there to
      be tiny rounding errors when claiming. The extra must be <= the total.

      Note: had to remove rewardExtras for now, contract was too large.
    `);
    const totals = await instance.rewardTotals()
    totals.map(t => console.log('rewardTotals', etherFromWei(t)))
    // const extras = await instance.rewardExtras()
    // extras.map(t => console.log('rewardExtras', etherFromWei(t)))
    // for (let i = 0; i < totals.length; i++) {
    //   assert.isTrue(extras[i].lte(totals[i]), 'totals must be less than extras')
    // }

    console.log(`
      At this point all the fees are in the endpoint/farms. We can harvest them 
      into the fee tokens, and then the dev portion of the fees is claimed.
    `);
    await logUSDCBalance('rewardFeesEndpoint usdc before harvest', rewardFeesEndpoint.address);
    await rewardFeesToken.harvest();
    await logUSDCBalance('rewardFeesEndpoint usdc after harvest', rewardFeesEndpoint.address);
    await logUSDCBalance('rewardFeesToken usdc after harvest', rewardFeesToken.address);

    await logUSDCBalance('usdc reward dev balance before claim', developer);
    await rewardFeesToken.updateRewards({from: developer});
    let owedre = await rewardFeesToken.owedRewards({from: developer});
    owedre.forEach(o => logEther('owed', o));
    await rewardFeesToken.updateAndClaim({from: developer});
    await logUSDCBalance('usdc reward dev balance after claim', developer);

    await logUSDCBalance('withdrawalFeesEndpoint usdc before harvest into token', withdrawalFeesEndpoint.address);
    await withdrawalFeesToken.harvest();    
    await logUSDCBalance('withdrawalFeesEndpoint usdc after harvest into token', withdrawalFeesEndpoint.address);
    await logUSDCBalance('withdrawFeesToken usdc after harvest', withdrawalFeesToken.address);

    await logUSDCBalance('usdc withdrawal dev balance before claim', developer);
    await withdrawalFeesToken.updateAndClaim({from: developer});
    await logUSDCBalance('usdc withdrawal dev balance after claim', developer);

    console.log(`
      The fees are now in the fee tokens. Some of those tokens are owned by 
      the staking pool endpoint/farm. We need to claim those into the 
      staking token endpoint. Everything is already converted to USDC.
    `);
    const puulToken = await PuulToken.deployed();
    await logEtherBalance('puul token balance before', puulToken, developer);

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
    const before = await logUSDCBalance('stakingToken usdc before updateAndClaim rewards', developer);
    await stakingToken.updateAndClaim({from: developer});
    const after = await logUSDCBalance('stakingToken usdc after updateAndClaim rewards', developer);
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