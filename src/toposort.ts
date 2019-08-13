type DepEdge<T extends string | number | symbol> = [T, T]

type DependencyMap<T extends string | number | symbol> = { [k in T]?: T[] }

const uniqueNodes = <T extends string | number | symbol>(
  dependencyMap: DependencyMap<T>
): Array<T> => {
  const allSignals = Object.entries(dependencyMap).reduce<Array<T>>(
    (acc, [key, dependencies]) => acc.concat([key as T]).concat(dependencies || []),
    []
  )
  return Array.from(new Set(allSignals))
}

const makeEdges = <T extends string | number | symbol>(dependencyMap: DependencyMap<T>) =>
  (Object.entries(dependencyMap) as [T, T[]][]).reduce<Array<DepEdge<T>>>(
    (acc, [key, dependencies]) =>
      acc.concat((dependencies || []).map((val): DepEdge<T> => [val, key])),
    []
  )

type IncomingCounts<T extends string | number | symbol> = { [k in T]: number }

const makeIncomingCounts = <T extends string | number | symbol>(
  edges: Array<DepEdge<T>>
): IncomingCounts<T> =>
  edges.reduce<IncomingCounts<T>>(
    (acc, edge) =>
      Object.assign({}, acc, { [edge[0]]: acc[edge[0]] || 0, [edge[1]]: (acc[edge[1]] || 0) + 1 }),
    {} as IncomingCounts<T>
  )

type OutgoingEdges<T extends string | number | symbol> = { [k in T]: Array<T> }

const makeOutgoingEdges = <T extends string | number | symbol>(
  edges: Array<DepEdge<T>>
): OutgoingEdges<T> =>
  edges.reduce<OutgoingEdges<T>>(
    (acc, edge) =>
      Object.assign({}, acc, {
        [edge[0]]: [...(acc[edge[0]] || []), edge[1]],
        [edge[1]]: acc[edge[1]] || []
      }),
    {} as OutgoingEdges<T>
  )

interface ZeroDepNodesResult<T extends string | number | symbol> {
  zeroDepNodes: Array<T>
  remainingNodeCounts: IncomingCounts<T>
}

const removeZeroDepNodes = <T extends string | number | symbol>(
  incomingCounts: IncomingCounts<T>
): ZeroDepNodesResult<T> =>
  Object.entries(incomingCounts).reduce<ZeroDepNodesResult<T>>(
    ({ zeroDepNodes, remainingNodeCounts }, [key, incomingCount]) =>
      incomingCount === 0
        ? { zeroDepNodes: [...zeroDepNodes, key as T], remainingNodeCounts }
        : {
            zeroDepNodes,
            remainingNodeCounts: Object.assign({}, remainingNodeCounts, {
              [key]: incomingCount
            })
          },
    { zeroDepNodes: [], remainingNodeCounts: {} as IncomingCounts<T> }
  )

const decrementIncomingCounts = <T extends string | number | symbol>(
  incomingCounts: IncomingCounts<T>,
  nodesToDecrement: Array<T>
) =>
  nodesToDecrement.reduce<IncomingCounts<T>>(
    (acc, node) => Object.assign({}, acc, { [node]: acc[node] - 1 }),
    incomingCounts
  )

interface GraphTraverseState<T extends string | number | symbol> {
  alreadyTraversed: Array<T>
  toTraverse: Array<T>
  incomingCounts: IncomingCounts<T>
  outgoingEdges: OutgoingEdges<T>
}

const traverseGraph = <T extends string | number | symbol>(
  graphTraverseState: GraphTraverseState<T>
): Array<T> => {
  if (graphTraverseState.toTraverse.length === 0) {
    return graphTraverseState.alreadyTraversed
  } else {
    const currentNode = graphTraverseState.toTraverse[0]
    const incomingCounts = decrementIncomingCounts(
      graphTraverseState.incomingCounts,
      graphTraverseState.outgoingEdges[currentNode]
    )
    const { zeroDepNodes, remainingNodeCounts } = removeZeroDepNodes(incomingCounts)
    return traverseGraph({
      alreadyTraversed: [...graphTraverseState.alreadyTraversed, currentNode],
      toTraverse: [...graphTraverseState.toTraverse.slice(1), ...zeroDepNodes],
      incomingCounts: remainingNodeCounts,
      outgoingEdges: graphTraverseState.outgoingEdges
    })
  }
}

const toposort = <T extends string | number | symbol>(dependencyMap: DependencyMap<T>) => {
  const nodes = uniqueNodes(dependencyMap)
  const edges = makeEdges(dependencyMap)
  const incomingCounts = makeIncomingCounts(edges)
  const outgoingEdges = makeOutgoingEdges(edges)
  const { zeroDepNodes, remainingNodeCounts } = removeZeroDepNodes(incomingCounts)
  const toposortedSignals = traverseGraph({
    incomingCounts: remainingNodeCounts,
    outgoingEdges,
    toTraverse: zeroDepNodes,
    alreadyTraversed: []
  })
  if (toposortedSignals.length !== nodes.length) {
    throw Error('Circular Dependency Or Incomplete graph')
  }
  return toposortedSignals
}

export default toposort
