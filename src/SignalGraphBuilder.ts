import { SignalGraphDefinition, DerivableSignals, ObservableMap } from './signalGraphDefinition'
import { SignalGraphDefinitionTransform } from './signalGraphDefinitionTransform'
import { buildSignalGraph, BuildSignalGraphFn } from './SignalGraph'

type SignalTransforms<S, Dep, T extends any[]> = {
  [K in keyof T]: SignalGraphDefinitionTransform<
    S,
    Dep,
    T[K] extends [keyof S, keyof S] ? T[K] : never
  >
}

type FirstElements<S, Exts extends [keyof S, keyof S][]> = {
  [K in keyof Exts]: Exts[K] extends [keyof S, keyof S] ? Exts[K][0] : never
}
type SecondElements<S, Exts extends [keyof S, keyof S][]> = {
  [K in keyof Exts]: Exts[K] extends [keyof S, keyof S] ? Exts[K][1] : never
}

type ToupleUnion<L extends any[]> = L[number]
export default class SignalGraphBuilder<
  S,
  Dep = {},
  P extends keyof S = never,
  D extends keyof S = never
> {
  constructor(
    private signalGraphDefinition: SignalGraphDefinition<S, Dep, P, D> = {
      depedencies: {},
      primaryKeys: [],
      derivedKeys: {} as DerivableSignals<ObservableMap<S> & Dep, D>
    },
    private initialValues: Partial<S> = {},
    private buildSignalGraphFn: BuildSignalGraphFn = buildSignalGraph
  ) {}

  public define<T extends [keyof S, keyof S][]>(
    ...transforms: SignalTransforms<S, Dep, T>
  ): SignalGraphBuilder<
    S,
    Dep,
    P | ToupleUnion<FirstElements<S, T>>,
    D | ToupleUnion<SecondElements<S, T>>
  > {
    const newDefinition: SignalGraphDefinition<
      S,
      Dep,
      P | ToupleUnion<FirstElements<S, T>>,
      D | ToupleUnion<SecondElements<S, T>>
    > = transforms.reduce((definition, transform) => transform(definition), this
      .signalGraphDefinition as SignalGraphDefinition<S, Dep, any, any>)
    return new SignalGraphBuilder(newDefinition, this.initialValues, this.buildSignalGraphFn)
  }

  public initializeWith(initialValues: Partial<S>) {
    return new SignalGraphBuilder(
      this.signalGraphDefinition,
      initialValues,
      this.buildSignalGraphFn
    )
  }

  public build() {
    return this.buildSignalGraphFn(this.signalGraphDefinition, this.initialValues)
  }
}
