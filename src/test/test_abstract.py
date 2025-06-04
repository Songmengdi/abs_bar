from abc import ABC, abstractmethod

class TestInterface(ABC):
    """测试抽象基类"""
    
    @abstractmethod
    def test_method1(self, param: str) -> str:
        """抽象方法1"""
        pass
    
    @abstractmethod
    def test_method2(self, param1: int, param2: str) -> int:
        """抽象方法2"""
        pass

class AnotherInterface(ABC):
    """另一个抽象基类"""
    
    @abstractmethod
    def another_method(self) -> None:
        """另一个抽象方法"""
        pass 