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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExportCommand = createExportCommand;
const commander_1 = require("commander");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = require("../utils/logger");
function createExportCommand() {
    const command = new commander_1.Command('export');
    command
        .description('Export proof outputs to a destination')
        .argument('<type>', 'Type of output to export (proof, all, synthesizer, preprocess, verify)')
        .argument('<destination>', 'Destination file or directory')
        .option('--source-dir <dir>', 'Source directory containing outputs', './tokamak-zk-evm-outputs')
        .option('--format <format>', 'Export format (json, files)', 'files')
        .action(async (type, destination, options) => {
        try {
            await exportOutputs(type, destination, options);
        }
        catch (error) {
            logger_1.logger.error('Export failed:', error);
            process.exit(1);
        }
    });
    return command;
}
async function exportOutputs(type, destination, options) {
    const { sourceDir = './tokamak-zk-evm-outputs', format = 'files' } = options;
    logger_1.logger.info(chalk_1.default.blue(`📤 Exporting ${type} outputs to ${destination}`));
    // Validate export type
    const validTypes = [
        'proof',
        'all',
        'synthesizer',
        'preprocess',
        'prove',
        'verify',
    ];
    if (!validTypes.includes(type)) {
        throw new Error(`Invalid export type: ${type}. Valid types: ${validTypes.join(', ')}`);
    }
    // Check if source directory exists
    if (!(await fs.pathExists(sourceDir))) {
        throw new Error(`Source directory not found: ${sourceDir}`);
    }
    // Find the most recent proof directory if sourceDir contains multiple proofs
    const proofDir = await findMostRecentProofDir(sourceDir);
    if (!proofDir) {
        throw new Error(`No proof outputs found in ${sourceDir}`);
    }
    logger_1.logger.info(`Using proof directory: ${path.basename(proofDir)}`);
    // Export based on type and format
    if (type === 'all') {
        await exportAllOutputs(proofDir, destination, format);
    }
    else if (type === 'proof') {
        await exportProofFiles(proofDir, destination, format);
    }
    else {
        await exportSpecificType(proofDir, type, destination, format);
    }
    logger_1.logger.info(chalk_1.default.green(`✅ Export completed successfully!`));
}
async function findMostRecentProofDir(sourceDir) {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });
    const proofDirs = entries
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('proof-'))
        .map((entry) => ({
        name: entry.name,
        path: path.join(sourceDir, entry.name),
    }));
    if (proofDirs.length === 0) {
        return null;
    }
    // Sort by modification time (most recent first)
    const dirsWithStats = await Promise.all(proofDirs.map(async (dir) => ({
        ...dir,
        stats: await fs.stat(dir.path),
    })));
    dirsWithStats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
    return dirsWithStats[0].path;
}
async function exportAllOutputs(proofDir, destination, format) {
    if (format === 'json') {
        // Export as a single JSON file
        const allOutputs = await collectAllOutputs(proofDir);
        await fs.writeJson(destination, allOutputs, { spaces: 2 });
        logger_1.logger.info(`All outputs exported to JSON: ${destination}`);
    }
    else {
        // Export as directory structure
        await fs.ensureDir(destination);
        await fs.copy(proofDir, destination);
        logger_1.logger.info(`All outputs exported to directory: ${destination}`);
    }
}
async function exportProofFiles(proofDir, destination, format) {
    const proveDir = path.join(proofDir, 'prove');
    if (!(await fs.pathExists(proveDir))) {
        throw new Error('Proof files not found in the specified directory');
    }
    if (format === 'json') {
        // Find and export proof.json
        const proofJsonPath = path.join(proveDir, 'proof.json');
        if (await fs.pathExists(proofJsonPath)) {
            const proofData = await fs.readJson(proofJsonPath);
            await fs.writeJson(destination, proofData, { spaces: 2 });
            logger_1.logger.info(`Proof exported to JSON: ${destination}`);
        }
        else {
            throw new Error('proof.json not found');
        }
    }
    else {
        // Export all proof-related files
        await fs.ensureDir(destination);
        await fs.copy(proveDir, destination);
        logger_1.logger.info(`Proof files exported to directory: ${destination}`);
    }
}
async function exportSpecificType(proofDir, type, destination, format) {
    const typeDir = path.join(proofDir, type);
    if (!(await fs.pathExists(typeDir))) {
        throw new Error(`${type} outputs not found in the specified directory`);
    }
    if (format === 'json') {
        // Collect all JSON files from the type directory
        const jsonFiles = await collectJsonFiles(typeDir);
        await fs.writeJson(destination, jsonFiles, { spaces: 2 });
        logger_1.logger.info(`${type} outputs exported to JSON: ${destination}`);
    }
    else {
        // Export all files from the type directory
        await fs.ensureDir(destination);
        await fs.copy(typeDir, destination);
        logger_1.logger.info(`${type} outputs exported to directory: ${destination}`);
    }
}
async function collectAllOutputs(proofDir) {
    const outputs = {};
    // Load summary if available
    const summaryPath = path.join(proofDir, 'summary.json');
    if (await fs.pathExists(summaryPath)) {
        outputs.summary = await fs.readJson(summaryPath);
    }
    // Collect outputs from each type
    const types = ['synthesizer', 'preprocess', 'prove', 'verify'];
    for (const type of types) {
        const typeDir = path.join(proofDir, type);
        if (await fs.pathExists(typeDir)) {
            outputs[type] = await collectJsonFiles(typeDir);
        }
    }
    return outputs;
}
async function collectJsonFiles(dir) {
    const result = {};
    const files = await fs.readdir(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile() && file.endsWith('.json')) {
            try {
                const fileName = path.basename(file, '.json');
                result[fileName] = await fs.readJson(filePath);
            }
            catch (error) {
                logger_1.logger.warn(`Could not parse JSON file ${file}:`, error);
                // Include as raw text if JSON parsing fails
                result[file] = await fs.readFile(filePath, 'utf8');
            }
        }
    }
    return result;
}
//# sourceMappingURL=export.js.map