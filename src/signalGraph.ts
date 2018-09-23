import toposort from './toposort'
import { Observable, ReplaySubject } from 'rxjs'
import {
  SignalGraphDefinition,
  Signals,
  DerivableSignals,
  DependencyList,
  SubjectMap,
  ObservableMap
} from './signalGraphDefinition'
import { transformValues } from './util'
import { shareReplay, startWith } from 'rxjs/operators'

export interface SignalGraph<PrimarySignalsType, DerivedSignalsType> {
  input<K1 extends keyof PrimarySignalsType>(key: K1): SubjectMap<PrimarySignalsType>[K1]

  output<K1 extends keyof PrimarySignalsType>(key: K1): ObservableMap<PrimarySignalsType>[K1]
  output<K2 extends keyof DerivedSignalsType>(key: K2): ObservableMap<DerivedSignalsType>[K2]
  output<K1 extends keyof PrimarySignalsType, K2 extends keyof DerivedSignalsType>(
    key: K1 | K2
  ): ObservableMap<PrimarySignalsType>[K1] | ObservableMap<DerivedSignalsType>[K2]
}

type SignalDependencyMap<S> = { [K in keyof S]: (keyof S)[] }

const makeSignalDependencyMap = <S, D extends keyof S>(derivableSignals: DerivableSignals<S, D>) =>
  transformValues<DerivableSignals<S, D>, SignalDependencyMap<S>>(
    signal => signal.dependencyList.filter((dep): dep is keyof S => dep !== undefined),
    derivableSignals
  )

const isPrimaryKey = <S, P extends keyof S>(
  primarySignals: ObservableMap<Pick<S, P>>,
  key: any
): key is P => !!(key && (primarySignals as any)[key])

const isDependencyKey = <Dep>(dependencies: Dep, key: any): key is keyof Dep =>
  !!(key && (dependencies as any)[key])

const isDerivedKey = <S, D extends keyof S>(
  derivedKeys: DerivableSignals<S, D>,
  key: any
): key is D => !!(key && (derivedKeys as any)[key])

const addDefaults = <T>(source: SignalAndValue<T>) =>
  source.hasInitialValue
    ? source.signal.pipe(
        startWith(source.initialValue),
        shareReplay(1)
      )
    : source.signal.pipe(shareReplay(1))

const makeInputs = <S, Dep, P extends keyof S, D extends keyof S>(
  signalGraphDefinition: SignalGraphDefinition<S, Dep, P, D>
) =>
  transformValues<SubjectMap<Pick<S, P>>>(
    _ => new ReplaySubject(1),
    signalGraphDefinition.primaryKeys
  )

type SignalWithValue<T> = {
  hasInitialValue: true
  signal: Observable<T>
  initialValue: T
}

type SignalWithoutValue<T> = {
  hasInitialValue: false
  signal: Observable<T>
}

type SignalAndValue<T> = SignalWithValue<T> | SignalWithoutValue<T>
type MappedWithValues<S, P extends keyof S> = { [K in P]: SignalAndValue<S[K]> }

const withInitialValues = <S, P extends keyof S>(
  signals: ObservableMap<Pick<S, P>>,
  initialValues: Partial<S>
): MappedWithValues<S, P> => {
  return (Object.keys(signals) as P[]).reduce<MappedWithValues<S, P>>(
    (acc, key) =>
      Object.assign({}, acc, {
        [key]: initialValues.hasOwnProperty(key)
          ? { hasInitialValue: true, signal: signals[key], initialValue: initialValues[key] }
          : { hasInitialValue: false, signal: signals[key] }
      }),
    {} as MappedWithValues<S, P>
  )
}

const makePrimarySignals = <S, P extends keyof S>(
  inputs: SubjectMap<Pick<S, P>>,
  initialValues: Partial<S>
) =>
  transformValues<MappedWithValues<S, P>, ObservableMap<Pick<S, P>>>(
    input => addDefaults(input),
    withInitialValues(inputs, initialValues)
  )

const makeSignalDependenciesFn = <S, Dep, P extends keyof S, D extends keyof S>(
  primarySignals: ObservableMap<Pick<S, P>>,
  dependencies: Dep,
  derivedKeys: DerivableSignals<Signals<S, Dep>, D>
) => (
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

type SignalDependenciesFn<S, Dep, D extends keyof S> = (
  derivedSignals: Partial<ObservableMap<Pick<S, D>>>,
  dependencyList: DependencyList<keyof Signals<S, Dep>>
) => (Signals<S, Dep>[keyof Signals<S, Dep>] | undefined)[]

const makeDerivedSignals = <S, Dep, P extends keyof S, D extends keyof S>(
  derivedKeys: DerivableSignals<Signals<S, Dep>, D>,
  initialValues: Partial<S>,
  makeSignalDependencies: SignalDependenciesFn<S, Dep, D>
) => {
  const signalDependencyMap = makeSignalDependencyMap(derivedKeys)
  const sortedSignals = toposort(signalDependencyMap)

  return sortedSignals
    .filter((signalName): signalName is D => isDerivedKey(derivedKeys, signalName))
    .reduce(
      (acc, signalName) => {
        const signal = derivedKeys[signalName]
        const signalDependencies = makeSignalDependencies(acc, signal.dependencyList)
        const derived = signal.derivationFn(...signalDependencies)
        const derivedWithValue: SignalAndValue<Partial<S>[D]> = initialValues.hasOwnProperty(
          signalName
        )
          ? { hasInitialValue: true, signal: derived, initialValue: initialValues[signalName] }
          : { hasInitialValue: false, signal: derived }
        return Object.assign({}, acc, { [signalName]: addDefaults(derivedWithValue) })
      },
      {} as ObservableMap<Pick<S, D>>
    )
}

export type BuildSignalGraphFn = <S, Dep, P extends keyof S, D extends keyof S>(
  signalGraphDefinition: SignalGraphDefinition<S, Dep, P, D>,
  initialValues: Partial<S>
) => SignalGraph<Pick<S, P>, Pick<S, D>>

export const buildSignalGraph: BuildSignalGraphFn = <
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
  >,
  initialValues: Partial<SignalsType> = {}
): SignalGraph<Pick<SignalsType, PrimarySignalsKeys>, Pick<SignalsType, DerivedSignalsKeys>> => {
  const inputs = makeInputs(signalGraphDefinition)
  const primarySignals = makePrimarySignals(inputs, initialValues)
  const dependencies = signalGraphDefinition.depedencies
  const makeSignalDependencies = makeSignalDependenciesFn(
    primarySignals,
    dependencies,
    signalGraphDefinition.derivedKeys
  )
  const derivedSignals = makeDerivedSignals(
    signalGraphDefinition.derivedKeys,
    initialValues,
    makeSignalDependencies
  )
  function output<K1 extends PrimarySignalsKeys>(
    key: K1
  ): ObservableMap<Pick<SignalsType, PrimarySignalsKeys>>[K1]
  function output<K2 extends DerivedSignalsKeys>(
    key: K2
  ): ObservableMap<Pick<SignalsType, DerivedSignalsKeys>>[K2]
  function output<K1 extends PrimarySignalsKeys, K2 extends DerivedSignalsKeys>(signal: K1 | K2) {
    return isPrimaryKey(primarySignals, signal) ? primarySignals[signal] : derivedSignals[signal]
  }
  return {
    output,
    input: <K1 extends PrimarySignalsKeys>(signal: K1) => inputs[signal]
  }
}
