const IWETH = artifacts.require("IWETH");
const IERC20 = artifacts.require("IERC20");
const IUniswapV2Pair = artifacts.require("IUniswapV2Pair");
const UniswapHelper = artifacts.require("UniswapHelper");
const IUniswapV2Router02 = artifacts.require("IUniswapV2Router02");
const IUniswapV2Factory = artifacts.require("IUniswapV2Factory");
const PuulFees = artifacts.require("PuulFees");
const PuulRewardFees = artifacts.require("PuulRewardFees");
const USDC_PUULPool = artifacts.require("USDC_PUULPool");
const USDC_PUULFarm = artifacts.require("USDC_PUULFarm");
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

contract("USDC_PUULFarm", async accounts => {
  let instance;
  let helper;
  let farm;
  let factory = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
  let weth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  let usdc = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  let dai = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  let usdt = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  const BASE_FEE = new BN('10000');


  let WETH;
  let PAIR;
  let USDC;
  let USDT;
  let DAI;
  let TOKEN;
  let puulFees;
  let rewardFees;
  let IERC20WETH;
  let UNI_ROUTER;
  let UNI_FACTORY;
  let withdrawFee;
  const admin = accounts[0];
  const member1 = accounts[1];
  const member2 = accounts[2];
  const developer = admin;
  const harvester = accounts[0];
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

  const OneDay = 86400;
  const OneWeek = OneDay * 7;
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
  const slpSwap = new BN('200'); // 2% slippage
  const slpA = new BN('200'); // 2% slippage
  const slpB = new BN('200'); // 2% slippage
  const slpRemA = new BN('200'); // 2% slippage
  const slpRemB = new BN('200'); // 2% slippage
  
  let withdrawalFeesEndpoint;
  let rewardFeesEndpoint;
  let withdrawalFeesToken;
  let rewardFeesToken;
  let dep = toPicoEther('2000')
  let outs;
  let tok0Min;
  let tok1Min;
  let respair;
  let puulToken;
  let distributor;

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
    helper = await UniswapHelper.deployed();
    rewardFees = await PuulRewardFees.deployed();
    puulFees = await PuulFees.deployed();
    withdrawFee = await rewardFees.getWithdrawalFee();  
    instance = await USDC_PUULPool.deployed();
    limits = await Limits.deployed();
    farm = await USDC_PUULFarm.deployed();

    WETH = await IWETH.at(weth);
    IERC20WETH = await IERC20.at(weth);
    USDC = await IERC20.at(usdc);
    USDT = await IERC20.at(usdt);
    DAI = await IERC20.at(dai);
    puulToken = await PuulToken.deployed();
    distributor = await RewardDistributor.deployed();
    TOKEN = puulToken;
    UNI_FACTORY = await IUniswapV2Factory.at(factory);
    console.log('getPair', puulToken.address);
    console.log('getPair', usdc);
    const PAIRA = await UNI_FACTORY.getPair(puulToken.address, usdc);
    console.log('paira', PAIRA);
    PAIR = await IUniswapV2Pair.at(PAIRA)
    token0 = await PAIR.token0();
    token1 = await PAIR.token1();
    console.log('token0', token0);
    console.log('token1', token1);
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
    await approve(USDC, instance.address, member1, toPicoEther('10000000000'));
    await approve(USDC, instance.address, admin, toPicoEther('10000000000'));
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

  it("fund puul/usdc Uniswap pool", async () => {
    // The endpoints for the fees. These are farms that feed the rewards to the fee tokens

    console.log(`
      Convert some WETH to USDC
    `);
    try {
      const amt = web3.utils.toWei('10');
      logEther('swapping', amt);
      const weus = await UNI_FACTORY.getPair(weth, usdc);
      const wpair = await IUniswapV2Pair.at(weus);
      const res = await wpair.getReserves();
      console.log('reserves', etherFromWei(res[0]), picoetherFromWei(res[1]));
      await logUSDCBalance('usdc balance before', member1);
      await logEtherBalance('member1 WETH balance', IERC20WETH, member1);
      await UNI_ROUTER.swapExactTokensForTokens(amt, 0, [weth, usdc], member1, Date.now() + 1800, {from: member1});
      const startingUSDC = await USDC.balanceOf(member1);
      logPicoether('usdc balance before', startingUSDC);
      await UNI_ROUTER.swapExactTokensForTokens(amt, 0, [weth, usdc], admin, Date.now() + 1800);
    } catch (e) {
      console.log('weth to usdc failed', e)
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
      Deposit into the PUUL/USDC pool using PUUL and USDC.
    `);
    // await limits.setMaxDeposit(instance.address, toWei('0')); // reset max deposit
    dep = toWei('100')
    console.log('dep', dep)
    console.log('puul depositing', etherFromWei(dep));
    respair = await PAIR.getReserves();
    console.log('puul_usdc reserves', etherFromWei(respair[1]), picoetherFromWei(respair[0]));
    const out = await UNI_ROUTER.quote(dep, respair[1], respair[0])
    logPicoether('usdc depositing', out);

    await logPicoetherBalance('member1 USDC balance', USDC, developer);
    tok0Min = slippage(new BN(dep), slpSwap);
    tok1Min = slippage(out, slpSwap);
    logEther('tok0Min', tok0Min);
    logPicoether('tok1Min', tok1Min);

    try {
      await instance.depositPair(out, dep, tok1Min, tok0Min);
      assert.equal(1, 1, 'should succeed');
    } catch (e) {
      console.log('depositPair', e);
      assert.equal(2, 1, 'fails if it gets here');
    }
    const afterDeposit = await USDC.balanceOf(developer);
    logPicoether('usdc balance after deposit', afterDeposit);
    await logEtherBalance('share', instance, developer)
    await logEtherBalance('PUUL after deposit', puulToken, developer)

    // make sure these are all a noop
    await instance.earn();
    await instance.harvest();
    await instance.liquidate();
    
    console.log(`
      Check that the pool balance equals the PUUL/USDC pair balance.
   `);
    let pairbal = await PAIR.balanceOf(instance.address);
    let poolbal = await instance.balanceOf(developer);
    logPicoether('puul_usdc balance', pairbal);
    await logUSDCBalance('usdc balance instance', instance.address);
    await logUSDCBalance('usdc balance helper', helper.address);
    logPicoether('pool balance', poolbal);
    const diffbal = poolbal.sub(pairbal);
    assert.equal(Number(diffbal.toString()), 0, 'pool tokens should equal lp tokens');

    console.log(`
      Transfer half of the PUUL/USDC pool tokens to member2. 
      Amount should be one half minus the withdrawal fee.
    `);
    const xfer = poolbal.div(new BN('2'));
    await instance.transfer(member2, xfer);
    const xferAfterFee = xfer.sub(xfer.mul(withdrawFee).div(BASE_FEE));
    let xferBal = await instance.balanceOf(member2);
    logEther('xfer to member 2', xferBal);
    let diff = xferBal.sub(xferAfterFee);
    xferBal = await instance.balanceOf(developer);
    logEther('xfer to member1', xferBal);
    console.log('diff', diff.toString());
    assert.equal(Number(diff.toString()), 0, 'xfer balance should remove fee');

    await instance.earn(); // should be a noop
    await distributor.sendRewardsToFarm(farm.address, puulToken.address, toWei('500'), { from: harvester})
    await logEtherBalance('farm        PUUL    aft farm', puulToken, farm.address);
    await logEtherBalance('distributor PUUL    aft farm', puulToken, distributor.address);

    await instance.harvestOnly();
    // console.log('rewardFeesEndpoint', rewardFeesEndpoint.address);
    await logEtherBalance('rewardFeesEndpoint PUUL', TOKEN, rewardFeesEndpoint.address);

    console.log(`
      Claim the rewards from member2.
    `);
    await instance.updateAndClaim({from: member2});
    const claim2 = await logEtherBalance('PUUL balance member2 after claim', puulToken, member2);
    assert.isFalse(claim2.isZero(), 'should have gotten some PUUL');

    console.log(`
      Claim the rewards from developer.
    `);
    await instance.updateAndClaim({from: developer});
    const claim1 = await logEtherBalance('PUUL balance member1 after claim', puulToken, developer);
    assert.isFalse(claim1.isZero(), 'should have gotten some PUUL');

    console.log(`
      Withdraw all the tokens from the PUUL/USDC pool for member2.
    `);
    let bal = await instance.balanceOf(member2)
    let total = await PAIR.totalSupply();
    let reser = await PAIR.getReserves();
    let tok0 = getLiquidityValue(bal, reser[0], total);
    let tok1 = getLiquidityValue(bal, reser[1], total);
    logPicoether('tok0', tok0);
    logEther('tok1', tok1);
    let slp1 = new BN('500')
    let liq0Min = slippage(tok0, slp1);
    let liq1Min = slippage(tok1, slp1);
    logPicoether('liq0Min', liq0Min);
    logEther('liq1Min', liq1Min);
    await logEtherBalance('PUUL balance member1 before withdraw', puulToken, member2);
    await instance.withdrawPair(bal, liq0Min, liq1Min, {from: member2});
    await logEtherBalance('PUUL balance member1 after withdraw', puulToken, member2);

    console.log(`
      Withdraw all the tokens from the PUUL/USDC pool for developer.
    `);
    bal = await instance.balanceOf(developer)
    total = await PAIR.totalSupply();
    reser = await PAIR.getReserves();
    tok0 = getLiquidityValue(bal, reser[0], total);
    tok1 = getLiquidityValue(bal, reser[1], total);
    logPicoether('tok0', tok0);
    logEther('tok1', tok1);
    slp1 = new BN('500')
    liq0Min = slippage(tok0, slp1);
    liq1Min = slippage(tok1, slp1);
    logPicoether('liq0Min', liq0Min);
    logEther('liq1Min', liq1Min);
    await logEtherBalance('PUUL balance member1 before withdraw', puulToken, developer);
    await instance.withdrawPair(bal, liq0Min, liq1Min, {from: developer});
    await logEtherBalance('PUUL balance member1 after withdraw', puulToken, developer);

    console.log(`
      The only thing left in the pool should be the withdrawal fees.
    `);
    const withdrawal = await puulFees.withdrawal();
    let totalSupply = await instance.totalSupply();
    let withdrawFees = await instance.balanceOf(withdrawal);
    logEther('withdraw total supply', totalSupply);
    logEther('withdraw withdrawal fees', withdrawFees);
    assert.equal(Number(totalSupply.toString()), Number(withdrawFees.toString()), 'totalSupply should equal withdrawal fees');

    console.log(`
      The reward fees are already in the rewardFeesEndpoint, but we need to get the 
      withdrawal fees. This gets the withdrawal fees from the bond/usdc pool, converts 
      to USDC, and adds them to the withdrawal fees endpoint. After this, there 
      should not be anything left in the bond/usdc pool.
    `);
    
    bal = await instance.balanceOf(withdrawal);
    total = await PAIR.totalSupply();
    reser = await PAIR.getReserves();
    tok0 = getLiquidityValue(bal, reser[0], total);
    tok1 = getLiquidityValue(bal, reser[1], total);
    logEther('res0', reser[0]);
    logEther('tok0', tok0);
    logPicoether('res1', reser[1]);
    logPicoether('tok1', tok1);
    slp1 = new BN('300')
    liq0Min = slippage(tok0, slp1);
    liq1Min = slippage(tok1, slp1);
    logEther('liq0Min', liq0Min);
    logPicoether('liq1Min', liq1Min);

    // This needs some liquidity in order to work
    // await withdrawalFeesEndpoint.withdrawFees(instance.address, bal, liq0Min, liq1Min, slp1, slp1);
    // await logUSDCBalance('withdrawalFeesEndpoint usdc', withdrawalFeesEndpoint.address);
    // await logUSDCBalance('rewardFeesEndpoint usdc', rewardFeesEndpoint.address);
    // totalSupply = await instance.totalSupply();
    // withdrawFees = await instance.balanceOf(withdrawal);
    // logEther('withdraw total supply', totalSupply);
    // logEther('withdraw withdrawal fees', withdrawFees);
    // assert.equal(Number(totalSupply.toString()), 0, 'totalSupply should equal 0');
    // assert.equal(0, Number(withdrawFees.toString()), 'withdrawal fees should be 0');
    // pairbal = await PAIR.balanceOf(instance.address);
    // assert.equal(0, Number(pairbal.toString()), 'should be no pair tokens');

    console.log(`
      At this point all the fees are in the endpoint/farms, except the reward fees due
      from the owned withdrawal fees. There should be a small amount from the tranfer
      of member1 to member2. Get those.
    `);

    await withdrawalFeesEndpoint.updateAndClaim(instance.address);
    logEtherBalance('withdrawFeesEndpoint puul', TOKEN, withdrawalFeesEndpoint.address);
    await logUSDCBalance('withdrawalFeesEndpoint usdc', withdrawalFeesEndpoint.address);

    console.log(`
      At this point all the fees are in the endpoint/farms. We can harvest them 
      into the fee tokens, and then the dev portion of the fees is claimed.
    `);
    await logUSDCBalance('rewardFeesEndpoint usdc before harvest', rewardFeesEndpoint.address);
    await logEtherBalance('rewardFeesEndpoint puul before harvest', puulToken, rewardFeesEndpoint.address);
    await rewardFeesToken.harvest();
    await logUSDCBalance('rewardFeesEndpoint usdc after harvest', rewardFeesEndpoint.address);
    await logEtherBalance('rewardFeesEndpoint puul after harvest', puulToken, rewardFeesEndpoint.address);
    await logUSDCBalance('rewardFeesToken usdc after harvest', rewardFeesToken.address);
    await logEtherBalance('rewardFeesToken puul after harvest', puulToken, rewardFeesToken.address);

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
    await logEtherBalance('puul token balance before', puulToken, developer);

    const stakingToken = await PuulStakingPool.deployed();
    const stakingTokenEndpoint = await PuulStakingPoolEndpoint.deployed();
    const stakingTokenRewards = await stakingToken.rewards();
    console.log('stakingToken rewards', stakingTokenRewards);
    assert.equal(stakingTokenRewards.length, 2, 'PuulStakingPool rewards should be 2');
    assert.include([usdc, puulToken.address], stakingTokenRewards[0], 'stakingTokenRewards rewards token should include usdc and puul');
    assert.include([usdc, puulToken.address], stakingTokenRewards[1], 'stakingTokenRewards rewards token should include usdc and puul');

    await logUSDCBalance('stakingTokenEndpoint usdc before updateAndClaim withdrawal', stakingTokenEndpoint.address);
    await logEtherBalance('stakingTokenEndpoint puul before updateAndClaim withdrawal', puulToken, stakingTokenEndpoint.address);
    stakingTokenEndpoint.updateAndClaim(withdrawalFeesToken.address);
    await logUSDCBalance('stakingTokenEndpoint usdc after updateAndClaim withdrawal', stakingTokenEndpoint.address);
    await logEtherBalance('stakingTokenEndpoint puul after updateAndClaim withdrawal', puulToken, stakingTokenEndpoint.address);
    // const pending = await rewardFeesToken.getPendingRewards(stakingTokenEndpoint.address);
    // pending.forEach(reward => logPicoether('pending', reward))
    stakingTokenEndpoint.updateAndClaim(rewardFeesToken.address);
    const allpuul = await logEtherBalance('stakingTokenEndpoint puul before updateAndClaim rewards', puulToken, stakingTokenEndpoint.address);

    console.log(`
      All the USDC is in the stakingToken endpoint/farm. Stake some tokens, 
      harvest the rewards from the endpoint/farm, and then claim the rewards.
    `);
    await logEtherBalance('withdrawalFeesEndpoint puul token balance start', puulToken, withdrawalFeesEndpoint.address);
    await puulToken.approve(stakingToken.address, toWei('1000000'));
    await stakingToken.deposit(toWei('1000'), {from: developer});
    await logEtherBalance('stakingToken           PUUL after deposit', puulToken, stakingToken.address);
    await stakingToken.harvest();
    await logEtherBalance('stakingToken           PUUL after harvest', puulToken, stakingToken.address);
    const before = await logEtherBalance('stakingToken puul before updateAndClaim rewards', puulToken, developer);
    await stakingToken.updateAndClaim({from: developer});
    const after = await logEtherBalance('stakingToken puul after updateAndClaim rewards', puulToken, developer);
    const extra = await logEtherBalance('stakingToken puul after updateAndClaim rewards', puulToken, stakingToken.address);
    total = after.sub(before).add(extra).sub(allpuul);
    assert.equal(Number(total.toString()), toWei('1000'), 'all reward puul should be accounted for');

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
    await withdrawalFeesEndpoint.updateAndClaim(stakingToken.address);
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