import {
  SignalGraphDefinition,
  Signals,
  DerivableSignals,
  DependencyList,
  SignalDerivation,
  InternalSignalDerivation
} from './signalGraphDefinition'
import { assoc } from './util'

export type SignalGraphDefinitionTransform<
  SignalsType,
  Dependencies,
  EP extends [keyof SignalsType, keyof SignalsType]
> = <P extends keyof SignalsType, D extends keyof SignalsType>(
  signalGraphDefinition: SignalGraphDefinition<SignalsType, Dependencies, P, D>
) => SignalGraphDefinition<SignalsType, Dependencies, P | EP[0], D | EP[1]>

/**
 * Injects a dependency into the Signal Graph that can be used by derived
 * signals
 * @param key The key of the dependency
 * @param dependency The dependency to be injected
 */
export const addDependency = <
  SignalsType,
  Dependencies,
  K extends Exclude<keyof Dependencies, keyof SignalsType>
>(
  key: K,
  dependency: Signals<SignalsType, Dependencies>[K]
): SignalGraphDefinitionTransform<SignalsType, Dependencies, [never, never]> => <
  P extends keyof SignalsType,
  D extends keyof SignalsType
>(
  signalGraphDefinition: SignalGraphDefinition<SignalsType, Dependencies, P, D>
) => ({
  ...signalGraphDefinition,
  depedencies: assoc(key, dependency, signalGraphDefinition.depedencies)
})

/**
 * Adds a primary signal into the Signal Graph, wich are the source streams
 * of the Signal Graph.
 * @param key The key for the primary signal
 */
export const addPrimary = <SignalsType, Dependencies, K extends keyof SignalsType>(
  key: K
): SignalGraphDefinitionTransform<SignalsType, Dependencies, [K, never]> => <
  P extends keyof SignalsType,
  D extends keyof SignalsType
>(
  signalGraphDefinition: SignalGraphDefinition<SignalsType, Dependencies, P, D>
) => ({
  ...signalGraphDefinition,
  primaryKeys: (signalGraphDefinition.primaryKeys as (P | K)[]).concat(key)
})

/**
 * Adds a new derived signal into the Signal Graph. It uses other signals passed
 * by arguments to create a new derived signal.
 * @param key The key for the derivation
 * @param derivationFn The function that will create a derived stream from its
 * arguments
 * @param args The list of keys of other primary signals or derived streams
 * required for the derivation function
 */
export const addDerived = <
  SignalsType,
  Dependencies,
  K extends keyof SignalsType,
  DL extends DependencyList<Exclude<keyof Signals<SignalsType, Dependencies>, K>>
>(
  key: K,
  derivationFn: SignalDerivation<
    Signals<SignalsType, Dependencies>,
    K,
    Exclude<keyof Signals<SignalsType, Dependencies>, K>,
    DL
  >,
  ...args: DL
): SignalGraphDefinitionTransform<SignalsType, Dependencies, [never, K]> => <
  P extends keyof SignalsType,
  D extends keyof SignalsType
>(
  signalGraphDefinition: SignalGraphDefinition<SignalsType, Dependencies, P, D>
) => ({
  ...signalGraphDefinition,
  derivableSignals: assoc<DerivableSignals<Signals<SignalsType, Dependencies>, D | K>, K>(
    key,
    {
      derivationFn: derivationFn as InternalSignalDerivation<Signals<SignalsType, Dependencies>, K>,
      dependencyList: args
    },
    signalGraphDefinition.derivableSignals as DerivableSignals<
      Signals<SignalsType, Dependencies>,
      K | D
    >
  )
})
