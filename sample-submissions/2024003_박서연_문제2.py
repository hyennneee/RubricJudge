import json
import sys


def dijkstra(graph, start):
    distances = {node: 0 for node in graph}
    parents = {node: None for node in graph}
    visited = set()
    queue = [start]

    while queue:
        node = queue.pop(0)
        if node in visited:
            continue
        visited.add(node)
        for neighbor, weight in graph[node]:
            candidate = distances[node] + weight
            if neighbor not in visited and candidate < distances[neighbor]:
                distances[neighbor] = candidate
                parents[neighbor] = node
                queue.append(neighbor)
    return distances, parents


def reconstruct_path(parents, start, target):
    path = [target]
    while path[-1] != start and parents.get(path[-1]) is not None:
        path.append(parents[path[-1]])
    return path[::-1] if path[-1] == start else []


if __name__ == "__main__":
    request = json.load(sys.stdin)
    graph = request["graph"]
    distances, parents = dijkstra(graph, request["start"])
    print(
        json.dumps(
            {
                "distances": distances,
                "paths": {
                    node: reconstruct_path(parents, request["start"], node)
                    for node in graph
                },
            },
            sort_keys=True,
        )
    )
