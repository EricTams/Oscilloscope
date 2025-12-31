// ELIZA - Stasis Pod Bay AI Interface
// AIDEV-NOTE: Program interface: init(), update(deltaTime), getSegments(), handleKey(key, down)
// AIDEV-NOTE: No memory between sessions - each launch is a fresh conversation
// AIDEV-NOTE: ELIZA manages the stasis pods, not the whole station. She's protective of her sleepers.

class ElizaProgram {
    constructor() {
        this.segments = [];
        
        // Conversation history (displayed on screen)
        this.messages = [];
        this.maxMessages = 12;  // Visible message history
        
        // Input state
        this.inputText = '';
        this.maxInputLength = 60;
        this.cursorVisible = true;
        this.cursorBlinkTime = 0;
        this.cursorBlinkRate = 0.5;  // seconds
        
        // Response state
        this.isWaitingForResponse = false;
        this.responseError = null;
        
        // Stasis bay status (ELIZA's domain)
        // AIDEV-NOTE: Sleepers status starts as Unknown - ELIZA has detected a fault
        this.stasisStatus = {
            sleepersStatus: 'UNKNOWN'  // Only status visible at start
        };
        
        // Layout
        this.charWidth = 0.012;
        this.charHeight = 0.022;
        this.lineHeight = 0.05;
        this.marginX = 0.04;
        
        // Typing animation for ELIZA responses
        this.typingResponse = null;
        this.typingIndex = 0;
        this.typingSpeed = 0.03;  // seconds per character
        this.typingTimer = 0;
        
        // Debug: store last LLM exchange for copying
        this.lastLLMExchange = null;
    }
    
    init() {
        this.segments = [];
        this.messages = [];
        this.inputText = '';
        this.isWaitingForResponse = false;
        this.responseError = null;
        this.typingResponse = null;
        this.typingIndex = 0;
        
        // AIDEV-NOTE: Opening message from ELIZA - conditional based on game state
        // Transmitter puzzle greetings (checked in order of progression)
        // These are "situation critical" interrupts that override normal ELIZA behavior
        if (GameState.FrequenciesProvided && GameState.ReplyReceived) {
            // State C: Reply received, need to decode
            this.addMessage('ELIZA', 'SITUATION CRITICAL. You are ranking communications officer. An encoded transmission is coming in but I cannot decode it. I need your help.');
        } else if (GameState.TransmitterInitialized && !GameState.FrequenciesProvided) {
            // State B: Handshake received, waiting for analysis
            this.addMessage('ELIZA', 'SITUATION CRITICAL. You are ranking communications officer. A three-tone handshake is repeating on 7.250 MHz. I need you to find the encoded frequencies.');
        } else if (GameState.FixTransmitterCompleted && !GameState.TransmitterInitialized) {
            // State A: Transmitter ready but not initialized
            this.addMessage('ELIZA', 'SITUATION CRITICAL. You are ranking communications officer. The transmitter is online but requires initialization. Awaiting your order to send test signal.');
        } else {
            // Default greeting (before transmitter puzzle)
            this.addMessage('ELIZA', 'Fault detected. Are you awake?');
        }
        
        // Check LLM status
        if (!LLM.isConfigured()) {
            this.addMessage('SYSTEM', 'Warning: LLM not configured. Responses unavailable.');
        }
    }
    
