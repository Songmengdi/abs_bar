import * as vscode from 'vscode';
import { JavaNavigationTarget } from '../types/javaTypes';
import { VSCodeCommands } from '../utils/constants';
import { JavaIndexService } from './javaIndexService';

/**
 * Java导航服务
 * 负责处理跳转逻辑，优先使用缓存，fallback到VS Code内置命令
 */
export class JavaNavigationService {
    constructor(private javaIndexService: JavaIndexService) {}
    /**
     * 跳转到实现
     * @param uri 文档URI
     * @param lineNumber 行号
     */
    public async goToImplementation(uri: vscode.Uri, lineNumber: number): Promise<void> {
        const startTime = Date.now();
        
        try {
            // 打开文档
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            
            // 获取该行的文本内容
            const lineText = document.lineAt(lineNumber).text;
            
            // 查找接口名称
            const interfaceMatch = lineText.match(/\s*public\s+interface\s+(\w+)/);
            
            if (interfaceMatch) {
                const interfaceName = interfaceMatch[1];
                console.log(`尝试从缓存查找接口实现: ${interfaceName}`);
                
                // 优先使用缓存查找
                const cachedTargets = this.javaIndexService.findImplementations(interfaceName);
                
                if (cachedTargets.length > 0) {
                    console.log(`缓存命中，找到 ${cachedTargets.length} 个实现，耗时 ${Date.now() - startTime}ms`);
                    await this.navigateToTarget(cachedTargets[0]);
                    return;
                }
                
                console.log(`缓存未命中，fallback到内置命令`);
            }
            
            // Fallback到内置命令
            await this.fallbackToBuiltinCommand(document, lineNumber, 'implementation');
            
        } catch (error: any) {
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
    public async goToInterface(uri: vscode.Uri, interfaceName: string, lineNumber: number): Promise<void> {
        const startTime = Date.now();
        
        try {
            // 从当前实现类文件中提取类名
            const document = await vscode.workspace.openTextDocument(uri);
            const content = document.getText();
            const classMatch = content.match(/public\s+class\s+(\w+)/);
            
            if (classMatch) {
                const className = classMatch[1];
                console.log(`尝试从缓存查找实现类的接口: ${className}`);
                
                // 优先使用缓存查找
                const cachedTargets = this.javaIndexService.findInterfaces(className);
                
                if (cachedTargets.length > 0) {
                    // 查找指定的接口
                    const targetInterface = cachedTargets.find(target => target.targetName === interfaceName);
                    if (targetInterface) {
                        console.log(`缓存命中，找到接口 ${interfaceName}，耗时 ${Date.now() - startTime}ms`);
                        await this.navigateToTarget(targetInterface);
                        return;
                    }
                }
                
                console.log(`缓存未命中，fallback到文件搜索`);
            }
            
            // Fallback到原有的文件搜索逻辑
            await this.fallbackToFileSearch(interfaceName);
            
        } catch (error: any) {
            console.error('go to interface时出错:', error);
            vscode.window.showErrorMessage(`go to interface时出错: ${error.message}`);
        }
    }
    
    /**
     * go to method impl
     * @param uri 文档URI
     * @param lineNumber 行号
     */
    public async goToMethodImplementation(uri: vscode.Uri, lineNumber: number): Promise<void> {
        const startTime = Date.now();
        
        try {
            // 打开文档
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            
            // 获取该行的文本内容
            const lineText = document.lineAt(lineNumber).text;
            
            // 解析接口名和方法名
            const content = document.getText();
            const interfaceMatch = content.match(/public\s+interface\s+(\w+)/);
            const methodMatch = lineText.match(/\s*(?:public|protected|private)?\s*(?:static\s+)?(?:default\s+)?(\w+(?:<[^>]*>)?)\s+(\w+)\s*\(/);
            
            if (interfaceMatch && methodMatch) {
                const interfaceName = interfaceMatch[1];
                const methodName = methodMatch[2];
                console.log(`尝试从缓存查找方法实现: ${interfaceName}.${methodName}`);
                
                // 优先使用缓存查找
                const cachedTargets = this.javaIndexService.findMethodImplementations(interfaceName, methodName);
                
                if (cachedTargets.length > 0) {
                    console.log(`缓存命中，找到 ${cachedTargets.length} 个方法实现，耗时 ${Date.now() - startTime}ms`);
                    await this.navigateToTarget(cachedTargets[0]);
                    return;
                }
                
                console.log(`缓存未命中，fallback到内置命令`);
            }
            
            // Fallback到内置命令
            await this.fallbackToBuiltinCommand(document, lineNumber, 'implementation');
            
        } catch (error: any) {
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
    public async goToInterfaceMethod(uri: vscode.Uri, interfaceName: string, methodName: string, lineNumber: number): Promise<void> {
        const startTime = Date.now();
        
        try {
            console.log(`尝试从缓存查找接口方法: ${interfaceName}.${methodName}`);
            
            // 优先使用缓存查找接口
            const cachedInterfaces = this.javaIndexService.findInterfaces(interfaceName);
            
            if (cachedInterfaces.length > 0) {
                const targetInterface = cachedInterfaces.find(target => target.targetName === interfaceName);
                if (targetInterface) {
                    console.log(`缓存命中，找到接口 ${interfaceName}，耗时 ${Date.now() - startTime}ms`);
                    // 导航到接口，然后查找方法
                    await this.navigateToTarget(targetInterface);
                    // 这里可以进一步定位到具体方法，暂时先跳转到接口
                    return;
                }
            }
            
            console.log(`缓存未命中，fallback到内置命令`);
            
            // Fallback到内置命令
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            await this.fallbackToBuiltinCommand(document, lineNumber, 'declaration');
            
        } catch (error: any) {
            console.error('go to interface method时出错:', error);
            vscode.window.showErrorMessage(`go to interface method时出错: ${error.message}`);
        }
    }
    
    /**
     * 导航到目标位置
     */
    private async navigateToTarget(target: JavaNavigationTarget): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(target.filePath));
            const editor = await vscode.window.showTextDocument(document);
            
            const position = new vscode.Position(target.lineNumber, target.columnNumber);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position));
            
            console.log(`导航到目标: ${target.targetName} (${target.fromCache ? '缓存' : '内置命令'})`);
            
        } catch (error: any) {
            console.error(`导航到目标失败: ${target.filePath}:${target.lineNumber}`, error);
            throw error;
        }
    }
    
