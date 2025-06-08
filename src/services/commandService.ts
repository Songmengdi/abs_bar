import * as vscode from 'vscode';
import { Commands } from '../utils/constants';
import { JavaNavigationService } from './javaNavigationService';
import { PythonIndexService } from './pythonIndexService';
import { PythonNavigationService } from './pythonNavigationService';

/**
 * 命令注册服务
 * 负责注册插件的命令
 */
export class CommandService {
    private javaNavigationService: JavaNavigationService;
    private pythonNavigationService: PythonNavigationService;
    private pythonIndexService: PythonIndexService;
    
    constructor() {
        this.javaNavigationService = new JavaNavigationService();
        this.pythonIndexService = new PythonIndexService();
        this.pythonNavigationService = new PythonNavigationService(this.pythonIndexService);
    }
    
    /**
     * 注册所有命令
     * @param context 扩展上下文
     */
    public registerCommands(context: vscode.ExtensionContext): void {
        // 注册go to impl命令
        context.subscriptions.push(
            vscode.commands.registerCommand(Commands.GO_TO_IMPLEMENTATIONS, async (uri: vscode.Uri, lineNumber: number) => {
                await this.javaNavigationService.goToImplementation(uri, lineNumber);
            })
        );
        
        // 注册go to method impl命令
        context.subscriptions.push(
            vscode.commands.registerCommand(Commands.GO_TO_METHOD_IMPLEMENTATIONS, async (uri: vscode.Uri, lineNumber: number) => {
                await this.javaNavigationService.goToMethodImplementation(uri, lineNumber);
            })
        );
        
        // 注册go to interface命令
        context.subscriptions.push(
            vscode.commands.registerCommand(Commands.GO_TO_INTERFACE, async (uri: vscode.Uri, interfaceName: string, lineNumber: number) => {
                await this.javaNavigationService.goToInterface(uri, interfaceName, lineNumber);
            })
        );
        
        // 注册go to interface method命令
        context.subscriptions.push(
            vscode.commands.registerCommand(Commands.GO_TO_INTERFACE_METHOD, async (uri: vscode.Uri, interfaceName: string, methodName: string, lineNumber: number) => {
                await this.javaNavigationService.goToInterfaceMethod(uri, interfaceName, methodName, lineNumber);
            })
        );
        
        // 注册Python go to impl命令
        context.subscriptions.push(
            vscode.commands.registerCommand(Commands.GO_TO_PYTHON_IMPLEMENTATIONS, async (uri: vscode.Uri, className: string, lineNumber: number) => {
                await this.pythonNavigationService.goToPythonImplementations(uri, className, lineNumber);
            })
        );
        
        // 注册Python method go to impl命令
        context.subscriptions.push(
            vscode.commands.registerCommand(Commands.GO_TO_PYTHON_METHOD_IMPLEMENTATIONS, async (uri: vscode.Uri, className: string, methodName: string, lineNumber: number) => {
                await this.pythonNavigationService.goToPythonMethodImplementations(uri, className, methodName, lineNumber);
            })
        );
        
        // 注册Python implementation go to abstract命令
        context.subscriptions.push(
            vscode.commands.registerCommand(Commands.GO_TO_PYTHON_ABSTRACT, async (uri: vscode.Uri, implementationClassName: string, abstractClassName: string, lineNumber: number) => {
                await this.pythonNavigationService.goToPythonAbstract(uri, implementationClassName, abstractClassName, lineNumber);
            })
        );
        
        // 注册Python implementation method go to abstract method命令
        context.subscriptions.push(
            vscode.commands.registerCommand(Commands.GO_TO_PYTHON_ABSTRACT_METHOD, async (uri: vscode.Uri, implementationClassName: string, methodName: string, abstractClassName: string, lineNumber: number) => {
                await this.pythonNavigationService.goToPythonAbstractMethod(uri, implementationClassName, methodName, abstractClassName, lineNumber);
            })
        );
    }
    
    /**
     * 获取Python索引服务
     */
    public getPythonIndexService(): PythonIndexService {
        return this.pythonIndexService;
    }
    
    /**
     * 调试方法：检查重复数据
     */
    public debugCheckDuplicates(): void {
        console.log('=== 开始调试检查 ===');
        this.pythonIndexService.debugCheckDuplicateMethods();
        
        const stats = this.pythonIndexService.getCacheStats();
        console.log('缓存统计:', stats);
        console.log('=== 调试检查完成 ===');
    }
    
    /**
     * 调试方法：检查特定抽象方法的实现索引
     */
    public debugCheckMethodImplementations(abstractClassName: string, methodName: string): void {
        this.pythonIndexService.debugCheckMethodImplementations(abstractClassName, methodName);
    }
} 