const _deploy_contracts = require("../migrations/2_deploy_contracts.js");

const Crowdfunding = artifacts.require("Crowdfunding");
const FirToken = artifacts.require("FirToken");
const truffleAssert = require('truffle-assertions');


contract("crowdfundingTest", accounts => {

    let contract;

    let acc0 = '0x0000000000000000000000000000000000000000';
    let acc1 = accounts[0];
    let acc2 = accounts[1];
    let acc3 = accounts[2];

    beforeEach(async function() {
        contract = await Crowdfunding.deployed();
    });


    it ("createNewCampaign: ", async()=> {

        let campaignID = await contract.newCampaign.call("somebody save me", 10, acc0);
        assert.equal(campaignID.valueOf(), 0);

        await contract.newCampaign("somebody save me", 10, acc0);
       
        let res = await contract.getCampaignInfo(campaignID.valueOf());
        assert.equal(res[0], "somebody save me");
        assert.equal(res[1], acc1);
        assert.equal(res[2].valueOf(), 10);


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
            return (event.campaignID.valueOf()==2 && event.amount.valueOf()==30 && event.manager===acc1);
        });
    });

/*
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

        token = await FirToken.deployed();
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

        token = await FirToken.deployed();
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

        token = await FirToken.deployed();
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

        token = await FirToken.deployed();
        let err;

        try {
            await contract.setSaleParams(0, token.address, acc1, [2, 100, 0], 10);      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Make sure allowance is enough"), -1);
    });
    

    it ("setSaleParamsFailed (Incorrent end time): ", async()=> {

        token = await FirToken.deployed();
        await token.approve(contract.address, 100);

        let err;

        try {
            await contract.setSaleParams(0, token.address, acc1, [2, 100, 0], 10);      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Incorrent end time"), -1);
    });*/


    it ("setSaleParams: ", async()=> {

        token = await FirToken.deployed();
        await token.approve(contract.address, 100);
        
        let endTime = Math.floor(Date.now()/1000)+1000;

        await contract.setSaleParams(0, token.address, acc1, [2, 100, 0], endTime); 

        let res = await contract.getTokenInfo(0);
        assert.equal(res[0], token.address);
        assert.equal(res[1], 2);
        assert.equal(res[2], 100);
        assert.equal(res[3], 0);
    });


    it ("setSaleParamsEvent: ", async()=> {

        token = await FirToken.deployed();
        await token.approve(contract.address, 100);
        
        let endTime = Math.floor(Date.now()/1000)+1;

        let res = await contract.setSaleParams(1, token.address, acc1, [2, 100, 0], endTime, {from: acc2}); 
        truffleAssert.eventEmitted(res, 'SaleParamsSetted', (event)=>{
            return (event.campaignID.valueOf()==1 && 
                    event.token===token.address && 
                    event.price.valueOf()==2 &&
                    event.quantity.valueOf()==100 &&
                    event.end.valueOf()==endTime);
        });
    });

/*
    it ("setSaleParamsFailed (Params already set): ", async()=> {

        token = await FirToken.deployed();
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
        assert.equal(status, 3);
    });


    it ("startSellingFailed (No params): ", async()=> {

        let err;

        try {
            await contract.startSelling(2);      
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Set sale parameters first"), -1);
    });*/
    

    it ("startSelling: ", async()=> {
        
        await contract.startSelling(0); 

        let status = await contract.getCampaignStatus.call(0);
        assert.equal(status, 0);
    });
    

    it ("startSellingEvent: ", async()=> {

        let currentTime = Math.floor(Date.now()/1000);

        let res = await contract.startSelling(1, {from: acc2});
        truffleAssert.eventEmitted(res, 'StartSelling', (event)=>{
            return (event.campaignID.valueOf()==1 && 
                    event.startTime.valueOf() <= currentTime+1 &&
                    event.startTime.valueOf() >= currentTime);
        });
    });

/*
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
        truffleAssert.eventEmitted(res, 'StopSelling', (event)=>{
            return (event.campaignID.valueOf()==0 && 
                    event.stopTime.valueOf() <= currentTime+1 &&
                    event.stopTime.valueOf() >= currentTime);
        });
        await contract.startSelling(0); 
    });*/


    

//getSoldTokens
//начать продажу если другой статус (ошибка), восстановить после паузы, после сбора
//Проверка всех статусов


});