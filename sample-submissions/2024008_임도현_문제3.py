import sys


def is_valid(text):
    stack = []
    for char in text:
        if char in "([{":
            stack.append(char)
        elif char in ")]}":
            if not stack or stack.pop() != {")": "(", "]": "[", "}": "{"}[char]:
                return False
    return not stack


if __name__ == "__main__":
    print(str(is_valid(sys.stdin.read().rstrip("\n"))).lower())