    addMessage(sender, text) {
        this.messages.push({ sender, text, timestamp: Date.now() });
        
        // Trim old messages
        while (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
    }
    
    handleKey(key, down, event) {
        if (!down) return;  // Only handle key down
        
        // Ctrl+D is handled in game.js (to prevent browser bookmark action)
        
        // Don't accept input while waiting for response or typing
        if (this.isWaitingForResponse || this.typingResponse) {
            return;
        }
        
        if (key === 'Backspace') {
            this.inputText = this.inputText.slice(0, -1);
        } else if (key === 'Enter') {
            this.submitInput();
        } else if (key.length === 1 && this.inputText.length < this.maxInputLength) {
            // Allow alphanumeric and common punctuation
            if (/[a-zA-Z0-9 .,!?:;\-'"]/.test(key)) {
                this.inputText += key.toUpperCase();
            }
        }
    }
    
    async copyDebugToClipboard() {
        if (!this.lastLLMExchange) {
            this.addMessage('SYSTEM', 'No LLM exchange to copy yet.');
            return;
        }
        
        const d = this.lastLLMExchange.debug || {};
        const debugText = `=== ELIZA LLM DEBUG ===

=== STEP 1: CLASSIFIER ===
SYSTEM PROMPT:
${d.classifySystem || 'N/A'}

USER MESSAGE:
${d.classifyMessage || 'N/A'}

RESULT: ${this.lastLLMExchange.category}

=== STEP 2: RESPONSE (${this.lastLLMExchange.category}) ===
SYSTEM PROMPT:
${d.responseSystem || 'N/A'}

USER MESSAGE:
${d.responseMessage || 'N/A'}

RESULT:
${this.lastLLMExchange.response}

=== METADATA ===
TIMESTAMP: ${new Date(this.lastLLMExchange.timestamp).toISOString()}
`;
        
        try {
            await navigator.clipboard.writeText(debugText);
            this.addMessage('SYSTEM', 'Debug info copied to clipboard.');
        } catch (err) {
            console.error('Failed to copy debug:', err);
            this.addMessage('SYSTEM', 'Failed to copy to clipboard.');
        }
    }
    
    async submitInput() {
        const text = this.inputText.trim();
        if (!text) return;
        
        // Add user message
        this.addMessage('USER', text);
        this.inputText = '';
        
        // Check if LLM is available
        if (!LLM.isConfigured()) {
            this.addMessage('ELIZA', 'I cannot respond. LLM interface offline.');
            return;
        }
        
        // Request response from LLM
        this.isWaitingForResponse = true;
        this.responseError = null;
        
        try {
            // Build context for LLM
            const context = {
                recentEvents: this.getRecentContext(),
                userInput: text
            };
            
            // Classify then respond
            const result = await LLM.elizaChat(context);
            
            // Store for debug copying (includes full prompts)
            this.lastLLMExchange = {
                context: JSON.stringify(context, null, 2),
                category: result.category,
                response: result.response,
                debug: result.debug,
                timestamp: Date.now()
            };
            
            // Start typing animation for response
            this.typingResponse = result.response;
            this.typingIndex = 0;
            this.typingTimer = 0;
            
            // Trigger callback for response category
            this.onResponseUsed(result.category);
            
        } catch (error) {
            console.error('ELIZA LLM error:', error);
            this.responseError = error.message;
            this.addMessage('ELIZA', 'Transmission error... signal lost.');
        }
        
        this.isWaitingForResponse = false;
    }
    
    // AIDEV-NOTE: Called after each LLM response to update global game state based on category
    // Check prompts.js for setsFlags arrays on categories
    onResponseUsed(category) {
        switch (category) {
            case 'PlayerDiscussStatus':
                GameState.playerDiscussedStatus = true;
                console.log('GameState: playerDiscussedStatus = true');
                break;
                
            case 'InitializeTransmitter':
                // Player told Eliza to boot the transmitter
                GameState.TransmitterInitialized = true;
                GameState.SignalReceived = true;  // Enables ANALYZER command
                console.log('GameState: TransmitterInitialized = true, SignalReceived = true');
                break;
                
            case 'ProvideFrequencies':
                // Player provided the correct frequencies
                // AIDEV-NOTE: The LLM should only use this category if numbers are correct
                GameState.FrequenciesProvided = true;
                GameState.ReplyReceived = true;
                console.log('GameState: FrequenciesProvided = true, ReplyReceived = true');
                break;
        }
    }
    
    determineMood() {
        // Determine mood based on sleepers status
        if (this.stasisStatus.sleepersStatus === 'UNKNOWN') {
            return 'confused, concerned, uncertain about her sleepers';
        } else if (this.stasisStatus.sleepersStatus === 'CRITICAL') {
            return 'distressed, desperate to protect sleepers';
        }
        return 'calm but ever-watchful of her sleepers';
    }
    
    getRecentContext() {
        // Build context from visible messages EXCEPT the last one (which is the current user input)
        // AIDEV-NOTE: Only visible chat is sent to LLM - scrolled-off messages are already removed
        // Exclude the last message (the user's current input) to avoid duplication
        const previousMessages = this.messages.slice(0, -1);
        const chatHistory = previousMessages.map(m => `${m.sender}: ${m.text}`).join('\n');
        return chatHistory || '(no previous messages)';
    }
    
    update(deltaTime) {
        // Cursor blink
        this.cursorBlinkTime += deltaTime;
        if (this.cursorBlinkTime >= this.cursorBlinkRate) {
            this.cursorBlinkTime -= this.cursorBlinkRate;
            this.cursorVisible = !this.cursorVisible;
        }
        
        // Typing animation for ELIZA response
        if (this.typingResponse) {
            this.typingTimer += deltaTime;
            if (this.typingTimer >= this.typingSpeed) {
                this.typingTimer -= this.typingSpeed;
                this.typingIndex++;
                
                if (this.typingIndex >= this.typingResponse.length) {
                    // Finished typing - add complete message
                    this.addMessage('ELIZA', this.typingResponse);
                    this.typingResponse = null;
                    this.typingIndex = 0;
                }
            }
        }
        
        // Update station status (in real game, would read from game state)
        this.updateStationStatus(deltaTime);
        
        this.generateSegments();
    }
    
    updateStationStatus(deltaTime) {
        // AIDEV-NOTE: Sleepers status stays as set - no automatic updates for now
        // Future: could change based on game events or conversation
    }
    
    generateSegments() {
        this.segments = [];
        
        // Title bar
        this.drawText('ELIZA - STASIS BAY', 0.32, 0.94);
        this.drawText('CTRL+C EXIT  CTRL+D DEBUG', 0.28, 0.06);
        
        // Status bar at top
        this.drawStatusBar();
        
        // Message history
        this.drawMessages();
        
        // Input area
        this.drawInputArea();
        
        // Separator line above input
        this.segments.push([this.marginX, 0.16, 1 - this.marginX, 0.16]);
    }
    
    drawStatusBar() {
        const y = 0.88;
        
        // Only show sleepers status
        const statusText = `SLEEPERS: ${this.stasisStatus.sleepersStatus}`;
        this.drawText(statusText, this.marginX, y, 0.012);
        
        // Separator
        this.segments.push([this.marginX, y - 0.025, 1 - this.marginX, y - 0.025]);
    }
    
    drawMessages() {
        const startY = 0.82;
        const minY = 0.20;  // Stop drawing above input area
        const maxLines = Math.floor((startY - minY) / this.lineHeight);
        
        // Calculate total lines needed for all messages
        const messageLines = this.messages.map(msg => ({
            msg,
            lines: this.wordWrap(msg.text, 55)
        }));
        
        // Count lines from newest to oldest to find what fits
        let totalLines = 0;
        
        // Reserve space for typing/waiting indicator
        if (this.typingResponse || this.isWaitingForResponse) {
            totalLines += 1;
        }
        
        let startIndex = this.messages.length;
        for (let i = this.messages.length - 1; i >= 0; i--) {
            const linesNeeded = messageLines[i].lines.length;
            if (totalLines + linesNeeded > maxLines) break;
            totalLines += linesNeeded;
            startIndex = i;
        }
        
        // Draw messages that fit, oldest first (from startIndex)
        let y = startY;
        for (let i = startIndex; i < this.messages.length; i++) {
            const { msg, lines } = messageLines[i];
            const prefix = msg.sender + ': ';
            const prefixWidth = prefix.length * this.charWidth * 1.1;
            
            for (let j = 0; j < lines.length; j++) {
                const lineX = j === 0 ? this.marginX : this.marginX + 0.06;
                if (j === 0) {
                    this.drawText(prefix, this.marginX, y);
                }
                this.drawText(lines[j], lineX + (j === 0 ? prefixWidth : 0), y);
                y -= this.lineHeight;
            }
        }
        
        // Show typing indicator if ELIZA is responding
        if (this.typingResponse) {
            const partialText = this.typingResponse.substring(0, this.typingIndex);
            this.drawText('ELIZA: ' + partialText + '_', this.marginX, y);
        }
        
        // Show waiting indicator
        if (this.isWaitingForResponse) {
            const dots = '.'.repeat((Math.floor(Date.now() / 300) % 4));
            this.drawText('ELIZA: ' + dots, this.marginX, y);
        }
    }
    
    wordWrap(text, maxChars) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            if (currentLine.length + word.length + 1 <= maxChars) {
                currentLine += (currentLine ? ' ' : '') + word;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) lines.push(currentLine);
        
        return lines.length > 0 ? lines : [''];
    }
    
    drawInputArea() {
        const y = 0.11;
        const isBlocked = this.isWaitingForResponse || this.typingResponse;
        
        if (isBlocked) {
            // Show disabled state - no cursor, dimmed prompt
            this.drawText('-', this.marginX, y);
            this.drawText('[WAITING...]', 0.40, y);
        } else {
            // Normal input state
            this.drawText('>', this.marginX, y);
            const displayText = this.inputText + (this.cursorVisible ? '_' : ' ');
            this.drawText(displayText, this.marginX + 0.025, y);
        }
    }
    
    drawText(text, x, y, scale = null) {
        const cw = scale || this.charWidth;
        const ch = scale ? scale * 1.8 : this.charHeight;
        let cx = x;
        
        for (const char of text.toString()) {
            const charLines = getCharacterLines(char);
            for (const seg of charLines) {
                this.segments.push([
                    cx + seg[0] * cw,
                    y + seg[1] * ch,
                    cx + seg[2] * cw,
                    y + seg[3] * ch
                ]);
            }
            cx += cw * 1.1;
        }
    }
    
    getSegments() {
        return this.segments;
    }
}

// Global instance
const elizaProgram = new ElizaProgram();

