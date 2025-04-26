# Lab4 - Vault Smart Contract

This project demonstrates a simple vault contract, which uses MockUSDC as underlying token for testing convenience. 

## How to Run

Run the following commands in your terminal:

```bash
npx hardhat clean
npx hardhat compile
npx hardhat run scripts/test.js
```

## Test Cases

### Part 1: Basic Functionality
- Test basic functionality of the vault:
    -  `deposit()`
    - `withdraw()`
    - `donate()` 
- Test the consistency of vault states and user states:
    - `sharePrice`
    - `totalShares`
    - `totalUnderlyingTokens`
    - `userShares`
    - `userUnderlyingTokens`

### Part 2-1: Inflation Attack
Showcase the inflation attack (Rounding shares to zero)
1. Malice deposits **1 USDC**
2. Malice donate(inflate) **20,000 USDC**
3. Bob deposits **20,000 USDC** (and get no share)
4. Malice burns his 1 share and gets **40,001 USDC**

### Part2-2: Security risk of `takeFreeAsOwner()` 
*Note: This test idea is included but may still need adjustments.*
1. Malice deposits **500 USDC** and gets **500 shares**
2. Vault owner take away **250 USDC** from the vault (**250 USDC** left in the vault, sharePrice becomes **0.5 USDC**)
3. Malice deposits **500 USDC** and gets **1000 shares** (now Malice owns **1500 shares**)

## Security Risk of takeFeeAsOwner()

If the owner takes the fee away, since the number of shares remains the same, the share price drops accordingly. Then, the attacker can deposit more tokens into the vault before the owner returns the fee. After the owner returns the fee, the attackers' shares become more valuable (since share price increases).

