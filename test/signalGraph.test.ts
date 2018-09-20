import { SignalGraph, buildSignalGraph } from '../src/signalGraph'
import { Observable, combineLatest, Subject, of } from 'rxjs'
import { SignalGraphDefinition } from '../src/signalGraphDefinition'
import { map, tap } from 'rxjs/operators'

type SignalsType = {
  x: string
  y: string
  z: string
}

type Dependencies = {
  dep: Observable<string>
}

type PrimarySignalsKeys = 'x'
type DerivedSignalsKeys = 'y' | 'z'

describe('SignalGraph', () => {
  describe('given a complete graph', () => {
    const signalGraphDefinition: SignalGraphDefinition<
      SignalsType,
      Dependencies,
      PrimarySignalsKeys,
      DerivedSignalsKeys
    > = {
      primaryKeys: ['x'],
      depedencies: {
        dep: of('sauce')
      },
      derivedKeys: {
        z: {
          derivationFn: y => (y ? y.pipe(map(yVal => 'Hello ' + yVal)) : new Observable<string>()),
          dependencyList: ['y']
        },
        y: {
          derivationFn: (x, dep) =>
            x && dep
              ? combineLatest(x, dep).pipe(map(([xVal, depVal]) => xVal + ' ' + depVal))
              : new Observable<string>(),
          dependencyList: ['x', 'dep']
        }
      }
    }

    const signalGraph = buildSignalGraph(signalGraphDefinition)
    it('has primary signals', () => {
      expect(signalGraph.get('x')).toBeInstanceOf(Subject)
    })
    it('has derived signals', () => {
      expect(signalGraph.get('y')).toBeInstanceOf(Observable)
      expect(signalGraph.get('z')).toBeInstanceOf(Observable)
    })
    it('has derived signals that behave correctly', async () => {
      await new Promise(resolve => {
        signalGraph.get('z').subscribe(result => {
          expect(result).toEqual('Hello apple sauce')
          resolve(true)
        })
        signalGraph.get('x').next('apple')
      })
    })
  })
  describe('given a incorrectly defined graph', () => {
    const signalGraphDefinition: SignalGraphDefinition<SignalsType, Dependencies, never, 'y'> = {
      primaryKeys: [] as never[],
      depedencies: {
        dep: of('sauce')
      },
      derivedKeys: {
        y: {
          derivationFn: (x, dep) =>
            x && dep
              ? combineLatest(x, dep).pipe(map(([xVal, depVal]) => xVal + ' ' + depVal))
              : new Observable<string>(),
          dependencyList: ['x', 'dep']
        }
      }
    }

    it('throws an exception when built', () => {
      expect(() => buildSignalGraph(signalGraphDefinition)).toThrowError(
        'Signal Dependency Not Found'
      )
    })
  })

  describe('given an incomplete but well defined graph', () => {
    const signalGraphDefinition: SignalGraphDefinition<SignalsType, Dependencies, never, 'y'> = {
      primaryKeys: [] as never[],
      depedencies: {
        dep: of('sauce')
      },
      derivedKeys: {
        y: {
          derivationFn: dep =>
            dep ? dep.pipe(map(depVal => 'Hello ' + depVal)) : new Observable<string>(),
          dependencyList: ['dep']
        }
      }
    }

    const signalGraph = buildSignalGraph(signalGraphDefinition)

    it('has signals', () => {
      expect(signalGraph.get('y')).toBeInstanceOf(Observable)
    })
    it('has derived signals that behave correctly', async () => {
      await new Promise(resolve => {
        signalGraph.get('y').subscribe(result => {
          expect(result).toEqual('Hello sauce')
          resolve(true)
        })
      })
    })
  })
})
