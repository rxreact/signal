import { buildSignalGraph } from '../src/signalGraph'
import { Observable, combineLatest, Subject, of } from 'rxjs'
import { SignalGraphDefinition } from '../src/signalGraphDefinition'
import { map, take, toArray } from 'rxjs/operators'

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
      derivableSignals: {
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

    it('has primary signals', () => {
      const signalGraph = buildSignalGraph(signalGraphDefinition, {})
      expect(signalGraph.output('x')).toBeInstanceOf(Observable)
    })
    it('has derived signals', () => {
      const signalGraph = buildSignalGraph(signalGraphDefinition, {})
      expect(signalGraph.output('y')).toBeInstanceOf(Observable)
      expect(signalGraph.output('z')).toBeInstanceOf(Observable)
    })
    it('has derived signals that behave correctly', async () => {
      const signalGraph = buildSignalGraph(signalGraphDefinition, {})
      await new Promise(resolve => {
        signalGraph.output('z').subscribe(result => {
          expect(result).toEqual('Hello apple sauce')
          resolve(true)
        })
        signalGraph.input('x').next('apple')
      })
    })
    it("inputs hold their last input until they're subscribed to", async () => {
      const signalGraph = buildSignalGraph(signalGraphDefinition, {})
      await new Promise(resolve => {
        signalGraph.input('x').next('apple')
        signalGraph.input('x').next('cheese')
        signalGraph.output('z').subscribe(result => {
          expect(result).toEqual('Hello cheese sauce')
          resolve(true)
        })
      })
    })
    it('when subscriptions go to zero, only the last input value is passed when subscriptions happen again', async () => {
      const signalGraph = buildSignalGraph(signalGraphDefinition, {})
      await new Promise(resolve => {
        signalGraph.input('x').next('apple')
        signalGraph.input('x').next('cheese')
        signalGraph
          .output('z')
          .pipe(take(1))
          .subscribe(_ => null, _ => null, () => resolve(true))
      })
      await new Promise(resolve => {
        signalGraph.input('x').next('oranges')
        signalGraph.input('x').next('pepper')
        signalGraph.output('z').subscribe(result => {
          expect(result).toEqual('Hello pepper sauce')
          resolve(true)
        })
      })
    })
    it('can initialize observables with initial values for primary signals', async () => {
      const signalGraph = buildSignalGraph(signalGraphDefinition, {
        x: 'orange'
      })
      await new Promise(resolve => {
        signalGraph
          .output('z')
          .pipe(
            take(2),
            toArray()
          )
          .subscribe(result => {
            expect(result).toEqual(['Hello orange sauce', 'Hello apple sauce'])
            resolve(true)
          })
        signalGraph.input('x').next('apple')
      })
    })
    it('can initialize observables with initial values for derived signals', async () => {
      const signalGraph = buildSignalGraph(signalGraphDefinition, {
        y: 'cheesy tots'
      })
      await new Promise(resolve => {
        signalGraph
          .output('z')
          .pipe(
            take(2),
            toArray()
          )
          .subscribe(result => {
            expect(result).toEqual(['Hello cheesy tots', 'Hello apple sauce'])
            resolve(true)
          })
        signalGraph.input('x').next('apple')
      })
    })
    it('can be connected to other graphs', async () => {
      const signalGraph = buildSignalGraph(signalGraphDefinition, {})
      const otherDefinition: SignalGraphDefinition<{ o: string; p: string }, {}, 'o', 'p'> = {
        primaryKeys: ['o'],
        depedencies: {},
        derivableSignals: {
          p: {
            derivationFn: o$ => (o$ ? o$.pipe(map(o => 'hot ' + o)) : new Observable<string>()),
            dependencyList: ['o']
          }
        }
      }
      const otherGraph = buildSignalGraph(otherDefinition, {})
      signalGraph.connect(
        'x',
        otherGraph,
        'p'
      )
      await new Promise(resolve => {
        signalGraph.output('z').subscribe(result => {
          expect(result).toEqual('Hello hot wonton sauce')
          resolve(true)
        })
        otherGraph.input('o').next('wonton')
      })
    })
  })
  describe('given a incorrectly defined graph', () => {
    const signalGraphDefinition: SignalGraphDefinition<SignalsType, Dependencies, never, 'y'> = {
      primaryKeys: [] as never[],
      depedencies: {
        dep: of('sauce')
      },
      derivableSignals: {
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
      expect(() => buildSignalGraph(signalGraphDefinition, {})).toThrowError(
        'Signal Dependency Not Found'
      )
    })
  })

  describe('given a graph with undefines in signal derivations', () => {
    const signalGraphDefinition: SignalGraphDefinition<SignalsType, Dependencies, never, 'y'> = {
      primaryKeys: [] as never[],
      depedencies: {
        dep: of('sauce')
      },
      derivableSignals: {
        y: {
          derivationFn: (_, dep) =>
            dep ? dep.pipe(map(depVal => 'Hello ' + depVal)) : new Observable<string>(),
          dependencyList: [undefined, 'dep']
        }
      }
    }

    const signalGraph = buildSignalGraph(signalGraphDefinition, {})

    it('has signals', () => {
      expect(signalGraph.output('y')).toBeInstanceOf(Observable)
    })
    it('has derived signals that behave correctly', async () => {
      await new Promise(resolve => {
        signalGraph.output('y').subscribe(result => {
          expect(result).toEqual('Hello sauce')
          resolve(true)
        })
      })
    })
  })

  describe('given an incomplete but well defined graph', () => {
    const signalGraphDefinition: SignalGraphDefinition<SignalsType, Dependencies, never, 'y'> = {
      primaryKeys: [] as never[],
      depedencies: {
        dep: of('sauce')
      },
      derivableSignals: {
        y: {
          derivationFn: dep =>
            dep ? dep.pipe(map(depVal => 'Hello ' + depVal)) : new Observable<string>(),
          dependencyList: ['dep']
        }
      }
    }

    const signalGraph = buildSignalGraph(signalGraphDefinition, {})

    it('has signals', () => {
      expect(signalGraph.output('y')).toBeInstanceOf(Observable)
    })
    it('has derived signals that behave correctly', async () => {
      await new Promise(resolve => {
        signalGraph.output('y').subscribe(result => {
          expect(result).toEqual('Hello sauce')
          resolve(true)
        })
      })
    })
  })
})
