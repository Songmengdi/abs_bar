package com.example.test;

import java.util.List;
import java.util.Map;

/**
 * 泛型接口测试
 */
public interface TestGenericInterface {
    
    // 简单泛型方法
    List<String> getStringList();
    
    // 复杂泛型方法
    Map<String, Integer> getDataMap(String key);
    
    // 带泛型参数的方法
    String generalNextQxm(String kcbId, int level);
    
    // 多个泛型参数
    List<KtTextInfo> getAllKtTextInfo(String kcbId);
    
    // 嵌套泛型
    Map<String, List<Integer>> getNestedGeneric();
} 