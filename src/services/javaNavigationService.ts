import * as vscode from 'vscode';
import { VSCodeCommands } from '../utils/constants';

/**
 * Java导航服务
 * 负责处理跳转逻辑，使用VS Code内置命令
 */
export class JavaNavigationService {
    /**
     * 跳转到实现
     * @param uri 文档URI
     * @param lineNumber 行号
     */
    public async goToImplementation(uri: vscode.Uri, lineNumber: number): Promise<void> {
        try {
            // 打开文档
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            
            // 获取该行的文本内容
            const lineText = document.lineAt(lineNumber).text;
            
            // 查找接口名称的位置
            const interfaceMatch = lineText.match(/\s*public\s+interface\s+(\w+)/);
            let position: vscode.Position;
            
            if (interfaceMatch) {
                // 找到接口名称在行中的位置
                const interfaceName = interfaceMatch[1];
                const interfaceNameIndex = lineText.indexOf(interfaceName);
                position = new vscode.Position(lineNumber, interfaceNameIndex);
            } else {
                // 如果没找到接口名称，则定位到行开头
                position = new vscode.Position(lineNumber, 0);
            }
            
            // 移动光标到指定位置
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position));
                
                // 使用VS Code内置的转到实现命令
                await vscode.commands.executeCommand(VSCodeCommands.GO_TO_IMPLEMENTATIONS);
            }
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
                } catch (error: any) {
                    console.error(`处理文件时出错: ${file.fsPath}`, error);
                }
            }
            
            // 如果没找到接口，显示提示
            vscode.window.showInformationMessage(`未找到接口 ${interfaceName}`);
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
        try {
            // 打开文档
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            
            // 获取该行的文本内容
            const lineText = document.lineAt(lineNumber).text;
            
            // 更新正则表达式以支持泛型
            const methodMatch = lineText.match(/\s*(?:public|protected|private)?\s*(?:static\s+)?(?:default\s+)?(\w+(?:<[^>]*>)?)\s+(\w+)\s*\(/);
            let position: vscode.Position;
            
            if (methodMatch) {
                // 找到方法名称在行中的位置
                const methodName = methodMatch[2];
                const methodNameIndex = lineText.indexOf(methodName);
                position = new vscode.Position(lineNumber, methodNameIndex);
            } else {
                // 如果没找到方法名称，则定位到行开头
                position = new vscode.Position(lineNumber, 0);
            }
            
            // 移动光标到指定位置
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position));
                
                // 使用VS Code内置的转到实现命令
                await vscode.commands.executeCommand(VSCodeCommands.GO_TO_IMPLEMENTATIONS);
            }
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
        try {
            // 打开文档
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            
            // 获取该行的文本内容
            const lineText = document.lineAt(lineNumber).text;
            
            // 查找方法名称的位置
            const methodNameIndex = lineText.indexOf(methodName);
            let position: vscode.Position;
            
            if (methodNameIndex !== -1) {
                // 找到方法名称在行中的位置
                position = new vscode.Position(lineNumber, methodNameIndex);
            } else {
                // 如果没找到方法名称，则定位到行开头
                position = new vscode.Position(lineNumber, 0);
            }
            
            // 移动光标到指定位置
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position));
                
                // 使用VS Code内置的转到声明命令
                await vscode.commands.executeCommand(VSCodeCommands.GO_TO_DECLARATION);
            }
        } catch (error: any) {
            console.error('go to interface method时出错:', error);
            vscode.window.showErrorMessage(`go to interface method时出错: ${error.message}`);
        }
    }
} 