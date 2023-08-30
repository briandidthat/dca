const { expect } = require("chai");
const { ethers } = require("hardhat");
const { vaultFactoryFixture, storageFacilityFixture, getEventObject, EVENTS } = require("./utils");


describe("StorageFacility", () => {
    let dev, user, rando;
    let vault, vaultFactory, storageFacility;
    const vaultFee = ethers.utils.parseEther("0.05"); // 0.5 ETH

    beforeEach(async () => {
        [dev, user, rando] = await ethers.getSigners();
        storageFacility = await storageFacilityFixture();
        vaultFactory = await vaultFactoryFixture(storageFacility.address);
        await storageFacility.connect(dev).setFactoryAddress(vaultFactory.address);

        const receipt = await vaultFactory
            .connect(user)
            .deployVault({ value: vaultFee })
            .then((tx) => tx.wait());
        const event = getEventObject(
            EVENTS.vaultFactory.NEW_VAULT,
            receipt.events
        );

        // get the vault we just deployed using the address from logs
        vault = await ethers.getContractAt("IVault", event.args.instance);
    });

    // ========================= GET VAULT OWNER =============================

    it("getVaultOwner: Should return the vault owners details", async () => {
        const details = await storageFacility.getVaultOwner(user.address);

        expect(details.owner).to.be.equal(user.address);
        expect(details.count).to.be.equal(1);
    });

    it("getVaultOwner: Revert - Should revert due to no existing vault for owner", async () => {
        await expect(storageFacility.getVaultOwner(dev.address)).to.be.revertedWith(
            "No vaults present for that address"
        );
    });

    // ========================= GET VAULTS =============================

    it("getVaults: Should return the correct vault by user", async () => {
        const details = await storageFacility.getVaults(user.address);
        expect(details.length).to.equal(1);
        expect(details[0].owner).to.be.equal(user.address);
        expect(details[0].instance).to.equal(vault.address);
    });

    it("getVaults: Revert - Should revert due to no existing vault for owner", async () => {
        await expect(storageFacility.getVaults(dev.address)).to.be.revertedWith(
            "No vaults present for that address"
        );
    });

    // ========================= STORE VAULT =============================

    it("storeVault: Revert - Should revert due to being called by somebody other than factory", async () => {
        await expect(storageFacility.connect(dev).storeVault(rando.address, dev.address)).to.be.revertedWith(
            "This function can only be called by the factory contract"
        );
    })

    // ========================= SET FACTORY ADDRESS =============================

    it("setFactoryAddress: Should set new vault factory address", async () => {
        storageFacility = await storageFacilityFixture();
        vaultFactory = await vaultFactoryFixture(storageFacility.address);
        const receipt = await storageFacility.connect(dev).setFactoryAddress(vaultFactory.address).then((tx) => tx.wait());

        const event = getEventObject(EVENTS.storageFacility.NEW_FACTORY, receipt.events);
        const factoryAddress = await storageFacility.getFactoryAddress();

        expect(event.args.oldFactory).to.be.equal(ethers.constants.AddressZero);
        expect(event.args.newFactory).to.be.equal(vaultFactory.address);
        expect(factoryAddress).to.be.equal(vaultFactory.address);
    })

    it("setFactoryAddress: Revert - Should revert due to not being called by the owner", async () => {
        await expect(storageFacility.connect(user).setFactoryAddress(rando.address)).to.be.revertedWith(
            "caller is not the owner"
        );
    });

})