import * as vscode from 'vscode';
import { PythonIndexService } from '../services/pythonIndexService';
import { ButtonTitles, Commands, LanguageIds } from '../utils/constants';

/**
 * Python ABC CodeLens提供器
 * 用于在Python ABC类上提供CodeLens跳转按钮
 */
export class PythonAbstractCodeLensProvider implements vscode.CodeLensProvider {
    private indexService: PythonIndexService;
    
    constructor(indexService: PythonIndexService) {
        this.indexService = indexService;
    }
    
    public provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        // 只处理Python文件
        if (document.languageId !== LanguageIds.PYTHON) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();
        
        // 检查是否包含ABC导入
        if (!this.hasAbcImport(text)) {
            return [];
        }
        
        // 查找ABC类定义
        const abcClasses = this.findAbstractClasses(text, document);
        
        abcClasses.forEach(abcClass => {
            const position = new vscode.Position(abcClass.lineNumber, 0);
            const range = new vscode.Range(position, position);
            
            // 添加go to python impl的CodeLens
            const goToPythonImplLens = new vscode.CodeLens(range, {
                title: ButtonTitles.GO_TO_PYTHON_IMPLEMENTATIONS,
                command: Commands.GO_TO_PYTHON_IMPLEMENTATIONS,
                arguments: [document.uri, abcClass.className, abcClass.lineNumber]
            });
            
            codeLenses.push(goToPythonImplLens);
            
            console.log(`为Python ABC类 ${abcClass.className} 添加CodeLens (行号: ${abcClass.lineNumber + 1})`);
        });
        
        // 查找抽象方法定义
        const abstractMethods = this.findAbstractMethods(text, document);
        
        abstractMethods.forEach(method => {
            const position = new vscode.Position(method.lineNumber, 0);
            const range = new vscode.Range(position, position);
            
            // 添加go to method impl的CodeLens
            const goToMethodImplLens = new vscode.CodeLens(range, {
                title: ButtonTitles.GO_TO_PYTHON_METHOD_IMPLEMENTATIONS,
                command: Commands.GO_TO_PYTHON_METHOD_IMPLEMENTATIONS,
                arguments: [document.uri, method.className, method.methodName, method.lineNumber]
            });
            
            codeLenses.push(goToMethodImplLens);
            
            console.log(`为Python抽象方法 ${method.className}.${method.methodName} 添加CodeLens (行号: ${method.lineNumber + 1})`);
        });
        
        return codeLenses;
    }
    
    /**
     * 检查文件是否包含ABC导入
     */
    private hasAbcImport(content: string): boolean {
        const abcImportPatterns = [
            /from\s+abc\s+import\s+.*ABC/,
            /import\s+abc/,
            /from\s+abc\s+import\s+.*ABCMeta/
        ];
        
        return abcImportPatterns.some(pattern => pattern.test(content));
    }
    
    /**
     * 查找抽象类定义
     */
    private findAbstractClasses(text: string, document: vscode.TextDocument): Array<{className: string, lineNumber: number}> {
        const abstractClasses: Array<{className: string, lineNumber: number}> = [];
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 匹配ABC类定义模式
            const abcClassMatch = line.match(/^class\s+(\w+)\s*\(\s*ABC\s*\):/);
            const abcMetaClassMatch = line.match(/^class\s+(\w+)\s*\(.*metaclass\s*=\s*ABCMeta.*\):/);
            
            if (abcClassMatch || abcMetaClassMatch) {
                const className = (abcClassMatch || abcMetaClassMatch)![1];
                
                abstractClasses.push({
                    className,
                    lineNumber: i
                });
                
                console.log(`在文档中发现ABC类: ${className} (行号: ${i + 1})`);
            }
        }
        
        return abstractClasses;
    }
    
    /**
     * 查找抽象方法定义
     */
    private findAbstractMethods(text: string, document: vscode.TextDocument): Array<{className: string, methodName: string, lineNumber: number}> {
        const abstractMethods: Array<{className: string, methodName: string, lineNumber: number}> = [];
        const lines = text.split('\n');
        
        let currentClassName = '';
        let inAbstractClass = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 检查是否是ABC类定义
            const abcClassMatch = line.match(/^class\s+(\w+)\s*\(\s*ABC\s*\):/);
            const abcMetaClassMatch = line.match(/^class\s+(\w+)\s*\(.*metaclass\s*=\s*ABCMeta.*\):/);
            
            if (abcClassMatch || abcMetaClassMatch) {
                currentClassName = (abcClassMatch || abcMetaClassMatch)![1];
                inAbstractClass = true;
                continue;
            }
            
            // 如果遇到新的类定义（非ABC），退出当前ABC类
            if (line.match(/^class\s+\w+/) && !abcClassMatch && !abcMetaClassMatch) {
                inAbstractClass = false;
                currentClassName = '';
                continue;
            }
            
            // 在ABC类内部查找@abstractmethod装饰器
            if (inAbstractClass && line.trim() === '@abstractmethod') {
                // 查找下一行的方法定义
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1];
                    const methodMatch = nextLine.match(/^\s+def\s+(\w+)\s*\(/);
                    if (methodMatch) {
                        abstractMethods.push({
                            className: currentClassName,
                            methodName: methodMatch[1],
                            lineNumber: i + 1  // 方法定义行
                        });
                    }
                }
            }
        }
        
        return abstractMethods;
    }
} 