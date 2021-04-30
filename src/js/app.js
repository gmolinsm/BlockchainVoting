App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  accountStatus: "Unknown",
  accountBalance: 0,

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    if(typeof(web3) !== undefined){
      App.web3Provider = window.ethereum;
    } else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: function() {
    $.getJSON("Election.json", function(election) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Election = TruffleContract(election);
      // Connect provider to interact with contract
      App.contracts.Election.setProvider(App.web3Provider);

      App.listenForEvents();
      return App.render();
    });
  },

  // Listen for events emitted from the contract
  listenForEvents: function() {
    App.contracts.Election.deployed().then(function(instance) {
      // Restart Chrome if you are unable to receive this event
      // This is a known issue with Metamask
      // https://github.com/MetaMask/metamask-extension/issues/2393
      instance.votedEvent({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        console.log("event triggered", event)
        // Reload when a new vote is recorded
        App.render();
      });
    });
  },

  render: function() {

    var electionInstance;
    var loader = $("#loader");
    var content = $("#content");

    loader.show();
    content.hide();

    // Load contract data
    App.contracts.Election.deployed().then(function(instance) {
      electionInstance = instance;
      return electionInstance.get_num_candidates();
    }).then(function(candidatesCount) {
      var candidatesResults = $("#candidatesResults");
      candidatesResults.empty();

      var candidatesSelect = $('#candidatesSelect');
      candidatesSelect.empty();

      for (var i = 0; i < candidatesCount; i++) {
        electionInstance.candidates(i).then(function(candidate) {
          var name = candidate[0];
          var voteCount = candidate[1];
          var id = candidate[2];

          // Render candidate Result
          var candidateTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + voteCount + "</td></tr>"
          candidatesResults.append(candidateTemplate);

          // Render candidate ballot option
          var candidateOption = "<option value='" + id + "' >" + name + "</ option>"
          candidatesSelect.append(candidateOption);
        });
      }
      return electionInstance.election_name();
    }).then(function(name){
      document.getElementById("electionName").innerHTML = name;
      App.getAccountInfo();
      loader.hide();
      content.show();  
    }).catch(function(error) {
      console.warn(error);
    });
  },

  getAccountInfo: function(){
    let accountInfo = $('#accountInfo');
    accountInfo.empty();
    if(window.ethereum){
      App.contracts.Election.deployed().then(function(instance) {
        return instance.voters(App.account);
      }).then(function(voter){
        if(voter[0] && voter[1]) {
          $('#vote').hide();
          $('#authorize').hide();
          App.accountStatus = "Already Voted";
        } else if(voter[0] && !voter[1]){
          $('#vote').show();
          $('#authorize').hide();
          App.accountStatus = "Ready to Vote";
        } else if(!voter[0]) {
          $('#vote').hide();
          $('#authorize').show();
          App.accountStatus = "Authorization needed";
        }
        
        web3.eth.getAccounts((error, accounts) => {
          web3.eth.getBalance(accounts[0], (error, balance) => {
            accountInfo.append("<li>Your account: " + accounts[0] + "</li>");
            accountInfo.append("<li>Your balance: " + balance + "</li>");
            accountInfo.append("<li>Status: " + App.accountStatus +"</li>");
            App.account = accounts[0];
            console.log(App.account);
          });
        });
      });
        
      
    }
  },

  authorize: function() {
    App.contracts.Election.deployed().then(function(instance) {
      electionInstance = instance;
      return instance.owner();
    }).then(function(owner){
      return electionInstance.authorize(App.account, { from: owner });
    }).then(function(receipt){
      $("#content").hide();
      $("#loader").show();
    }).catch(function(err) {
      console.error(err);
    });
  },

  castVote: function() {
    var candidateId = $('#candidatesSelect').val();
    App.contracts.Election.deployed().then(function(instance) {
      return instance.vote(candidateId, { from: App.account });
    }).then(function(receipt) {
      // Wait for votes to update
      $("#content").hide();
      $("#loader").show();
    }).catch(function(err) {
      console.error(err);
    });
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});