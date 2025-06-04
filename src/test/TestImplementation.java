package com.example.test;

/**
 * 测试接口实现类
 */
public class TestImplementation implements TestInterface {
    @Override
    public String testMethod1(String param) {
        // 实现方法1
        return "测试方法1实现: " + param;
    }
    
    @Override
    public int testMethod2(int param1, String param2) {
        // 实现方法2
        return param1 + param2.length();
    }
} 