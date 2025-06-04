package com.example.test;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.HashMap;

/**
 * 泛型实现类测试
 */
public class TestGenericImplementation implements TestGenericInterface {
    
    @Override
    public List<String> getStringList() {
        return new ArrayList<>();
    }
    
    @Override
    public Map<String, Integer> getDataMap(String key) {
        return new HashMap<>();
    }
    
    @Override
    public String generalNextQxm(String kcbId, int level) {
        return "test";
    }
    
    @Override
    public List<KtTextInfo> getAllKtTextInfo(String kcbId) {
        return new ArrayList<>();
    }
    
    @Override
    public Map<String, List<Integer>> getNestedGeneric() {
        return new HashMap<>();
    }
} 