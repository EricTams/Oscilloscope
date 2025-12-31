// AIDEV-NOTE: Global game state - accessible from all modules
// Session state only (not persisted across page reloads yet)
// AIDEV-NOTE: Flags here control which LLM response categories are available
// In prompts.js categories can have:
//   requiresFlag: 'flagName' - only available when GameState.flagName === true
//   removedByFlag: 'flagName' - removed when GameState.flagName === true

const GameState = {
    // Conversation milestones
    playerDiscussedStatus: false,
    NeedsRoleReveal: false,  // After psych assessment, Eliza needs to reveal player's role
    NeedsSolarProgram: false,  // After role revealed, player needs to run Solar program
    
    // Station systems
    powerLevel: 0.81,  // Power level percentage (average of all 4 panels, starts critical at ~0.81%)
    SolarAligned: false,  // True when solar panels 3&4 aligned to moon (power >= 2.4%)
    
    // Solar panel angles (persisted between program entries)
    // null = use default, otherwise use saved value
    solarPanelAngles: null,  // Will be set to [angle1, angle2, angle3, angle4] by Solar.initDefaults()
    
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
    
    // Game unlocks
    // AIDEV-NOTE: These flags control access to games and cube
    RocksUnlocked: false,
    MoonTaxiUnlocked: false,
    ChessUnlocked: false,
    CubeUnlocked: false,
    
    // Reset to initial state (call on new game or PUZZ 0)
    reset() {
        this.playerDiscussedStatus = false;
        this.NeedsRoleReveal = false;
        this.NeedsSolarProgram = false;
        this.powerLevel = 0.81;
        this.SolarAligned = false;
        this.solarPanelAngles = null;
        this.FixRecieverCompleted = false;
        this.FixTransmitterCompleted = false;
        this.NeedsTransmitterExplained = false;
        this.TransmitterInitialized = false;
        this.FrequenciesProvided = false;
        this.ReplyReceived = false;
        this.SignalReceived = false;
        this.SignalAnalyzed = false;
        this.ResponseTransmitted = false;
        this.RocksUnlocked = false;
        this.MoonTaxiUnlocked = false;
        this.ChessUnlocked = false;
        this.CubeUnlocked = false;
    }
};

