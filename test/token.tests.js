const _deploy_contracts = require("../migrations/2_deploy_contracts.js");

const FirToken = artifacts.require("FirToken");
const truffleAssert = require('truffle-assertions');


contract("tokenTest", accounts => {

    let contract;

    beforeEach(async function() {
        contract = await FirToken.deployed();
    });


    it ("createToken: ", async()=> {

        let sym = await contract.symbol();
        let name = await contract.name();
        let supp = await contract.totalSupply();
        assert.equal(web3.utils.hexToAscii(sym).split('\u0000')[0], 'FIR');
        assert.equal(web3.utils.hexToAscii(name).split('\u0000')[0], 'FirToken');
        assert.equal(supp, 1000);
    });


    it ("approveTest: ", async()=> {

        let acc1 = accounts[0];
        let acc2 = accounts[1];

        let res = await contract.approve.call(acc2);
        assert.equal(res, true);

        await contract.approve(acc2, -1);
        let allowance = await contract.allowance(acc1, acc2);
        assert.notEqual(allowance.valueOf(), 0);

        await contract.approve(acc2, 8);
        allowance = await contract.allowance(acc1, acc2);
        allowanceNull = await contract.allowance(acc2, acc1);
        assert.equal(allowance, 8);
        assert.equal(allowanceNull, 0);
    });


    it ("approveEventTest: ", async()=> {

        let acc1 = accounts[0];
        let acc2 = accounts[1];

        let res = await contract.approve(acc2, 10);
        truffleAssert.eventEmitted(res, 'Approval', (event)=>{
            return (event.src===acc1 && 
                    event.guy===acc2 && 
                    event.wad.valueOf()==10);
        });
    });


    it ("getBalanceTest: ", async()=> {

        let acc1 = accounts[0];
        let acc2 = accounts[1];
        let balance1 = await contract.balanceOf(acc1);
        let balance2 = await contract.balanceOf(acc2);

        assert.equal(balance1, 1000);
        assert.equal(balance2, 0);
    });


    it ("transferFailed (insufficient balance): ", async()=> {

        let acc1 = accounts[0];
        let acc2 = accounts[1];
        let err;

        try {
            await contract.transfer(acc2, 3000);            
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Token insufficient balance"), -1);

        let balance1 = await contract.balanceOf(acc1);
        assert.equal(balance1.valueOf(), 1000);
    });


    it ("transferFailed (insufficient allowance): ", async()=> {

        let acc1 = accounts[0];
        let acc2 = accounts[1];
        let err;

        await contract.transfer(acc2, 500);  

        try {
            await contract.transferFrom(acc2, acc1, 200);            
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Token insufficient balance"), -1);

        let balance1 = await contract.balanceOf(acc1);
        let balance2 = await contract.balanceOf(acc2);
        assert.equal(balance1.valueOf(), 500);
        assert.equal(balance2.valueOf(), 500);

        await contract.transfer(acc1, 500, {from: acc2});
    });


    it ("transferTest: ", async()=> {

        let acc1 = accounts[0];
        let acc2 = accounts[1];

        let transfer = await contract.transfer(acc2, 30);
        let balance1 = await contract.balanceOf(acc1);
        let balance2 = await contract.balanceOf(acc2);

        assert.equal(balance1.valueOf(), 1000-30);
        assert.equal(balance2.valueOf(), 30);

        truffleAssert.eventEmitted(transfer, 'Transfer', (event)=>{
            return (event.src===acc1 && 
                    event.dst===acc2 && 
                    event.wad.valueOf()==30);
        });

        await contract.transfer(acc1, 30, {from: acc2});
    });


    it ("transferFromTest: ", async()=> {

        let acc1 = accounts[0];
        let acc2 = accounts[1];
        let acc3 = accounts[2];

        await contract.transfer(acc2, 1000);
        await contract.approve(acc1, 500, {from: acc2});

        let transfer = await contract.transferFrom(acc2, acc3, 20);
        let balance1 = await contract.balanceOf(acc1);
        let balance2 = await contract.balanceOf(acc2);
        let balance3 = await contract.balanceOf(acc3);

        assert.equal(balance1.valueOf(), 0);
        assert.equal(balance2.valueOf(), 1000-20);
        assert.equal(balance3.valueOf(), 20);

        truffleAssert.eventEmitted(transfer, 'Transfer', (event)=>{
            return (event.src===acc2 && 
                    event.dst===acc3 && 
                    event.wad.valueOf()==20);
        });
    });


    it ("startStopTest: ", async()=> {

        let stopped = await contract.stopped();
        assert.equal(stopped, false);

        let stop = await contract.stop();
        stopped = await contract.stopped();
        assert.equal(stopped, true);
        truffleAssert.eventEmitted(stop, 'Stop');

        stop = await contract.start();
        stopped = await contract.stopped();
        assert.equal(stopped, false);

        truffleAssert.eventEmitted(stop, 'Start');
    });
    
    
    it ("stoppableFailed: ", async()=> {
        
        let acc2 = accounts[1];
        let err;
        await contract.stop();

        try {
            await contract.approve(acc2, 10);           
        } catch (error) {
            err = error;
        }        
        assert.notEqual(err, undefined, "Error must be thrown");
        assert.isAbove(err.message.search("Token is stopped"), -1);

        await contract.start();

        let noErr;
        try {
            await contract.approve(acc2, 10);           
        } catch (error) {
            noErr = error;
        }        
        assert.equal(noErr, undefined);
    });

});