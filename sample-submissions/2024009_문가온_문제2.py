import json
import sys


def dijkstra(graph, start):
    distances = {node: 0 for node in graph}
    parents = {node: None for node in graph}
    for node in graph:
        for neighbor, weight in graph[node]:
            if distances[node] + weight < distances[neighbor]:
                distances[neighbor] = distances[node] + weight
                parents[neighbor] = node
    return distances, parents


if __name__ == "__main__":
    request = json.load(sys.stdin)
    graph, start = request["graph"], request["start"]
    distances, parents = dijkstra(graph, start)
    paths = {
        node: [start, node]
        if node != start and parents[node] is not None
        else ([start] if node == start else [])
        for node in graph
    }
    print(json.dumps({"distances": distances, "paths": paths}, sort_keys=True))
