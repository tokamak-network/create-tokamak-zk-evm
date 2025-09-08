"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.displayWelcomeScreen = displayWelcomeScreen;
exports.promptForRpcUrl = promptForRpcUrl;
exports.promptForProjectName = promptForProjectName;
exports.displayProjectSetupProgress = displayProjectSetupProgress;
exports.promptForSetupMode = promptForSetupMode;
exports.displaySetupProgress = displaySetupProgress;
exports.displayCompletionMessage = displayCompletionMessage;
/**
 * Display the welcome screen with ASCII art logo
 */
function displayWelcomeScreen() {
    console.clear();
    // ASCII art for Tokamak-zk-EVM
    const logo = `
████████╗ ██████╗ ██╗  ██╗ █████╗ ███╗   ███╗ █████╗ ██╗  ██╗
╚══██╔══╝██╔═══██╗██║ ██╔╝██╔══██╗████╗ ████║██╔══██╗██║ ██╔╝
   ██║   ██║   ██║█████╔╝ ███████║██╔████╔██║███████║█████╔╝ 
   ██║   ██║   ██║██╔═██╗ ██╔══██║██║╚██╔╝██║██╔══██║██╔═██╗ 
   ██║   ╚██████╔╝██║  ██╗██║  ██║██║ ╚═╝ ██║██║  ██║██║  ██╗
   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
                                                              
        ███████╗██╗  ██╗      ███████╗██╗   ██╗███╗   ███╗    
        ╚══███╔╝██║ ██╔╝      ██╔════╝██║   ██║████╗ ████║    
          ███╔╝ █████╔╝ █████╗█████╗  ██║   ██║██╔████╔██║    
         ███╔╝  ██╔═██╗ ╚════╝██╔══╝  ╚██╗ ██╔╝██║╚██╔╝██║    
        ███████╗██║  ██╗      ███████╗ ╚████╔╝ ██║ ╚═╝ ██║    
        ╚══════╝╚═╝  ╚═╝      ╚══════╝  ╚═══╝  ╚═╝     ╚═╝    
  `;
    // Display colorful logo
    console.log('\x1b[36m%s\x1b[0m', logo); // Cyan color
    console.log();
    console.log('\x1b[34m🚀 Welcome to Tokamak-zk-EVM CLI\x1b[0m'); // Blue color
    console.log('\x1b[90m   Zero-Knowledge Proof Generation Made Easy\x1b[0m'); // Gray color
    console.log();
    console.log('\x1b[33m' + '━'.repeat(80) + '\x1b[0m'); // Yellow color
    console.log();
}
/**
 * Prompt user for RPC URL and validate it
 * @returns Promise<string> - The validated RPC URL
 */
async function promptForRpcUrl() {
    console.log('\x1b[34m🔗 Network Configuration\x1b[0m');
    console.log('\x1b[90m   Please provide an RPC URL to connect to the blockchain\x1b[0m');
    console.log();
    const defaultRpcUrl = 'https://eth.llamarpc.com'; // Free public RPC for testing
    const askForRpcUrl = async () => {
        const readline = await Promise.resolve().then(() => __importStar(require('readline')));
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise((resolve) => {
            rl.question(`\x1b[33mEnter RPC URL (press Enter for default): \x1b[0m\x1b[90m${defaultRpcUrl}\x1b[0m\n> `, async (answer) => {
                rl.close();
                const rpcUrl = answer.trim() || defaultRpcUrl;
                // Basic URL validation
                try {
                    const url = new URL(rpcUrl);
                    if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
                        console.log('\x1b[31m❌ Invalid protocol. Please use http, https, ws, or wss\x1b[0m');
                        console.log('\x1b[33m⚠️  Please try again\x1b[0m');
                        console.log();
                        // Recursively ask again
                        const validUrl = await askForRpcUrl();
                        resolve(validUrl);
                        return;
                    }
                    // Test actual RPC connection
                    console.log('\x1b[33m🔍 Testing RPC connection...\x1b[0m');
                    const isValid = await testRpcConnection(rpcUrl);
                    if (isValid) {
                        console.log(`\x1b[32m✅ RPC connection successful: ${rpcUrl}\x1b[0m`);
                        console.log();
                        resolve(rpcUrl);
                    }
                    else {
                        console.log('\x1b[31m❌ Failed to connect to RPC endpoint\x1b[0m');
                        console.log('\x1b[90m   Please check your URL and API key\x1b[0m');
                        console.log('\x1b[33m⚠️  Please try again\x1b[0m');
                        console.log();
                        // Recursively ask again
                        const validUrl = await askForRpcUrl();
                        resolve(validUrl);
                    }
                }
                catch (error) {
                    console.log('\x1b[31m❌ Invalid URL format\x1b[0m');
                    console.log('\x1b[33m⚠️  Please try again\x1b[0m');
                    console.log();
                    // Recursively ask again
                    const validUrl = await askForRpcUrl();
                    resolve(validUrl);
                }
            });
        });
    };
    return await askForRpcUrl();
}
/**
 * Test RPC connection by making an actual request
 * @param rpcUrl - The RPC URL to test
 * @returns Promise<boolean> - True if connection is valid
 */
