import sys


def is_valid(text):
    previous = None
    while previous != text:
        previous = text
        text = text.replace("()", "").replace("[]", "").replace("{}", "")
    return text == ""


if __name__ == "__main__":
    print(str(is_valid(sys.stdin.read().rstrip("\n"))).lower())
