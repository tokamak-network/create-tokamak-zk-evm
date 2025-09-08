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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStatusCommand = exports.createExportCommand = exports.createVerifyCommand = exports.createProveCommand = exports.createInitCommand = void 0;
// Main exports for the package
__exportStar(require("./types"), exports);
__exportStar(require("./config/defaults"), exports);
__exportStar(require("./utils/logger"), exports);
__exportStar(require("./utils/platform-detector"), exports);
__exportStar(require("./utils/github-api"), exports);
__exportStar(require("./utils/binary-manager"), exports);
__exportStar(require("./utils/script-runner"), exports);
__exportStar(require("./utils/config-manager"), exports);
// Re-export commands for programmatic use
var init_1 = require("./commands/init");
Object.defineProperty(exports, "createInitCommand", { enumerable: true, get: function () { return init_1.createInitCommand; } });
var prove_1 = require("./commands/prove");
Object.defineProperty(exports, "createProveCommand", { enumerable: true, get: function () { return prove_1.createProveCommand; } });
var verify_1 = require("./commands/verify");
Object.defineProperty(exports, "createVerifyCommand", { enumerable: true, get: function () { return verify_1.createVerifyCommand; } });
var export_1 = require("./commands/export");
Object.defineProperty(exports, "createExportCommand", { enumerable: true, get: function () { return export_1.createExportCommand; } });
var status_1 = require("./commands/status");
Object.defineProperty(exports, "createStatusCommand", { enumerable: true, get: function () { return status_1.createStatusCommand; } });
//# sourceMappingURL=index.js.map