import json
import sys


def calculate_sum(weights, inputs, bias=0.0):
    total = bias
    for index in range(len(weights)):
        total = total + weights[index] * inputs[index]
    return total


def step_function(value):
    if value > 0:
        return 1
    return 0


def train(data, epochs=100, learning_rate=0.1):
    weights = [0.0 for _ in data[0]["inputs"]]
    bias = 0.0
    for epoch in range(epochs):
        for item in data:
            prediction = step_function(calculate_sum(weights, item["inputs"], bias))
            difference = item["label"] - prediction
            updated = []
            for index in range(len(weights)):
                updated.append(
                    weights[index] + learning_rate * difference * item["inputs"][index]
                )
            weights = updated
            bias = bias + learning_rate * difference
    return [
        step_function(calculate_sum(weights, item["inputs"], bias)) for item in data
    ]


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
