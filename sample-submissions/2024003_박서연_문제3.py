import sys


def is_valid(text):
    return (
        text.count("(") == text.count(")")
        and text.count("[") == text.count("]")
        and text.count("{") == text.count("}")
    )


if __name__ == "__main__":
    print(str(is_valid(sys.stdin.read().rstrip("\n"))).lower())
