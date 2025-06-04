from abc import ABC, abstractmethod

class SimpleInterface(ABC):
    """简单的抽象基类"""
    
    @abstractmethod
    def simple_method(self) -> str:
        """简单的抽象方法"""
        pass

class SimpleImplementation(SimpleInterface):
    """简单的实现类"""
    
    def simple_method(self) -> str:
        """简单方法的实现"""
        return "简单实现" 