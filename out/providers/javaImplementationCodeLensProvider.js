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
exports.JavaImplementationCodeLensProvider = void 0;
const vscode = __importStar(require("vscode"));
const constants_1 = require("../utils/constants");
/**
 * Java实现类CodeLens提供器
 * 用于在Java实现类和实现方法上提供CodeLens跳转按钮
 */
class JavaImplementationCodeLensProvider {
    provideCodeLenses(document, token) {
        // 只处理Java文件
        if (document.languageId !== constants_1.LanguageIds.JAVA) {
            return [];
        }
        const codeLenses = [];
        const text = document.getText();
        // 查找实现类定义
        this.findImplementations(text, document).forEach(implInfo => {
            const position = new vscode.Position(implInfo.lineNumber, 0);
            const range = new vscode.Range(position, position);
            // 添加go to interface的CodeLens
            const goToInterfaceLens = new vscode.CodeLens(range, {
                title: constants_1.ButtonTitles.GO_TO_INTERFACE,
                command: constants_1.Commands.GO_TO_INTERFACE,
                arguments: [document.uri, implInfo.interfaceName, implInfo.lineNumber]
            });
            codeLenses.push(goToInterfaceLens);
        });
        // 查找实现方法
        this.findImplementationMethods(text, document).forEach(methodInfo => {
            const position = new vscode.Position(methodInfo.lineNumber, 0);
            const range = new vscode.Range(position, position);
            // 添加go to interface method的CodeLens
            const goToInterfaceMethodLens = new vscode.CodeLens(range, {
                title: constants_1.ButtonTitles.GO_TO_INTERFACE_METHOD,
                command: constants_1.Commands.GO_TO_INTERFACE_METHOD,
                arguments: [document.uri, methodInfo.interfaceName, methodInfo.methodName, methodInfo.lineNumber]
            });
            codeLenses.push(goToInterfaceMethodLens);
        });
        return codeLenses;
    }
    /**
     * 查找Java实现类定义
     */
    findImplementations(text, document) {
        const implementations = [];
        const lines = text.split('\n');
        // 更灵活的实现类匹配正则表达式，支持泛型extends
        const implementsRegex = /^\s*public\s+class\s+(\w+)(?:\s+extends\s+[\w<>,\s]+)?\s+implements\s+([^{]+)/;
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(implementsRegex);
            if (match) {
                const className = match[1];
                const interfacesStr = match[2];
                // 解析多个接口
                const interfaces = interfacesStr.split(',').map(iface => iface.trim());
                // 为每个接口创建一个实现记录
                interfaces.forEach(interfaceName => {
                    implementations.push({
                        className,
                        interfaceName,
                        lineNumber: i
                    });
                });
            }
        }
        return implementations;
    }
    /**
     * 查找实现方法定义
     */
    findImplementationMethods(text, document) {
        const methods = [];
        const lines = text.split('\n');
        // 当前类和接口名称
        let currentInterfaces = [];
        let currentClassName = '';
        let inClass = false;
        let braceCount = 0;
        // 查找类和方法
        const classRegex = /^\s*public\s+class\s+(\w+)(?:\s+extends\s+[\w<>,\s]+)?\s+implements\s+([^{]+)/;
        // 更灵活的方法匹配正则表达式，不要求必须以{结尾
        const methodRegex = /^\s*(?:public\s+|protected\s+|private\s+)?(?:static\s+)?(\w+(?:<[^>]*>)?)\s+(\w+)\s*\([^)]*\)/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // 检查是否是类定义
            const classMatch = line.match(classRegex);
            if (classMatch) {
                currentClassName = classMatch[1];
                const interfacesStr = classMatch[2];
                currentInterfaces = interfacesStr.split(',').map(iface => iface.trim());
                inClass = true;
                braceCount = 0;
                continue;
            }
            // 跟踪大括号以确定类范围
            if (inClass) {
                const openBraces = (line.match(/\{/g) || []).length;
                const closeBraces = (line.match(/\}/g) || []).length;
                braceCount += openBraces - closeBraces;
                // 只有当大括号计数小于0时，才说明类结束（类级别的闭括号）
                if (braceCount < 0) {
                    inClass = false;
                    currentClassName = '';
                    currentInterfaces = [];
                    continue;
                }
            }
            // 在实现类内部查找方法定义
            if (inClass && currentInterfaces.length > 0) {
                // 检查是否有@Override注解（检查当前行和前一行）
                const hasOverride = line.trim() === '@Override' ||
                    (i > 0 && lines[i - 1].trim() === '@Override') ||
                    (i > 1 && lines[i - 1].trim() === '' && lines[i - 2].trim() === '@Override');
                // 跳过@Override注解行本身
                if (line.trim() === '@Override') {
                    continue;
                }
                const methodMatch = line.match(methodRegex);
                if (methodMatch) {
                    const returnType = methodMatch[1];
                    const methodName = methodMatch[2];
                    // 排除构造函数和一些特殊方法
                    if (methodName !== currentClassName) {
                        // 如果有@Override注解，直接添加到所有接口
                        if (hasOverride) {
                            currentInterfaces.forEach(interfaceName => {
                                methods.push({
                                    interfaceName,
                                    methodName,
                                    lineNumber: i
                                });
                            });
                        }
                        else {
                            // 没有@Override注解，但是public方法，也可能是接口实现
                            if (line.includes('public ')) {
                                currentInterfaces.forEach(interfaceName => {
                                    methods.push({
                                        interfaceName,
                                        methodName,
                                        lineNumber: i
                                    });
                                });
                            }
                        }
                    }
                }
            }
        }
        return methods;
    }
}
exports.JavaImplementationCodeLensProvider = JavaImplementationCodeLensProvider;
//# sourceMappingURL=javaImplementationCodeLensProvider.js.map