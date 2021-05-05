$('#enableEthereum').hide();

App = {
  contracts: {},
  account: '0x0',
  accountStatus: "Unknown",
  loader: $("#loader"),
  content: $("#content"),

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {

    nodeManager = new Web3(new Web3.providers.HttpProvider("https://blockchainvoting.ddns.net"));
    /*nodeManager.eth.getAccounts((err, accounts) => {
      for (var i = 0; i < accounts.length; i++) {
        console.log(accounts[i]);
        nodeManager.eth.getBalance(accounts[i], (err, balance) => {
          console.log(nodeManager.fromWei(balance, "ether"));
        });
      }
    })*/

    if(window.ethereum !== undefined){
      ethereum.on('accountsChanged', function (accounts) {
        App.account = ethereum.selectedAddress;
        window.location.reload();
      });
      
      walletManager = new Web3(window.ethereum);
      walletManager.eth.getAccounts((err, res) => {
        App.account = res[0];
        return App.initContract();
      });
    } else {
      App.loader.empty();
      App.loader.append("<h4 style='text-align: center;'>Please install a valid Ethereum wallet. Metamask is available at: <a href='https://metamask.io/'>https://metamask.io/<a/></h4>");
    }
  },

  initContract: function() {
    $.getJSON("build/contracts/Election.json", function(election) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Election = TruffleContract(election);
      // Connect provider to interact with contract
      App.contracts.Election.setProvider(window.ethereum);
      App.render()
    });
  },

  render: function() {
    const ethereumButton = document.querySelector('.enableEthereumButton');
    ethereumButton.addEventListener('click', () => {
      //Will Start the metamask extension
      ethereum.request({ method: 'eth_requestAccounts' });
    });

    // If account is found, render results along with election data
    if(App.account != '0x0' && App.account !== undefined){
      nodeManager.eth.getAccounts((err, res) => {
        if(res.includes(App.account)){
          App.getContractInfo();
          App.getAccountInfo();
        } else {
          App.loader.empty();
          App.loader.append(
            "<h4 style='text-align: center;'>This address does not belong to the network. \
            Please create a new account and import it to the network in order to vote.</h4>\
            <hr/>"
            + "<form id='import' onSubmit='App.importAccount(); return false;'>\
                <div class='form-group' style='text-align: center;'>\
                  <label for='privateKey'>Account Private Key</label><br>\
                  <input type='password' id='privateKey' name='privateKey'><br>\
                  <label for='accountPass'>Account Password</label><br>\
                  <input type='password' id='accountPass' name='accountPass'><br>\
                </div>\
                <div class='text-center'>\
                  <button class='btn btn-warning'>Import Account</button>\
                <div/>\
              </form>"
          );
        }
      })
      
    } else {
      $('#authorize').hide();
      $('#vote').hide();
      $('#enableEthereum').show();
      App.loader.empty();
      App.loader.append("<h4 style='text-align: center;'>Make sure your account is connected.</h4>");
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
      App.loader.hide();
      App.content.show();
    }).catch(function(error) {
      console.warn(error);
      $('#enableEthereum').hide();
      App.loader.empty();
      App.loader.append("<h4 style='text-align: center;'>Couldn't retrieve contract instance. Please make sure Metamask is running on the proper network.</h4>");
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
        walletManager.eth.getBalance(App.account, (error, balance) => {
          accountInfo.append("<li>Your account: " + App.account + "</li>");
          accountInfo.append("<li>Your balance: " + walletManager.fromWei(balance, "ether") +" ETH" + "</li>");
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
      return electionInstance.authorize(App.account, {from: App.account});
    }).then(function(receipt){
      App.content.hide();
      App.loader.show();
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
      App.content.hide();
      App.loader.show();
      window.location.reload();
    }).catch(function(err) {
      console.error(err);
    });
  },

  importAccount: function() {
    var privateKey = $('#privateKey').val();
    var accountPass = $('#accountPass').val();
    nodeManager.personal.importRawKey("0x"+privateKey, accountPass, (err, account) => {
      if(err){
        alert("Invalid credentials");
      } else {
        nodeManager.eth.getAccounts((err, accounts) => {
          nodeManager.eth.sendTransaction({
          from: accounts[0],
          to: account, 
          value: nodeManager.toWei(0.01, "ether"), 
          }, function(err, transactionHash) {
            if (err) { 
              console.log(err); 
            } else {
              console.log(transactionHash);
            }
          });
        });
        
        alert("Migration successful. A small amount of ether will be transferred");
        window.location.reload();
      }
    });
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});