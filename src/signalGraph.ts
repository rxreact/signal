import toposort from './toposort'
import { Subject } from 'rxjs'
import {
  SignalGraphDefinition,
  Signals,
  DerivableSignals,
  DependencyList,
  SubjectMap,
  ObservableMap
} from './signalGraphDefinition'
import { transformValues } from './util'

export interface SignalGraph<PrimarySignalsType, DerivedSignalsType> {
  get<K1 extends keyof PrimarySignalsType>(key: K1): SubjectMap<PrimarySignalsType>[K1]
  get<K1 extends keyof DerivedSignalsType>(key: K1): ObservableMap<DerivedSignalsType>[K1]
  get<K1 extends keyof PrimarySignalsType | keyof DerivedSignalsType>(
    key: K1
  ):
    | SubjectMap<PrimarySignalsType & DerivedSignalsType>[K1]
    | ObservableMap<PrimarySignalsType & DerivedSignalsType>[K1]
}

type ArrayValues<S> = (S[keyof S] | undefined)[]
type SignalDependencies<SignalsType, Dependencies> = ArrayValues<Signals<SignalsType, Dependencies>>

type SignalDependencyMap<S> = { [K in keyof S]: (keyof S)[] }

type FinalSignals<
  SignalsType,
  Dependencies,
  PrimarySignalsKeys extends keyof SignalsType,
  DerivedSignalsKeys extends keyof SignalsType
> = SubjectMap<Pick<SignalsType, PrimarySignalsKeys>> &
  ObservableMap<Pick<SignalsType, DerivedSignalsKeys>> &
  Dependencies

const makeSignalDependencyMap = <S, D extends keyof S>(derivableSignals: DerivableSignals<S, D>) =>
  transformValues<DerivableSignals<S, D>, SignalDependencyMap<S>>(
    signal => signal.dependencyList.filter((dep): dep is keyof S => dep !== undefined),
    derivableSignals
  )

const isPrimaryKey = <S, P extends keyof S>(
  primarySignals: SubjectMap<Pick<S, P>>,
  key: any
): key is P => !!(key && (primarySignals as any)[key])

const isDependencyKey = <Dep>(dependencies: Dep, key: any): key is keyof Dep =>
  !!(key && (dependencies as any)[key])

const isDerivedKey = <S, D extends keyof S>(
  derivedKeys: DerivableSignals<S, D>,
  key: any
): key is D => !!(key && (derivedKeys as any)[key])

const makePrimarySignals = <S, Dep, P extends keyof S, D extends keyof S>(
  signalGraphDefinition: SignalGraphDefinition<S, Dep, P, D>
) => transformValues<SubjectMap<Pick<S, P>>>(_ => new Subject(), signalGraphDefinition.primaryKeys)

const makeSignalDependencies = <S, Dep, P extends keyof S, D extends keyof S>(
  primarySignals: SubjectMap<Pick<S, P>>,
  dependencies: Dep,
  derivedKeys: DerivableSignals<Signals<S, Dep>, D>,
  derivedSignals: Partial<ObservableMap<Pick<S, D>>>,
  dependencyList: DependencyList<keyof Signals<S, Dep>>
) =>
  dependencyList.map(
    (dependencyName): Signals<S, Dep>[keyof Signals<S, Dep>] | undefined => {
      if (isPrimaryKey(primarySignals, dependencyName)) {
        return primarySignals[dependencyName]
      }
      if (isDependencyKey(dependencies, dependencyName)) {
        return dependencies[dependencyName] as Signals<S, Dep>[keyof Signals<S, Dep>]
      }
      if (isDerivedKey(derivedKeys, dependencyName) && derivedSignals[dependencyName]) {
        return derivedSignals[dependencyName]
      }
      if (dependencyName) {
        throw Error('Signal Dependency Not Found')
      }
      return undefined
    }
  )

const makeDerivedSignals = <S, Dep, P extends keyof S, D extends keyof S>(
  primarySignals: SubjectMap<Pick<S, P>>,
  dependencies: Dep,
  derivedKeys: DerivableSignals<Signals<S, Dep>, D>
) => {
  const signalDependencyMap = makeSignalDependencyMap(derivedKeys)
  const sortedSignals = toposort(signalDependencyMap)

  return sortedSignals.reduce<Partial<ObservableMap<Pick<S, D>>>>((acc, signalName) => {
    if (!isDerivedKey(derivedKeys, signalName)) {
      return acc
    }
    const signal = derivedKeys[signalName]
    const signalDependencies = makeSignalDependencies(
      primarySignals,
      dependencies,
      derivedKeys,
      acc,
      signal.dependencyList
    )
    const derivedSignal = signal.derivationFn(...signalDependencies)
    return Object.assign({}, acc, { [signalName]: derivedSignal })
  }, {}) as ObservableMap<Pick<S, D>>
}

export const buildSignalGraph = <
  SignalsType,
  Dependencies,
  PrimarySignalsKeys extends keyof SignalsType,
  DerivedSignalsKeys extends keyof SignalsType
>(
  signalGraphDefinition: SignalGraphDefinition<
    SignalsType,
    Dependencies,
    PrimarySignalsKeys,
    DerivedSignalsKeys
  >
): SignalGraph<Pick<SignalsType, PrimarySignalsKeys>, Pick<SignalsType, DerivedSignalsKeys>> => {
  const primarySignals = makePrimarySignals(signalGraphDefinition)
  const dependencies = signalGraphDefinition.depedencies
  const derivedSignals = makeDerivedSignals(
    primarySignals,
    dependencies,
    signalGraphDefinition.derivedKeys
  )
  function get<K1 extends PrimarySignalsKeys>(
    key: K1
  ): SubjectMap<Pick<SignalsType, PrimarySignalsKeys>>[K1]
  function get<K2 extends DerivedSignalsKeys>(
    key: K2
  ): ObservableMap<Pick<SignalsType, DerivedSignalsKeys>>[K2]
  function get<K1 extends PrimarySignalsKeys, K2 extends DerivedSignalsKeys>(signal: K1 | K2) {
    return isPrimaryKey(primarySignals, signal) ? primarySignals[signal] : derivedSignals[signal]
  }
  return { get }
}
