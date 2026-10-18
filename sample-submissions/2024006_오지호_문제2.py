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
