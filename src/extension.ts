import * as vscode from 'vscode';
import { JavaImplementationCodeLensProvider } from './providers/javaImplementationCodeLensProvider';
import { JavaInterfaceCodeLensProvider } from './providers/javaInterfaceCodeLensProvider';
import { PythonAbstractCodeLensProvider } from './providers/pythonAbstractCodeLensProvider';
import { PythonImplementationCodeLensProvider } from './providers/pythonImplementationCodeLensProvider';
import { CommandService } from './services/commandService';
import { LanguageIds } from './utils/constants';

/**
 * 插件激活时调用
 */
export async function activate(context: vscode.ExtensionContext) {
    console.log('插件 "impl-nav" 已激活');
    
    // 注册命令
    const commandService = new CommandService();
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
    
    // 注册Java接口CodeLens提供器
    const javaInterfaceCodeLensProvider = new JavaInterfaceCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { language: LanguageIds.JAVA, scheme: 'file' },
            javaInterfaceCodeLensProvider
        )
    );
    
    // 注册Java实现类CodeLens提供器
    const javaImplementationCodeLensProvider = new JavaImplementationCodeLensProvider();
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

/**
 * 插件停用时调用
 */
export function deactivate() {
    console.log('插件 "impl-nav" 已停用');
}
