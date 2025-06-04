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
exports.JavaNavigationService = void 0;
const vscode = __importStar(require("vscode"));
const constants_1 = require("../utils/constants");
/**
 * Java导航服务
 * 负责处理跳转逻辑，使用VS Code内置命令
 */
class JavaNavigationService {
    /**
     * 跳转到实现
     * @param uri 文档URI
     * @param lineNumber 行号
     */
    async goToImplementation(uri, lineNumber) {
        try {
            // 打开文档
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            // 获取该行的文本内容
            const lineText = document.lineAt(lineNumber).text;
            // 查找接口名称的位置
            const interfaceMatch = lineText.match(/\s*public\s+interface\s+(\w+)/);
            let position;
            if (interfaceMatch) {
                // 找到接口名称在行中的位置
                const interfaceName = interfaceMatch[1];
                const interfaceNameIndex = lineText.indexOf(interfaceName);
                position = new vscode.Position(lineNumber, interfaceNameIndex);
            }
            else {
                // 如果没找到接口名称，则定位到行开头
                position = new vscode.Position(lineNumber, 0);
            }
            // 移动光标到指定位置
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position));
                // 使用VS Code内置的转到实现命令
                await vscode.commands.executeCommand(constants_1.VSCodeCommands.GO_TO_IMPLEMENTATIONS);
            }
        }
        catch (error) {
            console.error('跳转到实现时出错:', error);
            vscode.window.showErrorMessage(`跳转到实现时出错: ${error.message}`);
        }
    }
    /**
     * go to interface
     * @param uri 文档URI
     * @param interfaceName 接口名称
     * @param lineNumber 行号
     */
    async goToInterface(uri, interfaceName, lineNumber) {
        try {
            // 查找接口文件
            const javaFiles = await vscode.workspace.findFiles('**/*.java', '**/node_modules/**');
            for (const file of javaFiles) {
                try {
                    const document = await vscode.workspace.openTextDocument(file);
                    const content = document.getText();
                    // 查找接口定义
                    const interfaceRegex = new RegExp(`public\\s+interface\\s+${interfaceName}\\b`, 'g');
                    const match = interfaceRegex.exec(content);
                    if (match) {
                        // 找到接口，打开文件并定位
                        await vscode.window.showTextDocument(document);
                        // 计算接口名称的精确位置
                        const position = document.positionAt(match.index);
                        const lineText = document.lineAt(position.line).text;
                        const interfaceNameIndex = lineText.indexOf(interfaceName);
                        const exactPosition = new vscode.Position(position.line, interfaceNameIndex);
                        // 移动光标到接口名称位置
                        const editor = vscode.window.activeTextEditor;
                        if (editor) {
                            editor.selection = new vscode.Selection(exactPosition, exactPosition);
                            editor.revealRange(new vscode.Range(exactPosition, exactPosition));
                        }
                        return;
                    }
                }
                catch (error) {
                    console.error(`处理文件时出错: ${file.fsPath}`, error);
                }
            }
            // 如果没找到接口，显示提示
            vscode.window.showInformationMessage(`未找到接口 ${interfaceName}`);
        }
        catch (error) {
            console.error('go to interface时出错:', error);
            vscode.window.showErrorMessage(`go to interface时出错: ${error.message}`);
        }
    }
    /**
     * go to method impl
     * @param uri 文档URI
     * @param lineNumber 行号
     */
    async goToMethodImplementation(uri, lineNumber) {
        try {
            // 打开文档
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            // 获取该行的文本内容
            const lineText = document.lineAt(lineNumber).text;
            // 更新正则表达式以支持泛型
            const methodMatch = lineText.match(/\s*(?:public|protected|private)?\s*(?:static\s+)?(?:default\s+)?(\w+(?:<[^>]*>)?)\s+(\w+)\s*\(/);
            let position;
            if (methodMatch) {
                // 找到方法名称在行中的位置
                const methodName = methodMatch[2];
                const methodNameIndex = lineText.indexOf(methodName);
                position = new vscode.Position(lineNumber, methodNameIndex);
            }
            else {
                // 如果没找到方法名称，则定位到行开头
                position = new vscode.Position(lineNumber, 0);
            }
            // 移动光标到指定位置
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position));
                // 使用VS Code内置的转到实现命令
                await vscode.commands.executeCommand(constants_1.VSCodeCommands.GO_TO_IMPLEMENTATIONS);
            }
        }
        catch (error) {
            console.error('go to method impl时出错:', error);
            vscode.window.showErrorMessage(`go to method impl时出错: ${error.message}`);
        }
    }
    /**
     * go to interface method
     * @param uri 文档URI
     * @param interfaceName 接口名称
     * @param methodName 方法名称
     * @param lineNumber 行号
     */
    async goToInterfaceMethod(uri, interfaceName, methodName, lineNumber) {
        try {
            // 打开文档
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            // 获取该行的文本内容
            const lineText = document.lineAt(lineNumber).text;
            // 查找方法名称的位置
            const methodNameIndex = lineText.indexOf(methodName);
            let position;
            if (methodNameIndex !== -1) {
                // 找到方法名称在行中的位置
                position = new vscode.Position(lineNumber, methodNameIndex);
            }
            else {
                // 如果没找到方法名称，则定位到行开头
                position = new vscode.Position(lineNumber, 0);
            }
            // 移动光标到指定位置
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position));
                // 使用VS Code内置的转到声明命令
                await vscode.commands.executeCommand(constants_1.VSCodeCommands.GO_TO_DECLARATION);
            }
        }
        catch (error) {
            console.error('go to interface method时出错:', error);
            vscode.window.showErrorMessage(`go to interface method时出错: ${error.message}`);
        }
    }
}
exports.JavaNavigationService = JavaNavigationService;
//# sourceMappingURL=javaNavigationService.js.map