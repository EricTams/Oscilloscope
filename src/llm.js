// AIDEV-NOTE: LLM wrapper for OpenAI API calls
// Handles API key validation, setup screen, and prompt templating
// AIDEV-NOTE: API key stored in localStorage, checked before global OPENAI_API_KEY

const LLM = {
    // OpenAI API endpoint
    API_URL: 'https://api.openai.com/v1/chat/completions',
    
    // Default model - can be overridden in request options
    DEFAULT_MODEL: 'gpt-4o-mini',
    
    // LocalStorage key for API key
    STORAGE_KEY: 'oscilloscope_openai_key',
    
    // Track if user chose to skip LLM features
    _skipped: false,

    /**
     * Get the API key from localStorage or global variable
     * @returns {string|null}
     */
    getApiKey() {
        // Check localStorage first
        const storedKey = localStorage.getItem(this.STORAGE_KEY);
        if (storedKey && storedKey.startsWith('sk-')) {
            return storedKey;
        }
        // Fall back to global variable (from secrets.js)
        if (typeof OPENAI_API_KEY !== 'undefined' && OPENAI_API_KEY && OPENAI_API_KEY !== 'sk-your-key-here') {
            return OPENAI_API_KEY;
        }
        return null;
    },

    /**
     * Save API key to localStorage
     * @param {string} key
     * @returns {boolean} True if valid and saved
     */
    saveApiKey(key) {
        if (!key || !key.startsWith('sk-')) {
            return false;
        }
        localStorage.setItem(this.STORAGE_KEY, key.trim());
        return true;
    },

    /**
     * Clear stored API key
     */
    clearApiKey() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    /**
     * Check if OpenAI API key is configured and valid-looking
     * @returns {boolean}
     */
    isConfigured() {
        if (this._skipped) return false;
        return this.getApiKey() !== null;
    },

    /**
     * Fill template placeholders with values
     * @param {string} template - Template with {{placeholder}} syntax
     * @param {Object} values - Key-value pairs to insert
     * @returns {string}
     */
    fillTemplate(template, values) {
        return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
            return values[key] !== undefined ? values[key] : '';
        });
    },

    /**
     * Show the API key setup screen
     * Shows different UI based on whether a key already exists
     */
    showSetupScreen() {
        const overlay = document.getElementById('llm-setup-overlay');
        const stateNew = document.getElementById('llm-state-new');
        const stateExists = document.getElementById('llm-state-exists');
        
        if (!overlay) return;
        
        // Show appropriate state based on whether key exists
        const hasKey = this.getApiKey() !== null;
        
        if (stateNew) stateNew.style.display = hasKey ? 'none' : 'block';
        if (stateExists) stateExists.style.display = hasKey ? 'block' : 'none';
        
        overlay.style.display = 'flex';
    },

    /**
     * Hide the setup screen
     */
    hideSetupScreen() {
        const overlay = document.getElementById('llm-setup-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },
    
    /**
     * Switch to the "new key" state (for changing key)
     */
    showNewKeyState() {
        const stateNew = document.getElementById('llm-state-new');
        const stateExists = document.getElementById('llm-state-exists');
        const keyInput = document.getElementById('llm-api-key-input');
        
        if (stateNew) stateNew.style.display = 'block';
        if (stateExists) stateExists.style.display = 'none';
        if (keyInput) {
            keyInput.value = '';
            keyInput.focus();
        }
    },

    /**
     * Copy text to clipboard with fallback
     * @param {string} text
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            return false;
        }
    },

    /**
     * Handle retry button - reload the page to re-check for secrets.js
     */
    retry() {
        window.location.reload();
    },

    /**
     * Handle skip button - continue without LLM features
     */
    skip() {
        this._skipped = true;
        this.hideSetupScreen();
        // Dispatch event so game knows to continue
        window.dispatchEvent(new CustomEvent('llm-setup-complete', { detail: { skipped: true } }));
    },

    /**
     * Make a request to OpenAI chat completions API
     * @param {string} systemPrompt - System message
     * @param {string} userPrompt - User message
     * @param {Object} options - Optional settings (model, temperature, max_tokens)
     * @returns {Promise<string>} Response text
     */
    async request(systemPrompt, userPrompt, options = {}) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('LLM not configured - API key missing');
        }

        const model = options.model || this.DEFAULT_MODEL;
        const temperature = options.temperature ?? 0.7;
        const maxTokens = options.max_tokens ?? 150;

        const response = await fetch(this.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: temperature,
                max_tokens: maxTokens
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    },

    /**
     * Get available categories based on GameState flags
     * @returns {Object} Map of category name to category config
     */
    getAvailableCategories() {
        const available = {};
        
        for (const [name, config] of Object.entries(PROMPTS.categories)) {
            // Check requiresFlag - if set, GameState[flag] must be true
            if (config.requiresFlag && !GameState[config.requiresFlag]) {
                continue;
            }
            // Check removedByFlag - if set and true, skip this category
            if (config.removedByFlag && GameState[config.removedByFlag]) {
                continue;
            }
            available[name] = config;
        }
        
        return available;
    },

    /**
     * Build classifier system prompt from available categories
     * @returns {string} Complete system prompt with available categories
     */
    buildClassifierPrompt() {
        const categories = this.getAvailableCategories();
        const categoryLines = Object.entries(categories)
            .map(([name, config]) => `${name} - ${config.description}`)
            .join('\n');
        
        return PROMPTS.classifierBase.prefix + categoryLines + PROMPTS.classifierBase.suffix;
    },

    /**
     * Classify user input into a category
     * AIDEV-NOTE: Categories are filtered based on GameState flags
     * @param {Object} context - Context with userInput and recentEvents
     * @returns {Promise<{category: string, systemPrompt: string, userMessage: string}>}
     */
    async classifyInput(context) {
        const systemPrompt = this.buildClassifierPrompt();
        const userMessage = this.fillTemplate(PROMPTS.classifierBase.template, context);
        const result = await this.request(systemPrompt, userMessage, { 
            max_tokens: 20, 
            temperature: 0 
        });
        // Clean up response - should be just the category name
        return {
            category: result.trim(),
            systemPrompt,
            userMessage
        };
    },

    /**
     * Generate Eliza response based on category
     * @param {string} category - Category from classifyInput
     * @param {Object} context - Context with userInput, recentEvents
     * @returns {Promise<{response: string, systemPrompt: string, userMessage: string}>}
     */
    async generateElizaResponse(category, context) {
        const categoryConfig = PROMPTS.categories[category];
        if (!categoryConfig) {
            // Fallback to PlayerOther if unknown category
            console.warn(`Unknown category: ${category}, falling back to PlayerOther`);
            return this.generateElizaResponse('PlayerOther', context);
        }
        
        const userMessage = this.fillTemplate(categoryConfig.template, context);
        const response = await this.request(categoryConfig.system, userMessage, { 
            max_tokens: 80, 
            temperature: 0.8 
        });
        
        return {
            response,
            systemPrompt: categoryConfig.system,
            userMessage
        };
    },

    /**
     * Full Eliza chat: classify then respond
     * AIDEV-NOTE: Categories are filtered based on GameState flags
     * @param {Object} context - Context with userInput, recentEvents
     * @returns {Promise<{category: string, response: string, debug: object}>} Category, response, and debug info
     */
    async elizaChat(context) {
        // Step 1: Classify the input (categories filtered by GameState)
        const classifyResult = await this.classifyInput(context);
        const category = classifyResult.category;
        
        // Step 2: Generate response based on category
        const responseResult = await this.generateElizaResponse(category, context);
        
        // Return with debug info
        return { 
            category, 
            response: responseResult.response,
            debug: {
                classifySystem: classifyResult.systemPrompt,
                classifyMessage: classifyResult.userMessage,
                responseSystem: responseResult.systemPrompt,
                responseMessage: responseResult.userMessage
            }
        };
    },

    /**
     * Initialize setup screen event handlers
     */
    initSetupHandlers() {
        // API key input
        const keyInput = document.getElementById('llm-api-key-input');
        
        // Save key button (new key state)
        const saveBtn = document.getElementById('llm-save-key');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (!keyInput) return;
                
                const key = keyInput.value.trim();
                if (!key) {
                    saveBtn.textContent = 'Enter a key first';
                    setTimeout(() => { saveBtn.textContent = 'Save Key'; }, 2000);
                    return;
                }
                
                if (!key.startsWith('sk-')) {
                    saveBtn.textContent = 'Invalid key format';
                    setTimeout(() => { saveBtn.textContent = 'Save Key'; }, 2000);
                    return;
                }
                
                if (this.saveApiKey(key)) {
                    saveBtn.textContent = 'Saved!';
                    this.hideSetupScreen();
                    window.dispatchEvent(new CustomEvent('llm-setup-complete', { detail: { skipped: false } }));
                } else {
                    saveBtn.textContent = 'Save failed';
                    setTimeout(() => { saveBtn.textContent = 'Save Key'; }, 2000);
                }
            });
        }
        
        // Allow Enter key to submit
        if (keyInput) {
            keyInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && saveBtn) {
                    saveBtn.click();
                }
            });
        }

        // Skip button (new key state)
        const skipBtn = document.getElementById('llm-skip');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.skip());
        }
        
        // Continue with existing key button
        const continueBtn = document.getElementById('llm-continue');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.hideSetupScreen();
                window.dispatchEvent(new CustomEvent('llm-setup-complete', { detail: { skipped: false } }));
            });
        }
        
        // Change key button - clears key and shows input
        const changeBtn = document.getElementById('llm-change-key');
        if (changeBtn) {
            changeBtn.addEventListener('click', () => {
                this.clearApiKey();
                this.showNewKeyState();
            });
        }
        
        // Skip with existing key button
        const skipExistingBtn = document.getElementById('llm-skip-existing');
        if (skipExistingBtn) {
            skipExistingBtn.addEventListener('click', () => this.skip());
        }
    }
};

// Freeze the LLM object to prevent accidental modification of methods
Object.freeze(LLM);

