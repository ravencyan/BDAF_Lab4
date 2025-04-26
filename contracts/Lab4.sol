//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6; //USDC uses 6 decimals
    }
}

contract Vault is ERC20, Ownable {
    IERC20 public underlyingToken; //Token that the vault receives
    uint256 public sharePrice = 1e18; //Scale sharePrice to handle precision
    uint256 public totalShares = 0;

    // event Received(address indexed sender, uint256 amount);
    event Deposited(address indexed sender, uint256 amount);
    event Withdrawn(address indexed sender, uint256 amount);
    event FeeTaken(uint256 amount);
    event Donated(uint256 amount);

    constructor(address _underlyingToken) Ownable(msg.sender) ERC20("VaultShare", "VS") {
        require(_underlyingToken != address(0), "Invalid token address");
        underlyingToken = IERC20(_underlyingToken);
    }

    // receive() external payable {
    //     emit Received(msg.sender, msg.value);
    // }

    //_amountUnderlying should be in smallest unit
    function deposit(uint256 _amountUnderlying) external {
        require(_amountUnderlying > 0, "Nothing to deposit");

        uint256 totalUnderlyingBefore = underlyingToken.balanceOf(address(this));

        underlyingToken.transferFrom(msg.sender, address(this), _amountUnderlying);

        uint256 totalSupplyBefore = totalSupply();

        //uint256 sharesToMint = _amountUnderlying * 1e18 / sharePrice;
        uint256 sharesToMint;
        if (totalSupplyBefore == 0) {
            sharesToMint = _amountUnderlying; 
        } else {
            sharesToMint = totalSupplyBefore * (_amountUnderlying / totalUnderlyingBefore);
        }

        _mint(msg.sender, sharesToMint);
        totalShares += sharesToMint;

        //Added this line for malicious attack
        sharePrice = (underlyingToken.balanceOf(address(this)) * 1e18) / totalShares;

        emit Deposited(msg.sender, _amountUnderlying);
    }

    //_amountShares should be in smallest unit
    function withdraw(uint256 _amountShares) external {
        require(_amountShares > 0, "Nothing to withdraw");
        require(balanceOf(msg.sender) >= _amountShares, "Not enough shares to withdraw");

        uint256 amountUnderlying = _amountShares * sharePrice / 1e18;
        underlyingToken.transfer(msg.sender, amountUnderlying);

        _burn(msg.sender, _amountShares);
        totalShares -= _amountShares;

        if (totalShares == 0) {
            sharePrice = 1e18;
        } else {
            sharePrice = (underlyingToken.balanceOf(address(this)) * 1e18) / totalShares;
        }
        
        emit Withdrawn(msg.sender, _amountShares);
    }

    function donate(uint256 _amountUnderlying) external {
        require(_amountUnderlying > 0, "Nothing to donate");

        underlyingToken.transferFrom(msg.sender, address(this), _amountUnderlying);

        sharePrice = (underlyingToken.balanceOf(address(this)) * 1e18) / totalShares;

        emit Donated(_amountUnderlying);
    }

    function takeFeeAsOwner(uint256 _amountUnderlying) external onlyOwner {
        require(underlyingToken.balanceOf(address(this)) >= _amountUnderlying, "Insufficient underlying tokens in the vault");
        underlyingToken.transfer(msg.sender, _amountUnderlying);

        if (totalShares == 0) {
            sharePrice = 1e18;
        } else {
            sharePrice = (underlyingToken.balanceOf(address(this)) * 1e18) / totalShares;
        }

        emit FeeTaken(_amountUnderlying);
    }

    function getSharePrice() external view returns (uint256) {
        return sharePrice;
    }

    function getTotalShares() external view returns (uint256) {
        return totalShares;
    }

    function getTotalUnderlyingTokens() external view returns (uint256) {
        return underlyingToken.balanceOf(address(this));
    }

    function getUserShares(address user) external view returns (uint256) {
        return balanceOf(user);
    }

}