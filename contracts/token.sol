pragma solidity ^0.4.24;

import "../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol";


contract FirToken {

    using SafeMath for uint256;

    bytes32                                           public  symbol;
    uint256                                           public  decimals = 18;
    bytes32                                           public  name = "";  

    uint256                                           public  totalSupply;
    bool                                              public  stopped;

    mapping (address => uint256)                      public  balanceOf;
    mapping (address => mapping (address => uint256)) public  allowed;
   
       
    modifier stoppable {
        require(!stopped, "Token is stopped");
        _;
    }

    event Approval(address indexed src, address indexed guy, uint wad);
    event Transfer(address indexed src, address indexed dst, uint wad);
    event Stop();
    event Start();



    constructor(bytes32 _symbol, bytes32 _name, uint256 _initialAmount) public {
        name = _name;
        symbol = _symbol;
        balanceOf[msg.sender] = _initialAmount;
        totalSupply = _initialAmount;  
    }

    
    function approve(address guy) external returns (bool) {
        return approve(guy, uint(-1));
    }


    function approve(address guy, uint wad) public stoppable returns (bool) {
        allowed[msg.sender][guy] = wad;
        emit Approval(msg.sender, guy, wad);
        return true;
    }


    function transfer(address dst, uint wad) external returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }


    function transferFrom(address src, address dst, uint wad) public stoppable returns (bool)
    {
        uint256 allowance;
        if (src == msg.sender) allowance = balanceOf[src];
        else allowance = allowed[src][msg.sender];
        require(balanceOf[src] >= wad && allowance >= wad, "Token insufficient balance");
        return _transferFrom(src, dst, wad);
    }


    function _transferFrom(address src, address dst, uint wad) private returns (bool)
    {
        balanceOf[src] = (balanceOf[src]).sub(wad);
        balanceOf[dst] = (balanceOf[dst]).add(wad);

        emit Transfer(src, dst, wad);
        return true;
    }


    function balanceOf(address owner) public view returns (uint256) {
        return balanceOf[owner];
    }


    function allowance(address owner, address spender) public view returns (uint256) {
        return allowed[owner][spender];
    }


    function stop() public {
        stopped = true;
        emit Stop();
    }


    function start() public {
        stopped = false;
        emit Start();
    }
}