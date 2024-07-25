import { rewardSplitterV2Fixture, rewardSplitterV2FixtureWithStake } from '../fixtures';
import { expect } from 'chai';
import { parseUnits } from 'ethers';

describe('StakingSplitter', () => {
  it('should have ldt address', async () => {
    const { stakingSplitter, ldtAddress } = await rewardSplitterV2Fixture();

    expect(await stakingSplitter.ldt()).eq(ldtAddress);
  });

  it('should have tbb address', async () => {
    const { stakingSplitter, tbbAddress } = await rewardSplitterV2Fixture();

    expect(await stakingSplitter.tbb()).eq(tbbAddress);
  });

  it('should have tbs address', async () => {
    const { stakingSplitter, tbsAddress } = await rewardSplitterV2Fixture();

    expect(await stakingSplitter.tbs()).eq(tbsAddress);
  });

  it('should have tbg address', async () => {
    const { stakingSplitter, tbgAddress } = await rewardSplitterV2Fixture();

    expect(await stakingSplitter.tbg()).eq(tbgAddress);
  });

  it('should have farms address', async () => {
    const { stakingSplitter, tbbStakerAddress, tbsStakerAddress, tbgStakerAddress } = await rewardSplitterV2Fixture();

    expect(await stakingSplitter.stakers(0)).eq(tbbStakerAddress);
    expect(await stakingSplitter.stakers(1)).eq(tbsStakerAddress);
    expect(await stakingSplitter.stakers(2)).eq(tbgStakerAddress);
  });

  it('should have tbb reward rate', async () => {
    const { stakingSplitter } = await rewardSplitterV2Fixture();

    let rewardRate = await stakingSplitter.tbbRewardRate();

    expect(rewardRate[0]).eq(200);
    expect(rewardRate[1]).eq(200);

    await expect(stakingSplitter.setTbbRewardRate({ ldt: 300, tb: 400 })).not.reverted;

    rewardRate = await stakingSplitter.tbbRewardRate();

    expect(rewardRate[0]).eq(300);
    expect(rewardRate[1]).eq(400);
  });

  it('should have tbs reward rate', async () => {
    const { stakingSplitter } = await rewardSplitterV2Fixture();

    let rewardRate = await stakingSplitter.tbsRewardRate();

    expect(rewardRate[0]).eq(500);
    expect(rewardRate[1]).eq(500);

    await expect(stakingSplitter.setTbsRewardRate({ ldt: 600, tb: 700 })).not.reverted;

    rewardRate = await stakingSplitter.tbsRewardRate();

    expect(rewardRate[0]).eq(600);
    expect(rewardRate[1]).eq(700);
  });

  it('should have tbg reward rate', async () => {
    const { stakingSplitter } = await rewardSplitterV2Fixture();

    let rewardRate = await stakingSplitter.tbgRewardRate();

    expect(rewardRate[0]).eq(1000);
    expect(rewardRate[1]).eq(1000);

    await expect(stakingSplitter.setTbgRewardRate({ ldt: 2000, tb: 3000 })).not.reverted;

    rewardRate = await stakingSplitter.tbgRewardRate();

    expect(rewardRate[0]).eq(2000);
    expect(rewardRate[1]).eq(3000);
  });


  it('should have min rate', async () => {
    const { stakingSplitter } = await rewardSplitterV2Fixture();

    expect(await stakingSplitter.MIN_RATE()).eq(1);
  });

  it('should have max rate', async () => {
    const { stakingSplitter } = await rewardSplitterV2Fixture();

    expect(await stakingSplitter.MAX_RATE()).eq(100_000);
  });

  it('should calculate', async () => {
    const { stakingSplitter } = await rewardSplitterV2FixtureWithStake();

    const rewards = await stakingSplitter.calculate(parseUnits('221917.8'), parseUnits('1775342.4'));

    expect(rewards.tbb.liquidity.ldt).eq(1000000000000000000n);
    expect(rewards.tbb.liquidity.tb).eq(1000000000000000n);
    expect(rewards.tbb.liquidity.ldtLiquidity).eq(500000000000000000000n);
    expect(rewards.tbb.liquidity.tbLiquidity).eq(500000000000000000n);

    expect(rewards.tbb.ldt).eq(1000000000000000000n);
    expect(rewards.tbb.tb).eq(1000000000000000n);

    expect(rewards.tbs.liquidity.ldt).eq(25000000000000000000n);
    expect(rewards.tbs.liquidity.tb).eq(2500000000000000n);
    expect(rewards.tbs.liquidity.ldtLiquidity).eq(5000000000000000000000n);
    expect(rewards.tbs.liquidity.tbLiquidity).eq(500000000000000000n);

    expect(rewards.tbs.ldt).eq(25000000000000000000n);
    expect(rewards.tbs.tb).eq(2500000000000000n);

    expect(rewards.tbg.liquidity.ldt).eq(500000000000000000000n);
    expect(rewards.tbg.liquidity.tb).eq(5000000000000000n);
    expect(rewards.tbg.liquidity.ldtLiquidity).eq(50000000000000000000000n);
    expect(rewards.tbg.liquidity.tbLiquidity).eq(500000000000000000n);

    expect(rewards.tbg.ldt).eq(500000000000000000000n);
    expect(rewards.tbg.tb).eq(5000000000000000n);
  });
});