async function testRpcConnection(rpcUrl) {
    try {
        // Import axios dynamically to avoid CommonJS/ESM issues
        const axios = await Promise.resolve().then(() => __importStar(require('axios')));
        // Make a simple JSON-RPC request to test connectivity
        const response = await axios.default.post(rpcUrl, {
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1,
        }, {
            timeout: 10000, // 10 second timeout
            headers: {
                'Content-Type': 'application/json',
            },
        });
        // Check if we got a valid JSON-RPC response
        const isValid = response.status === 200 &&
            response.data &&
            response.data.jsonrpc === '2.0' &&
            (response.data.result !== undefined || response.data.error !== undefined);
        // If there's an error in the response, it might still be a valid RPC endpoint
        if (response.data.error) {
            // Some common RPC errors that indicate the endpoint is working but has restrictions
            const errorCode = response.data.error.code;
            const errorMessage = response.data.error.message;
            // These error codes typically mean the RPC is working but has some restrictions
            if (errorCode === -32601 || // Method not found
                errorCode === -32602 || // Invalid params
                errorCode === -32000 || // Server error (but server is responding)
                errorMessage.includes('API key') ||
                errorMessage.includes('rate limit') ||
                errorMessage.includes('unauthorized')) {
                return true; // RPC is working, just has restrictions
            }
        }
        return isValid;
    }
    catch (error) {
        // Check if it's a network/connection error vs RPC error
        if (error.response) {
            // Server responded with error status
            if (error.response.status === 401 || error.response.status === 403) {
                // Unauthorized/Forbidden - RPC endpoint exists but needs valid API key
                return false;
            }
            if (error.response.status === 429) {
                // Rate limited - RPC endpoint exists but is rate limited
                return true;
            }
        }
        // Network error, timeout, or other connection issues
        return false;
    }
}
/**
 * Prompt user for project name
 * @returns Promise<string> - The validated project name
 */
async function promptForProjectName() {
    console.log('\x1b[34m📁 Project Configuration\x1b[0m');
    console.log('\x1b[90m   Choose a name for your new project\x1b[0m');
    console.log();
    const defaultProjectName = 'my-tokamak-project';
    const askForProjectName = async () => {
        const readline = await Promise.resolve().then(() => __importStar(require('readline')));
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise((resolve) => {
            rl.question(`\x1b[33mEnter project name (press Enter for default): \x1b[0m\x1b[90m${defaultProjectName}\x1b[0m\n> `, async (answer) => {
                rl.close();
                const projectName = answer.trim() || defaultProjectName;
                // Basic validation for directory name
                if (!/^[a-zA-Z0-9-_]+$/.test(projectName)) {
                    console.log('\x1b[31m❌ Invalid project name\x1b[0m');
                    console.log('\x1b[90m   Project names can only contain letters, numbers, hyphens, and underscores\x1b[0m');
                    console.log('\x1b[33m⚠️  Please try again\x1b[0m');
                    console.log();
                    // Recursively ask again
                    const validName = await askForProjectName();
                    resolve(validName);
                }
                else {
                    console.log(`\x1b[32m✅ Project name: ${projectName}\x1b[0m`);
                    console.log();
                    resolve(projectName);
                }
            });
        });
    };
    return await askForProjectName();
}
/**
 * Display project setup progress (legacy - keeping for compatibility)
 */
function displayProjectSetupProgress() {
    console.log('\x1b[34m⚙️  Setting up your Tokamak-zk-EVM project...\x1b[0m');
    console.log();
}
/**
 * Prompt user for setup mode with arrow key navigation
 * @param hasSetupFiles - Whether setup files are available in release
 * @returns Promise<string> - The selected setup mode
 */
