import * as vscode from 'vscode';
import { PythonImplementationClass, PythonImplementationMethod, PythonIndexService } from './pythonIndexService';

/**
 * Python导航服务
 * 负责处理Python ABC跳转逻辑
 */
export class PythonNavigationService {
    private indexService: PythonIndexService;
    
    constructor(indexService: PythonIndexService) {
        this.indexService = indexService;
    }
    
    /**
     * 从Python ABC类跳转到实现类
     * @param uri 文档URI
     * @param className ABC类名
     * @param lineNumber 行号
     */
    public async goToPythonImplementations(uri: vscode.Uri, className: string, lineNumber: number): Promise<void> {
        try {
            console.log(`尝试跳转到Python ABC类 ${className} 的实现`);
            
            // 调试：显示所有已索引的ABC类
            const allAbstractClasses = this.indexService.getAbstractClasses();
            console.log(`当前已索引的ABC类: ${Array.from(allAbstractClasses.keys()).join(', ')}`);
            
            // 获取实现类列表
            const implementations = this.indexService.getImplementationClasses(className);
            console.log(`找到 ${implementations.length} 个实现类`);
            
            if (implementations.length === 0) {
                const message = `未找到ABC类 ${className} 的实现类\n已索引的ABC类: ${Array.from(allAbstractClasses.keys()).join(', ')}`;
                vscode.window.showInformationMessage(message);
                return;
            }
            
            if (implementations.length === 1) {
                // 只有一个实现类，直接跳转
                await this.jumpToImplementation(implementations[0]);
            } else {
                // 多个实现类，显示选择列表
                await this.showImplementationPicker(className, implementations);
            }
            
        } catch (error: any) {
            console.error('Python ABC导航时出错:', error);
            vscode.window.showErrorMessage(`Python ABC导航时出错: ${error.message}`);
        }
    }
    
