// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

contract Election {
    
    address public owner = msg.sender;
    string public election_name;
    uint public total_votes;
    
    constructor() {
        election_name = "Elecciones 4M";
        add_candidate("Isabel Diaz Ayuso, PP");
        add_candidate("Angel Gabilondo Pujol, PSOE");
        add_candidate("Monica Garcia Perez, MM");
        add_candidate("Rocio Monasterio San Martin, VOX");
        add_candidate("Pablo Iglesias Turrion, UP");
        add_candidate("Edmundo Bal Frances, CS");
        total_votes = 0;
    }
    
    struct Candidate {
        string name;
        uint vote_count;
        uint id;
    }
    
    struct Voter {
        bool authorized;
        bool vote_cast;
        uint vote_option;
    }

    event votedEvent (
        uint indexed _candidate_id
    );

    mapping(address => Voter) public voters;
    Candidate[] public candidates;
    
    modifier owner_only() {
        require(msg.sender == owner);
        _;
    }

    function add_candidate(string memory _name) owner_only public {
        candidates.push(Candidate(_name, 0, candidates.length));
    }
    
    function get_num_candidates() public view returns(uint) {
        return candidates.length;
    }
    
    function authorize(address _person) public {
        require(!voters[msg.sender].authorized);
        voters[_person].authorized = true;
    }
    
    function vote(uint _candidate_id) public {
        require(!voters[msg.sender].vote_cast && voters[msg.sender].authorized);
        require(_candidate_id >= 0 && _candidate_id <= get_num_candidates());
        
        voters[msg.sender].vote_option = _candidate_id;
        voters[msg.sender].vote_cast = true;
        
        candidates[_candidate_id].vote_count += 1;
        total_votes += 1;
        emit votedEvent(_candidate_id);
    }
    
    function end() owner_only public {
        selfdestruct(payable(owner));
    }
}
