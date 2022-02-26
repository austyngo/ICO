  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.10;

  import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
  import "@openzeppelin/contracts/access/Ownable.sol";
  import "./ICryptoDevs.sol";

  contract CryptoDevToken is ERC20, Ownable {
    // price of one token
    uint256 public constant tokenPrice = 0.001 ether;
    // each NFT would give wallet 10 tokens
    // needs to be represented by 10* (10**18) as ERC20 tokens are represented by wei - 1 token == 10**18 tokens
    uint256 public constant tokensPerNFT = 10 * 10 **18;
    // max total supply
    uint256 public constant maxTotalSupply = 10000 * 10**18;
    // CryptoDevsNFT contract instance
    ICryptoDevs CryptoDevsNFT;
    // mapping to keep track of tokens claimed by NFT holders
    mapping(uint256 => bool) public tokenIdsClaimed;

    constructor(address _cryptoDevsContract) ERC20("Crypto Dev Token", "CD") {
        CryptoDevsNFT = ICryptoDevs(_cryptoDevsContract);
    }

    /**
    @dev Mints 'amount' number of CryptoDevTokens
    Requirements: 'msg.value' should be equal or greater than tokenPrice * amount 
    */
    function mint(uint256 amount) public payable {
        uint256 _requiredAmount = tokenPrice * amount;
        require(msg.value >= _requiredAmount, "Not enough Ether sent");
        // total tokens + amount <= maxTotalSupply
        uint256 amountWithDecimals = amount * 10**18;
        // totalSupply() function from ERC20 returns total amount of tokens in existence
        require(totalSupply() + amountWithDecimals <= maxTotalSupply, "Exceeds the max total supply available");
        // call internal function from ERC20 contract
        _mint(msg.sender, amountWithDecimals);
    }

    /**
    @dev Mints tokens based on the number of NFTs held by the sender
    Requirements:
    - balance of CryptoDevs NFTs held by wallet greater than 0
    - tokens should have not been claimed for all the NFTs owned by the sender 
    */
    function claim() public {
        address sender = msg.sender;
        // get number of NFTs held by sender
        uint256 balance = CryptoDevsNFT.balanceOf(sender);
        // if balance is 0 revert the transaction
        require(balance > 0, "You don't own any Crypto Devs NFTs");
        // amount keeps track of unclaimed tokenIds
        uint256 amount = 0;
        // loop over balance and get token ID owned by 'sender' at a given "index" of its token list
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = CryptoDevsNFT.tokenOfOwnerByIndex(sender, i);
            // if tokenId has not been claimed, incrase the amount
            // ensures tokens can only been claimed once per NFT
            if (!tokenIdsClaimed[tokenId]) {
                amount += 1;
                tokenIdsClaimed[tokenId] = true;
            }
        }
        // If all the token Ids have been claimed, revert the transaction
        require(amount > 0, "You already claimed all the tokens");
        // call internal _mint function from ERC20
        _mint(msg.sender, amount * tokensPerNFT);
    }

    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}

  }