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
  derivedKeys: assoc<DerivableSignals<Signals<SignalsType, Dependencies>, D | K>, K>(
    key,
    {
      derivationFn: derivationFn as InternalSignalDerivation<Signals<SignalsType, Dependencies>, K>,
      dependencyList: args
    },
    signalGraphDefinition.derivedKeys as DerivableSignals<Signals<SignalsType, Dependencies>, K | D>
  )
})
