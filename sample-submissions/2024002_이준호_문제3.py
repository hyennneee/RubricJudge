import sys


def is_valid(text):
    pairs = [("(", ")"), ("[", "]"), ("{", "}")]
    return all(text.count(opening) == text.count(closing) for opening, closing in pairs)


if __name__ == "__main__":
    print(str(is_valid(sys.stdin.read().rstrip("\n"))).lower())
