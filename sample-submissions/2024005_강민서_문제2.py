import json
import sys


def dijkstra(graph, start):
    distances = {node: float("inf") for node in graph}
    parents = {node: None for node in graph}
    distances[start] = 0
    queue = [start]
    while queue:
        node = queue.pop(0)
        for neighbor, weight in graph[node]:
            if distances[neighbor] == float("inf"):
                distances[neighbor] = distances[node] + weight
                parents[neighbor] = node
                queue.append(neighbor)
    return distances, parents


def path_to(parents, start, target):
    path, node = [], target
    while node is not None:
        path.append(node)
        if node == start:
            return path[::-1]
        node = parents[node]
    return []


if __name__ == "__main__":
    request = json.load(sys.stdin)
    graph, start = request["graph"], request["start"]
    distances, parents = dijkstra(graph, start)
    print(
        json.dumps(
            {
                "distances": {
                    node: None if value == float("inf") else value
                    for node, value in distances.items()
                },
                "paths": {node: path_to(parents, start, node) for node in graph},
            },
            sort_keys=True,
        )
    )
