const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("NFTix - EventCreator & Event", function () {
  const NUM_TICKETS = 2;
  const PRICE = ethers.utils.parseEther("0.05");
  const EVENT_NAME = "NFTix Concert";
  const EVENT_SYMBOL = "NFTIX";

  const Stages = {
    Prep: 0,
    Active: 1,
    CheckinOpen: 2,
    Closed: 3,
  };

  async function deployFactoryAndEventFixture() {
    const [owner, buyer1, buyer2, staffMember, outsider] = await ethers.getSigners();

    const EventCreator = await ethers.getContractFactory("EventCreator");
    const eventCreator = await EventCreator.deploy();
    await eventCreator.deployed();

    const Event = await ethers.getContractFactory("Event");
    const event = await Event.deploy(
      owner.address,
      NUM_TICKETS,
      PRICE,
      EVENT_NAME,
      EVENT_SYMBOL
    );
    await event.deployed();

    return { EventCreator, Event, eventCreator, event, owner, buyer1, buyer2, staffMember, outsider };
  }

  describe("EventCreator Factory", function () {
    it("Should create a new Event contract, emit CreateEvent, and list it in getEvents()", async function () {
      const { Event, eventCreator, owner } = await loadFixture(deployFactoryAndEventFixture);

      const tx = await eventCreator
        .connect(owner)
        .createEvent(NUM_TICKETS, PRICE, EVENT_NAME, EVENT_SYMBOL);
      const receipt = await tx.wait();

      const createEventLog = receipt.events.find((e) => e.event === "CreateEvent");
      expect(createEventLog).to.not.be.undefined;
      expect(createEventLog.args.creator).to.equal(owner.address);

      const createdAddress = createEventLog.args.eventAddress;
      const eventsList = await eventCreator.getEvents();
      expect(eventsList).to.deep.equal([createdAddress]);

      const childEvent = Event.attach(createdAddress);
      expect(await childEvent.owner()).to.equal(owner.address);
      expect(await childEvent.name()).to.equal(EVENT_NAME);
      expect(await childEvent.symbol()).to.equal(EVENT_SYMBOL);
      expect(await childEvent.numTickets()).to.equal(NUM_TICKETS);
      expect(await childEvent.price()).to.equal(PRICE);
      expect(await childEvent.stage()).to.equal(Stages.Prep);
    });
  });

  describe("Event Deployment & Constructor", function () {
    it("Should initialize state variables properly", async function () {
      const { event, owner } = await loadFixture(deployFactoryAndEventFixture);

      expect(await event.owner()).to.equal(owner.address);
      expect(await event.name()).to.equal(EVENT_NAME);
      expect(await event.symbol()).to.equal(EVENT_SYMBOL);
      expect(await event.numTickets()).to.equal(NUM_TICKETS);
      expect(await event.numTicketsLeft()).to.equal(NUM_TICKETS);
      expect(await event.totalMinted()).to.equal(0);
      expect(await event.price()).to.equal(PRICE);
      expect(await event.stage()).to.equal(Stages.Prep);
    });

    it("Should revert on invalid constructor arguments", async function () {
      const { Event, owner } = await loadFixture(deployFactoryAndEventFixture);

      await expect(
        Event.deploy(ethers.constants.AddressZero, NUM_TICKETS, PRICE, EVENT_NAME, EVENT_SYMBOL)
      ).to.be.revertedWith("Invalid owner");

      await expect(
        Event.deploy(owner.address, 0, PRICE, EVENT_NAME, EVENT_SYMBOL)
      ).to.be.revertedWith("Number of tickets must be > 0");
    });
  });

  describe("Stage Management (setStage)", function () {
    it("Should allow owner to update stages and emit StageChanged", async function () {
      const { event, owner } = await loadFixture(deployFactoryAndEventFixture);

      await expect(event.connect(owner).setStage(Stages.Active))
        .to.emit(event, "StageChanged")
        .withArgs(Stages.Active);
      expect(await event.stage()).to.equal(Stages.Active);

      await expect(event.connect(owner).setStage(Stages.CheckinOpen))
        .to.emit(event, "StageChanged")
        .withArgs(Stages.CheckinOpen);
      expect(await event.stage()).to.equal(Stages.CheckinOpen);
    });

    it("Should revert when non-owner tries to change stage", async function () {
      const { event, buyer1 } = await loadFixture(deployFactoryAndEventFixture);

      await expect(event.connect(buyer1).setStage(Stages.Active)).to.be.revertedWith("Only owner");
    });
  });

  describe("Purchasing & Minting NFTs (buyTicket)", function () {
    it("Should revert if event stage is not Active", async function () {
      const { event, buyer1 } = await loadFixture(deployFactoryAndEventFixture);

      await expect(
        event.connect(buyer1).buyTicket({ value: PRICE })
      ).to.be.revertedWith("Invalid event stage");
    });

    it("Should revert if sent ETH does not match ticket price", async function () {
      const { event, owner, buyer1 } = await loadFixture(deployFactoryAndEventFixture);
      await event.connect(owner).setStage(Stages.Active);

      await expect(
        event.connect(buyer1).buyTicket({ value: PRICE.sub(1) })
      ).to.be.revertedWith("Incorrect payment amount");

      await expect(
        event.connect(buyer1).buyTicket({ value: PRICE.add(1) })
      ).to.be.revertedWith("Incorrect payment amount");
    });

    it("Should mint sequential NFTs, update counts, emit CreateTicket, and revert when sold out", async function () {
      const { event, owner, buyer1, buyer2, outsider } = await loadFixture(
        deployFactoryAndEventFixture
      );
      await event.connect(owner).setStage(Stages.Active);

      await expect(event.connect(buyer1).buyTicket({ value: PRICE }))
        .to.emit(event, "CreateTicket")
        .withArgs(event.address, buyer1.address, 0);

      expect(await event.totalMinted()).to.equal(1);
      expect(await event.numTicketsLeft()).to.equal(1);
      expect(await event.ownerOf(0)).to.equal(buyer1.address);
      expect(await event.isUsed(0)).to.equal(false);

      await expect(event.connect(buyer2).buyTicket({ value: PRICE }))
        .to.emit(event, "CreateTicket")
        .withArgs(event.address, buyer2.address, 1);

      expect(await event.totalMinted()).to.equal(2);
      expect(await event.numTicketsLeft()).to.equal(0);
      expect(await event.ownerOf(1)).to.equal(buyer2.address);
      expect(await event.isUsed(1)).to.equal(false);

      await expect(
        event.connect(outsider).buyTicket({ value: PRICE })
      ).to.be.revertedWith("Sold out");
    });
  });

  describe("Staff Authorization & Gate Check-in (setStaff & useTicket)", function () {
    it("Should allow owner to authorize/revoke staff and reject invalid calls", async function () {
      const { event, owner, staffMember, outsider } = await loadFixture(
        deployFactoryAndEventFixture
      );

      await expect(
        event.connect(outsider).setStaff(staffMember.address, true)
      ).to.be.revertedWith("Only owner");

      await expect(
        event.connect(owner).setStaff(ethers.constants.AddressZero, true)
      ).to.be.revertedWith("Invalid staff address");

      await expect(event.connect(owner).setStaff(staffMember.address, true))
        .to.emit(event, "StaffUpdated")
        .withArgs(staffMember.address, true);
      expect(await event.staff(staffMember.address)).to.equal(true);

      await expect(event.connect(owner).setStaff(staffMember.address, false))
        .to.emit(event, "StaffUpdated")
        .withArgs(staffMember.address, false);
      expect(await event.staff(staffMember.address)).to.equal(false);
    });

    it("Should enforce stage, authorization, existence, and single-use check-in without burning NFT", async function () {
      const { event, owner, buyer1, staffMember, outsider } = await loadFixture(
        deployFactoryAndEventFixture
      );

      await event.connect(owner).setStage(Stages.Active);
      await event.connect(buyer1).buyTicket({ value: PRICE });
      await event.connect(owner).setStaff(staffMember.address, true);

      // Cannot useTicket before CheckinOpen
      await expect(event.connect(staffMember).useTicket(0)).to.be.revertedWith(
        "Invalid event stage"
      );

      await event.connect(owner).setStage(Stages.CheckinOpen);

      // Unauthorized wallets (including ticket holder and outsider) cannot call useTicket
      await expect(event.connect(buyer1).useTicket(0)).to.be.revertedWith("Not authorized");
      await expect(event.connect(outsider).useTicket(0)).to.be.revertedWith("Not authorized");

      // Non-existent tokenId reverts
      await expect(event.connect(staffMember).useTicket(99)).to.be.revertedWith(
        "Ticket does not exist"
      );

      // Staff checks in tokenId 0 -> isUsed becomes true, NFT stays in buyer1 wallet (NOT burned)
      await expect(event.connect(staffMember).useTicket(0))
        .to.emit(event, "TicketUsed")
        .withArgs(event.address, 0, buyer1.address, anyValue);

      expect(await event.isUsed(0)).to.equal(true);
      expect(await event.ownerOf(0)).to.equal(buyer1.address);

      // Reusing the same ticket reverts (even by owner)
      await expect(event.connect(owner).useTicket(0)).to.be.revertedWith(
        "Ticket already used"
      );
    });
  });

  describe("Organizer Revenue Checkout (withdrawRevenue)", function () {
    it("Should revert for non-owner or when contract balance is 0", async function () {
      const { event, owner, buyer1 } = await loadFixture(deployFactoryAndEventFixture);

      await expect(event.connect(buyer1).withdrawRevenue()).to.be.revertedWith("Only owner");
      await expect(event.connect(owner).withdrawRevenue()).to.be.revertedWith(
        "No revenue to withdraw"
      );
    });

    it("Should transfer entire contract revenue to owner and emit OwnerWithdrawMoney", async function () {
      const { event, owner, buyer1, buyer2 } = await loadFixture(deployFactoryAndEventFixture);

      await event.connect(owner).setStage(Stages.Active);
      await event.connect(buyer1).buyTicket({ value: PRICE });
      await event.connect(buyer2).buyTicket({ value: PRICE });

      const expectedRevenue = PRICE.mul(2);

      await expect(() => event.connect(owner).withdrawRevenue()).to.changeEtherBalances(
        [event, owner],
        [expectedRevenue.mul(-1), expectedRevenue]
      );

      expect(await ethers.provider.getBalance(event.address)).to.equal(0);

      // Buy another event scenario or verify event emission directly
      const { event: event2, owner: owner2, buyer1: b1 } = await loadFixture(
        deployFactoryAndEventFixture
      );
      await event2.connect(owner2).setStage(Stages.Active);
      await event2.connect(b1).buyTicket({ value: PRICE });

      await expect(event2.connect(owner2).withdrawRevenue())
        .to.emit(event2, "OwnerWithdrawMoney")
        .withArgs(owner2.address, PRICE);
    });
  });
});
