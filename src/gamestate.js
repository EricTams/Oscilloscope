// AIDEV-NOTE: Global game state - accessible from all modules
// Session state only (not persisted across page reloads yet)
// AIDEV-NOTE: Flags here control which LLM response categories are available
// In prompts.js categories can have:
//   requiresFlag: 'flagName' - only available when GameState.flagName === true
//   removedByFlag: 'flagName' - removed when GameState.flagName === true

const GameState = {
    // Conversation milestones
    playerDiscussedStatus: false,
    
    // Puzzle state flags
    // AIDEV-NOTE: These flags control puzzle progression and program visibility
    FixRecieverCompleted: false,
    FixTransmitterCompleted: false,
    NeedsTransmitterExplained: false,
    
    // Transmitter puzzle flags
    // AIDEV-NOTE: TransmitterInitialized = test message sent, handshake started
    // FrequenciesProvided = player gave correct 3 frequencies to Eliza
    // ReplyReceived = response received after sending frequencies
    TransmitterInitialized: false,
    FrequenciesProvided: false,
    ReplyReceived: false,
    
    // Signal analyzer puzzle flags
    // AIDEV-NOTE: SignalReceived enables ANALYZER command
    // SignalAnalyzed tracks if player has viewed the analysis
    // ResponseTransmitted tracks puzzle completion
    SignalReceived: false,
    SignalAnalyzed: false,
    ResponseTransmitted: false,
    
    // Reset to initial state (call on new game or PUZZ 0)
    reset() {
        this.playerDiscussedStatus = false;
        this.FixRecieverCompleted = false;
        this.FixTransmitterCompleted = false;
        this.NeedsTransmitterExplained = false;
        this.TransmitterInitialized = false;
        this.FrequenciesProvided = false;
        this.ReplyReceived = false;
        this.SignalReceived = false;
        this.SignalAnalyzed = false;
        this.ResponseTransmitted = false;
    }
};

