"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PythonIndexService = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Python索引服务
 * 负责扫描和索引Python ABC类
 */
class PythonIndexService {
    abstractClasses = new Map();
    implementationClasses = new Map();
    implementationMethods = new Map();
    // 文件级别的缓存，用于增量更新
    fileAbstractClasses = new Map(); // filePath -> classNames[]
    fileImplementationClasses = new Map(); // filePath -> implementations[]
    fileImplementationMethods = new Map(); // filePath -> methods[]
    /**
     * 扫描工作区中的所有Python文件，建立ABC索引
     */
    async buildIndex() {
        const startTime = Date.now();
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
            // 分批处理文件，避免内存压力
            const batchSize = 50;
            let processedFiles = 0;
            for (let i = 0; i < pythonFiles.length; i += batchSize) {
                const batch = pythonFiles.slice(i, i + batchSize);
                // 并行处理批次内的文件
                await Promise.all(batch.map(async (file) => {
                    await this.scanPythonFile(file);
                    processedFiles++;
                    // 每处理100个文件输出一次进度
                    if (processedFiles % 100 === 0) {
                        console.log(`已处理 ${processedFiles}/${pythonFiles.length} 个文件`);
                    }
                }));
            }
            const scanTime = Date.now();
            console.log(`文件扫描完成，耗时: ${scanTime - startTime}ms`);
            // 构建实现类索引
            await this.buildImplementationIndex();
            const implTime = Date.now();
            console.log(`实现类索引构建完成，耗时: ${implTime - scanTime}ms`);
            // 构建方法级别索引
            await this.buildMethodIndex();
            const methodTime = Date.now();
            console.log(`方法索引构建完成，耗时: ${methodTime - implTime}ms`);
            // 验证缓存一致性
            this.validateCacheConsistency();
            const totalTime = Date.now() - startTime;
            const stats = this.getCacheStats();
            console.log(`Python ABC索引构建完成，总耗时: ${totalTime}ms`);
            console.log(`索引统计: ${stats.abstractClasses} 个ABC类，${stats.implementationClasses} 个实现类，${stats.implementationMethods} 个实现方法`);
            console.log(`文件级缓存: ${stats.fileAbstractClasses} 个抽象类文件，${stats.fileImplementationClasses} 个实现类文件，${stats.fileImplementationMethods} 个方法文件`);
        }
        catch (error) {
            console.error('构建Python ABC索引时出错:', error);
        }
    }
    /**
     * 扫描单个Python文件
     */
    async scanPythonFile(fileUri) {
        try {
            const document = await vscode.workspace.openTextDocument(fileUri);
            const content = document.getText();
            const lines = content.split('\n');
            // 检查是否包含ABC导入
            if (!this.hasAbcImport(content)) {
                // 即使没有ABC导入，也要检查是否有实现类
                await this.scanImplementationFile(fileUri);
                return;
            }
            console.log(`扫描文件: ${fileUri.fsPath}`);
            // 查找ABC类定义
            const abcClasses = this.findAbstractClasses(lines, fileUri.fsPath);
            // 添加到索引
            const classNames = [];
            for (const abcClass of abcClasses) {
                this.abstractClasses.set(abcClass.className, abcClass);
                classNames.push(abcClass.className);
                console.log(`找到ABC类: ${abcClass.className} 在 ${abcClass.filePath}:${abcClass.lineNumber + 1}`);
            }
            // 更新文件级别缓存
            if (classNames.length > 0) {
                this.fileAbstractClasses.set(fileUri.fsPath, classNames);
            }
            // 同时扫描实现类（一个文件可能既有抽象类又有实现类）
            await this.scanImplementationFile(fileUri);
        }
        catch (error) {
            console.error(`扫描Python文件时出错: ${fileUri.fsPath}`, error);
        }
    }
    /**
     * 检查文件是否包含ABC导入
     */
    hasAbcImport(content) {
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
    findAbstractClasses(lines, filePath) {
        const abstractClasses = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // 匹配ABC类定义模式
            const abcClassMatch = line.match(/^class\s+(\w+)\s*\(\s*ABC\s*\):/);
            const abcMetaClassMatch = line.match(/^class\s+(\w+)\s*\(.*metaclass\s*=\s*ABCMeta.*\):/);
            if (abcClassMatch || abcMetaClassMatch) {
                const className = (abcClassMatch || abcMetaClassMatch)[1];
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
    findAbstractMethods(lines, classStartLine) {
        const methods = [];
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
    getAbstractClasses() {
        return this.abstractClasses;
    }
    /**
     * 根据类名获取ABC类信息
     */
    getAbstractClass(className) {
        return this.abstractClasses.get(className);
    }
    /**
     * 构建实现类索引
     */
    async buildImplementationIndex() {
        console.log('开始构建Python实现类索引...');
        try {
            // 查找所有Python文件
            const pythonFiles = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**');
            // 扫描每个Python文件查找实现类
            for (const file of pythonFiles) {
                await this.scanImplementationFile(file);
            }
        }
        catch (error) {
            console.error('构建Python实现类索引时出错:', error);
        }
    }
    /**
     * 扫描单个Python文件查找实现类
     */
    async scanImplementationFile(fileUri) {
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
                        this.implementationClasses.get(resolvedBaseClass).push(implClass);
                        console.log(`找到实现类: ${implClass.className} 实现了 ${resolvedBaseClass} 在 ${implClass.filePath}:${implClass.lineNumber + 1}`);
                    }
                }
            }
            // 更新文件级别缓存
            if (implementationClasses.length > 0) {
                this.fileImplementationClasses.set(fileUri.fsPath, implementationClasses);
            }
        }
        catch (error) {
            console.error(`扫描Python实现类文件时出错: ${fileUri.fsPath}`, error);
        }
    }
    /**
     * 查找实现类定义
     */
    findImplementationClasses(lines, filePath) {
        const implementationClasses = [];
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
    getTotalImplementationCount() {
        let total = 0;
        for (const implementations of this.implementationClasses.values()) {
            total += implementations.length;
        }
        return total;
    }
    /**
     * 根据ABC类名获取实现类列表
     */
    getImplementationClasses(abstractClassName) {
        return this.implementationClasses.get(abstractClassName) || [];
    }
    /**
     * 构建方法级别索引
     */
    async buildMethodIndex() {
        console.log('开始构建Python方法级别索引...');
        try {
            // 遍历所有实现类，查找其中的方法
            for (const [abstractClassName, implementations] of this.implementationClasses.entries()) {
                for (const implementation of implementations) {
                    await this.scanImplementationMethods(implementation, abstractClassName);
                }
            }
        }
        catch (error) {
            console.error('构建Python方法级别索引时出错:', error);
        }
    }
    /**
     * 扫描实现类中的方法
     */
    async scanImplementationMethods(implementation, abstractClassName) {
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
                // 检查是否已存在相同的方法，避免重复添加
                const existingMethods = this.implementationMethods.get(methodKey);
                const alreadyExists = existingMethods.some(existing => existing.filePath === method.filePath &&
                    existing.className === method.className &&
                    existing.methodName === method.methodName &&
                    existing.abstractClassName === method.abstractClassName);
                if (!alreadyExists) {
                    existingMethods.push(method);
                    console.log(`找到实现方法: ${method.className}.${method.methodName} 在 ${method.filePath}:${method.lineNumber + 1}`);
                }
                else {
                    console.log(`跳过重复实现方法: ${method.className}.${method.methodName} 在 ${method.filePath}:${method.lineNumber + 1}`);
                }
            }
        }
        catch (error) {
            console.error(`扫描实现类方法时出错: ${implementation.filePath}`, error);
        }
    }
    /**
     * 查找实现类中的方法
     */
    findImplementationMethods(lines, implementation, abstractClass) {
        const methods = [];
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
                    const isAbstractMethod = abstractClass.methods.some(abstractMethod => abstractMethod.methodName === methodName);
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
    getTotalMethodCount() {
        let total = 0;
        for (const methods of this.implementationMethods.values()) {
            total += methods.length;
        }
        return total;
    }
    /**
     * 根据抽象类名和方法名获取实现方法列表
     */
    getImplementationMethods(abstractClassName, methodName) {
        const methodKey = `${abstractClassName}.${methodName}`;
        return this.implementationMethods.get(methodKey) || [];
    }
    /**
     * 增量更新单个文件的索引
     */
    async updateFileIndex(fileUri) {
        try {
            console.log(`增量更新文件索引: ${fileUri.fsPath}`);
            // 先移除该文件的旧索引
            await this.removeFileFromIndex(fileUri.fsPath);
            // 重新扫描该文件
            await this.scanPythonFile(fileUri);
            // 重新构建该文件相关的实现类和方法索引
            await this.rebuildRelatedIndexes(fileUri.fsPath);
            // 验证缓存一致性
            this.validateCacheConsistency(fileUri.fsPath);
            console.log(`文件索引更新完成: ${fileUri.fsPath}`);
        }
        catch (error) {
            console.error(`更新文件索引时出错: ${fileUri.fsPath}`, error);
        }
    }
    /**
     * 验证缓存一致性
     */
    validateCacheConsistency(filePath) {
        try {
            // 验证抽象类索引一致性
            for (const [className, abstractClass] of this.abstractClasses.entries()) {
                const fileClasses = this.fileAbstractClasses.get(abstractClass.filePath) || [];
                if (!fileClasses.includes(className)) {
                    console.warn(`缓存不一致: 抽象类 ${className} 在全局索引中存在，但在文件级缓存中缺失`);
                }
            }
            // 验证实现类索引一致性
            for (const [abstractClassName, implementations] of this.implementationClasses.entries()) {
                for (const impl of implementations) {
                    const fileImplementations = this.fileImplementationClasses.get(impl.filePath) || [];
                    const exists = fileImplementations.some(fileImpl => fileImpl.className === impl.className && fileImpl.filePath === impl.filePath);
                    if (!exists) {
                        console.warn(`缓存不一致: 实现类 ${impl.className} 在全局索引中存在，但在文件级缓存中缺失`);
                    }
                }
            }
            // 验证方法索引一致性
            for (const [methodKey, methods] of this.implementationMethods.entries()) {
                for (const method of methods) {
                    const fileMethods = this.fileImplementationMethods.get(method.filePath) || [];
                    const exists = fileMethods.some(fileMethod => fileMethod.methodName === method.methodName &&
                        fileMethod.className === method.className &&
                        fileMethod.filePath === method.filePath);
                    if (!exists) {
                        console.warn(`缓存不一致: 方法 ${method.className}.${method.methodName} 在全局索引中存在，但在文件级缓存中缺失`);
                    }
                }
            }
            if (filePath) {
                console.log(`缓存一致性验证完成: ${filePath}`);
            }
        }
        catch (error) {
            console.error('缓存一致性验证时出错:', error);
        }
    }
    /**
     * 获取缓存统计信息
     */
    getCacheStats() {
        return {
            abstractClasses: this.abstractClasses.size,
            implementationClasses: this.getTotalImplementationCount(),
            implementationMethods: this.getTotalMethodCount(),
            fileAbstractClasses: this.fileAbstractClasses.size,
            fileImplementationClasses: this.fileImplementationClasses.size,
            fileImplementationMethods: this.fileImplementationMethods.size
        };
    }
    /**
     * 调试方法：检查方法索引中的重复数据
     */
    debugCheckDuplicateMethods() {
        console.log('=== 检查方法索引中的重复数据 ===');
        for (const [methodKey, methods] of this.implementationMethods.entries()) {
            if (methods.length > 1) {
                console.log(`方法键 ${methodKey} 有 ${methods.length} 个实现:`);
                const uniqueMethods = new Set();
                const duplicates = [];
                for (const method of methods) {
                    const signature = `${method.filePath}:${method.className}.${method.methodName}:${method.lineNumber}`;
                    if (uniqueMethods.has(signature)) {
                        duplicates.push(method);
                    }
                    else {
                        uniqueMethods.add(signature);
                    }
                    console.log(`  - ${signature}`);
                }
                if (duplicates.length > 0) {
                    console.warn(`❌ 发现 ${duplicates.length} 个重复方法:`);
                    duplicates.forEach(dup => {
                        console.warn(`    重复: ${dup.filePath}:${dup.className}.${dup.methodName}:${dup.lineNumber}`);
                    });
                }
                else {
                    console.log(`✅ 无重复数据`);
                }
            }
        }
        console.log('=== 重复数据检查完成 ===');
    }
    /**
     * 调试方法：检查特定抽象方法的实现索引
     */
    debugCheckMethodImplementations(abstractClassName, methodName) {
        console.log(`=== 检查抽象方法实现索引: ${abstractClassName}.${methodName} ===`);
        const methodKey = `${abstractClassName}.${methodName}`;
        const implementations = this.implementationMethods.get(methodKey) || [];
        console.log(`全局方法索引中找到 ${implementations.length} 个实现:`);
        implementations.forEach((impl, index) => {
            console.log(`  ${index + 1}. ${impl.className}.${impl.methodName} 在 ${impl.filePath}:${impl.lineNumber + 1}`);
        });
        // 检查抽象类是否存在
        const abstractClass = this.abstractClasses.get(abstractClassName);
        if (abstractClass) {
            console.log(`✅ 抽象类 ${abstractClassName} 存在于索引中`);
            const abstractMethod = abstractClass.methods.find(m => m.methodName === methodName);
            if (abstractMethod) {
                console.log(`✅ 抽象方法 ${methodName} 存在于抽象类中`);
            }
            else {
                console.warn(`❌ 抽象方法 ${methodName} 不存在于抽象类中`);
            }
        }
        else {
            console.warn(`❌ 抽象类 ${abstractClassName} 不存在于索引中`);
        }
        // 检查实现类索引
        const implClasses = this.implementationClasses.get(abstractClassName) || [];
        console.log(`实现类索引中找到 ${implClasses.length} 个实现类:`);
        implClasses.forEach((impl, index) => {
            console.log(`  ${index + 1}. ${impl.className} 在 ${impl.filePath}:${impl.lineNumber + 1}`);
        });
        console.log('=== 检查完成 ===');
    }
    /**
     * 从索引中移除指定文件的所有数据
     */
    async removeFileFromIndex(filePath) {
        console.log(`开始清理文件索引: ${filePath}`);
        // 移除抽象类
        const oldAbstractClasses = this.fileAbstractClasses.get(filePath) || [];
        for (const className of oldAbstractClasses) {
            console.log(`移除抽象类: ${className}`);
            this.abstractClasses.delete(className);
            // 移除相关的实现类映射
            const removedImplementations = this.implementationClasses.get(className) || [];
            this.implementationClasses.delete(className);
            // 移除相关的方法映射
            for (const [methodKey, methods] of this.implementationMethods.entries()) {
                if (methodKey.startsWith(`${className}.`)) {
                    console.log(`移除方法映射: ${methodKey}`);
                    this.implementationMethods.delete(methodKey);
                }
            }
            // 清理孤立的实现类方法索引
            for (const impl of removedImplementations) {
                this.cleanupOrphanedMethodsForImplementation(impl, className);
            }
        }
        // 移除实现类
        const oldImplementationClasses = this.fileImplementationClasses.get(filePath) || [];
        for (const implClass of oldImplementationClasses) {
            console.log(`移除实现类: ${implClass.className}`);
            // 从各个抽象类的实现列表中移除
            for (const baseClass of implClass.baseClasses) {
                const implementations = this.implementationClasses.get(baseClass) || [];
                const filteredImplementations = implementations.filter(impl => impl.filePath !== filePath || impl.className !== implClass.className);
                if (filteredImplementations.length > 0) {
                    this.implementationClasses.set(baseClass, filteredImplementations);
                }
                else {
                    // 如果没有实现类了，也要清理相关的方法索引
                    console.log(`抽象类 ${baseClass} 没有实现类了，清理相关方法索引`);
                    for (const [methodKey, methods] of this.implementationMethods.entries()) {
                        if (methodKey.startsWith(`${baseClass}.`)) {
                            this.implementationMethods.delete(methodKey);
                        }
                    }
                    this.implementationClasses.delete(baseClass);
                }
                // 清理该实现类的方法索引
                this.cleanupOrphanedMethodsForImplementation(implClass, baseClass);
            }
        }
        // 移除实现方法
        const oldImplementationMethods = this.fileImplementationMethods.get(filePath) || [];
        for (const method of oldImplementationMethods) {
            const methodKey = `${method.abstractClassName}.${method.methodName}`;
            const methods = this.implementationMethods.get(methodKey) || [];
            const filteredMethods = methods.filter(m => m.filePath !== filePath || m.className !== method.className);
            if (filteredMethods.length > 0) {
                this.implementationMethods.set(methodKey, filteredMethods);
            }
            else {
                console.log(`移除方法索引: ${methodKey}`);
                this.implementationMethods.delete(methodKey);
            }
        }
        // 清空文件级别缓存
        this.fileAbstractClasses.delete(filePath);
        this.fileImplementationClasses.delete(filePath);
        this.fileImplementationMethods.delete(filePath);
        console.log(`文件索引清理完成: ${filePath}`);
    }
    /**
     * 清理指定实现类的孤立方法索引
     */
    cleanupOrphanedMethodsForImplementation(implementation, abstractClassName) {
        // 查找并移除该实现类的所有方法索引
        for (const [methodKey, methods] of this.implementationMethods.entries()) {
            if (methodKey.startsWith(`${abstractClassName}.`)) {
                const filteredMethods = methods.filter(m => m.filePath !== implementation.filePath || m.className !== implementation.className);
                if (filteredMethods.length > 0) {
                    this.implementationMethods.set(methodKey, filteredMethods);
                }
                else {
                    console.log(`清理孤立方法索引: ${methodKey}`);
                    this.implementationMethods.delete(methodKey);
                }
            }
        }
    }
    /**
     * 重新构建与指定文件相关的索引
     */
    async rebuildRelatedIndexes(filePath) {
        // 获取新添加的抽象类
        const newAbstractClasses = this.fileAbstractClasses.get(filePath) || [];
        // 为新的抽象类重新构建实现类索引
        for (const abstractClassName of newAbstractClasses) {
            // 利用现有的文件级缓存，避免重复扫描
            for (const [otherFilePath, implementations] of this.fileImplementationClasses.entries()) {
                // 跳过当前文件，避免重复处理
                if (otherFilePath === filePath) {
                    continue;
                }
                for (const implementation of implementations) {
                    if (implementation.baseClasses.includes(abstractClassName)) {
                        if (!this.implementationClasses.has(abstractClassName)) {
                            this.implementationClasses.set(abstractClassName, []);
                        }
                        // 检查是否已存在，避免重复添加
                        const existingImpls = this.implementationClasses.get(abstractClassName);
                        const alreadyExists = existingImpls.some(existing => existing.filePath === implementation.filePath &&
                            existing.className === implementation.className);
                        if (!alreadyExists) {
                            existingImpls.push(implementation);
                            // 重新构建方法索引
                            await this.rebuildMethodIndexForImplementation(implementation, abstractClassName);
                        }
                    }
                }
            }
        }
        // 处理当前文件中的实现类，查找它们对应的抽象类
        const currentFileImplementations = this.fileImplementationClasses.get(filePath) || [];
        for (const implementation of currentFileImplementations) {
            for (const baseClass of implementation.baseClasses) {
                // 检查基类是否是已知的抽象类
                if (this.abstractClasses.has(baseClass)) {
                    if (!this.implementationClasses.has(baseClass)) {
                        this.implementationClasses.set(baseClass, []);
                    }
                    // 检查是否已存在，避免重复添加
                    const existingImpls = this.implementationClasses.get(baseClass);
                    const alreadyExists = existingImpls.some(existing => existing.filePath === implementation.filePath &&
                        existing.className === implementation.className);
                    if (!alreadyExists) {
                        existingImpls.push(implementation);
                        console.log(`添加当前文件实现类: ${implementation.className} -> ${baseClass}`);
                    }
                    // ✅ 关键修复：无论是否重复，都要重新构建方法索引
                    // 因为方法内容可能已经改变（移除后重新添加）
                    console.log(`重建当前文件方法索引: ${implementation.className} -> ${baseClass}`);
                    await this.rebuildMethodIndexForImplementation(implementation, baseClass);
                }
            }
        }
    }
    /**
     * 为指定实现类重新构建方法索引
     */
    async rebuildMethodIndexForImplementation(implementation, abstractClassName) {
        try {
            console.log(`开始重建方法索引: ${implementation.className} (${implementation.filePath}) -> ${abstractClassName}`);
            const abstractClass = this.abstractClasses.get(abstractClassName);
            if (!abstractClass) {
                console.log(`未找到抽象类: ${abstractClassName}`);
                return;
            }
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(implementation.filePath));
            const content = document.getText();
            const lines = content.split('\n');
            const implementationMethods = this.findImplementationMethods(lines, implementation, abstractClass);
            console.log(`在 ${implementation.className} 中找到 ${implementationMethods.length} 个实现方法`);
            // 更新全局方法索引
            for (const method of implementationMethods) {
                const methodKey = `${abstractClassName}.${method.methodName}`;
                if (!this.implementationMethods.has(methodKey)) {
                    this.implementationMethods.set(methodKey, []);
                }
                // 检查是否已存在相同的方法，避免重复添加
                const existingMethods = this.implementationMethods.get(methodKey);
                const alreadyExists = existingMethods.some(existing => existing.filePath === method.filePath &&
                    existing.className === method.className &&
                    existing.methodName === method.methodName &&
                    existing.abstractClassName === method.abstractClassName);
                if (!alreadyExists) {
                    existingMethods.push(method);
                    console.log(`添加方法到全局索引: ${method.className}.${method.methodName} -> ${abstractClassName}.${method.methodName}`);
                }
                else {
                    console.log(`跳过重复方法: ${method.className}.${method.methodName} -> ${abstractClassName}.${method.methodName}`);
                }
            }
            // 更新文件级别的方法缓存
            if (implementationMethods.length > 0) {
                const existingMethods = this.fileImplementationMethods.get(implementation.filePath) || [];
                // 避免重复添加相同的方法
                const newMethods = implementationMethods.filter(newMethod => !existingMethods.some(existing => existing.methodName === newMethod.methodName &&
                    existing.className === newMethod.className &&
                    existing.abstractClassName === newMethod.abstractClassName));
                if (newMethods.length > 0) {
                    const updatedMethods = [...existingMethods, ...newMethods];
                    this.fileImplementationMethods.set(implementation.filePath, updatedMethods);
                    console.log(`更新文件级方法缓存: ${implementation.filePath} 新增 ${newMethods.length} 个方法`);
                }
                else {
                    console.log(`文件级方法缓存无需更新: ${implementation.filePath} (无新方法)`);
                }
            }
            else {
                console.log(`${implementation.className} 中没有找到实现方法`);
            }
            console.log(`方法索引重建完成: ${implementation.className} -> ${abstractClassName}`);
        }
        catch (error) {
            console.error(`重新构建方法索引时出错: ${implementation.filePath}`, error);
        }
    }
    /**
     * 移除文件索引（用于文件删除）
     */
    async removeFileIndex(filePath) {
        console.log(`移除文件索引: ${filePath}`);
        await this.removeFileFromIndex(filePath);
    }
    /**
     * 解析Python文件中的导入语句
     */
    parseImports(lines) {
        const importMap = new Map();
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
    resolveClassName(className, importMap) {
        // 如果在导入映射中找到，返回原始名称
        if (importMap.has(className)) {
            return importMap.get(className);
        }
        // 否则返回原始类名
        return className;
    }
}
exports.PythonIndexService = PythonIndexService;
//# sourceMappingURL=pythonIndexService.js.map