// AIDEV-NOTE: Global game state - accessible from all modules
// Session state only (not persisted across page reloads yet)
// AIDEV-NOTE: Flags here control which LLM response categories are available
// In prompts.js categories can have:
//   requiresFlag: 'flagName' - only available when GameState.flagName === true
//   removedByFlag: 'flagName' - removed when GameState.flagName === true

const GameState = {
    // Conversation milestones
    playerDiscussedStatus: false,
    
    // Add more flags here as needed:
    // playerMetEliza: false,
    // playerKnowsAboutFault: false,
    // statusFullyDiscussed: false,
    
    // Reset to initial state (call on new game)
    reset() {
        this.playerDiscussedStatus = false;
        // Reset any additional flags here
    }
};

