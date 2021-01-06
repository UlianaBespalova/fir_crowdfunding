const _deploy_contracts = require("../migrations/2_deploy_contracts.js");

const Crowdfunding = artifacts.require("Crowdfunding");
const FirToken = artifacts.require("FirToken");
const truffleAssert = require('truffle-assertions');


contract("crowdfundingTest", accounts => {

    let contract;
    let token;

    const acc0 = '0x0000000000000000000000000000000000000000';
    const acc1 = accounts[0];
    const acc2 = accounts[1];
    const acc3 = accounts[2];

    beforeEach(async function() {
        contract = await Crowdfunding.deployed();
        token = await FirToken.deployed();
    });


    it ("createNewCampaign: ", async()=> {

        let campaignID = await contract.newCampaign.call("somebody save me", 50, acc0);
        assert.equal(campaignID.valueOf(), 0);

        await contract.newCampaign("somebody save me", 50, acc0);
       
        let res = await contract.getCampaignInfo(campaignID.valueOf());
        assert.equal(res[0], "somebody save me");
        assert.equal(res[1], acc1);
        assert.equal(res[2].valueOf(), 50);


        campaignID = await contract.newCampaign.call("", 20, acc2);
        assert.equal(campaignID.valueOf(), 1);

        await contract.newCampaign("", 20, acc2);

        res = await contract.getCampaignInfo(campaignID.valueOf());
        assert.equal(res[1], acc2);
        assert.equal(res[2].valueOf(), 20);


        let numCampaigns = await contract.numCampaigns();
        assert.equal(numCampaigns.valueOf(), 2);
    });


    it ("createNewCampaignEvent: ", async()=> {

        let res = await contract.newCampaign("", 30, acc1);
        truffleAssert.eventEmitted(res, 'CampaignAdded', (event)=>{
            return (event.campaignID.valueOf()==2 && 
                    event.amount.valueOf()==30 && event.manager===acc1);
        });


        await token.approve(contract.address, 100);
        let endTime = Math.floor(Date.now()/1000)+1;
        await contract.setSaleParams(2, token.address, acc1, [1, 100, 0], endTime); 

        await contract.startSelling(2);
        await contract.crowdSell(2, acc2, {value: 10, from: acc2});
        await contract.crowdSell(2, acc3, {value: 10, from: acc3}); 
    });


    it ("createNewCampaignFailed (moreThanZero): ", async()=> {

        let err;

        try {
            await contract.newCampaign("", 0, acc1);          
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Value should be more than zero"), -1);

        let numCampaigns = await contract.numCampaigns();
        assert.equal(numCampaigns.valueOf(), 3);
    });


    it ("getCampaignInfoFailed (Incorrect campaignID): ", async()=> {

        let err;

        try {
            await contract.getCampaignInfo(100);         
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Incorrect campaignID"), -1);
    });


    it ("getNullTokenInfo: ", async()=> {

        let res = await contract.getTokenInfo(1);
        assert.equal(res[0], '0x0000000000000000000000000000000000000000');
        assert.equal(res[1], 0);
    });


    it ("setSaleParamsFailed (managerOnly): ", async()=> {

        let err;

        try {
            await contract.setSaleParams(0, acc1, acc1, [2, 100, 0], 10, {from: acc3});      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Оnly for the campaign manager"), -1);
    });


    it ("setSaleParamsFailed (Incorrect token address): ", async()=> {

        let err;

        try {
            await contract.setSaleParams(0, acc0, acc1, [2, 100, 0], 10);      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Incorrect token address"), -1);
    });


    it ("setSaleParamsFailed (Incorrect owner): ", async()=> {

        let err;

        try {
            await contract.setSaleParams(0, token.address, acc0, [2, 100, 0], 10);      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Owner is incorrect"), -1);
    });


    it ("setSaleParamsFailed (Wrong price): ", async()=> {

        let err;

        try {
            await contract.setSaleParams(0, token.address, acc1, [0, 100, 0], 10);      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Wrong price of the token"), -1);
    });


    it ("setSaleParamsFailed (Wrong number of tokens): ", async()=> {

        let err;

        try {
            await contract.setSaleParams(0, token.address, acc1, [1, 0, 0], 10);      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Number of tokens should be more than zero"), -1);
    });


    it ("setSaleParamsFailed (Not enough allowance): ", async()=> {

        await contract.newCampaign("", 100, acc1);

        let err;

        try {
            await contract.setSaleParams(3, token.address, accounts[4], [2, 100, 0], 10);      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Make sure allowance is enough"), -1);
    });
    

    it ("setSaleParamsFailed (Incorrent end time): ", async()=> {

        await token.approve(contract.address, 100);

        let err;

        try {
            await contract.setSaleParams(0, token.address, acc1, [2, 100, 0], 10);      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Incorrent end time"), -1);
    });


    it ("setSaleParams: ", async()=> {

        await token.approve(contract.address, 100);
        
        let endTime = Math.floor(Date.now()/1000)+1000;

        await contract.setSaleParams(0, token.address, acc1, [2, 100, 10], endTime); 

        let res = await contract.getTokenInfo(0);
        assert.equal(res[0], token.address);
        assert.equal(res[1], 2);
        assert.equal(res[2], 100);
        assert.equal(res[3], 10);
    });


    it ("setSaleParamsEvent: ", async()=> {

        await token.approve(contract.address, 20);
        
        let endTime = Math.floor(Date.now()/1000)+10;

        let res = await contract.setSaleParams(1, token.address, acc1, [1, 20, 10], endTime, {from: acc2}); 
        truffleAssert.eventEmitted(res, 'SaleParamsSetted', (event)=>{
            return (event.campaignID.valueOf()==1 && 
                    event.token===token.address && 
                    event.price.valueOf()==1 &&
                    event.quantity.valueOf()==20 &&
                    event.end.valueOf()==endTime);
        });
    });


    it ("setSaleParamsFailed (Params already set): ", async()=> {

        let err;

        try {
            await contract.setSaleParams(0, token.address, acc1, [2, 100, 0], 10);      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Token parameters are already set"), -1);
    });


    it ("getCampaignStatus: ", async()=> {

        let status = await contract.getCampaignStatus.call(0);
        assert.equal(status, 3);

        status = await contract.getCampaignStatus.call(2);
        assert.equal(status, 2);
    });


    it ("startSellingFailed (No params): ", async()=> {

        let err;

        try {
            await contract.startSelling(3);      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Set sale parameters first"), -1);
    });
    

    it ("startSelling: ", async()=> {
        
        await contract.startSelling(0); 

        let status = await contract.getCampaignStatus.call(0);
        assert.equal(status, 0);
    });
    

    it ("startSellingEvent: ", async()=> {

        let currentTime = Math.floor(Date.now()/1000);

        let res = await contract.startSelling(1, {from: acc2});
        truffleAssert.eventEmitted(res, 'StartedSelling', (event)=>{
            return (event.campaignID.valueOf()==1 && 
                    event.startTime.valueOf() <= currentTime+1 &&
                    event.startTime.valueOf() >= currentTime);
        });
    });


    it ("startSellingFailed (Wrong status): ", async()=> {

        let err;

        try {
            await contract.startSelling(0);      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Сan't start selling"), -1);
    });


    it ("stopSellingFailed (Wrong status): ", async()=> {

        let err;

        try {
            await contract.stopSelling(2);      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Сan't stop selling"), -1);
    });


    it ("stopSelling: ", async()=> {
        
        await contract.stopSelling(0); 
        let status = await contract.getCampaignStatus.call(0);
        assert.equal(status, 3);

        await contract.startSelling(0); 
        status = await contract.getCampaignStatus.call(0);
        assert.equal(status, 0);
    });


    it ("stopSellingEvent: ", async()=> {

        let currentTime = Math.floor(Date.now()/1000);

        let res = await contract.stopSelling(0);
        truffleAssert.eventEmitted(res, 'StoppedSelling', (event)=>{
            return (event.campaignID.valueOf()==0 && 
                    event.stopTime.valueOf() <= currentTime+1 &&
                    event.stopTime.valueOf() >= currentTime);
        });
        await contract.startSelling(0); 
    });


    it ("getSoldTokens: ", async()=> {
        let sold = await contract.getSoldTokens.call(0); 
        assert.equal(sold.valueOf(), 0);
    });


    it ("crowdSellFailed (Stopped): ", async()=> {

        let err;

        try {
            await contract.crowdSell(2, acc3, {value: 20, from: acc2});      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Fundraising stopped"), -1);
    });
    

    it ("crowdSellFailed (Sold out): ", async()=> {

        let err;

        try {
            await contract.crowdSell(1, acc3, {value: 25, from: acc2});      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Sold out"), -1);
    });


    it ("crowdSellFailed (Not enough allowance): ", async()=> {

        let err;

        try {
            await contract.crowdSell(1, acc3, {value: 20, from: acc2});      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Make sure allowance is enough"), -1);
    });


    it ("crowdSell: ", async()=> {

        let balanceOld_acc1 = await token.balanceOf(acc1);
        let balanceOld_acc2 = await token.balanceOf(acc2);
        let balanceOld_acc3 = await token.balanceOf(acc3);

        await contract.crowdSell(0, acc3, {value: 20, from: acc2}); 

        let balanceNew_acc1 = await token.balanceOf(acc1);
        let balanceNew_acc2 = await token.balanceOf(acc2);
        let balanceNew_acc3 = await token.balanceOf(acc3);

        let sold = await contract.getSoldTokens.call(0); 

        assert.equal(sold, 10);
        assert.equal(balanceNew_acc2 - balanceOld_acc2, 10);
        assert.equal(balanceNew_acc3 - balanceOld_acc3, 1);
        assert.equal(balanceOld_acc1 - balanceNew_acc1, 11);
    });


    it ("crowdSellNoRebate: ", async()=> {

        let balanceOld_acc1 = await token.balanceOf(acc1);
        let balanceOld_acc2 = await token.balanceOf(acc2);

        await contract.crowdSell(0, acc2, {value: 10, from: acc2}); 

        let balanceNew_acc1 = await token.balanceOf(acc1);
        let balanceNew_acc2 = await token.balanceOf(acc2);

        let sold = await contract.getSoldTokens.call(0); 

        assert.equal(sold, 15);
        assert.equal(balanceNew_acc2 - balanceOld_acc2, 5);
        assert.equal(balanceOld_acc1 - balanceNew_acc1, 5);
    });


    it ("crowdSellEvent: ", async()=> {

        let res = await contract.crowdSell(0, acc3, {value: 10, from: acc2}); 
        truffleAssert.eventEmitted(res, 'CrowdSell', (event)=>{
            return (event.campaignID.valueOf() == 0 && 
                    event.from === acc2 &&
                    event.amount.valueOf() == 10 &&
                    event.inviter === acc3 &&
                    event.rebate.valueOf() == 0);
        });
    });


    it ("crowdfundingSucceeded: ", async()=> {

        status = await contract.getCampaignStatus.call(0);
        assert.equal(status, 0);

        await contract.crowdSell(0, acc3, {value: 12, from: acc3}); 

        let sold = await contract.getSoldTokens.call(0); 
        assert.equal(sold, 26);

        status = await contract.getCampaignStatus.call(0);
        assert.equal(status, 1);
    });


    it ("crowdfundingFailed: ", async()=> {

        let sold = await contract.getSoldTokens.call(2); 
        assert.equal(sold, 20);

        status = await contract.getCampaignStatus.call(2);
        assert.equal(status, 2);        
    });


    it ("claimAwardFailed (Was not successful): ", async()=> {

        let err;

        try {
            await contract.claim(2);    
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Сampaign was not successful"), -1);
    });


    it ("claimAwardEvent: ", async()=> {

        let balanceOld = await web3.eth.getBalance(contract.address);
        res = await contract.claim(0);
        let balanceNew = await web3.eth.getBalance(contract.address);

        assert.equal(balanceOld - balanceNew, 52);

        truffleAssert.eventEmitted(res, 'Claimed', (event)=>{
            return (event.campaignID.valueOf() == 0 && 
                    event.receiver === acc1 &&
                    event.amount.valueOf() == 52);
        });    
    });


    it ("claimAwardFailed (Already withdrawn): ", async()=> {

        let err;

        try {
            await contract.claim(0);    
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Already withdrawn"), -1);
    });

});