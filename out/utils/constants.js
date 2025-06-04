"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ButtonTitles = exports.LanguageIds = exports.VSCodeCommands = exports.Commands = void 0;
/**
 * 插件命令常量
 */
exports.Commands = {
    // 从接口go to impl
    GO_TO_IMPLEMENTATIONS: 'abs-bar.goToImplementations',
    // 从接口方法go to method impl
    GO_TO_METHOD_IMPLEMENTATIONS: 'abs-bar.goToMethodImplementations',
    // 从实现类go to interface
    GO_TO_INTERFACE: 'abs-bar.goToInterface',
    // 从实现方法go to interface method
    GO_TO_INTERFACE_METHOD: 'abs-bar.goToInterfaceMethod',
    // Python ABC go to impl
    GO_TO_PYTHON_IMPLEMENTATIONS: 'abs-bar.goToPythonImplementations',
    // Python abstract method go to impl
    GO_TO_PYTHON_METHOD_IMPLEMENTATIONS: 'abs-bar.goToPythonMethodImplementations',
    // Python implementation go to abstract
    GO_TO_PYTHON_ABSTRACT: 'abs-bar.goToPythonAbstract',
    // Python implementation method go to abstract method
    GO_TO_PYTHON_ABSTRACT_METHOD: 'abs-bar.goToPythonAbstractMethod'
};
/**
 * VS Code 内置命令
 */
exports.VSCodeCommands = {
    // VS Code内置的转到实现命令
    GO_TO_IMPLEMENTATIONS: 'editor.action.goToImplementation',
    // VS Code内置的显示所有实现命令
    PEEK_IMPLEMENTATIONS: 'editor.action.peekImplementation',
    // VS Code内置的转到声明命令
    GO_TO_DECLARATION: 'editor.action.revealDeclaration'
};
/**
 * 语言ID
 */
exports.LanguageIds = {
    JAVA: 'java',
    PYTHON: 'python'
};
/**
 * 按钮标题
 */
exports.ButtonTitles = {
    GO_TO_IMPLEMENTATIONS: 'go to impl',
    GO_TO_METHOD_IMPLEMENTATIONS: 'go to method impl',
    GO_TO_INTERFACE: 'go to interface',
    GO_TO_INTERFACE_METHOD: 'go to interface method',
    GO_TO_PYTHON_IMPLEMENTATIONS: 'go to python impl',
    GO_TO_PYTHON_METHOD_IMPLEMENTATIONS: 'go to method impl',
    GO_TO_PYTHON_ABSTRACT: 'go to abstract',
    GO_TO_PYTHON_ABSTRACT_METHOD: 'go to abstract method'
};
//# sourceMappingURL=constants.js.map