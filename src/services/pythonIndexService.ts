import * as vscode from 'vscode';

/**
 * Python ABC类信息
 */
export interface PythonAbstractClass {
    className: string;
    filePath: string;
    lineNumber: number;
    methods: PythonAbstractMethod[];
}

/**
 * Python抽象方法信息
 */
export interface PythonAbstractMethod {
    methodName: string;
    lineNumber: number;
}

/**
 * Python实现类信息
 */
export interface PythonImplementationClass {
    className: string;
    filePath: string;
    lineNumber: number;
    baseClasses: string[];
}

/**
 * Python实现方法信息
 */
export interface PythonImplementationMethod {
    methodName: string;
    className: string;
    filePath: string;
    lineNumber: number;
    abstractClassName: string;
}

/**
 * Python索引服务
 * 负责扫描和索引Python ABC类
 */
export class PythonIndexService {
    private abstractClasses: Map<string, PythonAbstractClass> = new Map();
    private implementationClasses: Map<string, PythonImplementationClass[]> = new Map();
    private implementationMethods: Map<string, PythonImplementationMethod[]> = new Map();
    
    // 文件级别的缓存，用于增量更新
    private fileAbstractClasses: Map<string, string[]> = new Map(); // filePath -> classNames[]
    private fileImplementationClasses: Map<string, PythonImplementationClass[]> = new Map(); // filePath -> implementations[]
    private fileImplementationMethods: Map<string, PythonImplementationMethod[]> = new Map(); // filePath -> methods[]
    
    /**
     * 扫描工作区中的所有Python文件，建立ABC索引
     */
    public async buildIndex(): Promise<void> {
        console.log('开始构建Python ABC索引...');
        
        try {
            // 查找所有Python文件
            const pythonFiles = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**');
            console.log(`找到 ${pythonFiles.length} 个Python文件`);
            
            // 清空现有索引
            this.abstractClasses.clear();
            this.implementationClasses.clear();
            this.implementationMethods.clear();
            this.fileAbstractClasses.clear();
            this.fileImplementationClasses.clear();
            this.fileImplementationMethods.clear();
            
            // 扫描每个Python文件
            for (const file of pythonFiles) {
                await this.scanPythonFile(file);
            }
            
            // 构建实现类索引
            await this.buildImplementationIndex();
            
            // 构建方法级别索引
            await this.buildMethodIndex();
            
            console.log(`Python ABC索引构建完成，共找到 ${this.abstractClasses.size} 个ABC类，${this.getTotalImplementationCount()} 个实现类，${this.getTotalMethodCount()} 个实现方法`);
        } catch (error: any) {
            console.error('构建Python ABC索引时出错:', error);
        }
    }
    
    /**
     * 扫描单个Python文件
     */
    private async scanPythonFile(fileUri: vscode.Uri): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(fileUri);
            const content = document.getText();
            const lines = content.split('\n');
            
            // 检查是否包含ABC导入
            if (!this.hasAbcImport(content)) {
                return;
            }
            
            console.log(`扫描文件: ${fileUri.fsPath}`);
            
            // 查找ABC类定义
            const abcClasses = this.findAbstractClasses(lines, fileUri.fsPath);
            
            // 添加到索引
            const classNames: string[] = [];
            for (const abcClass of abcClasses) {
                this.abstractClasses.set(abcClass.className, abcClass);
                classNames.push(abcClass.className);
                console.log(`找到ABC类: ${abcClass.className} 在 ${abcClass.filePath}:${abcClass.lineNumber + 1}`);
            }
            
