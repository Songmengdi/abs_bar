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
exports.JavaInterfaceCodeLensProvider = void 0;
const vscode = __importStar(require("vscode"));
const constants_1 = require("../utils/constants");
/**
 * Java接口CodeLens提供器
 * 用于在Java接口和接口方法上提供CodeLens跳转按钮
 */
class JavaInterfaceCodeLensProvider {
    provideCodeLenses(document, token) {
        // 只处理Java文件
        if (document.languageId !== constants_1.LanguageIds.JAVA) {
            return [];
        }
        const codeLenses = [];
        const text = document.getText();
        // 查找接口定义
        this.findInterfaces(text, document).forEach(interfaceInfo => {
            const position = new vscode.Position(interfaceInfo.lineNumber, 0);
            const range = new vscode.Range(position, position);
            // 添加go to impl的CodeLens
            const goToImplementationsLens = new vscode.CodeLens(range, {
                title: constants_1.ButtonTitles.GO_TO_IMPLEMENTATIONS,
                command: constants_1.Commands.GO_TO_IMPLEMENTATIONS,
                arguments: [document.uri, interfaceInfo.lineNumber]
            });
            codeLenses.push(goToImplementationsLens);
        });
        // 查找接口方法
        this.findInterfaceMethods(text, document).forEach(methodInfo => {
            const position = new vscode.Position(methodInfo.lineNumber, 0);
            const range = new vscode.Range(position, position);
            // 添加go to method impl的CodeLens
            const goToMethodImplementationsLens = new vscode.CodeLens(range, {
                title: constants_1.ButtonTitles.GO_TO_METHOD_IMPLEMENTATIONS,
                command: constants_1.Commands.GO_TO_METHOD_IMPLEMENTATIONS,
                arguments: [document.uri, methodInfo.lineNumber]
            });
            codeLenses.push(goToMethodImplementationsLens);
        });
        return codeLenses;
    }
    /**
     * 查找Java接口定义
     */
    findInterfaces(text, document) {
        const interfaces = [];
        const lines = text.split('\n');
        // 简单的正则表达式查找接口定义
        const interfaceRegex = /\s*public\s+interface\s+(\w+)/;
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(interfaceRegex);
            if (match) {
                interfaces.push({
                    name: match[1],
                    lineNumber: i
                });
            }
        }
        return interfaces;
    }
    /**
     * 查找接口方法定义
     */
    findInterfaceMethods(text, document) {
        const methods = [];
        const lines = text.split('\n');
        // 当前接口名称
        let currentInterface = '';
        let inInterface = false;
        let braceCount = 0;
        // 查找接口和它的方法
        const interfaceRegex = /\s*public\s+interface\s+(\w+)/;
        // 更灵活的方法匹配正则表达式
        const methodRegex = /^\s*(?:public\s+|protected\s+|private\s+)?(?:static\s+)?(?:default\s+)?(\w+(?:<[^>]*>)?)\s+(\w+)\s*\([^)]*\)(?:\s*throws\s+[^{;]*)?(?:\s*[{;]|$)/;
        // 用于处理跨行方法声明
        let pendingMethodLine = '';
        let pendingMethodStartLine = -1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // 检查是否是接口定义
            const interfaceMatch = line.match(interfaceRegex);
            if (interfaceMatch) {
                currentInterface = interfaceMatch[1];
                inInterface = true;
                braceCount = 0;
                pendingMethodLine = '';
                pendingMethodStartLine = -1;
                continue;
            }
            // 跟踪大括号以确定接口范围
            if (inInterface) {
                const openBraces = (line.match(/\{/g) || []).length;
                const closeBraces = (line.match(/\}/g) || []).length;
                braceCount += openBraces - closeBraces;
                // 如果大括号计数为负数，说明接口结束
                if (braceCount < 0) {
                    inInterface = false;
                    currentInterface = '';
                    pendingMethodLine = '';
                    pendingMethodStartLine = -1;
                    continue;
                }
            }
            // 在接口内部查找方法
            if (inInterface && currentInterface) {
                // 处理跨行方法声明
                if (pendingMethodLine) {
                    // 继续拼接方法声明
                    pendingMethodLine += ' ' + line.trim();
                    // 检查是否完成了方法声明（以分号或大括号结尾）
                    if (line.includes(';') || line.includes('{')) {
                        const methodMatch = pendingMethodLine.match(methodRegex);
                        if (methodMatch) {
                            const methodName = methodMatch[2];
                            if (methodName !== currentInterface) {
                                methods.push({
                                    interfaceName: currentInterface,
                                    name: methodName,
                                    lineNumber: pendingMethodStartLine
                                });
                            }
                        }
                        pendingMethodLine = '';
                        pendingMethodStartLine = -1;
                    }
                }
                else {
                    // 尝试匹配单行方法
                    const methodMatch = line.match(methodRegex);
                    if (methodMatch) {
                        const methodName = methodMatch[2];
                        if (methodName !== currentInterface) {
                            methods.push({
                                interfaceName: currentInterface,
                                name: methodName,
                                lineNumber: i
                            });
                        }
                    }
                    else {
                        // 检查是否是跨行方法的开始
                        const partialMethodMatch = line.match(/^\s*(?:public\s+|protected\s+|private\s+)?(?:static\s+)?(?:default\s+)?(\w+(?:<[^>]*>)?)\s+(\w+)\s*\(/);
                        if (partialMethodMatch && !line.includes(';') && !line.includes('{')) {
                            pendingMethodLine = line.trim();
                            pendingMethodStartLine = i;
                        }
                    }
                }
            }
        }
        return methods;
    }
}
exports.JavaInterfaceCodeLensProvider = JavaInterfaceCodeLensProvider;
//# sourceMappingURL=javaInterfaceCodeLensProvider.js.map