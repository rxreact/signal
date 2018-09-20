import { SignalGraphDefinition, DerivableSignals, ObservableMap } from './signalGraphDefinition'
import { SignalGraphDefinitionTransform } from './signalGraphDefinitionTransform'
import { buildSignalGraph } from './SignalGraph'

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
    }
  ) {}

  public define<
    P1 extends keyof S = never,
    D1 extends keyof S = never,
    P2 extends keyof S = never,
    D2 extends keyof S = never,
    P3 extends keyof S = never,
    D3 extends keyof S = never,
    P4 extends keyof S = never,
    D4 extends keyof S = never,
    P5 extends keyof S = never,
    D5 extends keyof S = never,
    P6 extends keyof S = never,
    D6 extends keyof S = never,
    P7 extends keyof S = never,
    D7 extends keyof S = never,
    P8 extends keyof S = never,
    D8 extends keyof S = never,
    P9 extends keyof S = never,
    D9 extends keyof S = never,
    P10 extends keyof S = never,
    D10 extends keyof S = never
  >(
    ...transforms: [
      SignalGraphDefinitionTransform<S, Dep, P1, D1>?,
      SignalGraphDefinitionTransform<S, Dep, P2, D2>?,
      SignalGraphDefinitionTransform<S, Dep, P3, D3>?,
      SignalGraphDefinitionTransform<S, Dep, P4, D4>?,
      SignalGraphDefinitionTransform<S, Dep, P5, D5>?,
      SignalGraphDefinitionTransform<S, Dep, P6, D6>?,
      SignalGraphDefinitionTransform<S, Dep, P7, D7>?,
      SignalGraphDefinitionTransform<S, Dep, P8, D8>?,
      SignalGraphDefinitionTransform<S, Dep, P9, D9>?,
      SignalGraphDefinitionTransform<S, Dep, P10, D10>?
    ]
  ): SignalGraphBuilder<
    S,
    Dep,
    P | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 | P10,
    D | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10
  > {
    const newDefinition: SignalGraphDefinition<
      S,
      Dep,
      P | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 | P10,
      D | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10
    > = transforms.reduce(
      (definition, transform) => (transform ? transform(definition) : definition),
      this.signalGraphDefinition as SignalGraphDefinition<S, Dep, any, any>
    )
    return new SignalGraphBuilder(newDefinition)
  }

  public build() {
    return buildSignalGraph(this.signalGraphDefinition)
  }
}
