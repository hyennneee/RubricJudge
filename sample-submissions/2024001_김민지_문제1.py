import json
import sys


def calculate_sum(weights, inputs, bias=0.0):
    return sum(weight * value for weight, value in zip(weights, inputs)) + bias


def step_function(value):
    return 1 if value > 0 else 0


def train(data, epochs=100, learning_rate=0.1):
    feature_count = len(data[0]["inputs"])
    weights = [0.0] * feature_count
    bias = 0.0

    for _ in range(epochs):
        for item in data:
            inputs = item["inputs"]
            target = item["label"]
            prediction = step_function(calculate_sum(weights, inputs, bias))
            error = target - prediction
            for index, value in enumerate(inputs):
                weights[index] += learning_rate * error * value
            bias += learning_rate * error

    return [
        step_function(calculate_sum(weights, item["inputs"], bias)) for item in data
    ]


if __name__ == "__main__":
    request = json.load(sys.stdin)
    predictions = train(
        request["trainingData"],
        request.get("epochs", 100),
        request.get("learningRate", 0.1),
    )
    print(json.dumps({"predictions": predictions}))
