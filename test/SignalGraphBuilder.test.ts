import { SignalGraphDefinition } from '../src/signalGraphDefinition'
import { Observable, of, combineLatest } from 'rxjs'
import { map } from 'rxjs/operators'
import SignalGraphBuilder from '../src/SignalGraphBuilder'
import { addPrimary, addDependency, addDerived } from '../src/signalGraphDefinitionTransform'
import { SignalGraph } from '../src/SignalGraph'
describe('SignalGraphBuilder', () => {
  type SignalsType = {
    x: string
    y: string
    z: string
  }

  type Dependencies = {
    dep: Observable<string>
  }

  const startingDefinition: SignalGraphDefinition<SignalsType, Dependencies> = {
    primaryKeys: [],
    depedencies: {},
    derivableSignals: {}
  }
  const startingInitialValues = {}
  const buildSignalGraph = jest.fn().mockImplementation((...args) => args)

  describe('define', () => {
    const dep = of('sauce')
    const zDerivation = map((yVal: string) => 'Hello ' + yVal)
    const yDerivation = (x: Observable<string>, dep: Observable<string>) =>
      combineLatest(x, dep).pipe(map(([xVal, depVal]) => xVal + ' ' + depVal))
    const expectedSignalGraphDefinition = {
      primaryKeys: ['x'],
      depedencies: {
        dep
      },
      derivableSignals: {
        z: {
          derivationFn: zDerivation,
          dependencyList: ['y']
        },
        y: {
          derivationFn: yDerivation,
          dependencyList: ['x', 'dep']
        }
      }
    }
    it('applies all definition transforms', () => {
      const signalGraphBuilder = new SignalGraphBuilder(
        startingDefinition,
        startingInitialValues,
        buildSignalGraph
      )
      // this is to verify that seperating primary and derived signal types is working
      const signalGraphTypeTest: SignalGraph<
        Pick<SignalsType, 'x'>,
        Pick<SignalsType, 'y' | 'z'>
      > = signalGraphBuilder
        .define(
          addPrimary('x'),
          addDependency('dep', dep),
          addDerived('z', zDerivation, 'y'),
          addDerived('y', yDerivation, 'x', 'dep')
        )
        .build()
      const signalGraph: any = signalGraphTypeTest
      expect(signalGraph[0]).toEqual(expectedSignalGraphDefinition)
    })
  })
  describe('initializeWith', () => {
    const expectedInitialValues = {
      x: 'abcd',
      z: 'defg'
    }
    it('passes initial values to the signal graph builder', () => {
      const signalGraphBuilder = new SignalGraphBuilder(
        startingDefinition,
        startingInitialValues,
        buildSignalGraph
      )
      const signalGraph: any = signalGraphBuilder
        .initializeWith({
          x: 'abcd',
          z: 'defg'
        })
        .build()
      expect(signalGraph[1]).toEqual(expectedInitialValues)
    })
  })
})
