//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

library VotePowerQueue {

  struct QueueNode {
    uint256 votePower;
    uint256 endBlock;
  }

  struct InOutQueue {
    uint256 start;
    uint256 end;
    mapping(uint256 => QueueNode) items;
  }

  function enqueue(InOutQueue storage queue, QueueNode memory item) internal {
    queue.items[queue.end++] = item;
  }

  function dequeue(InOutQueue storage queue) internal returns (QueueNode memory) {
    QueueNode memory item = queue.items[queue.start];
    delete queue.items[queue.start++];
    return item;
  }

  function queueItems(InOutQueue storage q) internal view returns (QueueNode[] memory) {
    QueueNode[] memory items = new QueueNode[](q.end - q.start);
    for (uint256 i = q.start; i < q.end; i++) {
      items[i - q.start] = q.items[i];
    }
    return items;
  }

  function queueItems(InOutQueue storage q, uint64 offset, uint64 limit) internal view returns (QueueNode[] memory) {
    uint256 start = q.start + offset;
    if (start >= q.end) {
      return new QueueNode[](0);
    }
    uint end = start + limit;
    if (end > q.end) {
      end = q.end;
    }
    QueueNode[] memory items = new QueueNode[](end - start);
    for (uint256 i = start; i < end; i++) {
      items[i - start] = q.items[i];
    }
    return items;
  }

  /**
  * Collect all ended vote powers from queue
  */
  function collectEndedVotes(InOutQueue storage q) internal returns (uint256) {
    uint256 total = 0;
    for (uint256 i = q.start; i < q.end; i++) {
      if (q.items[i].endBlock > block.number) {
        break;
      }
      total += q.items[i].votePower;
      dequeue(q);
    }
    return total;
  }

  function sumEndedVotes(InOutQueue storage q) internal view returns (uint256) {
    uint256 total = 0;
    for (uint256 i = q.start; i < q.end; i++) {
      if (q.items[i].endBlock > block.number) {
        break;
      }
      total += q.items[i].votePower;
    }
    return total;
  }

  function clear(InOutQueue storage q) internal {
    for (uint256 i = q.start; i < q.end; i++) {
      delete q.items[i];
    }
    q.start = q.end;
  }
  
}