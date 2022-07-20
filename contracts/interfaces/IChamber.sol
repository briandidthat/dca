// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

interface IChamber {
  event Supply(address indexed asset, uint amount);
  event Deposit(address indexed asset, uint amount);
  event ExecuteSwap(address indexed asset, uint amount);
}