import json
import sys


def dijkstra(graph, start):
    distances = {node: float("inf") for node in graph}
    parents = {node: None for node in graph}
    distances[start] = 0
    queue = [(0, start)]
    while queue:
        distance, node = min(queue)
        queue.remove((distance, node))
        if distance != distances[node]:
            continue
        for neighbor, weight in graph[node]:
            candidate = distance + weight
            if candidate < distances[neighbor]:
                distances[neighbor] = candidate
                parents[neighbor] = node
                queue.append((candidate, neighbor))
    return distances, parents


if __name__ == "__main__":
    request = json.load(sys.stdin)
    graph, start = request["graph"], request["start"]
    distances, parents = dijkstra(graph, start)
    paths = {}
    for target in graph:
        path, node = [], target
        while node is not None:
            path.append(node)
            if node == start:
                break
            node = parents[node]
        paths[target] = path[::-1] if path and path[-1] == start else []
    print(
        json.dumps(
            {
                "distances": {
                    node: None if value == float("inf") else value
                    for node, value in distances.items()
                },
                "paths": paths,
            },
            sort_keys=True,
        )
    )
