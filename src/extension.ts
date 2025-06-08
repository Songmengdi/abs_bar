import * as vscode from 'vscode';
import { JavaImplementationCodeLensProvider } from './providers/javaImplementationCodeLensProvider';
import { JavaInterfaceCodeLensProvider } from './providers/javaInterfaceCodeLensProvider';
import { PythonAbstractCodeLensProvider } from './providers/pythonAbstractCodeLensProvider';
import { PythonImplementationCodeLensProvider } from './providers/pythonImplementationCodeLensProvider';
import { CommandService } from './services/commandService';
import { JavaCacheService } from './services/javaCacheService';
import { JavaIndexService } from './services/javaIndexService';
import { LanguageIds } from './utils/constants';

/**
 * 插件激活时调用
 */
export async function activate(context: vscode.ExtensionContext) {
    console.log('插件 "impl-nav" 已激活');
    
    // 初始化Java服务
    javaCacheService = new JavaCacheService();
    const javaIndexService = new JavaIndexService();
    
    // 建立服务间关联
    javaIndexService.setCacheService(javaCacheService);
    
    // 构建Java索引
    console.log('开始构建Java索引...');
    await javaIndexService.buildIndex();
    
    // 注册命令（传入Java索引服务）
    const commandService = new CommandService(javaIndexService);
    commandService.registerCommands(context);
    
    // 构建Python ABC索引
    const pythonIndexService = commandService.getPythonIndexService();
    await pythonIndexService.buildIndex();
    
    // 监听Python文件变化，增量更新索引
    const pythonFileWatcher = vscode.workspace.createFileSystemWatcher('**/*.py');
    pythonFileWatcher.onDidCreate(async (uri) => {
        console.log(`检测到Python文件创建，增量更新索引: ${uri.fsPath}`);
        await pythonIndexService.updateFileIndex(uri);
    });
    pythonFileWatcher.onDidChange(async (uri) => {
        console.log(`检测到Python文件修改，增量更新索引: ${uri.fsPath}`);
        await pythonIndexService.updateFileIndex(uri);
    });
    pythonFileWatcher.onDidDelete(async (uri) => {
        console.log(`检测到Python文件删除，移除索引: ${uri.fsPath}`);
        await pythonIndexService.removeFileIndex(uri.fsPath);
    });
    context.subscriptions.push(pythonFileWatcher);
    
    // 监听Java文件变化，增量更新索引
    const javaFileWatcher = vscode.workspace.createFileSystemWatcher('**/*.java');
    javaFileWatcher.onDidCreate(async (uri) => {
        console.log(`检测到Java文件创建，增量更新索引: ${uri.fsPath}`);
        // 先清理缓存，再更新索引
        if (javaCacheService) {
            javaCacheService.invalidateFileCache(uri.fsPath);
        }
        await javaIndexService.scanJavaFile(uri.fsPath);
    });
    javaFileWatcher.onDidChange(async (uri) => {
        console.log(`检测到Java文件修改，增量更新索引: ${uri.fsPath}`);
        // 先清理缓存，再更新索引
        if (javaCacheService) {
            javaCacheService.invalidateFileCache(uri.fsPath);
        }
        await javaIndexService.scanJavaFile(uri.fsPath);
    });
    javaFileWatcher.onDidDelete(async (uri) => {
        console.log(`检测到Java文件删除，移除索引: ${uri.fsPath}`);
        // 先清理缓存，再移除索引
        if (javaCacheService) {
            javaCacheService.invalidateFileCache(uri.fsPath);
        }
        javaIndexService.removeFileIndex(uri.fsPath);
    });
    context.subscriptions.push(javaFileWatcher);
    
    // 注册Java接口CodeLens提供器
    const javaInterfaceCodeLensProvider = new JavaInterfaceCodeLensProvider(javaIndexService);
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { language: LanguageIds.JAVA, scheme: 'file' },
            javaInterfaceCodeLensProvider
        )
    );
    
    // 注册Java实现类CodeLens提供器
    const javaImplementationCodeLensProvider = new JavaImplementationCodeLensProvider(javaIndexService);
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { language: LanguageIds.JAVA, scheme: 'file' },
            javaImplementationCodeLensProvider
        )
    );
    
    // 注册Python ABC CodeLens提供器
    const pythonAbstractCodeLensProvider = new PythonAbstractCodeLensProvider(pythonIndexService);
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { language: LanguageIds.PYTHON, scheme: 'file' },
            pythonAbstractCodeLensProvider
        )
    );
    
    // 注册Python实现类CodeLens提供器
    const pythonImplementationCodeLensProvider = new PythonImplementationCodeLensProvider(pythonIndexService);
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { language: LanguageIds.PYTHON, scheme: 'file' },
            pythonImplementationCodeLensProvider
        )
    );
}

// 全局变量用于存储服务实例
let javaCacheService: JavaCacheService | null = null;

/**
 * 插件停用时调用
 */
export function deactivate() {
    console.log('插件 "impl-nav" 已停用');
    
    // 清理Java缓存服务
    if (javaCacheService) {
        javaCacheService.dispose();
        javaCacheService = null;
    }
}
