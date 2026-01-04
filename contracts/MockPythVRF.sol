//SPDX-License-Identifier:MIT
pragma solidity ^0.8.24;

import "./interfaces/IPythVRF.sol";

/**
 * @title MockPythVRF
 * @dev Mock implementation of IPythVRF for testing and development
 * This contract automatically fulfills VRF requests and calls back to the requester
 */
contract MockPythVRF is IPythVRF {
    mapping(bytes32 => RandomnessData) public randomnessData;
    uint256 private nonce;
    
    struct RandomnessData {
        uint256 randomNumber;
        uint256 blockNumber;
        bool fulfilled;
    }
    
    event RandomnessRequested(bytes32 indexed requestId, bytes32 seed);
    event RandomnessFulfilled(bytes32 indexed requestId, uint256 randomNumber);
    
    /**
     * @dev Request verifiable random number (auto-fulfilled for mock)
     * Mission X: No seed - VRF generates its own entropy
     * Automatically calls back to the requester contract's fulfillRandomness function
     */
    function requestRandomness() external returns (bytes32 requestId) {
        // Generate deterministic requestId from caller and nonce (VRF's own entropy)
        requestId = keccak256(abi.encodePacked(msg.sender, block.timestamp, block.prevrandao, nonce++));
        
        // Auto-fulfill immediately for mock
        // VRF generates its own entropy (no player input)
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), block.timestamp, block.prevrandao, nonce)));
        
        randomnessData[requestId] = RandomnessData({
            randomNumber: randomNumber,
            blockNumber: block.number,
            fulfilled: true
        });
        
        emit RandomnessRequested(requestId, bytes32(0)); // No seed for Mission X compliance
        emit RandomnessFulfilled(requestId, randomNumber);
        
        // Mission X: Push-based callback - VRF calls fulfillRandomness with randomness
        // IMPORTANT: Call callback but handle failures gracefully
        // Some contracts (like FlipMatch) use pull-based pattern and don't need callback
        // Casino contracts need callback for immediate fulfillment
        
        // Try to call fulfillRandomness (for casino contracts)
        // Use low-level call with limited gas to prevent reentrancy issues
        // If it fails (e.g., nonReentrant), randomness is still available via getRandomness
        (bool success, ) = msg.sender.call{gas: 500000}(
            abi.encodeWithSignature("fulfillRandomness(bytes32,uint256)", requestId, randomNumber)
        );
        
        // If fulfillRandomness doesn't exist or fails, try fulfillVRF (for FlipMatch compatibility)
        if (!success) {
            msg.sender.call{gas: 500000}(
                abi.encodeWithSignature("fulfillVRF(bytes32)", requestId)
            );
            // If both fail, randomness is still available via getRandomness (pull-based)
        }
        
        return requestId;
    }
    
    /**
     * @dev Get random number for a given request
     */
    function getRandomness(bytes32 requestId) external view returns (uint256 randomNumber, uint256 blockNumber, bool fulfilled) {
        RandomnessData memory data = randomnessData[requestId];
        return (data.randomNumber, data.blockNumber, data.fulfilled);
    }
    
    /**
     * @dev Mission X: Push-based callback - VRF provider calls this on game contracts
     * This is implemented in game contracts, not in VRF provider
     * But we need it in interface, so we provide empty implementation here
     */
    function fulfillRandomness(bytes32 /* requestId */, uint256 /* randomness */) external pure {
        // This function is called by VRF provider on game contracts
        // Mock VRF doesn't need this - it calls fulfillRandomness on game contracts directly
        revert("This should be called on game contracts, not VRF provider");
    }
    
    /**
     * @dev Verify randomness proof (always returns true for mock)
     */
    function verifyRandomness(
        bytes32 requestId,
        uint256 randomNumber,
        bytes calldata /* proof */
    ) external view returns (bool isValid) {
        RandomnessData memory data = randomnessData[requestId];
        return data.fulfilled && data.randomNumber == randomNumber;
    }
}

