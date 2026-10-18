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


if __name__ == "__main__":
    request = json.load(sys.stdin)
    graph, start = request["graph"], request["start"]
    distances, parents = dijkstra(graph, start)
    paths = {node: [node] if node == start else [] for node in graph}
    for target in graph:
        path, node = [], target
        while node is not None:
            path.append(node)
            if node == start:
                paths[target] = path[::-1]
                break
            node = parents[node]
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
