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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const javaImplementationCodeLensProvider_1 = require("./providers/javaImplementationCodeLensProvider");
const javaInterfaceCodeLensProvider_1 = require("./providers/javaInterfaceCodeLensProvider");
const pythonAbstractCodeLensProvider_1 = require("./providers/pythonAbstractCodeLensProvider");
const pythonImplementationCodeLensProvider_1 = require("./providers/pythonImplementationCodeLensProvider");
const commandService_1 = require("./services/commandService");
const constants_1 = require("./utils/constants");
/**
 * 插件激活时调用
 */
async function activate(context) {
    console.log('插件 "impl-nav" 已激活');
    // 注册命令
    const commandService = new commandService_1.CommandService();
    commandService.registerCommands(context);
    // 构建Python ABC索引
    const pythonIndexService = commandService.getPythonIndexService();
    await pythonIndexService.buildIndex();
    // 监听Python文件变化，增量更新索引
    const pythonFileWatcher = vscode.workspace.createFileSystemWatcher('**/*.py');
    pythonFileWatcher.onDidCreate(async (uri) => {
        console.log(`检测到Python文件创建，增量更新索引: ${uri.fsPath}`);
        await pythonIndexService.updateFileIndex(uri);
    });
    pythonFileWatcher.onDidChange(async (uri) => {
        console.log(`检测到Python文件修改，增量更新索引: ${uri.fsPath}`);
        await pythonIndexService.updateFileIndex(uri);
    });
    pythonFileWatcher.onDidDelete(async (uri) => {
        console.log(`检测到Python文件删除，移除索引: ${uri.fsPath}`);
        await pythonIndexService.removeFileIndex(uri.fsPath);
    });
    context.subscriptions.push(pythonFileWatcher);
    // 注册Java接口CodeLens提供器
    const javaInterfaceCodeLensProvider = new javaInterfaceCodeLensProvider_1.JavaInterfaceCodeLensProvider();
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: constants_1.LanguageIds.JAVA, scheme: 'file' }, javaInterfaceCodeLensProvider));
    // 注册Java实现类CodeLens提供器
    const javaImplementationCodeLensProvider = new javaImplementationCodeLensProvider_1.JavaImplementationCodeLensProvider();
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: constants_1.LanguageIds.JAVA, scheme: 'file' }, javaImplementationCodeLensProvider));
    // 注册Python ABC CodeLens提供器
    const pythonAbstractCodeLensProvider = new pythonAbstractCodeLensProvider_1.PythonAbstractCodeLensProvider(pythonIndexService);
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: constants_1.LanguageIds.PYTHON, scheme: 'file' }, pythonAbstractCodeLensProvider));
    // 注册Python实现类CodeLens提供器
    const pythonImplementationCodeLensProvider = new pythonImplementationCodeLensProvider_1.PythonImplementationCodeLensProvider(pythonIndexService);
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: constants_1.LanguageIds.PYTHON, scheme: 'file' }, pythonImplementationCodeLensProvider));
}
/**
 * 插件停用时调用
 */
function deactivate() {
    console.log('插件 "impl-nav" 已停用');
}
//# sourceMappingURL=extension.js.map