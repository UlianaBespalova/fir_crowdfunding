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
        uint rebate;
        uint quantity;
        uint soldQuantity;
    }

    struct Participant {
        uint numTokens;
        bool rewarded;
    } 

    struct Campaign {
        string description;
        address manager;
        uint amount;

        CampaignStatus status;

        Token token;
        TimeLimits timeLimits;

        mapping (address => Participant) participants;
    }

    uint public numCampaigns;
    Campaign[] public campaigns;

//------------------------
   
       
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
                           uint rebate,  
                           uint end); 

    event StartSelling (uint indexed campaignID, uint indexed startTime);   

    event StopSelling (uint indexed campaignID, uint indexed stopTime);                                      


//------------------------

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
                           address owner, 
                           uint[3] memory price_quantity_rebate, 
                           uint endTime) 
    public checkCampaignID(campaignID) managerOnly(campaignID, msg.sender) {  

        require(token != address(0x00), "Incorrect token address");   
        require(owner != address(0x00), "Owner is incorrect");

        Campaign storage c = campaigns[campaignID];
        require(c.token.tokenAddress == address(0x00), "Token parameters are already set");
        require(price_quantity_rebate.length == 3, "Wrong price_quantity_rebate params");
        require(price_quantity_rebate[0] > 0, "Wrong price of the token");
        require(price_quantity_rebate[1] > 0, "Number of tokens should be more than zero");

        require(FirToken(token).allowance(owner, address(this)) >= price_quantity_rebate[1], 
                "Make sure allowance is enough");
        
        require(endTime > now, "Incorrent end time");

        c.token = Token(token, owner, price_quantity_rebate[0], price_quantity_rebate[2],
                        price_quantity_rebate[1], 0);  
        c.timeLimits.endTime = endTime;


        emit SaleParamsSetted(campaignID, token, price_quantity_rebate[0], price_quantity_rebate[1],
                              price_quantity_rebate[2], endTime); 
    }


    function startSelling (uint campaignID) public managerOnly(campaignID, msg.sender) {

        require(getCampaignStatus(campaignID) == CampaignStatus.Stopped, "Сan't start selling");
        Campaign storage c = campaigns[campaignID];
        require(c.token.tokenAddress != address(0x00), "Set sale parameters first");

        uint startTime = now;
        if (c.timeLimits.startTime == 0) c.timeLimits.startTime = startTime;
        
        c.status = CampaignStatus.Continues;
        emit StartSelling(campaignID, startTime);
    }


    function stopSelling (uint campaignID) public managerOnly(campaignID, msg.sender) {

        require(getCampaignStatus(campaignID) == CampaignStatus.Continues, "Сan't stop selling");

        Campaign storage c = campaigns[campaignID];
        c.status = CampaignStatus.Stopped;
        
        emit StopSelling(campaignID, now);
    }


    function getCampaignStatus(uint campaignID) public checkCampaignID(campaignID) 
    returns(CampaignStatus) {
        Campaign storage c = campaigns[campaignID];

        if (c.token.tokenAddress == address(0x00)) c.status = CampaignStatus.Stopped; //не началось
        else {
            uint gottenAmount = (c.token.soldQuantity).mul(c.token.price);
            if (c.amount <= gottenAmount) c.status = CampaignStatus.Succeeded; //собрали всё
            else if (c.timeLimits.endTime < now) c.status = CampaignStatus.Failed; //не собрали
        }
        return (c.status);
    }


    //for testing
    function getCampaignInfo(uint campaignID) external view checkCampaignID(campaignID) 
    returns(string, address, uint) {
        Campaign storage c = campaigns[campaignID];
        return (c.description, c.manager, c.amount);
    }

    function getTokenInfo(uint campaignID) external view checkCampaignID(campaignID) 
    returns(address, uint, uint, uint) {
        Token storage t = campaigns[campaignID].token;
        return (t.tokenAddress, t.price, t.quantity, t.rebate);
    }

    function getSoldTokens(uint campaignID) external view checkCampaignID(campaignID) 
    returns(uint) {
        Token storage t = campaigns[campaignID].token;
        return (t.soldQuantity);
    }

    
}