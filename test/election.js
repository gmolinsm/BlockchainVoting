var Election = artifacts.require("./Election.sol");

contract("Election", function(accounts) {
    it("initializes with five candidates", function(){
        return Election.deployed().then(function(instance) {
            return instance.get_num_candidates();
        }).then(function(count) {
            assert.equal(count, 5);
        });
    });

    it("allows a voter to cast a vote", function(){
        return Election.deployed().then(function(instance){
            electionInstance = instance;
            candidateId = 0;
            electionInstance.authorize(accounts[0]);
            return electionInstance.vote(candidateId, { from: accounts[0] });
        }).then(function(receipt) {
            assert(typeof(receipt) !== undefined, "a receipt was received");
            return electionInstance.voters(accounts[0]);
        }).then(function(account){
            assert.equal(account.vote_cast, true, "voter was marked as voted");
            return electionInstance.candidates(candidateId);
        }).then(function(candidate){
            var voteCount = candidate[1];
            assert.equal(voteCount, 1, "the candidates votes are incremented");
        });
    });

    it("throws an exception for unauthorized candidates", function(){
        return Election.deployed().then(function(instance){
            electionInstance = instance;
            candidateId = 0;
            // No authorization
            return electionInstance.vote(candidateId, { from: accounts[0] });
        }).then(assert.fail).catch(function(error) {
            assert(error.message.indexOf('revert') >= 0, "revert is thrown when unauthorized");
        });
    });

    it("throws an exception when double voting", function(){
        return Election.deployed().then(function(instance){
            electionInstance = instance;
            candidateId = 1;
            electionInstance.authorize(accounts[1], { from: accounts[0] });
            electionInstance.vote(candidateId, { from: accounts[1] });
            return electionInstance.candidates(candidateId);
        }).then(function(candidate){
            var voteCount = candidate[1];
            assert.equal(voteCount, 1, "candidate receives first vote");
            return electionInstance.vote(candidateId, { from: accounts[1] });
        }).then(assert.fail).catch(function(error) {
            assert(error.message.indexOf('revert') >= 0, "error message must contain revert");
            return electionInstance.candidates(candidateId);
        }).then(function(candidate){
            var voteCount = candidate[1];
            assert.equal(voteCount, 1, "candidate did not receive a second vote");
        });
    });
});