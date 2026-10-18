import sys


def is_valid(text):
    matching = {")": "(", "]": "[", "}": "{"}
    stack = []
    for char in text:
        if char in "([{":
            stack.append(char)
        elif char in matching:
            if not stack or stack.pop() != matching[char]:
                return False
        else:
            return False
    return not stack


if __name__ == "__main__":
    print(str(is_valid(sys.stdin.read().rstrip("\n"))).lower())