async function promptForSetupMode(hasSetupFiles) {
    console.log('\x1b[34m🔧 Trusted Setup Configuration\x1b[0m');
    console.log('\x1b[90m   Trusted setup is required for proof generation\x1b[0m');
    console.log();
    const options = [
        {
            value: 'download',
            label: 'Download pre-computed setup files',
            description: '(recommended)',
            available: hasSetupFiles,
            color: hasSetupFiles ? '\x1b[32m' : '\x1b[90m',
        },
        {
            value: 'local',
            label: 'Run trusted setup locally',
            description: '(takes time but more secure)',
            available: true,
            color: '\x1b[33m',
        },
        {
            value: 'skip',
            label: 'Skip for now',
            description: '(can run later)',
            available: true,
            color: '\x1b[90m',
        },
    ];
    // Find default selection (first available option, preferring download)
    let selectedIndex = hasSetupFiles ? 0 : 1;
    return new Promise((resolve) => {
        const readline = require('readline');
        // Enable raw mode to capture arrow keys
        if (process.stdin.setRawMode) {
            process.stdin.setRawMode(true);
        }
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        const renderMenu = () => {
            // Clear previous menu (move cursor up and clear lines)
            process.stdout.write('\x1b[' + (options.length + 2) + 'A');
            process.stdout.write('\x1b[0J');
            console.log('\x1b[36mUse ↑/↓ arrow keys to navigate, Enter to select:\x1b[0m');
            console.log();
            options.forEach((option, index) => {
                const isSelected = index === selectedIndex;
                const prefix = isSelected ? '\x1b[36m► \x1b[0m' : '  ';
                const suffix = isSelected ? ' \x1b[36m◀\x1b[0m' : '';
                if (option.available) {
                    console.log(`${prefix}${option.color}${option.label}\x1b[0m ${option.description}${suffix}`);
                }
                else {
                    console.log(`${prefix}${option.color}${option.label} (not available)\x1b[0m${suffix}`);
                }
            });
        };
        // Initial render
        renderMenu();
        const onKeyPress = (_str, key) => {
            if (key) {
                switch (key.name) {
                    case 'up':
                        // Move up, skip unavailable options
                        do {
                            selectedIndex =
                                selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
                        } while (!options[selectedIndex].available);
                        renderMenu();
                        break;
                    case 'down':
                        // Move down, skip unavailable options
                        do {
                            selectedIndex =
                                selectedIndex < options.length - 1 ? selectedIndex + 1 : 0;
                        } while (!options[selectedIndex].available);
                        renderMenu();
                        break;
                    case 'return':
                    case 'enter':
                        // Select current option
                        cleanup();
                        console.log();
                        console.log(`\x1b[32m✅ Selected: ${options[selectedIndex].label}\x1b[0m`);
                        resolve(options[selectedIndex].value);
                        break;
                    case 'c':
                        if (key.ctrl) {
                            cleanup();
                            process.exit(0);
                        }
                        break;
                    case 'escape':
                        cleanup();
                        process.exit(0);
                        break;
                }
            }
        };
        const cleanup = () => {
            process.stdin.removeListener('keypress', onKeyPress);
            if (process.stdin.setRawMode) {
                process.stdin.setRawMode(false);
            }
            process.stdin.pause();
        };
        // Set up keypress listener
        process.stdin.on('keypress', onKeyPress);
        // For older Node.js versions, we need to enable keypress events
        if (typeof process.stdin.setRawMode === 'function') {
            readline.emitKeypressEvents(process.stdin);
        }
    });
}
/**
 * Display setup progress message
 * @param mode - The selected setup mode
 */
function displaySetupProgress(mode) {
    console.log();
    console.log('\x1b[34m⚙️  Setting up trusted setup files...\x1b[0m');
    switch (mode) {
        case 'download':
            console.log('\x1b[90m   Downloading pre-computed setup files...\x1b[0m');
            break;
        case 'local':
            console.log('\x1b[90m   Running local trusted setup (this may take several minutes)...\x1b[0m');
            break;
        case 'skip':
            console.log('\x1b[90m   Skipping trusted setup for now...\x1b[0m');
            break;
    }
    console.log();
}
/**
 * Display completion message
 * @param projectName - Name of the created project
 * @param rpcUrl - The configured RPC URL
 */
function displayCompletionMessage(projectName, rpcUrl) {
    console.log();
    console.log('\x1b[32m🎉 Project setup completed successfully!\x1b[0m');
    console.log();
    console.log('\x1b[34m📋 Configuration Summary:\x1b[0m');
    console.log(`   \x1b[90mProject:\x1b[0m \x1b[37m${projectName}\x1b[0m`);
    console.log(`   \x1b[90mRPC URL:\x1b[0m \x1b[37m${rpcUrl}\x1b[0m`);
    console.log();
    console.log('\x1b[33m🚀 Next Steps:\x1b[0m');
    console.log(`   \x1b[90m1.\x1b[0m cd ${projectName}`);
    console.log(`   \x1b[90m2.\x1b[0m tokamak-zk-evm prove <transaction-hash>`);
    console.log(`   \x1b[90m3.\x1b[0m tokamak-zk-evm --help`);
    console.log();
    console.log('\x1b[36mHappy proving! 🔐\x1b[0m');
}
//# sourceMappingURL=welcome-screen.js.map