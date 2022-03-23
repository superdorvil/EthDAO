// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

// An NFT smart contract where each token is a share
// 90 percent of initial sales stored in smart contract
// Secondary fees stored in smart contract
// Funds will be split amongst the token/share holders
// The withdrawal of the money opens after 3 years and the contract owner cannot rug the project
// However, the owner has the ability to open a vote to allow token owners to decide to remove money early
// Floor price is maintained by price per share stored in smart contract, 90% of initial fees
// Hodlers encouraged to hodl because they have 90 percent of value retained and secondary fees can push the value up
// Sellers are encouraged to sell becuase they may be able to negotiate a value above 90 percent initial share price
// When they sell if becomes game like to see how high the share price will go
// The price is backed by the price per share
// In the event there is a liquidity crisis the tokens are backed by price per share stored in contract
// Unclaimed money after a withdrawal period goes to the contract owner

// FIXME: maybe want to seperate contract into an NFT contract and a DAO contract

// Update the IPFS URI
// Upate the total Supply
// Update the ETH price

contract EthDAO is Ownable, ERC721 {
    using Strings for uint256;
    string private currentBaseURI;

    //address private superdorvil = ;

    uint256 private cost = 0.0125 ether;
    uint256 private maxSupply = 100;
    uint256 private maxMintAmount = 20;
    uint256 private threeYearHodlTimeLimit;
    uint256 private unclaimedFundsTimeLimit;
    uint256 private voteTimeLimit = 0;
    uint256 private votesToHodl = 0;
    uint256 private totalSharesWithdrawn = 0;
    uint256 private totalSupply = 0;

    bool private pausedState = false;

    struct shareData {
        bool hodl;
        bool isShareWithdrawn;
    }

    mapping(address => uint256[]) ownerTokenIDs;
    // slang for should we hodl(not sell and have diamond hands) or Naw(dont hodl the data)
    mapping(uint256 => shareData) hodlOrSell;

    constructor() ERC721("EthDAO", "ETHDAO") {
        setBaseURI("ipfs://give me a uri/");
        threeYearHodlTimeLimit = 156 weeks + block.timestamp; // 3 years
        unclaimedFundsTimeLimit = threeYearHodlTimeLimit + 25 weeks;

        // take a couple of tokens for myself and avoid the pay wall
        for (uint256 i = 0; i < 10; i++) {
            mint();
        }
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        string memory curBaseURI = _baseURI();

        return bytes(curBaseURI).length > 0
            ? string(abi.encodePacked(curBaseURI, tokenId.toString(), '.json'))
            : "";
    }

    function setBaseURI(string memory baseURI) public onlyOwner {
        currentBaseURI = baseURI;
    }

    function isVoteOpen() public view returns (bool) {
        return (block.timestamp < voteTimeLimit);
    }

    // votes to hodl is less than 50 percent or we are outside of a 3 year time limit withdrawal is open
    function isWithdrawalOpen() public view returns (bool) {
        return (votesToHodl < (totalSupply / 2)) || (block.timestamp > threeYearHodlTimeLimit);
    }

    function claim(uint256 mintAmount) external payable {
        require(!isWithdrawalOpen(), 'minting is closed during withdrawal period');
        require(pausedState == true, 'contract paused for minting yet');
        require(mintAmount > 0, 'must mint at least 1 share 0');
        require(mintAmount <= maxMintAmount, 'mint amount cannot be greater than 20');
        require(totalSupply + mintAmount <= maxSupply, 'minting will go over total supply of 100 ethdaos');
        //if (msg.sender != owner()) [this gives me the power to dilute shares which is BS]
        require(msg.value >= (cost * mintAmount), 'Not enough ethereum for the transaction');

        for (uint256 i = 1; i <= mintAmount; i++) { // mint mintAmount of tokens
          mint();
        }

        // retrieve 20 percent of the recieve purchase, the rest stays in the contract
        //(bool success, ) = payable(superdorvil).call{value: msg.value * 20 / 100}("");
        (bool success, ) = payable(owner()).call{value: msg.value * 20 / 100}("");
        require(success);
    }

    function mint() internal {
        _safeMint(msg.sender, totalSupply); // mint
        ownerTokenIDs[msg.sender].push(totalSupply); // map minted token id to this owner
        // initialize shareData false, can I assume it to be false
        hodlOrSell[totalSupply].hodl = true;
        hodlOrSell[totalSupply].isShareWithdrawn = false;
        votesToHodl++;
        totalSupply++;
    }

    // Withdraw shares, each share on each individual token can only be claimed once
    function withdraw(address owner) external payable {
        require(isWithdrawalOpen(), 'Withdrawal not yet open');
        require(!isVoteOpen(), 'Cannot withdraw during voting period');

        // divide balance by total supply - the amount withdrawn to get the amount per share
        uint256 withdrawalAmountPerShare = address(this).balance / (totalSupply - totalSharesWithdrawn);
        uint256 ownersUnclaimedShares = 0;
        bool isShareWithdrawn;

        for (uint256 i; i < ownerTokenIDs[owner].length; i++) { // for each of owners tokens
            isShareWithdrawn = hodlOrSell[ownerTokenIDs[owner][i]].isShareWithdrawn;

            if (!isShareWithdrawn) {
                hodlOrSell[ownerTokenIDs[owner][i]].isShareWithdrawn = true;
                totalSharesWithdrawn++;
                ownersUnclaimedShares++;
            }
        }

        (bool success, ) = payable(address(owner)).call{value: withdrawalAmountPerShare * ownersUnclaimedShares}("");
        require(success);
    }

    // this is for a situation where people don't withdraw their funds 25 weeks after withdrawal period opens.
    // also for any royalties after funds have been withdrawn
    function getUnclaimedFunds() external payable onlyOwner {
        require(block.timestamp > unclaimedFundsTimeLimit, 'Can only withdraw 25 weeks withdrawal period is open');

        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success);
    }

    // returns an list of all if the hodl data, was the share hodls and if it was already withdrawn (voting / hodl data)
    function getShareData() external view returns (shareData[] memory) {
      shareData[] memory allShareData = new shareData[](totalSupply);

      for (uint256 i; i < totalSupply; i++) { // for each token add its share data
          allShareData[i].hodl = hodlOrSell[i].hodl;
          allShareData[i].isShareWithdrawn = hodlOrSell[i].isShareWithdrawn;
      }

      return allShareData;
    }

    function getPrivateData() external view returns (uint256, uint256, bool) {
      return (threeYearHodlTimeLimit, voteTimeLimit, pausedState);
    }

    // Allow anyone update their vote to hodl or naw
    function voteToHodlOrSell(address owner, bool hodl) external {
        require(isVoteOpen(), 'Vote not yet open');

        // loop through all shares and update their hodl data
        for (uint256 i; i < ownerTokenIDs[owner].length; i++) { // for each of owners tokens
            // if update owners ith(i index) shareData hodl value if different than requested hodl value
            if (hodlOrSell[ownerTokenIDs[owner][i]].hodl != hodl) {
                hodlOrSell[ownerTokenIDs[owner][i]].hodl = hodl; // set hodl
                if (hodl) {
                    votesToHodl++; // if hodling now increment hodl count
                } else {
                    votesToHodl--; // if not hodling now decrent hodl count
                }
            }
        }

        // Update the time I get the getUnclaimedFunds time period to the last vote time casted
        if (isWithdrawalOpen()) { // withdrawal open means we are at concensus to sell
            unclaimedFundsTimeLimit = block.timestamp + 25 weeks;
        } else {
            unclaimedFundsTimeLimit = threeYearHodlTimeLimit + 25 weeks;
        }
    }

    // Allow group to vote on selling assets early
    // centralized portion of the dao
    // I can probably decentralize this as well with the time functionality
    function openVoteToSellSharesEarly() external onlyOwner {
        require(!isVoteOpen(), 'Voting period is already open');
        require(!isWithdrawalOpen(), 'if withdrawal is open voting is closed for good');

        voteTimeLimit = 1 weeks + block.timestamp;
    }

    // might delete thius function, useful for testing the contract.
    function closeVoteToSellSharesEarly() external onlyOwner {
        voteTimeLimit = block.timestamp;
    }

    // pauses and unpauses contract
    function pauseContract() external onlyOwner {
        pausedState = !pausedState;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return currentBaseURI;
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId); // do I need this?

        for (uint256 i; i < ownerTokenIDs[from].length; i++) { // for each of owners tokens
            // check if current token matches owners ith(token) pop ith token from onwer
            if (ownerTokenIDs[from][i] == tokenId) {
                // swap to ith token with last token, we want to keep the last one and pop the ith one
                ownerTokenIDs[from][i] = ownerTokenIDs[from][ownerTokenIDs[from].length - 1];
                ownerTokenIDs[from].pop(); // pop last token because which is being transfered
            }
        }

        // transfer token id to next owner
        ownerTokenIDs[to].push(tokenId);
    }
}
