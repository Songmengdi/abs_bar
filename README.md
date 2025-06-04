# Maven Search

一个用于在 VSCode 中快速搜索和添加 Maven 依赖的插件。

## 功能特点

- 快速搜索 Maven 依赖
- 实时展示依赖的最新版本信息
- 支持查看依赖的下载次数和发布时间
- 一键复制 Maven 依赖声明到剪贴板

## 使用方法

1. 按下 `Ctrl+Shift+P`（Windows/Linux）或 `Cmd+Shift+P`（macOS）打开命令面板
2. 输入 `Maven: 搜索依赖` 并选择
3. 在输入框中输入要搜索的依赖关键词（如：spring-boot, junit 等）
4. 从搜索结果中选择需要的依赖
5. 选择合适的版本
6. 依赖声明会自动复制到剪贴板

## 示例

搜索并添加 Spring Boot 依赖：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter</artifactId>
    <version>3.2.0</version>
</dependency>
```

## 版本历史

### 0.0.1

- 初始版本
- 支持基本的 Maven 依赖搜索功能
- 支持查看依赖版本信息
- 支持一键复制依赖声明

## 问题反馈

如果你在使用过程中遇到任何问题，或者有功能建议，欢迎提交