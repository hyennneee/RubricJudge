import sys


def is_valid(text):
    return all(
        text.count(left) == text.count(right)
        for left, right in [("(", ")"), ("[", "]"), ("{", "}")]
    )


if __name__ == "__main__":
    print(str(is_valid(sys.stdin.read().rstrip("\n"))).lower())
