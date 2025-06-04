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
exports.PythonImplementationCodeLensProvider = void 0;
const vscode = __importStar(require("vscode"));
const constants_1 = require("../utils/constants");
/**
 * Python实现类CodeLens提供器
 * 用于在Python实现类上提供CodeLens跳转按钮
 */
class PythonImplementationCodeLensProvider {
    indexService;
    constructor(indexService) {
        this.indexService = indexService;
    }
    provideCodeLenses(document, token) {
        // 只处理Python文件
        if (document.languageId !== constants_1.LanguageIds.PYTHON) {
            return [];
        }
        const codeLenses = [];
        const text = document.getText();
        // 查找实现类定义
        const implementationClasses = this.findImplementationClasses(text, document);
        implementationClasses.forEach(implClass => {
            const position = new vscode.Position(implClass.lineNumber, 0);
            const range = new vscode.Range(position, position);
            // 为每个基类添加go to abstract的CodeLens
            implClass.baseClasses.forEach(baseClass => {
                // 检查基类是否是ABC类
                if (this.indexService.getAbstractClass(baseClass)) {
                    const goToAbstractLens = new vscode.CodeLens(range, {
                        title: `${constants_1.ButtonTitles.GO_TO_PYTHON_ABSTRACT} (${baseClass})`,
                        command: constants_1.Commands.GO_TO_PYTHON_ABSTRACT,
                        arguments: [document.uri, implClass.className, baseClass, implClass.lineNumber]
                    });
                    codeLenses.push(goToAbstractLens);
                    console.log(`为Python实现类 ${implClass.className} 添加跳转到 ${baseClass} 的CodeLens (行号: ${implClass.lineNumber + 1})`);
                }
            });
        });
        // 查找实现方法定义
        const implementationMethods = this.findImplementationMethods(text, document);
        implementationMethods.forEach(method => {
            const position = new vscode.Position(method.lineNumber, 0);
            const range = new vscode.Range(position, position);
            // 添加go to abstract method的CodeLens
            const goToAbstractMethodLens = new vscode.CodeLens(range, {
                title: `${constants_1.ButtonTitles.GO_TO_PYTHON_ABSTRACT_METHOD} (${method.abstractClassName})`,
                command: constants_1.Commands.GO_TO_PYTHON_ABSTRACT_METHOD,
                arguments: [document.uri, method.className, method.methodName, method.abstractClassName, method.lineNumber]
            });
            codeLenses.push(goToAbstractMethodLens);
            console.log(`为Python实现方法 ${method.className}.${method.methodName} 添加跳转到抽象方法的CodeLens (行号: ${method.lineNumber + 1})`);
        });
        return codeLenses;
    }
    /**
     * 查找实现类定义
     */
    findImplementationClasses(text, document) {
        const implementationClasses = [];
        const lines = text.split('\n');
        // 解析导入语句
        const importMap = this.parseImports(lines);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // 匹配类定义模式，排除ABC类
            const classMatch = line.match(/^class\s+(\w+)\s*\(([^)]+)\):/);
            if (classMatch) {
                const className = classMatch[1];
                const baseClassesStr = classMatch[2];
                // 解析基类列表
                const baseClasses = baseClassesStr
                    .split(',')
                    .map(cls => cls.trim())
                    .filter(cls => cls !== 'ABC' && !cls.includes('metaclass')) // 排除ABC和metaclass
                    .map(cls => this.resolveClassName(cls, importMap)); // 解析导入的类名
                if (baseClasses.length > 0) {
                    implementationClasses.push({
                        className,
                        baseClasses,
                        lineNumber: i
                    });
                }
            }
        }
        return implementationClasses;
    }
    /**
     * 解析Python文件中的导入语句
     */
    parseImports(lines) {
        const importMap = new Map();
        for (const line of lines) {
            // 匹配 from module import Class1, Class2
            const fromImportMatch = line.match(/^from\s+([^\s]+)\s+import\s+(.+)$/);
            if (fromImportMatch) {
                const module = fromImportMatch[1];
                const imports = fromImportMatch[2].split(',').map(imp => imp.trim());
                for (const imp of imports) {
                    // 处理 "Class as Alias" 格式
                    const asMatch = imp.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
                    if (asMatch) {
                        const originalName = asMatch[1];
                        const aliasName = asMatch[2] || originalName;
                        importMap.set(aliasName, originalName);
                    }
                }
            }
            // 匹配 import module
            const importMatch = line.match(/^import\s+([^\s]+)$/);
            if (importMatch) {
                const module = importMatch[1];
                importMap.set(module, module);
            }
        }
        return importMap;
    }
    /**
     * 解析类名（处理导入的类名）
     */
    resolveClassName(className, importMap) {
        // 如果在导入映射中找到，返回原始名称
        if (importMap.has(className)) {
            return importMap.get(className);
        }
        // 否则返回原始类名
        return className;
    }
    /**
     * 查找实现方法定义
     */
    findImplementationMethods(text, document) {
        const implementationMethods = [];
        const lines = text.split('\n');
        // 解析导入语句
        const importMap = this.parseImports(lines);
        let currentClassName = '';
        let currentBaseClasses = [];
        let inImplementationClass = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // 检查是否是类定义
            const classMatch = line.match(/^class\s+(\w+)\s*\(([^)]+)\):/);
            if (classMatch) {
                currentClassName = classMatch[1];
                const baseClassesStr = classMatch[2];
                // 解析基类列表
                currentBaseClasses = baseClassesStr
                    .split(',')
                    .map(cls => cls.trim())
                    .filter(cls => cls !== 'ABC' && !cls.includes('metaclass'))
                    .map(cls => this.resolveClassName(cls, importMap));
                // 检查是否有抽象基类
                inImplementationClass = currentBaseClasses.some(baseClass => this.indexService.getAbstractClass(baseClass));
                continue;
            }
            // 如果遇到新的类定义，重置状态
            if (line.match(/^class\s+\w+/)) {
                inImplementationClass = false;
                currentClassName = '';
                currentBaseClasses = [];
                continue;
            }
            // 在实现类内部查找方法定义
            if (inImplementationClass && currentClassName) {
                const methodMatch = line.match(/^\s+def\s+(\w+)\s*\(/);
                if (methodMatch) {
                    const methodName = methodMatch[1];
                    // 检查每个基类，看是否有对应的抽象方法
                    for (const baseClass of currentBaseClasses) {
                        const abstractClass = this.indexService.getAbstractClass(baseClass);
                        if (abstractClass) {
                            const hasAbstractMethod = abstractClass.methods.some(abstractMethod => abstractMethod.methodName === methodName);
                            if (hasAbstractMethod) {
                                implementationMethods.push({
                                    className: currentClassName,
                                    methodName,
                                    abstractClassName: baseClass,
                                    lineNumber: i
                                });
                                break; // 找到一个匹配就够了
                            }
                        }
                    }
                }
            }
        }
        return implementationMethods;
    }
}
exports.PythonImplementationCodeLensProvider = PythonImplementationCodeLensProvider;
//# sourceMappingURL=pythonImplementationCodeLensProvider.js.map