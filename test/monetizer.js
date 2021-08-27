const Monetizer = artifacts.require("Monetizer")
const WitnetProxy = artifacts.require("WitnetProxy")
const WitnetRequestBoard = artifacts.require("WitnetRequestBoard")
const { expectRevert, time } = require("@openzeppelin/test-helpers")

const balance = async (address) => parseInt(await web3.eth.getBalance(address))

contract("Monetizer", (accounts) => {
  let monetizer, wrb, witnetFee
  let wrbOperatorInitialBalance, depositorInitialBalance, beneficiaryInitialBalance, monetizerInitialBalance,
    depositorLocalBalance, beneficiaryLocalBalance

  const gasPrice = web3.utils.toWei("1", "gwei")

  const videoId = "0KPJE-NiwWs"
  const wrbOperator = accounts[0]
  const depositor = accounts[1]
  const beneficiary = accounts[2]
  const anonymous = accounts[3]
  const lockTime = 300
  const reward = parseInt(web3.utils.toWei("1", "ether"))

  const lowTargetViewCount = 10000
  const highTargetViewCount = 1000000000

  describe("End-2-end", () => {
    before(async () => {
      monetizer = await Monetizer.deployed()
      wrb = await WitnetRequestBoard.at(WitnetProxy.address)
      wrbOperatorInitialBalance = await balance(wrbOperator)
      depositorInitialBalance = await balance(depositor)
      beneficiaryInitialBalance = await balance(beneficiary)
      monetizerInitialBalance = await balance(monetizer.address)
      witnetFee = parseInt(await wrb.estimateReward(gasPrice))
    })

    it("should allow deposits for a new video ID", async () => {
      await monetizer.deposit(videoId, beneficiary, lockTime, lowTargetViewCount, {
        from: depositor,
        value: reward,
        gasPrice
      })
    })

    it("should not allow deposits for an already known video ID", async () => {
      await expectRevert(
        monetizer.deposit(videoId, beneficiary, lockTime, lowTargetViewCount, {
          from: anonymous
        }),
        "Monetizer: there was already a deposit for this video"
      )
    })

    it("should take balance away from depositor", async () => {
      assert(await balance(wrbOperator) === wrbOperatorInitialBalance, "wrbOperator balance has not been reduced")
      assert(depositorInitialBalance - await balance(depositor) > reward, "depositor balance has not been reduced")
      assert(await balance(beneficiary) === beneficiaryInitialBalance, "beneficiary balance has changed")
      assert(await balance(monetizer.address) === reward, "monetizer hasn't escrowed the deposit")
    })

    it("shouldn't allow checking view count before timelock is over", async () => {
      await expectRevert(
        monetizer.checkViews(videoId, { from: anonymous }),
        "Monetizer: the beneficiary timelock has not expired ye"
      )
      await time.increase(lockTime)
    })

    it("shouldn't allow withdrawing before checking view count", async () => {
      await expectRevert(
        monetizer.withdraw(videoId, { from: anonymous }),
        "Monetizer: view count needs to be checked before withdrawing"
      )
    })

    it("shouldn't allow checking view count if underpaying", async () => {
      await expectRevert(
        monetizer.checkViews(videoId, { from: anonymous }),
        "WitnetRequestBoardTrustableBase: reward too low"
      )
    })

    it("shouldn't allow checking view count of unknown video ID", async () => {
      await expectRevert(
        monetizer.checkViews("unknown", { from: anonymous }),
        "Monetizer: the video doesn't exist"
      )
    })

    it("should allow checking view count after timelock is over", async () => {
      depositorLocalBalance = await balance(depositor)
      await monetizer.checkViews(videoId, {
        from: depositor,
        value: witnetFee,
        gasPrice
      })
    })

    it("should have taken the Witnet fee from caller of `checkViews`", async () => {
      assert(await balance(depositor) <= depositorLocalBalance - witnetFee, "depositor didn't pay for Witnet fee")
      assert(await balance(wrb.address) === witnetFee, "Witnet fee is not escrowed in Witnet Request Board")
    })

    it("shouldn't allow checking view count if already checking", async () => {
      await expectRevert(
        monetizer.checkViews(videoId, { from: anonymous }),
        "Monetizer: view count was already being checked"
      )
    })

    it("shouldn't allow withdrawing for unknown video ID", async () => {
      await expectRevert(
        monetizer.withdraw("unknown", { from: anonymous }),
        "Monetizer: the video doesn't exist"
      )
    })

    it("shouldn't allow withdrawing before Witnet query is solved", async () => {
      await expectRevert(
        monetizer.withdraw(videoId, { from: anonymous }),
        "Monetizer: view count is currently being checked"
      )
    })

    it("should allow withdrawing after Witnet query is solved", async () => {
      depositorLocalBalance = await balance(depositor)
      beneficiaryLocalBalance = await balance(beneficiary)

      await wrb.reportResult(1, "0x0000000000000000000000000000000000000000000000000000000000000001", "0x194E20")
      await monetizer.withdraw(videoId, { from: anonymous })
    })

    it("should have paid the reward to the beneficiary", async () => {
      assert(
        await balance(depositor) === depositorLocalBalance,
        "monetizer has incorrectly paid the reward to the depositor"
      )
      assert(
        await balance(beneficiary) === beneficiaryLocalBalance + reward,
        "monetizer hasn't paid the reward to the beneficiary"
      )
      assert(
        await balance(monetizer.address) === monetizerInitialBalance,
        "monetizer has kept some balance for itself after paying the reward"
      )
    })

    it("should allow depositing again for a paid out video", async () => {
      // This time we're using a "high target view count", so we should be refunding the reward to the depositor
      await monetizer.deposit(videoId, beneficiary, lockTime, highTargetViewCount, {
        from: depositor,
        value: reward,
        gasPrice
      })
    })

    it("should refund the reward to the depositor if target view count is not reached", async () => {
      await time.increase(lockTime)
      await monetizer.checkViews(videoId, {
        from: depositor,
        value: witnetFee,
        gasPrice
      })

      await wrb.reportResult(2, "0x0000000000000000000000000000000000000000000000000000000000000002", "0x194E20")

      depositorLocalBalance = await balance(depositor)
      beneficiaryLocalBalance = await balance(beneficiary)
      await monetizer.withdraw(videoId, { from: anonymous })

      assert(
        await balance(depositor) === depositorLocalBalance + reward,
        "monetizer hasn't refunded the reward to the depositor"
      )
      assert(
        await balance(beneficiary) === beneficiaryLocalBalance,
        "monetizer has incorrectly paid the reward to the beneficiary"
      )
      assert(
        await balance(monetizer.address) === monetizerInitialBalance,
        "monetizer has kept some balance for itself after refunding the reward"
      )
    })

  })
})