    /**
     * 跳转到指定的实现类
     */
    private async jumpToImplementation(implementation: PythonImplementationClass): Promise<void> {
        try {
            // 打开实现类文件
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(implementation.filePath));
            await vscode.window.showTextDocument(document);
            
            // 定位到类定义行
            const position = new vscode.Position(implementation.lineNumber, 0);
            const editor = vscode.window.activeTextEditor;
            
            if (editor) {
                // 移动光标到类定义位置
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
                
                console.log(`跳转到实现类: ${implementation.className} 在 ${implementation.filePath}:${implementation.lineNumber + 1}`);
            }
            
        } catch (error: any) {
            console.error('跳转到实现类时出错:', error);
            vscode.window.showErrorMessage(`跳转到实现类时出错: ${error.message}`);
        }
    }
    
    /**
     * 显示实现类选择器
     */
    private async showImplementationPicker(abstractClassName: string, implementations: PythonImplementationClass[]): Promise<void> {
        try {
            // 构建选择项
            const items = implementations.map(impl => ({
                label: impl.className,
                description: `${impl.filePath}:${impl.lineNumber + 1}`,
                detail: `实现了 ${abstractClassName}`,
                implementation: impl
            }));
            
            // 显示快速选择
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: `选择 ${abstractClassName} 的实现类`,
                matchOnDescription: true,
                matchOnDetail: true
            });
            
            if (selected) {
                await this.jumpToImplementation(selected.implementation);
            }
            
        } catch (error: any) {
            console.error('显示实现类选择器时出错:', error);
            vscode.window.showErrorMessage(`显示实现类选择器时出错: ${error.message}`);
        }
    }
    
    /**
     * 从Python抽象方法跳转到实现方法
     * @param uri 文档URI
     * @param className ABC类名
     * @param methodName 抽象方法名
     * @param lineNumber 行号
     */
    public async goToPythonMethodImplementations(uri: vscode.Uri, className: string, methodName: string, lineNumber: number): Promise<void> {
        try {
            console.log(`尝试跳转到Python抽象方法 ${className}.${methodName} 的实现`);
            
            // 获取实现方法列表
            const implementationMethods = this.indexService.getImplementationMethods(className, methodName);
            
            if (implementationMethods.length === 0) {
                vscode.window.showInformationMessage(`未找到抽象方法 ${className}.${methodName} 的实现`);
                return;
            }
            
            if (implementationMethods.length === 1) {
                // 只有一个实现方法，直接跳转
                await this.jumpToImplementationMethod(implementationMethods[0]);
            } else {
                // 多个实现方法，显示选择列表
                await this.showMethodImplementationPicker(className, methodName, implementationMethods);
            }
            
        } catch (error: any) {
            console.error('Python抽象方法导航时出错:', error);
            vscode.window.showErrorMessage(`Python抽象方法导航时出错: ${error.message}`);
        }
    }
    
    /**
     * 跳转到指定的实现方法
     */
    private async jumpToImplementationMethod(method: PythonImplementationMethod): Promise<void> {
        try {
            // 打开实现方法文件
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(method.filePath));
            await vscode.window.showTextDocument(document);
            
            // 定位到方法定义行
            const position = new vscode.Position(method.lineNumber, 0);
            const editor = vscode.window.activeTextEditor;
            
            if (editor) {
                // 移动光标到方法定义位置
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
                
                console.log(`跳转到实现方法: ${method.className}.${method.methodName} 在 ${method.filePath}:${method.lineNumber + 1}`);
            }
            
        } catch (error: any) {
            console.error('跳转到实现方法时出错:', error);
            vscode.window.showErrorMessage(`跳转到实现方法时出错: ${error.message}`);
        }
    }
    
    /**
     * 显示实现方法选择器
     */
    private async showMethodImplementationPicker(abstractClassName: string, methodName: string, implementations: PythonImplementationMethod[]): Promise<void> {
        try {
            // 构建选择项
            const items = implementations.map(impl => ({
                label: `${impl.className}.${impl.methodName}`,
                description: `${impl.filePath}:${impl.lineNumber + 1}`,
                detail: `实现了 ${abstractClassName}.${methodName}`,
                implementation: impl
            }));
            
            // 显示快速选择
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: `选择 ${abstractClassName}.${methodName} 的实现方法`,
                matchOnDescription: true,
                matchOnDetail: true
            });
            
            if (selected) {
                await this.jumpToImplementationMethod(selected.implementation);
            }
            
        } catch (error: any) {
            console.error('显示实现方法选择器时出错:', error);
            vscode.window.showErrorMessage(`显示实现方法选择器时出错: ${error.message}`);
        }
    }
    
    /**
     * 从Python实现类跳转到抽象基类
     * @param uri 文档URI
     * @param implementationClassName 实现类名
     * @param abstractClassName 抽象基类名
     * @param lineNumber 行号
     */
    public async goToPythonAbstract(uri: vscode.Uri, implementationClassName: string, abstractClassName: string, lineNumber: number): Promise<void> {
        try {
            console.log(`尝试从Python实现类 ${implementationClassName} 跳转到抽象基类 ${abstractClassName}`);
            
            // 获取抽象基类信息
            const abstractClass = this.indexService.getAbstractClass(abstractClassName);
            
            if (!abstractClass) {
                vscode.window.showInformationMessage(`未找到抽象基类 ${abstractClassName}`);
                return;
            }
            
            // 跳转到抽象基类
            await this.jumpToAbstractClass(abstractClass);
            
        } catch (error: any) {
            console.error('跳转到抽象基类时出错:', error);
            vscode.window.showErrorMessage(`跳转到抽象基类时出错: ${error.message}`);
        }
    }
    
    /**
     * 跳转到指定的抽象基类
     */
    private async jumpToAbstractClass(abstractClass: any): Promise<void> {
        try {
            // 打开抽象基类文件
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(abstractClass.filePath));
            await vscode.window.showTextDocument(document);
            
            // 定位到类定义行
            const position = new vscode.Position(abstractClass.lineNumber, 0);
            const editor = vscode.window.activeTextEditor;
            
            if (editor) {
                // 移动光标到类定义位置
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
                
                console.log(`跳转到抽象基类: ${abstractClass.className} 在 ${abstractClass.filePath}:${abstractClass.lineNumber + 1}`);
            }
            
        } catch (error: any) {
            console.error('跳转到抽象基类时出错:', error);
            vscode.window.showErrorMessage(`跳转到抽象基类时出错: ${error.message}`);
        }
    }
    
    /**
     * 从Python实现方法跳转到抽象方法
     * @param uri 文档URI
     * @param implementationClassName 实现类名
     * @param methodName 方法名
     * @param abstractClassName 抽象基类名
     * @param lineNumber 行号
     */
    public async goToPythonAbstractMethod(uri: vscode.Uri, implementationClassName: string, methodName: string, abstractClassName: string, lineNumber: number): Promise<void> {
        try {
            console.log(`尝试从Python实现方法 ${implementationClassName}.${methodName} 跳转到抽象方法 ${abstractClassName}.${methodName}`);
            
            // 获取抽象基类信息
            const abstractClass = this.indexService.getAbstractClass(abstractClassName);
            
            if (!abstractClass) {
                vscode.window.showInformationMessage(`未找到抽象基类 ${abstractClassName}`);
                return;
            }
            
            // 查找对应的抽象方法
            const abstractMethod = abstractClass.methods.find(method => method.methodName === methodName);
            
            if (!abstractMethod) {
                vscode.window.showInformationMessage(`在抽象基类 ${abstractClassName} 中未找到抽象方法 ${methodName}`);
                return;
            }
            
            // 跳转到抽象方法
            await this.jumpToAbstractMethod(abstractClass, abstractMethod);
            
        } catch (error: any) {
            console.error('跳转到抽象方法时出错:', error);
            vscode.window.showErrorMessage(`跳转到抽象方法时出错: ${error.message}`);
        }
    }
    
    /**
     * 跳转到指定的抽象方法
     */
    private async jumpToAbstractMethod(abstractClass: any, abstractMethod: any): Promise<void> {
        try {
            // 打开抽象基类文件
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(abstractClass.filePath));
            await vscode.window.showTextDocument(document);
            
            // 定位到方法定义行
            const position = new vscode.Position(abstractMethod.lineNumber, 0);
            const editor = vscode.window.activeTextEditor;
            
            if (editor) {
                // 移动光标到方法定义位置
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
                
                console.log(`跳转到抽象方法: ${abstractClass.className}.${abstractMethod.methodName} 在 ${abstractClass.filePath}:${abstractMethod.lineNumber + 1}`);
            }
            
        } catch (error: any) {
            console.error('跳转到抽象方法时出错:', error);
            vscode.window.showErrorMessage(`跳转到抽象方法时出错: ${error.message}`);
        }
    }
} 