// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleStorage {
    // Menyimpan sebuah nilai
    uint256 private storedValue;

    // Owner contract
    address public owner;

    // Event ketika nilai diperbarui
    event ValueUpdated(uint256 newValue);

    // Event ketika owner ditetapkan
    event OwnerSet(address indexed newOwner);

    // Constructor → Set owner saat deploy
    constructor() {
        owner = msg.sender;
        emit OwnerSet(owner); // Event OwnerSet muncul saat deploy
    }

    // Simpan nilai ke blockchain (write)
    function setValue(uint256 _value) public {
        storedValue = _value;
        emit ValueUpdated(_value); // Event ValueUpdated muncul saat set value
    }

    // Membaca nilai terakhir (read)
    function getValue() public view returns (uint256) {
        return storedValue;
    }
}
