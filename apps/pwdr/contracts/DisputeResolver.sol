// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DisputeResolver {
    struct Dispute {
        string paymentId;
        string[] evidenceHashes;
        bool isResolved;
        bool isFraud;
    }

    mapping(string => Dispute) public disputes;

    function submitEvidence(string memory paymentId, string memory ipfsHash) public {
        disputes[paymentId].paymentId = paymentId;
        disputes[paymentId].evidenceHashes.push(ipfsHash);
    }

    function vote(string memory paymentId, bool isFraud) public {
        require(!disputes[paymentId].isResolved, "Already resolved");
        disputes[paymentId].isFraud = isFraud;
    }

    function resolveDispute(string memory paymentId) public {
        require(!disputes[paymentId].isResolved, "Already resolved");
        disputes[paymentId].isResolved = true;
    }

    function getEvidence(string memory paymentId) public view returns (string[] memory) {
        return disputes[paymentId].evidenceHashes;
    }
}
