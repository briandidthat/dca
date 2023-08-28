const { expect } = require("chai");
const { ethers } = require("hardhat");
const { chamberFactoryFixture, getEventObject, EVENTS } = require("./utils");


describe("StorageFacility", () => {
    let dev, user, treasury, rando;
    let chamber, chamberFactory;
    const chamberFee = ethers.utils.parseEther("0.05"); // 0.5 ETH

    beforeEach(async () => {
        [dev, user, treasury, rando] = await ethers.getSigners();
        chamberFactory = await chamberFactoryFixture();

        const receipt = await chamberFactory
            .connect(user)
            .deployChamber({ value: chamberFee })
            .then((tx) => tx.wait());
        const event = getEventObject(
            EVENTS.chamberFactory.NEW_CHAMBER,
            receipt.events
        );

        // get the address of the new storage facility deployed by the chamber factory
        const storageFacilityAddress = await chamberFactory.getStorageAddress();

        // get the chamber we just deployed using the address from logs
        chamber = await ethers.getContractAt("IChamber", event.args.instance);
        storageFacility = await ethers.getContractAt("IStorageFacility", storageFacilityAddress);
    });

    // ========================= GET CHAMBER OWNER =============================
    it("getChamberOwner: Should return the chamber owners details", async () => {
        const details = await storageFacility.getChamberOwner(user.address);
        console.log(details);

        expect(details.owner).to.be.equal(user.address);
        expect(details.count).to.be.equal(1);
    });


    // ========================= GET CHAMBERS =============================

    it("getChambers: Should return the correct chamber by user", async () => {
        const details = await storageFacility.getChambers(user.address);
        expect(details.length).to.equal(1);
        expect(details[0].owner).to.be.equal(user.address);
        expect(details[0].instance).to.equal(chamber.address);
    });

    it("getChambers: Revert - Should revert due to no existing chamber for owner", async () => {
        await expect(storageFacility.getChambers(dev.address)).to.be.revertedWith(
            "No chambers present for that address"
        );
    });
})