from .test_abstract import TestInterface, AnotherInterface

class TestImplementation(TestInterface):
    """测试接口实现类"""
    
    def test_method1(self, param: str) -> str:
        """实现方法1"""
        return f"测试方法1实现: {param}"
    
    def test_method2(self, param1: int, param2: str) -> int:
        """实现方法2"""
        return param1 + len(param2)

class AnotherImplementation(AnotherInterface):
    """另一个接口实现类"""
    
    def another_method(self) -> None:
        """另一个方法的实现"""
        print("另一个方法的实现")

class MultipleImplementation(TestInterface, AnotherInterface):
    """多重继承实现类"""
    
    def test_method1(self, param: str) -> str:
        return f"多重继承实现: {param}"
    
    def test_method2(self, param1: int, param2: str) -> int:
        return param1 * len(param2)
    
    def another_method(self) -> None:
        print("多重继承的另一个方法实现") 