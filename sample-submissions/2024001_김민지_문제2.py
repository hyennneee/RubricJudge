import heapq
import json
import sys


def dijkstra(graph, start):
    distances = {node: float("inf") for node in graph}
    parents = {node: None for node in graph}
    distances[start] = 0
    queue = [(0, start)]

    while queue:
        distance, node = heapq.heappop(queue)
        if distance != distances[node]:
            continue
        for neighbor, weight in graph[node]:
            candidate = distance + weight
            if candidate < distances[neighbor]:
                distances[neighbor] = candidate
                parents[neighbor] = node
                heapq.heappush(queue, (candidate, neighbor))

    return distances, parents


def reconstruct_path(parents, start, target):
    path = []
    node = target
    while node is not None:
        path.append(node)
        if node == start:
            return list(reversed(path))
        node = parents[node]
    return []


if __name__ == "__main__":
    request = json.load(sys.stdin)
    graph = request["graph"]
    start = request["start"]
    distances, parents = dijkstra(graph, start)
    output = {
        "distances": {
            node: None if value == float("inf") else value
            for node, value in distances.items()
        },
        "paths": {node: reconstruct_path(parents, start, node) for node in graph},
    }
    print(json.dumps(output, sort_keys=True))
