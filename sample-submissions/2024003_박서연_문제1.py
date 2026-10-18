import json
import sys


def calculate_sum(weights, inputs, bias=0.0):
    return sum(weights) + bias


def step_function(value):
    return 1 if value >= 0 else 0


def train(data, epochs=100, learning_rate=0.1):
    return [0 for _ in data]


if __name__ == "__main__":
    request = json.load(sys.stdin)
    print(
        json.dumps(
            {
                "predictions": train(
                    request["trainingData"],
                    request.get("epochs", 100),
                    request.get("learningRate", 0.1),
                )
            }
        )
    )
