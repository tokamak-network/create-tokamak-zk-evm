/**
 * Display the welcome screen with ASCII art logo
 */
export function displayWelcomeScreen(): void {
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
export async function promptForRpcUrl(): Promise<string> {
  console.log('\x1b[34m🔗 Network Configuration\x1b[0m');
  console.log(
    '\x1b[90m   Please provide an RPC URL to connect to the blockchain\x1b[0m'
  );
  console.log();

  const defaultRpcUrl = 'https://eth.llamarpc.com'; // Free public RPC for testing
  
  const askForRpcUrl = async (): Promise<string> => {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(
        `\x1b[33mEnter RPC URL (press Enter for default): \x1b[0m\x1b[90m${defaultRpcUrl}\x1b[0m\n> `,
        async (answer) => {
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
            } else {
              console.log('\x1b[31m❌ Failed to connect to RPC endpoint\x1b[0m');
              console.log('\x1b[90m   Please check your URL and API key\x1b[0m');
              console.log('\x1b[33m⚠️  Please try again\x1b[0m');
              console.log();
              // Recursively ask again
              const validUrl = await askForRpcUrl();
              resolve(validUrl);
            }
          } catch (error) {
            console.log('\x1b[31m❌ Invalid URL format\x1b[0m');
            console.log('\x1b[33m⚠️  Please try again\x1b[0m');
            console.log();
            // Recursively ask again
            const validUrl = await askForRpcUrl();
            resolve(validUrl);
          }
        }
      );
    });
  };

  return await askForRpcUrl();
}

/**
 * Test RPC connection by making an actual request
 * @param rpcUrl - The RPC URL to test
 * @returns Promise<boolean> - True if connection is valid
 */
async function testRpcConnection(rpcUrl: string): Promise<boolean> {
  try {
    // Import axios dynamically to avoid CommonJS/ESM issues
    const axios = await import('axios');
    
    // Make a simple JSON-RPC request to test connectivity
    const response = await axios.default.post(
      rpcUrl,
      {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      },
      {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

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
  } catch (error: any) {
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
export async function promptForProjectName(): Promise<string> {
  console.log('\x1b[34m📁 Project Configuration\x1b[0m');
  console.log('\x1b[90m   Choose a name for your new project\x1b[0m');
  console.log();

  const defaultProjectName = 'my-tokamak-project';
  
  const askForProjectName = async (): Promise<string> => {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(
        `\x1b[33mEnter project name (press Enter for default): \x1b[0m\x1b[90m${defaultProjectName}\x1b[0m\n> `,
        async (answer) => {
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
          } else {
            console.log(`\x1b[32m✅ Project name: ${projectName}\x1b[0m`);
            console.log();
            resolve(projectName);
          }
        }
      );
    });
  };

  return await askForProjectName();
}

/**
 * Display project setup progress
 */
export function displaySetupProgress(): void {
  console.log('\x1b[34m⚙️  Setting up your Tokamak-zk-EVM project...\x1b[0m');
  console.log();
}

/**
 * Display completion message
 * @param projectName - Name of the created project
 * @param rpcUrl - The configured RPC URL
 */
export function displayCompletionMessage(
  projectName: string,
  rpcUrl: string
): void {
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
