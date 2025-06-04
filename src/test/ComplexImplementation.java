package com.example.test;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.HashMap;

/**
 * 复杂实现类示例 - 测试各种实现方法格式
 */
public class ComplexImplementation implements ComplexInterface, Serializable {
    
    @Override
    public String basicMethod(String param) {
        return "Basic: " + param;
    }
    
    @Override
    public List<String> genericMethod(Map<String, Integer> data) {
        List<String> result = new ArrayList<>();
        for (String key : data.keySet()) {
            result.add(key + "=" + data.get(key));
        }
        return result;
    }
    
    @Override
    public void methodWithException(String param) throws Exception {
        if (param == null) {
            throw new Exception("Parameter cannot be null");
        }
        System.out.println("Processing: " + param);
    }
    
    @Override
    public int multiLineMethod(String param1,
                              int param2,
                              boolean param3) {
        return param3 ? param1.length() + param2 : param2;
    }
    
    // 没有@Override注解的方法
    public void noParamMethod() {
        System.out.println("No param method implementation");
    }
    
    // 私有辅助方法
    private void helperMethod() {
        System.out.println("Helper method");
    }
    
    // 公共非接口方法
    public void additionalMethod() {
        System.out.println("Additional method");
    }
} 