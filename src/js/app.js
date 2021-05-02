App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  accountStatus: "Unknown",

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    $('#enableEthereum').hide();
    if(window.ethereum !== undefined){
      App.web3Provider = window.ethereum;
      web3 = new Web3(App.web3Provider);
      web3.eth.getAccounts((err, res) => { 
        App.account = res[0];
        return App.initContract();
      });
    } else {
      document.getElementById("loader").innerHTML = "Please install a valid Ethereum wallet. Metamask is available at: <a href='https://metamask.io/'>https://metamask.io/<a/>";
    }
  },

  initContract: function() {
    
    $.getJSON("Election.json", function(election) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Election = TruffleContract(election);
      // Connect provider to interact with contract
      App.contracts.Election.setProvider(App.web3Provider);
      App.render();
    });
  },

  render: function() {
    
    var electionInstance;
    var loader = $("#loader");
    var content = $("#content");

    ethereum.on('accountsChanged', function (accounts) {
      console.log("Accounts changed");
      // Time to reload your interface with accounts[0]!
      App.account = ethereum.selectedAddress;
      window.location.reload();
    });

    const ethereumButton = document.querySelector('.enableEthereumButton');
    ethereumButton.addEventListener('click', () => {
      //Will Start the metamask extension
      ethereum.request({ method: 'eth_requestAccounts' });
    });

    loader.show();
    content.hide();
    
    App.getContractInfo();
    console.log(App.account);
    // If account is found, render results along with election data
    if(App.account != '0x0' && App.account !== undefined){
      App.getAccountInfo();
      loader.hide();
      content.show();
    } else {
      $('#authorize').hide();
      $('#vote').hide();
      $('#enableEthereum').show();
      document.getElementById("loader").innerHTML = "Make sure your account is connected and reload the site.";
    }
  },
  
  getContractInfo: function(){
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
    }).catch(function(error) {
      console.warn(error);
      $('#enableEthereum').hide();
      document.getElementById("loader").innerHTML = "Please make sure Metamask is running on the proper network.";
    });
  },
  
  getAccountInfo: function(){
    let accountInfo = $('#accountInfo');
    accountInfo.empty();
    if(window.ethereum){
      App.contracts.Election.deployed().then(function(instance) {
        return instance.voters(App.account);
      }).then(function(voter){
        //Resolve status
        if(voter[0] && voter[1]){
          App.accountStatus = "Already voted for " + voter[2];
          $('#authorize').hide();
          $('#vote').hide();
        } else if(voter[0] && !voter[1]){
          App.accountStatus = "Ready to vote";
          $('#authorize').hide();
          $('#vote').show();
        } else if(!voter[1] && !voter[1]){
          App.accountStatus = "Needs verification";
          $('#authorize').show();
          $('#vote').hide();
        }
        
        //Retrieve account info
        web3.eth.getBalance(App.account, (error, balance) => {
          accountInfo.append("<li>Your account: " + App.account + "</li>");
          accountInfo.append("<li>Your balance: " + web3.fromWei(balance, "ether") +" ETH" + "</li>");
          accountInfo.append("<li>Status: " + App.accountStatus +"</li>");
        });
      });
    }
  },

  authorize: function() {
    App.contracts.Election.deployed().then(function(instance) {
      electionInstance = instance;
      return instance.owner();
    }).then(function(owner){
      App.owner = owner;
      console.log(App.account);
      return electionInstance.authorize(App.account, {from: App.account});
    }).then(function(receipt){
      $("#content").hide();
      $("#loader").show();
      window.location.reload();
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
      window.location.reload();
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