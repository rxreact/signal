import { Observable, Subject } from 'rxjs'

export type ObservableMap<T> = { [P in keyof T]: Observable<T[P]> }
export type SubjectMap<T> = { [P in keyof T]: Subject<T[P]> }

export type Signals<SignalsType, Dependencies> = ObservableMap<SignalsType> & Dependencies //#endregion

export type DependencyList<T> = [T?, T?, T?, T?, T?, T?, T?, T?, T?, T?]

type Value<S, P extends keyof S | undefined> = P extends keyof S ? S[P] : undefined

export type SignalDerivation<
  S,
  P extends keyof S,
  T extends keyof S,
  K extends DependencyList<T>
> = (
  ...args: [
    Value<S, K[0]>,
    Value<S, K[1]>,
    Value<S, K[2]>,
    Value<S, K[3]>,
    Value<S, K[4]>,
    Value<S, K[5]>,
    Value<S, K[6]>,
    Value<S, K[7]>,
    Value<S, K[8]>,
    Value<S, K[9]>
  ]
) => S[P]

export type InternalSignalDerivation<S, P extends keyof S> = (
  ...args: (S[keyof S] | undefined)[]
) => S[P]

export type DerivableSignals<S, D extends keyof S> = {
  [P in D]: {
    derivationFn: InternalSignalDerivation<S, P>
    dependencyList: DependencyList<keyof S>
  }
}

export interface SignalGraphDefinition<
  SignalsType,
  Dependencies = {},
  P extends keyof SignalsType = never,
  D extends keyof SignalsType = never
> {
  depedencies: Partial<Dependencies>
  primaryKeys: P[]
  derivedKeys: DerivableSignals<ObservableMap<SignalsType> & Dependencies, D>
}
