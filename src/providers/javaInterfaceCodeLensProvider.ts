import * as vscode from 'vscode';
import { ButtonTitles, Commands, LanguageIds } from '../utils/constants';

/**
 * Java接口CodeLens提供器
 * 用于在Java接口和接口方法上提供CodeLens跳转按钮
 */
export class JavaInterfaceCodeLensProvider implements vscode.CodeLensProvider {
    
    public provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        // 只处理Java文件
        if (document.languageId !== LanguageIds.JAVA) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();
        
        // 查找接口定义
        this.findInterfaces(text, document).forEach(interfaceInfo => {
            const position = new vscode.Position(interfaceInfo.lineNumber, 0);
            const range = new vscode.Range(position, position);
            
            // 添加go to impl的CodeLens
            const goToImplementationsLens = new vscode.CodeLens(range, {
                title: ButtonTitles.GO_TO_IMPLEMENTATIONS,
                command: Commands.GO_TO_IMPLEMENTATIONS,
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
                title: ButtonTitles.GO_TO_METHOD_IMPLEMENTATIONS,
                command: Commands.GO_TO_METHOD_IMPLEMENTATIONS,
                arguments: [document.uri, methodInfo.lineNumber]
            });
            
            codeLenses.push(goToMethodImplementationsLens);
        });
        
        return codeLenses;
    }
    
    /**
     * 查找Java接口定义
     */
    private findInterfaces(text: string, document: vscode.TextDocument): Array<{name: string, lineNumber: number}> {
        const interfaces: Array<{name: string, lineNumber: number}> = [];
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
    private findInterfaceMethods(text: string, document: vscode.TextDocument): Array<{interfaceName: string, name: string, lineNumber: number}> {
        const methods: Array<{interfaceName: string, name: string, lineNumber: number}> = [];
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
                } else {
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
                    } else {
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