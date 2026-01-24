def fibonacci(n):
    a, b = 0, 1
    for i in range(n):
        print(a, end=" ")
        a, b = b, a + b
    print()

def fibonacci_recursive(n):
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        return fibonacci_recursive(n-1) + fibonacci_recursive(n-2)

if __name__ == "__main__":
    print("Iterative Fibonacci:")
    fibonacci(10)

    print("Recursive Fibonacci:")
    for i in range(10):
        print(fibonacci_recursive(i), end=" ")
    print()