    /**
     * Fallback到内置命令
     */
    private async fallbackToBuiltinCommand(document: vscode.TextDocument, lineNumber: number, type: 'implementation' | 'declaration'): Promise<void> {
        try {
            const lineText = document.lineAt(lineNumber).text;
            let position: vscode.Position;
            
            if (type === 'implementation') {
                // 查找接口名称的位置
                const interfaceMatch = lineText.match(/\s*public\s+interface\s+(\w+)/);
                if (interfaceMatch) {
                    const interfaceName = interfaceMatch[1];
                    const interfaceNameIndex = lineText.indexOf(interfaceName);
                    position = new vscode.Position(lineNumber, interfaceNameIndex);
                } else {
                    position = new vscode.Position(lineNumber, 0);
                }
            } else {
                // 查找方法名称的位置
                const methodMatch = lineText.match(/\s*(?:public|protected|private)?\s*(?:static\s+)?(\w+(?:<[^>]*>)?)\s+(\w+)\s*\(/);
                if (methodMatch) {
                    const methodName = methodMatch[2];
                    const methodNameIndex = lineText.indexOf(methodName);
                    position = new vscode.Position(lineNumber, methodNameIndex);
                } else {
                    position = new vscode.Position(lineNumber, 0);
                }
            }
            
            // 移动光标到指定位置
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position));
                
                // 使用相应的内置命令
                const command = type === 'implementation' 
                    ? VSCodeCommands.GO_TO_IMPLEMENTATIONS 
                    : VSCodeCommands.GO_TO_DECLARATION;
                    
                await vscode.commands.executeCommand(command);
                console.log(`使用内置命令: ${command}`);
            }
            
        } catch (error: any) {
            console.error(`Fallback到内置命令失败: ${type}`, error);
            throw error;
        }
    }
    
    /**
     * Fallback到文件搜索
     */
    private async fallbackToFileSearch(interfaceName: string): Promise<void> {
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
                        console.log(`文件搜索找到接口: ${interfaceName}`);
                        return;
                    }
                } catch (error: any) {
                    console.error(`处理文件时出错: ${file.fsPath}`, error);
                }
            }
            
            // 如果没找到接口，显示提示
            vscode.window.showInformationMessage(`未找到接口 ${interfaceName}`);
            
        } catch (error: any) {
            console.error(`文件搜索失败: ${interfaceName}`, error);
            throw error;
        }
    }
} 