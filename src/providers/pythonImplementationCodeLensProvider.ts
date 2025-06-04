import * as vscode from 'vscode';
import { PythonIndexService } from '../services/pythonIndexService';
import { ButtonTitles, Commands, LanguageIds } from '../utils/constants';

/**
 * Python实现类CodeLens提供器
 * 用于在Python实现类上提供CodeLens跳转按钮
 */
export class PythonImplementationCodeLensProvider implements vscode.CodeLensProvider {
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
                        title: `${ButtonTitles.GO_TO_PYTHON_ABSTRACT} (${baseClass})`,
                        command: Commands.GO_TO_PYTHON_ABSTRACT,
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
                title: `${ButtonTitles.GO_TO_PYTHON_ABSTRACT_METHOD} (${method.abstractClassName})`,
                command: Commands.GO_TO_PYTHON_ABSTRACT_METHOD,
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
    private findImplementationClasses(text: string, document: vscode.TextDocument): Array<{className: string, baseClasses: string[], lineNumber: number}> {
        const implementationClasses: Array<{className: string, baseClasses: string[], lineNumber: number}> = [];
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
    private parseImports(lines: string[]): Map<string, string> {
        const importMap = new Map<string, string>();
        
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
    private resolveClassName(className: string, importMap: Map<string, string>): string {
        // 如果在导入映射中找到，返回原始名称
        if (importMap.has(className)) {
            return importMap.get(className)!;
        }
        
        // 否则返回原始类名
        return className;
    }
    
    /**
     * 查找实现方法定义
     */
    private findImplementationMethods(text: string, document: vscode.TextDocument): Array<{className: string, methodName: string, abstractClassName: string, lineNumber: number}> {
        const implementationMethods: Array<{className: string, methodName: string, abstractClassName: string, lineNumber: number}> = [];
        const lines = text.split('\n');
        
        // 解析导入语句
        const importMap = this.parseImports(lines);
        
        let currentClassName = '';
        let currentBaseClasses: string[] = [];
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
                inImplementationClass = currentBaseClasses.some(baseClass => 
                    this.indexService.getAbstractClass(baseClass)
                );
                
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
                            const hasAbstractMethod = abstractClass.methods.some(abstractMethod => 
                                abstractMethod.methodName === methodName
                            );
                            
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