            // 更新文件级别缓存
            if (classNames.length > 0) {
                this.fileAbstractClasses.set(fileUri.fsPath, classNames);
            }
            
        } catch (error: any) {
            console.error(`扫描Python文件时出错: ${fileUri.fsPath}`, error);
        }
    }
    
    /**
     * 检查文件是否包含ABC导入
     */
    private hasAbcImport(content: string): boolean {
        // 检查各种ABC导入模式
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
    private findAbstractClasses(lines: string[], filePath: string): PythonAbstractClass[] {
        const abstractClasses: PythonAbstractClass[] = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 匹配ABC类定义模式
            const abcClassMatch = line.match(/^class\s+(\w+)\s*\(\s*ABC\s*\):/);
            const abcMetaClassMatch = line.match(/^class\s+(\w+)\s*\(.*metaclass\s*=\s*ABCMeta.*\):/);
            
            if (abcClassMatch || abcMetaClassMatch) {
                const className = (abcClassMatch || abcMetaClassMatch)![1];
                
                // 查找该类中的抽象方法
                const methods = this.findAbstractMethods(lines, i);
                
                abstractClasses.push({
                    className,
                    filePath,
                    lineNumber: i,
                    methods
                });
            }
        }
        
        return abstractClasses;
    }
    
    /**
     * 查找抽象方法
     */
    private findAbstractMethods(lines: string[], classStartLine: number): PythonAbstractMethod[] {
        const methods: PythonAbstractMethod[] = [];
        
        // 从类定义开始向下查找，直到遇到下一个类或文件结束
        for (let i = classStartLine + 1; i < lines.length; i++) {
            const line = lines[i];
            
            // 如果遇到新的类定义，停止查找
            if (line.match(/^class\s+\w+/)) {
                break;
            }
            
            // 查找@abstractmethod装饰器
            if (line.trim() === '@abstractmethod') {
                // 查找下一行的方法定义
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1];
                    const methodMatch = nextLine.match(/^\s+def\s+(\w+)\s*\(/);
                    if (methodMatch) {
                        methods.push({
                            methodName: methodMatch[1],
                            lineNumber: i + 1
                        });
                    }
                }
            }
        }
        
        return methods;
    }
    
    /**
     * 获取所有ABC类
     */
    public getAbstractClasses(): Map<string, PythonAbstractClass> {
        return this.abstractClasses;
    }
    
    /**
     * 根据类名获取ABC类信息
     */
    public getAbstractClass(className: string): PythonAbstractClass | undefined {
        return this.abstractClasses.get(className);
    }
    
    /**
     * 构建实现类索引
     */
    private async buildImplementationIndex(): Promise<void> {
        console.log('开始构建Python实现类索引...');
        
        try {
            // 查找所有Python文件
            const pythonFiles = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**');
            
            // 扫描每个Python文件查找实现类
            for (const file of pythonFiles) {
                await this.scanImplementationFile(file);
            }
            
        } catch (error: any) {
            console.error('构建Python实现类索引时出错:', error);
        }
    }
    
    /**
     * 扫描单个Python文件查找实现类
     */
    private async scanImplementationFile(fileUri: vscode.Uri): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(fileUri);
            const content = document.getText();
            const lines = content.split('\n');
            
            // 解析导入语句
            const importMap = this.parseImports(lines);
            
            // 查找实现类定义
            const implementationClasses = this.findImplementationClasses(lines, fileUri.fsPath);
            
            // 添加到索引
            for (const implClass of implementationClasses) {
                for (const baseClass of implClass.baseClasses) {
                    // 解析基类名称（可能包含模块路径）
                    const resolvedBaseClass = this.resolveClassName(baseClass, importMap);
                    
                    // 检查基类是否是ABC类
                    if (this.abstractClasses.has(resolvedBaseClass)) {
                        if (!this.implementationClasses.has(resolvedBaseClass)) {
                            this.implementationClasses.set(resolvedBaseClass, []);
                        }
                        this.implementationClasses.get(resolvedBaseClass)!.push(implClass);
                        console.log(`找到实现类: ${implClass.className} 实现了 ${resolvedBaseClass} 在 ${implClass.filePath}:${implClass.lineNumber + 1}`);
                    }
                }
            }
            
            // 更新文件级别缓存
            if (implementationClasses.length > 0) {
                this.fileImplementationClasses.set(fileUri.fsPath, implementationClasses);
            }
            
        } catch (error: any) {
            console.error(`扫描Python实现类文件时出错: ${fileUri.fsPath}`, error);
        }
    }
    
    /**
     * 查找实现类定义
     */
    private findImplementationClasses(lines: string[], filePath: string): PythonImplementationClass[] {
        const implementationClasses: PythonImplementationClass[] = [];
        
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
                    .filter(cls => cls !== 'ABC' && !cls.includes('metaclass')); // 排除ABC和metaclass
                
                if (baseClasses.length > 0) {
                    implementationClasses.push({
                        className,
                        filePath,
                        lineNumber: i,
                        baseClasses
                    });
                }
            }
        }
        
        return implementationClasses;
    }
    
    /**
     * 获取总实现类数量
     */
    private getTotalImplementationCount(): number {
        let total = 0;
        for (const implementations of this.implementationClasses.values()) {
            total += implementations.length;
        }
        return total;
    }
    
    /**
     * 根据ABC类名获取实现类列表
     */
    public getImplementationClasses(abstractClassName: string): PythonImplementationClass[] {
        return this.implementationClasses.get(abstractClassName) || [];
    }
    
    /**
     * 构建方法级别索引
     */
    private async buildMethodIndex(): Promise<void> {
        console.log('开始构建Python方法级别索引...');
        
        try {
            // 遍历所有实现类，查找其中的方法
            for (const [abstractClassName, implementations] of this.implementationClasses.entries()) {
                for (const implementation of implementations) {
                    await this.scanImplementationMethods(implementation, abstractClassName);
                }
            }
            
        } catch (error: any) {
            console.error('构建Python方法级别索引时出错:', error);
        }
    }
    
    /**
     * 扫描实现类中的方法
     */
    private async scanImplementationMethods(implementation: PythonImplementationClass, abstractClassName: string): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(implementation.filePath));
            const content = document.getText();
            const lines = content.split('\n');
            
            // 获取抽象类的方法列表
            const abstractClass = this.abstractClasses.get(abstractClassName);
            if (!abstractClass) {
                return;
            }
            
            // 查找实现类中的方法
            const implementationMethods = this.findImplementationMethods(lines, implementation, abstractClass);
            
            // 添加到方法索引
            for (const method of implementationMethods) {
                const methodKey = `${abstractClassName}.${method.methodName}`;
                if (!this.implementationMethods.has(methodKey)) {
                    this.implementationMethods.set(methodKey, []);
                }
                this.implementationMethods.get(methodKey)!.push(method);
                console.log(`找到实现方法: ${method.className}.${method.methodName} 在 ${method.filePath}:${method.lineNumber + 1}`);
            }
            
        } catch (error: any) {
            console.error(`扫描实现类方法时出错: ${implementation.filePath}`, error);
        }
    }
    
    /**
     * 查找实现类中的方法
     */
    private findImplementationMethods(lines: string[], implementation: PythonImplementationClass, abstractClass: PythonAbstractClass): PythonImplementationMethod[] {
        const methods: PythonImplementationMethod[] = [];
        
        let inTargetClass = false;
        let classStartLine = -1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 查找目标实现类的开始
            const classMatch = line.match(/^class\s+(\w+)/);
            if (classMatch && classMatch[1] === implementation.className) {
                inTargetClass = true;
                classStartLine = i;
                continue;
            }
            
            // 如果遇到新的类定义，退出当前类
            if (inTargetClass && classMatch && classMatch[1] !== implementation.className) {
                break;
            }
            
            // 在目标类内部查找方法定义
            if (inTargetClass) {
                const methodMatch = line.match(/^\s+def\s+(\w+)\s*\(/);
                if (methodMatch) {
                    const methodName = methodMatch[1];
                    
                    // 检查是否是抽象方法的实现
                    const isAbstractMethod = abstractClass.methods.some(abstractMethod => 
                        abstractMethod.methodName === methodName
                    );
                    
                    if (isAbstractMethod) {
                        methods.push({
                            methodName,
                            className: implementation.className,
                            filePath: implementation.filePath,
                            lineNumber: i,
                            abstractClassName: abstractClass.className
                        });
                    }
                }
            }
        }
        
        return methods;
    }
    
    /**
     * 获取总方法数量
     */
    private getTotalMethodCount(): number {
        let total = 0;
        for (const methods of this.implementationMethods.values()) {
            total += methods.length;
        }
        return total;
    }
    
    /**
     * 根据抽象类名和方法名获取实现方法列表
     */
    public getImplementationMethods(abstractClassName: string, methodName: string): PythonImplementationMethod[] {
        const methodKey = `${abstractClassName}.${methodName}`;
        return this.implementationMethods.get(methodKey) || [];
    }
    
    /**
     * 增量更新单个文件的索引
     */
    public async updateFileIndex(fileUri: vscode.Uri): Promise<void> {
        try {
            console.log(`增量更新文件索引: ${fileUri.fsPath}`);
            
            // 先移除该文件的旧索引
            await this.removeFileFromIndex(fileUri.fsPath);
            
            // 重新扫描该文件
            await this.scanPythonFile(fileUri);
            
            // 重新构建该文件相关的实现类和方法索引
            await this.rebuildRelatedIndexes(fileUri.fsPath);
            
            console.log(`文件索引更新完成: ${fileUri.fsPath}`);
            
        } catch (error: any) {
            console.error(`更新文件索引时出错: ${fileUri.fsPath}`, error);
        }
    }
    
    /**
     * 从索引中移除指定文件的所有数据
     */
    private async removeFileFromIndex(filePath: string): Promise<void> {
        // 移除抽象类
        const oldAbstractClasses = this.fileAbstractClasses.get(filePath) || [];
        for (const className of oldAbstractClasses) {
            this.abstractClasses.delete(className);
            
            // 移除相关的实现类映射
            this.implementationClasses.delete(className);
            
            // 移除相关的方法映射
            for (const [methodKey, methods] of this.implementationMethods.entries()) {
                if (methodKey.startsWith(`${className}.`)) {
                    this.implementationMethods.delete(methodKey);
                }
            }
        }
        
        // 移除实现类
        const oldImplementationClasses = this.fileImplementationClasses.get(filePath) || [];
        for (const implClass of oldImplementationClasses) {
            // 从各个抽象类的实现列表中移除
            for (const baseClass of implClass.baseClasses) {
                const implementations = this.implementationClasses.get(baseClass) || [];
                const filteredImplementations = implementations.filter(impl => 
                    impl.filePath !== filePath || impl.className !== implClass.className
                );
                
                if (filteredImplementations.length > 0) {
                    this.implementationClasses.set(baseClass, filteredImplementations);
                } else {
                    this.implementationClasses.delete(baseClass);
                }
            }
        }
        
        // 移除实现方法
        const oldImplementationMethods = this.fileImplementationMethods.get(filePath) || [];
        for (const method of oldImplementationMethods) {
            const methodKey = `${method.abstractClassName}.${method.methodName}`;
            const methods = this.implementationMethods.get(methodKey) || [];
            const filteredMethods = methods.filter(m => 
                m.filePath !== filePath || m.className !== method.className
            );
            
            if (filteredMethods.length > 0) {
                this.implementationMethods.set(methodKey, filteredMethods);
            } else {
                this.implementationMethods.delete(methodKey);
            }
        }
        
        // 清空文件级别缓存
        this.fileAbstractClasses.delete(filePath);
        this.fileImplementationClasses.delete(filePath);
        this.fileImplementationMethods.delete(filePath);
    }
    
    /**
     * 重新构建与指定文件相关的索引
     */
    private async rebuildRelatedIndexes(filePath: string): Promise<void> {
        // 获取新添加的抽象类
        const newAbstractClasses = this.fileAbstractClasses.get(filePath) || [];
        
        // 为新的抽象类重新构建实现类索引
        for (const abstractClassName of newAbstractClasses) {
            // 扫描所有文件，查找该抽象类的实现
            for (const [otherFilePath, implementations] of this.fileImplementationClasses.entries()) {
                for (const implementation of implementations) {
                    if (implementation.baseClasses.includes(abstractClassName)) {
                        if (!this.implementationClasses.has(abstractClassName)) {
                            this.implementationClasses.set(abstractClassName, []);
                        }
                        this.implementationClasses.get(abstractClassName)!.push(implementation);
                        
                        // 重新构建方法索引
                        await this.rebuildMethodIndexForImplementation(implementation, abstractClassName);
                    }
                }
            }
        }
    }
    
    /**
     * 为指定实现类重新构建方法索引
     */
    private async rebuildMethodIndexForImplementation(implementation: PythonImplementationClass, abstractClassName: string): Promise<void> {
        try {
            const abstractClass = this.abstractClasses.get(abstractClassName);
            if (!abstractClass) {
                return;
            }
            
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(implementation.filePath));
            const content = document.getText();
            const lines = content.split('\n');
            
            const implementationMethods = this.findImplementationMethods(lines, implementation, abstractClass);
            
            for (const method of implementationMethods) {
                const methodKey = `${abstractClassName}.${method.methodName}`;
                if (!this.implementationMethods.has(methodKey)) {
                    this.implementationMethods.set(methodKey, []);
                }
                this.implementationMethods.get(methodKey)!.push(method);
            }
            
        } catch (error: any) {
            console.error(`重新构建方法索引时出错: ${implementation.filePath}`, error);
        }
    }
    
    /**
     * 移除文件索引（用于文件删除）
     */
    public async removeFileIndex(filePath: string): Promise<void> {
        console.log(`移除文件索引: ${filePath}`);
        await this.removeFileFromIndex(filePath);
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
} 