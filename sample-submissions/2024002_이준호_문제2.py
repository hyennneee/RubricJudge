import json
import sys


def dijkstra(graph, start):
    nodes = list(graph)
    distances = {node: float("inf") for node in nodes}
    parents = {node: None for node in nodes}
    remaining = set(nodes)
    distances[start] = 0

    while remaining:
        node = min(remaining, key=lambda item: distances[item])
        remaining.remove(node)
        if distances[node] == float("inf"):
            break
        for neighbor, weight in graph[node]:
            candidate = distances[node] + weight
            if candidate < distances[neighbor]:
                distances[neighbor] = candidate
                parents[neighbor] = node
    return distances, parents


def reconstruct_path(parents, start, target):
    path = []
    current = target
    while current is not None:
        path.append(current)
        if current == start:
            return path[::-1]
        current = parents[current]
    return []


if __name__ == "__main__":
    request = json.load(sys.stdin)
    graph = request["graph"]
    start = request["start"]
    distances, parents = dijkstra(graph, start)
    result = {
        "distances": {
            node: None if value == float("inf") else value
            for node, value in distances.items()
        },
        "paths": {node: reconstruct_path(parents, start, node) for node in graph},
    }
    print(json.dumps(result, sort_keys=True))
