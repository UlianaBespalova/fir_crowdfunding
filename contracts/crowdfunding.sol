pragma solidity ^0.4.24;

import "../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol";
import "./token.sol";


contract Crowdfunding {

    using SafeMath for uint256;

    enum CampaignStatus { 
        Continues,
        Succeeded,
        Failed,
        Stopped
    }

    struct TimeLimits {
        uint startTime;
        uint endTime;
    }

    struct Token {
        address tokenAddress;
        address owner;
        uint price;
        uint rebateRate;
        uint quantity;
        uint soldQuantity;
    }

    struct Campaign {
        string description;
        address manager;
        uint amount;
        bool claimed;

        CampaignStatus status;

        Token token;
        TimeLimits timeLimits;

        mapping (address => uint) participants;
    }

    uint public numCampaigns;
    Campaign[] public campaigns;


    modifier moreThanZero(uint value) {
        require(value > 0, "Value should be more than zero");
        _;
    }

    modifier checkCampaignID(uint campaignID) {
        require(campaignID >= 0 && campaignID < numCampaigns, "Incorrect campaignID");
        _;
    }

    modifier managerOnly(uint campaignID, address user) {
        Campaign storage c = campaigns[campaignID];
        require(c.manager == user, "Оnly for the campaign manager");
        _;
    }

    event CampaignAdded(uint indexed campaignID, 
                         uint indexed amount, 
                         address indexed manager, 
                         address from);

    event SaleParamsSetted(uint indexed campaignID, 
                           address indexed token, 
                           uint indexed price, 
                           uint quantity,
                           uint rebateRate,  
                           uint end); 

    event StartedSelling (uint indexed campaignID, uint indexed startTime);   

    event StoppedSelling (uint indexed campaignID, uint indexed stopTime);  

    event CrowdSell (uint indexed campaignID, 
                     address indexed from,
                     uint indexed amount,
                     address inviter,
                     uint rebate);       

    event Claimed (uint indexed campaignID, address indexed receiver, uint indexed amount);  

    event ReturnedDonation (uint indexed campaignID, 
                            address indexed participant, 
                            uint indexed amount);                                           


    function newCampaign(string _description, uint _amount, address _manager)
    public moreThanZero(_amount) returns (uint) {
        
        uint campaignID = campaigns.length++;
        Campaign storage c = campaigns[campaignID];
        numCampaigns++;

        if (_manager != address(0x00)) c.manager = _manager;
        else c.manager = msg.sender;

        c.description = _description;
        c.amount = _amount;
        c.status = CampaignStatus.Stopped;

        emit CampaignAdded(campaignID, _amount, c.manager, msg.sender);
        return campaignID;
    }

    function setSaleParams(uint campaignID,
                           address token, 
                           address tokenOwner, 
                           uint[3] memory price_quantity_rebate, 
                           uint endTime) 
    public checkCampaignID(campaignID) managerOnly(campaignID, msg.sender) {  

        require(token != address(0x00), "Incorrect token address");   
        require(tokenOwner != address(0x00), "Owner is incorrect");

        Campaign storage c = campaigns[campaignID];
        require(c.token.tokenAddress == address(0x00), "Token parameters are already set");
        require(price_quantity_rebate.length == 3, "Wrong price_quantity_rebate params");
        require(price_quantity_rebate[0] > 0, "Wrong price of the token");
        require(price_quantity_rebate[1] > 0, "Number of tokens should be more than zero");

        require(FirToken(token).allowance(tokenOwner, address(this)) >= price_quantity_rebate[1], 
            "Make sure allowance is enough");
        require(endTime > now, "Incorrent end time");

        c.token = Token(token, tokenOwner, price_quantity_rebate[0], price_quantity_rebate[2],
                        price_quantity_rebate[1], 0);  
        c.timeLimits.endTime = endTime;

        emit SaleParamsSetted(campaignID, token, price_quantity_rebate[0], price_quantity_rebate[1],
                              price_quantity_rebate[2], endTime); 
    }

    function startSelling (uint campaignID) 
    public checkCampaignID(campaignID) managerOnly(campaignID, msg.sender) {

        require(getCampaignStatus(campaignID) == CampaignStatus.Stopped, "Сan't start selling");
        Campaign storage c = campaigns[campaignID];
        require(c.token.tokenAddress != address(0x00), "Set sale parameters first");

        uint startTime = now;
        if (c.timeLimits.startTime == 0) c.timeLimits.startTime = startTime;
        
        c.status = CampaignStatus.Continues;
        emit StartedSelling(campaignID, startTime);
    }

    function stopSelling (uint campaignID) 
    public checkCampaignID(campaignID) managerOnly(campaignID, msg.sender) {

        require(getCampaignStatus(campaignID) == CampaignStatus.Continues, "Сan't stop selling");

        Campaign storage c = campaigns[campaignID];
        c.status = CampaignStatus.Stopped;
        
        emit StoppedSelling(campaignID, now);
    }

    function getCampaignStatus(uint campaignID) public checkCampaignID(campaignID) 
    returns(CampaignStatus) {
        Campaign storage c = campaigns[campaignID];

        if (c.token.tokenAddress == address(0x00)) c.status = CampaignStatus.Stopped; //не начата/остановлена
        else {
            uint gottenAmount = (c.token.soldQuantity).mul(c.token.price);
            if (c.amount <= gottenAmount) c.status = CampaignStatus.Succeeded; //если собрана нужная сумма
            else if (c.timeLimits.endTime < now) c.status = CampaignStatus.Failed; //сумма не собрана и время вышло
        }
        return (c.status);
    }

    function crowdSell(uint campaignID, address inviter) public payable {
        
        require(getCampaignStatus(campaignID) == CampaignStatus.Continues, "Fundraising stopped");
        uint rebate = sell(campaignID, msg.value, inviter);

        emit CrowdSell(campaignID, msg.sender, msg.value, inviter, rebate);
    }

    function sell(uint campaignID, uint value, address inviter) internal 
    checkCampaignID(campaignID) returns(uint) {

        Campaign storage c = campaigns[campaignID];
        uint numTokens = value.div(c.token.price);
        require(c.token.soldQuantity.add(numTokens) <= c.token.quantity, "Sold out");
        
        uint rebate = 0; //расчет бонуса за приглашение
        if (inviter != address(0x00) && inviter != msg.sender && c.token.rebateRate > 0) {
            rebate = (numTokens.mul(c.token.rebateRate)).div(100);
        }

        address token = c.token.tokenAddress;
        require(FirToken(token).allowance(c.token.owner, address(this)) >= numTokens.add(rebate),
            "Make sure allowance is enough");

        if (rebate > 0) FirToken(token).transferFrom(c.token.owner, inviter, rebate);
        FirToken(token).transferFrom(c.token.owner, msg.sender, numTokens);
        
        c.token.soldQuantity = c.token.soldQuantity.add(numTokens);
        c.participants[msg.sender] = numTokens;

        return rebate;
    }

    function claim(uint campaignID) //забрать собранную сумму
    public checkCampaignID(campaignID) managerOnly(campaignID, msg.sender) {

        require(getCampaignStatus(campaignID) == CampaignStatus.Succeeded, "Сampaign was not successful");
        
        Campaign storage c = campaigns[campaignID];
        require(!c.claimed, "Already withdrawn");

        uint gottenAmount = (c.token.soldQuantity).mul(c.token.price);
        transfer(msg.sender, gottenAmount);
        c.claimed = true;

        emit Claimed(campaignID, msg.sender, gottenAmount);
    }

    function returnDonation(uint campaignID) //вернуть взнос в случае провала кампании
    public checkCampaignID(campaignID) {

        require(getCampaignStatus(campaignID) == CampaignStatus.Failed, "Сampaign was not a failure");

        Campaign storage c = campaigns[campaignID];
        uint numTokens = c.participants[msg.sender];
        require(numTokens > 0, "No donation to return");

        uint donationToReturn = (numTokens).mul(c.token.price);
        transfer(msg.sender, donationToReturn);
        delete c.participants[msg.sender];

        emit ReturnedDonation(campaignID, msg.sender, donationToReturn);
    }

    function transfer(address receiver, uint amount) internal { 
        receiver.transfer(amount);
    }

    //для тестирования
    function getCampaignInfo(uint campaignID) external view checkCampaignID(campaignID) 
    returns(string, address, uint) {
        Campaign storage c = campaigns[campaignID];
        return (c.description, c.manager, c.amount);
    }

    function getTokenInfo(uint campaignID) external view checkCampaignID(campaignID) 
    returns(address, uint, uint, uint) {
        Token storage t = campaigns[campaignID].token;
        return (t.tokenAddress, t.price, t.quantity, t.rebateRate);
    }

    function getSoldTokens(uint campaignID) external view checkCampaignID(campaignID) 
    returns(uint) {
        Token storage t = campaigns[campaignID].token;
        return (t.soldQuantity);
    }
}
