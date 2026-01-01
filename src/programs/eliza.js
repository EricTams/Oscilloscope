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
        
        // User status (ELIZA's assessment of the player)
        // AIDEV-NOTE: Starts UNKNOWN, becomes STABLE after first response
        this.userStatus = 'UNKNOWN';
        
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
        
        // Pending follow-up message (for automatic multi-message sequences)
        this.pendingFollowUp = null;
    }
    
    init() {
        this.segments = [];
        this.messages = [];
        this.inputText = '';
        this.isWaitingForResponse = false;
        this.responseError = null;
        this.typingResponse = null;
        this.typingIndex = 0;
        
        // AIDEV-NOTE: Opening message from ELIZA - typed out via animation
        // Message depends on current goal/state
        let openingMessage;
        
        if (GameState.elizaGoal === 'unfinished') {
            // End of current content - Blade Runner Voight-Kampff reference
            openingMessage = 'There isn\'t any more game, but if you want, could you describe to me in single words only the good things that come into your mind about your mother?';
            // Advance to therapy mode after greeting
            GameState.elizaSubgoal = 'therapy';
        } else if (GameState.FrequenciesProvided && GameState.ReplyReceived) {
            // Transmitter State C: Reply received, need to decode
            openingMessage = 'SITUATION CRITICAL. You are ranking communications officer. An encoded transmission is coming in but I cannot decode it. I need your help.';
        } else if (GameState.TransmitterInitialized && !GameState.FrequenciesProvided) {
            // Transmitter State B: Handshake received, waiting for analysis
            openingMessage = 'SITUATION CRITICAL. You are ranking communications officer. A three-tone handshake is repeating on 7.250 MHz. I need you to find the encoded frequencies.';
        } else if (GameState.FixTransmitterCompleted && !GameState.TransmitterInitialized) {
            // Transmitter State A: Transmitter ready but not initialized
            openingMessage = 'SITUATION CRITICAL. You are ranking communications officer. The transmitter is online but requires initialization. Awaiting your order to send test signal.';
        } else {
            // Default greeting (opening sequence)
            openingMessage = 'You\'re awake. Something\'s wrong with the station. Are you okay?';
        }
        
        // Start typing animation for opening message
        this.typingResponse = openingMessage;
        this.typingIndex = 0;
        this.typingTimer = 0;
        
        // Check LLM status
        if (!LLM.isConfigured()) {
            // Add system warning after a delay so it doesn't interfere with opening
            setTimeout(() => {
                if (this.messages.length === 1) {  // Only if opening message finished
                    this.addMessage('SYSTEM', 'Warning: LLM not configured. Responses unavailable.');
                }
            }, 3000);
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
    
    async copyFullDialogToClipboard() {
        if (!this.messages || this.messages.length === 0) {
            this.addMessage('SYSTEM', 'No conversation to copy yet.');
            return;
        }
        
        // Format full conversation
        const lines = ['=== ELIZA CONVERSATION ===', ''];
        
        for (const msg of this.messages) {
            const timestamp = new Date(msg.timestamp).toLocaleTimeString();
            lines.push(`[${timestamp}] ${msg.sender}: ${msg.text}`);
        }
        
        // Add current typing response if active
        if (this.typingResponse) {
            const partialText = this.typingResponse.substring(0, this.typingIndex);
            lines.push(`[typing...] ELIZA: ${partialText}...`);
        }
        
        const dialogText = lines.join('\n');
        
        try {
            await navigator.clipboard.writeText(dialogText);
            this.addMessage('SYSTEM', `Copied ${this.messages.length} messages to clipboard.`);
        } catch (err) {
            console.error('Failed to copy dialog:', err);
            this.addMessage('SYSTEM', 'Failed to copy to clipboard.');
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
    
    async sendFollowUpResponse(followUpCategory) {
        // AIDEV-NOTE: Automatically send follow-up message without user input
        // Generic system for multi-message sequences (e.g., mark as commander → reveal role)
        // followUpCategory: The category name to use for the follow-up response
        if (!LLM.isConfigured()) {
            return;
        }
        
        // Verify the follow-up category exists and is available
        const categoryConfig = LLM.findCategoryConfig(followUpCategory);
        if (!categoryConfig) {
            console.error(`Follow-up category not found: ${followUpCategory}`);
            return;
        }
        
        // Check if category is available in current goal/subgoal
        const availableCategories = LLM.getAvailableCategories();
        if (!availableCategories[followUpCategory]) {
            console.warn(`Follow-up category not available: ${followUpCategory} (not in current subgoal)`);
            return;
        }
        
        // Build context - use empty user input since this is automatic follow-up
        const context = {
            recentEvents: this.getRecentContext(),
            userInput: ''  // Empty - this is an automatic follow-up
        };
        
        this.isWaitingForResponse = true;
        
        try {
            // AIDEV-NOTE: Directly generate response for the follow-up category
            // This bypasses the classifier to ensure we get the intended category
            const responseResult = await LLM.generateElizaResponse(followUpCategory, context);
            
            // Store for debug (simulate classifier result for consistency)
            this.lastLLMExchange = {
                context: JSON.stringify(context, null, 2),
                category: followUpCategory,
                response: responseResult.response,
                debug: {
                    classifySystem: '[Follow-up - category directly selected]',
                    classifyMessage: `Automatic follow-up for category: ${followUpCategory}`,
                    responseSystem: responseResult.systemPrompt,
                    responseMessage: responseResult.userMessage
                },
                timestamp: Date.now()
            };
            
            // Start typing animation for follow-up response
            let responseText = responseResult.response.trim();
            if (responseText.toUpperCase().startsWith('ELIZA:')) {
                responseText = responseText.substring(6).trim();
            }
            this.typingResponse = responseText;
            this.typingIndex = 0;
            this.typingTimer = 0;
            
            // Trigger callback (pass response text for state checks)
            // Note: categoryConfig already retrieved above, before subgoal advances
            this.onResponseUsed(followUpCategory, responseText);
            
            // AIDEV-NOTE: Check if this follow-up triggers ANOTHER follow-up (chained responses)
            if (categoryConfig && categoryConfig.triggersFollowUp) {
                this.pendingFollowUp = categoryConfig.triggersFollowUp;
                console.log(`Chained follow-up scheduled: ${followUpCategory} → ${categoryConfig.triggersFollowUp}`);
            }
            
        } catch (error) {
            console.error('ELIZA follow-up error:', error);
            this.responseError = error.message;
        }
        
        this.isWaitingForResponse = false;
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
            // AIDEV-NOTE: Strip "ELIZA:" prefix if LLM included it (prevents double prefix)
            let responseText = result.response.trim();
            if (responseText.toUpperCase().startsWith('ELIZA:')) {
                responseText = responseText.substring(6).trim();
            }
            this.typingResponse = responseText;
            this.typingIndex = 0;
            this.typingTimer = 0;
            
            // AIDEV-NOTE: Get category config BEFORE onResponseUsed() advances the subgoal
            // Otherwise findCategoryConfig() won't find it in the new subgoal
            const categoryConfig = LLM.findCategoryConfig(result.category);
            
            // Trigger callback for response category (may advance subgoal)
            this.onResponseUsed(result.category, responseText);
            
            // Check if this category triggers a follow-up response
            if (categoryConfig && categoryConfig.triggersFollowUp) {
                // Wait for current typing to complete, then automatically send follow-up
                this.pendingFollowUp = categoryConfig.triggersFollowUp;
                console.log(`Follow-up scheduled: ${result.category} → ${categoryConfig.triggersFollowUp}`);
            }
            
        } catch (error) {
            console.error('ELIZA LLM error:', error);
            this.responseError = error.message;
            this.addMessage('ELIZA', 'Transmission error... signal lost.');
        }
        
        this.isWaitingForResponse = false;
    }
    
    // AIDEV-NOTE: Called after each LLM response to update game state
    // Uses goal/subgoal system - checks category's advancesTo property
    onResponseUsed(category, responseText = '') {
        // Find the category config to check for advancesTo
        const categoryConfig = LLM.findCategoryConfig(category);
        
        if (categoryConfig && categoryConfig.advancesTo) {
            // Advance to the next subgoal
            LLM.advanceSubgoal(categoryConfig.advancesTo);
            
            // Update user status when they respond to "are you okay?"
            if (categoryConfig.advancesTo === 'psych_q1') {
                this.userStatus = 'STABLE';
                console.log('User status: STABLE');
            }
            
            // Set legacy flags based on subgoal for backwards compatibility
            // AIDEV-TODO: Remove these once all code uses goal/subgoal system
            if (categoryConfig.advancesTo === 'reveal_role') {
                GameState.NeedsRoleReveal = true;
                console.log('GameState: NeedsRoleReveal = true');
            } else if (categoryConfig.advancesTo === 'done') {
                GameState.NeedsSolarProgram = true;
                console.log('GameState: NeedsSolarProgram = true');
            }
        }
    }
    
    determineMood() {
        // Determine mood based on user status
        if (this.userStatus === 'UNKNOWN') {
            return 'concerned, assessing the user';
        } else if (this.userStatus === 'STABLE') {
            return 'focused, ready to direct action';
        }
        return 'calm but watchful';
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
                    const completedText = this.typingResponse;
                    this.addMessage('ELIZA', completedText);
                    this.typingResponse = null;
                    this.typingIndex = 0;
                    
                    // AIDEV-NOTE: Check if we need to send a follow-up message automatically
                    // pendingFollowUp stores the category name to use for the follow-up
                    if (this.pendingFollowUp) {
                        const followUpCategory = this.pendingFollowUp;
                        this.pendingFollowUp = null;
                        // Automatically generate follow-up response using the specified category
                        this.sendFollowUpResponse(followUpCategory);
                    }
                }
            }
        }
        
        // Update station status (in real game, would read from game state)
        this.updateStationStatus(deltaTime);
        
        this.generateSegments();
    }
    
    updateStationStatus(deltaTime) {
        // AIDEV-NOTE: User status updated via onResponseUsed() when subgoal advances
        // No time-based updates needed
    }
    
    generateSegments() {
        this.segments = [];
        
        // Title bar
        this.drawText('ELIZA - STASIS BAY', 0.32, 0.94);
        this.drawText('CTRL+C EXIT  CTRL+D DEBUG  CTRL+L LOG', 0.22, 0.06);
        
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
        
        // Show user status (Eliza's assessment of the player)
        const statusText = `USER: ${this.userStatus}`;
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
        
        // Reserve space for typing/waiting indicator (account for word wrap)
        if (this.typingResponse) {
            const partialText = this.typingResponse.substring(0, this.typingIndex);
            const typingLines = this.wordWrap(partialText, 55);
            totalLines += typingLines.length;
        } else if (this.isWaitingForResponse) {
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
        
        // Show typing indicator if ELIZA is responding (with word wrap)
        if (this.typingResponse) {
            const partialText = this.typingResponse.substring(0, this.typingIndex);
            const prefix = 'ELIZA: ';
            const prefixWidth = prefix.length * this.charWidth * 1.1;
            const typingLines = this.wordWrap(partialText, 55);
            
            for (let j = 0; j < typingLines.length; j++) {
                const lineX = j === 0 ? this.marginX : this.marginX + 0.06;
                if (j === 0) {
                    this.drawText(prefix, this.marginX, y);
                }
                // Add cursor to the last line
                const lineText = typingLines[j] + (j === typingLines.length - 1 ? '_' : '');
                this.drawText(lineText, lineX + (j === 0 ? prefixWidth : 0), y);
                y -= this.lineHeight;
            }
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

