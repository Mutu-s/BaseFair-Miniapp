//SPDX-License-Identifier:MIT
pragma solidity ^0.8.24;

/**
 * @title IPythVRF
 * @dev Interface for Pyth Network VRF integration (Mission X compliant)
 * This interface supports callback pattern for oracle fulfillment
 */
interface IPythVRF {
    /**
     * @dev Request verifiable random number from Pyth Network
     * Mission X: No seed parameter - VRF generates its own entropy
     * @return requestId Unique request identifier
     */
    function requestRandomness() external returns (bytes32 requestId);
    
    /**
     * @dev Get random number for a given request (after fulfillment)
     * @param requestId Request identifier
     * @return randomNumber Verifiable random number
     * @return blockNumber Block number when randomness was generated
     * @return fulfilled Whether the request has been fulfilled
     */
    function getRandomness(bytes32 requestId) external view returns (uint256 randomNumber, uint256 blockNumber, bool fulfilled);
    
    /**
     * @dev Mission X: Push-based callback - VRF calls this when randomness is ready
     * @param requestId Request identifier
     * @param randomness Verifiable random number
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) external;
    
    /**
     * @dev Verify randomness proof (Mission X requirement)
     * @param requestId Request identifier
     * @param randomNumber Random number to verify
     * @param proof Verification proof
     * @return isValid Whether the proof is valid
     */
    function verifyRandomness(
        bytes32 requestId,
        uint256 randomNumber,
        bytes calldata proof
    ) external view returns (bool isValid);
}

