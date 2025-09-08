/**
 * Display the welcome screen with ASCII art logo
 */
export declare function displayWelcomeScreen(): void;
/**
 * Prompt user for RPC URL and validate it
 * @returns Promise<string> - The validated RPC URL
 */
export declare function promptForRpcUrl(): Promise<string>;
/**
 * Prompt user for project name
 * @returns Promise<string> - The validated project name
 */
export declare function promptForProjectName(): Promise<string>;
/**
 * Display project setup progress (legacy - keeping for compatibility)
 */
export declare function displayProjectSetupProgress(): void;
/**
 * Prompt user for setup mode with arrow key navigation
 * @param hasSetupFiles - Whether setup files are available in release
 * @returns Promise<string> - The selected setup mode
 */
export declare function promptForSetupMode(hasSetupFiles: boolean): Promise<string>;
/**
 * Display setup progress message
 * @param mode - The selected setup mode
 */
export declare function displaySetupProgress(mode: string): void;
/**
 * Display completion message
 * @param projectName - Name of the created project
 * @param rpcUrl - The configured RPC URL
 */
export declare function displayCompletionMessage(projectName: string, rpcUrl: string): void;
//# sourceMappingURL=welcome-screen.d.ts.map