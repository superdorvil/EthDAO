// NOTE: Big number just to string it to print it out

const EthDAO = artifacts.require("EthDAO")
const {expectRevert, balance} = require('@openzeppelin/test-helpers');
const ipfsUri = "give me a uri";

require("chai")
  .use(require("chai-as-promised"))
  .should()

contract('EthDAO', (accounts) => {
  let price = web3.utils.toBN(web3.utils.toWei('12.5', 'finney'))
  let [superdorvil, m1, m2, m3, m4] = accounts;
  let address;
  let receipt;
  let mintAmount = 0;
  let mintPrice = 0;
  let shareData = [];
  let threeYearHodlTimeLimit
  let voteTimeLimit
  let currentBlockTime
  let pausedState
  let isVoteOpen
  let voteOpen
  let isWithdrawalOpen
  let contractBalance
  let currentBalance
  let newBalance
  const oneWeekInSeconds = 604800;
  let hodlCount = 0
  let sellCount = 0


  const updateMintAmount = (amount) => {
    mintAmount = amount
    mintPrice = amount * price
  }

  const closedStateCheck = async () => {
    isVoteOpen = await contract.isVoteOpen()
    assert.equal(isVoteOpen, false)

    isWithdrawalOpen = await contract.isWithdrawalOpen()
    assert.equal(isWithdrawalOpen, false)

    await expectRevert(
      contract.withdraw(superdorvil),
      'Withdrawal not yet open'
    )

    await expectRevert(
      contract.getUnclaimedFunds(),
      'Can only withdraw 25 weeks withdrawal period is open'
    )

    await expectRevert(
      contract.voteToHodlOrSell(superdorvil, false),
      'Vote not yet open'
    )
  }

  const getContractPrivateData = async () => {
    privateData = await contract.getPrivateData()

    threeYearHodlTimeLimit = privateData[0]
    voteTimeLimit = privateData[1]
    pausedState = privateData[2]
  }

  const printInfo = (info, log) => {
    if (log) {
      console.log(info)
    }
  }

  const checkVotes = (sData, start, end, hodl, log) => {
    sData.forEach((sd, i) => {
      if (i >= start && i < end) {
        printInfo('vote i = ' + i + ' = ' + sd.hodl, log)
        assert.equal(sd.hodl, hodl)

        if (hodl) {
          hodlCount++
        } else {
          sellCount++
        }
      }
    });
  }

  const checkAllVotes = (shareData, hodlSet1, hodlSet2, hodlSet3, hodlSet4, hodlSet5, hodlSet6, hodlSet7, hodlSet8, hodlSet9, hodlSet10, log, debug) => {
    if (debug) {
      console.log(debug)
    }

    hodlCount = 0
    sellCount = 0

    printInfo('set1', log)
    checkVotes(shareData, 0, 10, hodlSet1, log)
    printInfo('set2', log)
    checkVotes(shareData, 10, 20, hodlSet2, log)
    printInfo('set3', log)
    checkVotes(shareData, 20, 30, hodlSet3, log)
    printInfo('set4', log)
    checkVotes(shareData, 30, 40, hodlSet4, log)
    printInfo('set5', log)
    checkVotes(shareData, 40, 50, hodlSet5, log)
    printInfo('set6', log)
    checkVotes(shareData, 50, 60, hodlSet6, log)
    printInfo('set7', log)
    checkVotes(shareData, 60, 70, hodlSet7, log)
    printInfo('set8', log)
    checkVotes(shareData, 70, 80, hodlSet8, log)
    printInfo('set9', log)
    checkVotes(shareData, 80, 90, hodlSet9, log)
    printInfo('set10', log)
    checkVotes(shareData, 90, 100, hodlSet10, log)
    printInfo('check votes done', log)
  }

  const checkIsShareWithdrawn = (sData, start, end, isShareWithdrawn, log) => {
    sData.forEach((sd, i) => {
      if (i >= start && i < end) {
        printInfo('withdraw i = ' + i + ' = ' + sd.isShareWithdrawn, log)
        assert.equal(sd.isShareWithdrawn, isShareWithdrawn)
      }
    });
  }

  const checkAllSharesWithdrawn = (shareData, withdrawSet1, withdrawSet2, withdrawSet3, withdrawSet4, withdrawSet5, withdrawSet6, withdrawSet7, withdrawSet8, withdrawSet9, withdrawSet10, log, debug) => {
    if (debug) {
      console.log(debug)
    }

    withdrawCount = 0
    sellCount = 0

    printInfo('set1', log)
    checkIsShareWithdrawn(shareData, 0, 10, withdrawSet1, log)
    printInfo('set2', log)
    checkIsShareWithdrawn(shareData, 10, 20, withdrawSet2, log)
    printInfo('set3', log)
    checkIsShareWithdrawn(shareData, 20, 30, withdrawSet3, log)
    printInfo('set4', log)
    checkIsShareWithdrawn(shareData, 30, 40, withdrawSet4, log)
    printInfo('set5', log)
    checkIsShareWithdrawn(shareData, 40, 50, withdrawSet5, log)
    printInfo('set6', log)
    checkIsShareWithdrawn(shareData, 50, 60, withdrawSet6, log)
    printInfo('set7', log)
    checkIsShareWithdrawn(shareData, 60, 70, withdrawSet7, log)
    printInfo('set8', log)
    checkIsShareWithdrawn(shareData, 70, 80, withdrawSet8, log)
    printInfo('set9', log)
    checkIsShareWithdrawn(shareData, 80, 90, withdrawSet9, log)
    printInfo('set10', log)
    checkIsShareWithdrawn(shareData, 90, 100, withdrawSet10, log)
    printInfo('check votes done', log)
  }

  const assertHodlCount = ({hodl, sell}) => {
      assert.equal(hodl, hodlCount)
      assert.equal(sell, sellCount)
  }

  before(async () => {
    contract = await EthDAO.new() // deployed
    address = contract.address

    shareData = await contract.getShareData()
    assert.equal(shareData.length, 10)

    await getContractPrivateData()
    assert.equal(pausedState, false)

    await closedStateCheck()
  })

  describe('deployment', async () => {
    it('deploys successfully', async () => {
      assert.notEqual(address, 0x0)
      assert.notEqual(address, '')
      assert.notEqual(address, null)
      assert.notEqual(address, undefined)
    })

    it("has a name", async () => {
      const name = await contract.name()
      assert.equal(name, 'EthDAO')
    })

    it("has a symbol", async () => {
      const symbol = await contract.symbol()
      assert.equal(symbol, 'ETHDAO')
    })
  })

  describe('Minting on multiple account', async () => {
    it('Expect revert on failing the mint. ', async () => {
      updateMintAmount(1);

      await expectRevert(
        contract.claim(mintAmount, { from: m1, value: mintPrice }),
        'contract paused for minting yet'
      )

      await contract.pauseContract() // unpause

      updateMintAmount(0)

      await expectRevert(
        contract.claim(mintAmount, { from: m1, value: mintPrice }),
        'must mint at least 1 share 0'
      )

      updateMintAmount(21)

      await expectRevert(
        contract.claim(mintAmount, { from: m1, value: mintPrice }),
        'mint amount cannot be greater than 20'
      )

      updateMintAmount(20)

      await expectRevert(
        contract.claim(mintAmount, { from: m1, value: mintPrice/2 }),
        'Not enough ethereum for the transaction'
      )

      await contract.pauseContract() // pause

      await expectRevert(
        contract.claim(mintAmount, { from: m1, value: mintPrice }),
        'contract paused for minting yet'
      )

      await contract.pauseContract() // unpause
    })

    it('Mint successfully. ', async () => {
      await closedStateCheck()

      contractBalance = await balance.current(address)
      assert.equal(contractBalance, 0)

      updateMintAmount(10)

      await contract.claim(mintAmount, { from: superdorvil, value: mintPrice })

      shareData = await contract.getShareData()
      assert.equal(shareData.length, 20)

      contractBalance = await balance.current(address)
      assert.equal(contractBalance, 100000000000000000)

      updateMintAmount(20)

      await closedStateCheck()

      await contract.claim(mintAmount, { from: m1, value: mintPrice })

      shareData = await contract.getShareData()
      assert.equal(shareData.length, 40)

      contractBalance = await balance.current(address)
      assert.equal(contractBalance, 300000000000000000)

      await closedStateCheck()

      await contract.claim(mintAmount, { from: m2, value: mintPrice })

      shareData = await contract.getShareData()
      assert.equal(shareData.length, 60)

      contractBalance = await balance.current(address)
      assert.equal(contractBalance, 500000000000000000)

      await closedStateCheck()

      await contract.claim(mintAmount, { from: m3, value: mintPrice })

      shareData = await contract.getShareData()
      assert.equal(shareData.length, 80)

      contractBalance = await balance.current(address)
      assert.equal(contractBalance, 700000000000000000)

      await closedStateCheck()

      await contract.claim(mintAmount, { from: superdorvil, value: mintPrice })

      shareData = await contract.getShareData()
      assert.equal(shareData.length, 100)

      contractBalance = await balance.current(address)
      assert.equal(contractBalance, 900000000000000000)

      await closedStateCheck()

      shareData.forEach((sd, i) => {
        assert.equal(sd.hodl, true)
        assert.equal(sd.isShareWithdrawn, false)
      });

      updateMintAmount(1)
      await expectRevert(
        contract.claim(mintAmount, { from: m1, value: mintPrice }),
        'minting will go over total supply of 100 ethdaos'
      )
    })
  })

  describe('token uris', async () => {
    it("has correct tokenURI", async () => {
      let tokenURI = await contract.tokenURI(0)
      expect(tokenURI).to.equal("ipfs://" + ipfsUri + "/0.json")
      tokenURI = await contract.tokenURI(1)
      expect(tokenURI).to.equal("ipfs://" + ipfsUri + "/1.json")
      tokenURI = await contract.tokenURI(2)
      expect(tokenURI).to.equal("ipfs://" + ipfsUri + "/2.json")
    })
  })

  // need to add the ability to partial vote by buying after minting and changing vote
  describe('Voting', async () => {
    it("Check vote function require statements work", async () => {
      isVoteOpen = await contract.isVoteOpen()
      assert.equal(isVoteOpen, false)

      await expectRevert(
        contract.voteToHodlOrSell(superdorvil, false),
        'Vote not yet open'
      )

      await contract.openVoteToSellSharesEarly()
      isVoteOpen = await contract.isVoteOpen()
      assert.equal(isVoteOpen, true)

      // This sets the vote time limit to the current block time
      // We can open the vote and check the difference to see if it sets it to about a week from now
      await contract.closeVoteToSellSharesEarly()
      isVoteOpen = await contract.isVoteOpen()
      assert.equal(isVoteOpen, false)

      await getContractPrivateData() // time closed
      currentBlockTime = voteTimeLimit

      // once its the current block timestamp or earlier the vote is closed so this should still be closed
      await expectRevert(
        contract.voteToHodlOrSell(superdorvil, false),
        'Vote not yet open'
      )

      await contract.openVoteToSellSharesEarly()
      isVoteOpen = await contract.isVoteOpen()
      assert.equal(isVoteOpen, true)

      await getContractPrivateData() // opened vote timeout
      // make sure there is a week difference in time
      assert.equal(true,
        (oneWeekInSeconds + 5) > (voteTimeLimit - currentBlockTime) &&
        (oneWeekInSeconds - 5) < (voteTimeLimit - currentBlockTime)
      )

      await contract.closeVoteToSellSharesEarly()
      isVoteOpen = await contract.isVoteOpen()
      assert.equal(isVoteOpen, false)

      await expectRevert(
        contract.voteToHodlOrSell(superdorvil, false),
        'Vote not yet open'
      )

      shareData = await contract.getShareData()
      shareData.forEach((sd, i) => {
        assert.equal(sd.hodl, true)
        assert.equal(sd.isShareWithdrawn, false)
      });
    })

    it("Vote and check if vote workd, hodl shares should update properly", async () => {
      await contract.openVoteToSellSharesEarly()
      isVoteOpen = await contract.isVoteOpen()
      assert.equal(isVoteOpen, true)

      await contract.voteToHodlOrSell(superdorvil, false)

      shareData = await contract.getShareData()
      checkAllVotes(shareData, false, false, true, true, true, true, true, true, false, false)
      assertHodlCount({hodl: 60, sell: 40})

      isWithdrawalOpen = await contract.isWithdrawalOpen()
      assert.equal(isWithdrawalOpen, false)

      await expectRevert(
        contract.withdraw(superdorvil),
        'Withdrawal not yet open'
      )

      await contract.voteToHodlOrSell(m2, false)

      shareData = await contract.getShareData()
      checkAllVotes(shareData, false, false, true, true, false, false, true, true, false, false)
      assertHodlCount({hodl: 40, sell: 60})

      // vote leans to withdraw but the vote is still open
      await expectRevert(
        contract.withdraw(superdorvil),
        'Cannot withdraw during voting period'
      )

      // transer 10 tokens to m4
      await contract.safeTransferFrom(superdorvil, m4, 0);
      await contract.safeTransferFrom(superdorvil, m4, 1);
      await contract.safeTransferFrom(superdorvil, m4, 2);
      await contract.safeTransferFrom(superdorvil, m4, 3);
      await contract.safeTransferFrom(superdorvil, m4, 4);
      await contract.safeTransferFrom(superdorvil, m4, 5);
      await contract.safeTransferFrom(superdorvil, m4, 6);
      await contract.safeTransferFrom(superdorvil, m4, 7);
      await contract.safeTransferFrom(superdorvil, m4, 8);
      await contract.safeTransferFrom(superdorvil, m4, 9);

      await contract.voteToHodlOrSell(m4, true)

      shareData = await contract.getShareData()
      checkAllVotes(shareData, true, false, true, true, false, false, true, true, false, false)
      assertHodlCount({hodl: 50, sell: 50})

      // 50 50 vote not open withdrawal
      await expectRevert(
        contract.withdraw(superdorvil),
        'Withdrawal not yet open'
      )

      await contract.voteToHodlOrSell(m4, false)

      await contract.closeVoteToSellSharesEarly()
      isVoteOpen = await contract.isVoteOpen()
      assert.equal(isVoteOpen, false)

      shareData = await contract.getShareData()
      checkAllVotes(shareData, false, false, true, true, false, false, true, true, false, false)
      assertHodlCount({hodl: 40, sell: 60})
    })
  })

  // check the balances of these withdrawals
  // should be able to do some form of await with these payables
  // then grab data and await the correct balance was sent
  describe('withdrawing shares', async () => {
    it("withdrawing shares", async () => {
      isWithdrawalOpen = await contract.isWithdrawalOpen()
      assert.equal(isWithdrawalOpen, true)

      await expectRevert(
        contract.claim(mintAmount, { from: m1, value: mintPrice }),
        'minting is closed during withdrawal period'
      )

      shareData = await contract.getShareData()
      checkAllSharesWithdrawn(shareData, false, false, false, false, false, false, false, false, false, false)

      contractBalance = await balance.current(address)

      const tenShares = contractBalance / 10
      const twentyShares = contractBalance / 5

      currentBalance = await balance.current(m1)
      await contract.withdraw(m1);
      shareData = await contract.getShareData()
      checkAllSharesWithdrawn(shareData, false, false, true, true, false, false, false, false, false, false)
      newBalance = await balance.current(m1) - currentBalance
      assert.equal(twentyShares, newBalance)

      // transer 10 tokens to m4
      await contract.safeTransferFrom(superdorvil, m1, 10);
      await contract.safeTransferFrom(superdorvil, m1, 11);
      await contract.safeTransferFrom(superdorvil, m1, 12);
      await contract.safeTransferFrom(superdorvil, m1, 13);
      await contract.safeTransferFrom(superdorvil, m1, 14);
      await contract.safeTransferFrom(superdorvil, m1, 15);
      await contract.safeTransferFrom(superdorvil, m1, 16);
      await contract.safeTransferFrom(superdorvil, m1, 17);
      await contract.safeTransferFrom(superdorvil, m1, 18);
      await contract.safeTransferFrom(superdorvil, m1, 19);

      currentBalance = await balance.current(m1)
      await contract.withdraw(m1);
      shareData = await contract.getShareData()
      checkAllSharesWithdrawn(shareData, false, true, true, true, false, false, false, false, false, false)
      newBalance = await balance.current(m1) - currentBalance
      assert.equal(tenShares, newBalance)

      currentBalance = await balance.current(superdorvil)
      await contract.withdraw(superdorvil);
      shareData = await contract.getShareData()
      checkAllSharesWithdrawn(shareData, false, true, true, true, false, false, false, false, true, true)
      newBalance = await balance.current(superdorvil) - currentBalance
      //assert.equal(twentyShares, newBalance)
      console.log('not tryna calculate the gas fees, lol, transfered ' + newBalance + 'to superdorvil')

      currentBalance = await balance.current(m2)
      await contract.withdraw(m2);
      shareData = await contract.getShareData()
      checkAllSharesWithdrawn(shareData, false, true, true, true, true, true, false, false, true, true)
      newBalance = await balance.current(m2) - currentBalance
      assert.equal(twentyShares, newBalance)

      currentBalance = await balance.current(m3)
      await contract.withdraw(m3);
      shareData = await contract.getShareData()
      checkAllSharesWithdrawn(shareData, false, true, true, true, true, true, true, true, true, true)
      newBalance = await balance.current(m3) - currentBalance
      assert.equal(twentyShares, newBalance)

      currentBalance = await balance.current(m4)
      await contract.withdraw(m4);
      shareData = await contract.getShareData()
      checkAllSharesWithdrawn(shareData, true, true, true, true, true, true, true, true, true, true)
      newBalance = await balance.current(m4) - currentBalance
      assert.equal(tenShares, newBalance)

      contractBalance = await balance.current(address)
      assert.equal(0, contractBalance)
    })

    /*
    await expectRevert(
    contract.getUnclaimedFunds(),
    'Can only withdraw 25 weeks withdrawal period is open'
    )
    */
  })
})
