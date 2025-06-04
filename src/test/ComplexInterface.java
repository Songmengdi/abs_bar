package com.example.test;

import java.util.List;
import java.util.Map;

/**
 * 复杂接口示例 - 测试各种方法声明格式
 */
public interface ComplexInterface {
    
    // 基本方法
    String basicMethod(String param);
    
    // 带泛型的方法
    List<String> genericMethod(Map<String, Integer> data);
    
    // 带异常声明的方法
    void methodWithException(String param) throws Exception;
    
    // 默认方法
    default String defaultMethod(String input) {
        return "default: " + input;
    }
    
    // 静态方法
    static void staticMethod() {
        System.out.println("Static method");
    }
    
    // 多行参数的方法
    int multiLineMethod(String param1,
                       int param2,
                       boolean param3);
    
    // 无参数方法
    void noParamMethod();
} 