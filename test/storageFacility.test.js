const { expect } = require("chai");
const { ethers } = require("hardhat");
const { vaultFactoryFixture, getEventObject, EVENTS } = require("./utils");


describe("StorageFacility", () => {
    let dev, user, treasury, rando;
    let vault, vaultFactory;
    const vaultFee = ethers.utils.parseEther("0.05"); // 0.5 ETH

    beforeEach(async () => {
        [dev, user, treasury, rando] = await ethers.getSigners();
        vaultFactory = await vaultFactoryFixture();

        const receipt = await vaultFactory
            .connect(user)
            .deployVault({ value: vaultFee })
            .then((tx) => tx.wait());
        const event = getEventObject(
            EVENTS.vaultFactory.NEW_VAULT,
            receipt.events
        );

        // get the address of the new storage facility deployed by the vault factory
        const storageFacilityAddress = await vaultFactory.getStorageAddress();

        // get the vault we just deployed using the address from logs
        vault = await ethers.getContractAt("IVault", event.args.instance);
        storageFacility = await ethers.getContractAt("IStorageFacility", storageFacilityAddress);
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

})