//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

library PoolAPY {
  struct ApyNode {
    uint256 startBlock;
    uint256 endBlock;
    uint256 reward;
    uint256 available;
  }

  struct ApyQueue {
    uint256 start;
    uint256 end;
    mapping(uint256 => ApyNode) items;
  }

  function enqueue(ApyQueue storage queue, ApyNode memory item) internal {
    queue.items[queue.end++] = item;
  }

  function dequeue(ApyQueue storage queue) internal returns (ApyNode memory) {
    ApyNode memory item = queue.items[queue.start];
    delete queue.items[queue.start++];
    return item;
  }

  function clearOutdatedNode(ApyQueue storage queue, uint256 outdatedBlock) internal {
    uint256 start = queue.start;
    uint256 end = queue.end;
    for (uint256 i = start; i < end; i++) {
      if (queue.items[i].endBlock > outdatedBlock) {
        break;
      }
      dequeue(queue);
    }
  }

  function enqueueAndClearOutdated(ApyQueue storage queue, ApyNode memory item, uint256 outdatedBlock) internal {
    enqueue(queue, item);
    clearOutdatedNode(queue, outdatedBlock);
  }

}