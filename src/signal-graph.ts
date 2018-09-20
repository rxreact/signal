import { ObservableMap, ActionMap, SubjectMap } from '@rxreact/core'
import { Subject, Observable } from 'rxjs'
import { of } from 'rxjs/observable/of'
import toposort from 'toposort'

const makeEdges = <E, P, D>(derivableSignals: DerivableSignalMap<E, P, D>) =>
  Object.entries<DerivableSignal<E, P, D, keyof D>>(derivableSignals).reduce<
    ReadonlyArray<[string, string]>
  >(
    (acc, key) => acc.concat(key[1].dependencyList.map((val): [string, string] => [key[0], val])),
    []
  )
const isPrimarySignal = <ExternalSignalsType, DerivedSignalsType>(
  ExternalSignals: Array<keyof ExternalSignalsType>,
  dependencyName: keyof ExternalSignalsType | keyof DerivedSignalsType
): dependencyName is keyof ExternalSignalsType => {
  return ExternalSignals.includes(dependencyName as keyof ExternalSignalsType)
}

const buildSignalGraph = <E, P, D>(signalGraphBuildData: SignalGraphBuildData<E, P, D>) => {
  const dependencies = (Object.keys(signalGraphBuildData.derivableSignals) as (keyof D)[]).reduce<
    Partial<SignalDependencyMap<E, P, D>>
  >(
    (acc, key) =>
      Object.assign({}, acc, { [key]: signalGraphBuildData.derivableSignals[key].dependencyList }),
    {}
  )
  const sortedSignals: Array<keyof D | keyof E | keyof P> = toposort(
    makeEdges(dependencies as { [k: string]: string[] })
  ).reverse()
  const derivedSignals = sortedSignals.reduce<
    Partial<DerivedSignalsObservableType<typeof signalDerivationMap>>
  >((acc, current) => {
    if (isPrimarySignal<E, P, D>(ExternalSignals, current)) {
      return acc
    }
    const signalDependencyNames: Array<keyof ExternalSignalsType | keyof DerivedSignalsType> =
      dependencies[current]
    const signalDependencies = signalDependencyNames.map(dependencyName => {
      if (
        isPrimarySignal<ExternalSignalsType, DerivedSignalsType>(ExternalSignals, dependencyName)
      ) {
        if (ExternalSignalsubjects[dependencyName]) {
          return ExternalSignalsubjects[dependencyName]
        } else {
          throw Error('Missing Primary Signal')
        }
      } else {
        if (acc[dependencyName]) {
          return acc[dependencyName]
        } else {
          throw Error('Missing derived signal')
        }
      }
    })
    return Object.assign({}, acc, {
      [current]: (signalDerivationMap[current] as ((
        ...signalDependencies: Array<
          | SubjectMap<ExternalSignalsType>[keyof ExternalSignalsType]
          | Partial<ObservableMap<DerivedSignalsType>>[keyof DerivedSignalsType]
        >
      ) => any))(...signalDependencies)
    })
  }, {}) as ObservableMap<DerivedSignalsType>
  function get<K1 extends keyof ExternalSignalsType>(
    signal: K1
  ): SubjectMap<ExternalSignalsType>[K1]
  function get<K2 extends keyof DerivedSignalsType>(
    signal: K2
  ): ObservableMap<DerivedSignalsType>[K2]
  function get<K1 extends keyof ExternalSignalsType, K2 extends keyof DerivedSignalsType>(
    signal: K1 | K2
  ) {
    return isPrimarySignal<ExternalSignalsType, DerivedSignalsType>(ExternalSignals, signal)
      ? ExternalSignalsubjects[signal]
      : derivedSignals[signal]
  }
  return {
    get
  }
}

const signalGraphBuilder = makeSignalGraphBuilder<
  { q: string },
  { x: string },
  { y: number; z: number[] }
>()
  .addExternal('q', new Observable<string>())
  .addPrimary('x')
  .addDerived('y', x => of(3), 'x')
  .addDerived('z', (x, y) => of([4]), 'x', 'y')
/*
const X = Symbol.for("x");
const Y = Symbol.for("y");
const Z = Symbol.for("z");

interface Thing {
  y: typeof Y
}

const thing : Thing = { y: Y}

const signalGraphCreator = signalGraphCreatorFactory<{[X]: string},{[thing.y]: number, [Z]: number[]}>(X);
const sg  = signalGraphCreator(
{
  [thing.y]: [X],
  [Z]: [X, thing.y]
},{
  [thing.y]: (x) => of(4),
  [Z]: (y, x, q) => of([4])
});

const x = sg.get(thing.y);

*/
