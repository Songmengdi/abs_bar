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
exports.CommandService = void 0;
const vscode = __importStar(require("vscode"));
const constants_1 = require("../utils/constants");
const javaNavigationService_1 = require("./javaNavigationService");
const pythonIndexService_1 = require("./pythonIndexService");
const pythonNavigationService_1 = require("./pythonNavigationService");
/**
 * 命令注册服务
 * 负责注册插件的命令
 */
class CommandService {
    javaNavigationService;
    pythonNavigationService;
    pythonIndexService;
    constructor() {
        this.javaNavigationService = new javaNavigationService_1.JavaNavigationService();
        this.pythonIndexService = new pythonIndexService_1.PythonIndexService();
        this.pythonNavigationService = new pythonNavigationService_1.PythonNavigationService(this.pythonIndexService);
    }
    /**
     * 注册所有命令
     * @param context 扩展上下文
     */
    registerCommands(context) {
        // 注册go to impl命令
        context.subscriptions.push(vscode.commands.registerCommand(constants_1.Commands.GO_TO_IMPLEMENTATIONS, async (uri, lineNumber) => {
            await this.javaNavigationService.goToImplementation(uri, lineNumber);
        }));
        // 注册go to method impl命令
        context.subscriptions.push(vscode.commands.registerCommand(constants_1.Commands.GO_TO_METHOD_IMPLEMENTATIONS, async (uri, lineNumber) => {
            await this.javaNavigationService.goToMethodImplementation(uri, lineNumber);
        }));
        // 注册go to interface命令
        context.subscriptions.push(vscode.commands.registerCommand(constants_1.Commands.GO_TO_INTERFACE, async (uri, interfaceName, lineNumber) => {
            await this.javaNavigationService.goToInterface(uri, interfaceName, lineNumber);
        }));
        // 注册go to interface method命令
        context.subscriptions.push(vscode.commands.registerCommand(constants_1.Commands.GO_TO_INTERFACE_METHOD, async (uri, interfaceName, methodName, lineNumber) => {
            await this.javaNavigationService.goToInterfaceMethod(uri, interfaceName, methodName, lineNumber);
        }));
        // 注册Python go to impl命令
        context.subscriptions.push(vscode.commands.registerCommand(constants_1.Commands.GO_TO_PYTHON_IMPLEMENTATIONS, async (uri, className, lineNumber) => {
            await this.pythonNavigationService.goToPythonImplementations(uri, className, lineNumber);
        }));
        // 注册Python method go to impl命令
        context.subscriptions.push(vscode.commands.registerCommand(constants_1.Commands.GO_TO_PYTHON_METHOD_IMPLEMENTATIONS, async (uri, className, methodName, lineNumber) => {
            await this.pythonNavigationService.goToPythonMethodImplementations(uri, className, methodName, lineNumber);
        }));
        // 注册Python implementation go to abstract命令
        context.subscriptions.push(vscode.commands.registerCommand(constants_1.Commands.GO_TO_PYTHON_ABSTRACT, async (uri, implementationClassName, abstractClassName, lineNumber) => {
            await this.pythonNavigationService.goToPythonAbstract(uri, implementationClassName, abstractClassName, lineNumber);
        }));
        // 注册Python implementation method go to abstract method命令
        context.subscriptions.push(vscode.commands.registerCommand(constants_1.Commands.GO_TO_PYTHON_ABSTRACT_METHOD, async (uri, implementationClassName, methodName, abstractClassName, lineNumber) => {
            await this.pythonNavigationService.goToPythonAbstractMethod(uri, implementationClassName, methodName, abstractClassName, lineNumber);
        }));
    }
    /**
     * 获取Python索引服务
     */
    getPythonIndexService() {
        return this.pythonIndexService;
    }
    /**
     * 调试方法：检查重复数据
     */
    debugCheckDuplicates() {
        console.log('=== 开始调试检查 ===');
        this.pythonIndexService.debugCheckDuplicateMethods();
        const stats = this.pythonIndexService.getCacheStats();
        console.log('缓存统计:', stats);
        console.log('=== 调试检查完成 ===');
    }
    /**
     * 调试方法：检查特定抽象方法的实现索引
     */
    debugCheckMethodImplementations(abstractClassName, methodName) {
        this.pythonIndexService.debugCheckMethodImplementations(abstractClassName, methodName);
    }
}
exports.CommandService = CommandService;
//# sourceMappingURL=commandService.js.map