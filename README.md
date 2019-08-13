[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Greenkeeper badge](https://badges.greenkeeper.io/rxreact/signal.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/rxreact/signal.svg?branch=master)](https://travis-ci.org/rxreact/signal)
[![Coverage Status](https://coveralls.io/repos/github/rxreact/signal/badge.svg?branch=master)](https://coveralls.io/github/rxreact/signal?branch=master)

Development Sponsored By:
[![Carbon Five](./assets/C5_final_logo_horiz.png)](http://www.carbonfive.com)

# Signal

This package answers to one of the most difficult questions when writing applications with RxJS: how to I build a data model for my application with observables?

Existing data modeling solutions use RxJS to *mimic* other more well-known solutions for state management -- i.e. *how would I build Redux with RxJS*? This approach often sacrifices the power and potential of observables without providing much benefit. At the same time, working with raw observables without any framework brings up a million pitfalls -- hot vs cold, when to subscribe, how to manage dependencies and test, etc.

Signal is drawn from our experience as professional programmers at Carbon Five who use RxJS on a number of production projects, and is essentially captures our "best practices" we've developed over time for modelling data with Observables.

## Installation

In your project:

```
npm install @rxreact/signal --save
```

or

```
yarn add @rxreact/signal
```

RxJS and React are peer dependencies and need to be installed seperately

## What is a Signal Graph?

This tutorial assumes a basic knowledge of RxJS and functional reactive programming. You can start with:

[The introduction to Reactive Programming you've been missing
](https://gist.github.com/staltz/868e7e9bc2a7b8c1f754)

[Egghead Courses](https://egghead.io/courses/introduction-to-reactive-programming)

Let's explore the idea of a Signal Graph by building something we use all the time: a login form.

![Signal Graph](./assets/signal_image.png)

A login form will need an entry for your credentials and a way to submit. You probably want to display feedback from the server about incorrect logins, and maybe you also want to disable clicking submit while a login is in progress.

So how do we model this with observables? We'll let's start with what we have - three streams of data from user inputs. We can track every thing the user types in each text field, and we can track clicking on a submit button.

From there, we can probably come up with a stream of attempted logins by combining the username and password every time the user clicks the submit button.

We can use those to kick off API calls to a server, which will eventually result a stream of responses.

From there we can derive more things -- we can seperate successes and failures from the response stream, and we can derive whether a login is progress from the time between a login attempt and a login response.

We can extract useful data from our success and failure streams -- the error messages returned from the server and maybe an auth token that comes back in a success login response.

And finally later on we can use the auth token stream to trigger a fetch of a protected resource since the next screen after a login is usually to display some personalized data.

We've built up a series of streams, starting from our `primary signals` which are our user inputs. The network of these connected observables is called a signal graph. The signals are the emissions from observables, and the graph is how they're all tied together. This is how we can architect programs with Observables. Our programs become a series of reactive data streams, starting with primary signals and extending to all the derivations based on those primary signals. Taken together, those form a signal graph.

Signal graphs are a concept. Your observables together form a signal graph whether or not you use this library. However, using this library to directly define your signal graph will help you think about your design, and solve a number of potential pitfalls you're likely to encounter writing production code with observables.

## Usage

In traditional RxJs, we'd define a series of signals manually:

```javascript
const username$ = new Subject();
const password$ = new Subject();
const submitButton$ = new Subject();

const loginAttempts$ = submitButton$.pipe(withLatestFrom(username$, password$));

const loginResponses$ = loginAttempts$.pipe(
  mergeMap(([_, username, password]) => api.login(
    username,
    password
  ))
);
```

The first issue this presents is testing -- `loginResponse$` is dependent on several of the other signals and difficult to test. We can solve this by switch to factory functions:

```typescript
const makeLoginAttempts = (
    submitButton$: Observable<void>,
    username$: Observable<string>,
    password$: Observable<string>
  ) => submitButton$.pipe(withLatestFrom(username$, password$))

const makeLoginResponses = (loginAttempts$: Observable<[void, string, string]>, api: API) =>
    loginAttempts$.pipe(flatMap(([_, username, password]) => api.login({ username, password })))
```

But now have to wire up all that DI manually in our regular code.

This library provides a DSL for succinctly defining graphs:

```typescript

  type SignalsType = {
    username$: string
    password$: string
    submitButton$: void
    loginAttempts$: [void, string, string]
    loginResponses$: LoginResponse
    loginInProgress$: boolean
    loginSuccesses$: LoginSuccess
    loginFailures$: LoginFailure
    loginFailureMessage$: string
    authStatus$: AuthStatus
  }

  type Dependencies = {
    api: API
  }

  const signalGraph = new SignalGraphBuilder<SignalsType, Dependencies>()
    .define(addPrimary('username$'))
    .define(
      addPrimary('password$'),
      addPrimary('submitButton$'),
      addDependency('api', api),
      addDerived('loginAttempts$', makeLoginAttempts, 'submitButton$', 'username$', 'password$'),
      addDerived('loginResponses$', makeLoginResponses, 'loginAttempts$', 'api'),
      addDerived('loginInProgress$', makeLoginInProgress, 'loginAttempts$', 'loginResponses$'),
      addDerived('loginSuccesses$', makeLoginSuccesses, 'loginResponses$'),
      addDerived('loginFailures$', makeLoginFailures, 'loginResponses$'),
      addDerived(
        'loginFailureMessage$',
        makeLoginFailureMessage,
        'loginAttempts$',
        'loginFailures$'
      ),
      addDerived('authStatus$', makeAuthStatus, 'loginSuccesses$')
    )
    .initializeWith({
      loginInProgress$: false,
      loginFailureMessage$: '',
      username$: '',
      password$: '',
      authStatus$: { status: 'unauthorized' }
    })
    .build()
```

We describe dependencies, provide factory functions, and the whole graph is built for us when we call `build`. We don't even have to define Subjects for our primary signals. It detects cyclic dependencies and missing signals. We can hydrate the graph with an initial state. For those following the subtleties of hot/cold observables, all observables in this graph have `shareReplay(1)` called on them, because this makes our graph behave like a predicatable state machine. In fact, other than by injecting outside dependencies, the graph is purely functional.


### Getting signals in an out of the graph

Once your graph is built, you can extract any signal by calling:

```typescript
signalGraph.output(`loginAttempts$`)
```

This will give you an observable that emits values for that node on the graph.

If you want to put new data into one of the primary signals, call:

```typescript
signalGraph.input(`username$`)
```

This will give you a Subject that you can call `next()` on to cause that signal to emit new values.

If you use React for your UI, make sure to check out [@rxreact/signal-connect](https://github.com/rxreact/signal-connect) which makes connecting signal graphs to React components super easy!

### Connecting multiple graphs

While it's possible to model an entire application as one signal graph, in practice that graph will get huge in a production application. So it's nice often to seperate graphs by different major domains or feature areas of your application. However, in this case you need to connect the graphs, and `@rxreact/signal` lets you do that.

Let's say you had a second graph for a protected area of the application:

```typescript
const protectedAreaGraph = new SignalGraphBuilder<
  {
    userToken$: string
    authStatus$: AuthStatus
    protected$: string
  },
  { api: API }
>()
  .define(
    addPrimary('authStatus$'),
    addDerived('userToken$', makeUserToken, 'authStatus$'),
    addDependency('api', api),
    addDerived('protected$', makeProtected, 'userToken$', 'api')
  )
  .initializeWith({
    protected$: ''
  })
  .build()
```

Now you want to connect outputs of `authStatus$` from your authentication graph to inputs of `authStatus$` in your protected area graph. You can do this easily:

```typescript
protectedAreaGraph.connect(
  'authStatus$',
  signalGraph,
  'authStatus$'
)
```

### Typescript FTW

While `@rxreact/signal` can be used with just javascript, if you use Typescript you get a number of added bonuses, in the form of super strong type checking. You can see from the examples above that `SignalGraphBuilder` takes two generic parameters that specify the types of your signals and the types of your external dependencies. Once you've done that, all of your definition code has very strong type checking. If you type a signal name wrong, you'll get an error. If the signal you reference as a dependency doesn't match the type expected by the factory function, you'll get an error. It becomes quite difficult to write a graph incorrectly!

### Caveat Emptor

This libraries are still in very in development and the typings require Typescript 3.1. Feel free to experiment but beware production usage!

Expect though that development will continue and this will be a production-grade library in the future!


### More Detailed Documentation

#### Signal Types
As seen above, this type allows you to define the type of signals that will be used in your signal graph. All of the signals throughout the graph will be defined in this type.

```javascript
  type SignalsType = {
    username$: string
    password$: string
  }

  Dependencies = { api: API }
```

#### SignalGraphBuilder
This class gets initialized with the following arguments
- 1) The signals that have been defined in the `SignalsType`
- 2) Dependencies for the signals


  ```javascript
    new SignalGraphBuilder(SignalTypes, Dependencies)
  ```

  It is initialized with the following values

  ```javascript
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
          derivableSignals: {} as DerivableSignals<ObservableMap<S> & Dep, D>
        },
        private initialValues: Partial<S> = {},
        private buildSignalGraphFn: BuildSignalGraphFn = buildSignalGraph
      ) {}
    }
  ```

  The first two arguments are `SignalsType` and `Dependencies`. Here `P` and `D` are all of the keys for the primary or dervived signals. The keys are the keys of the signals as defined in `SignalTypes`.

  `SignalGraphDefinition` - returns an object with all of the values needed to build our graph

```javascript
    export interface SignalGraphDefinition<
      SignalsType,
      Dependencies = {},
      P extends keyof SignalsType = never,
      D extends keyof SignalsType = never
    > {
      depedencies: Partial<Dependencies>
      primaryKeys: P[]
      derivableSignals: DerivableSignals<ObservableMap<SignalsType> & Dependencies, D>
    }
```

`DerivableSignals` type is the following:
```javascript
export type DerivableSignals<S, D extends keyof S> = {
  [P in D]: {
    derivationFn: InternalSignalDerivation<S, P>
    dependencyList: DependencyList<keyof S>
  }
}
```
`S` is for the SignalsType
`D` : keys for the derived signals that exist in the SignalsType

`InternalSignalDerivation` type is the following:
```javascript
  export type InternalSignalDerivation<S, P extends keyof S> = (
  ...args: (S[keyof S] | undefined)[]
) => S[P]
```

`S` is for the SignalsType
`P` is for all of keys that can exist in `S`

The `InternalSignalDerivation` sets the key value pairs for the `SignalsTypes` so they can be executed in the context of the SignalGraph

`DependencyList` is simply a list of dependencies for a particular signal
```javascript
 export type DependencyList<T> = [T?, T?, T?, T?, T?, T?, T?, T?, T?, T?]
```
Now that we have gone through our `SignalGraphDefinition` - let's take a look at how we actually build our graph

`BuildSignalGraphFn` - Takes the `SignalGraphDefinition` along with our initial values and actually builds our signal graph

```typescript
    export type BuildSignalGraphFn = <S, Dep, P extends keyof S, D extends keyof S>(
      signalGraphDefinition: SignalGraphDefinition<S, Dep, P, D>,
      initialValues: Partial<S>
    ) => SignalGraph<Pick<S, P>, Pick<S, D>>
```

  `SignalGraph<Pick<S, P>, Pick<S, D>>` -  This interface allows for the following
  - Connecting two separate signal graphs with the `connect` function
  - Being able to affect input for a signal with the `input` function
  - Being able to see output for a signal with the `output` function

Function Signature is shown below

```javascript
  export interface SignalGraph<PrimarySignalsType, DerivedSignalsType> {
    connect<K1 extends keyof PrimarySignalsType, OP, OD>(
      key: K1,
      graph: SignalGraph<OP, OD>,
      otherKey: MatchingKeys<PrimarySignalsType[K1], OP> | MatchingKeys<PrimarySignalsType[K1], OD>
    ): Subscription
    input<K1 extends keyof PrimarySignalsType>(key: K1): SubjectMap<PrimarySignalsType>[K1]

    output<K1 extends keyof PrimarySignalsType>(key: K1): ObservableMap<PrimarySignalsType>[K1]
    output<K2 extends keyof DerivedSignalsType>(key: K2): ObservableMap<DerivedSignalsType>[K2]
    output<K1 extends keyof PrimarySignalsType, K2 extends keyof DerivedSignalsType>(
      key: K1 | K2
    ): ObservableMap<PrimarySignalsType>[K1] | ObservableMap<DerivedSignalsType>[K2]
  }
```

Now that we have our signal Graph initialized - the `define` function allows us to define how these signals will exist in our signal graph. For example
are the `primary` or `derived`? -

```javascript
public define<T extends [keyof S, keyof S][]>(
    ...transforms: SignalTransforms<S, Dep, T>
  ): SignalGraphBuilder<
    S,
    Dep,
    P | ToupleUnion<FirstElements<S, T>>,
    D | ToupleUnion<SecondElements<S, T>>
  > {
    console.log("Transforms", transforms)
    const newDefinition: SignalGraphDefinition<
      S,
      Dep,
      P | ToupleUnion<FirstElements<S, T>>,
      D | ToupleUnion<SecondElements<S, T>>
    > = transforms.reduce((definition, transform) => transform(definition), this
      .signalGraphDefinition as SignalGraphDefinition<S, Dep, any, any>)
      console.log("new definition", newDefinition)
    return new SignalGraphBuilder(newDefinition, this.initialValues, this.buildSignalGraphFn)
  }
  ```

  This function essentially takes our list of signals and returns an updated `SignalGraphDefinition` - that is than used to essentially create a new instance of the `SignalGraphBuilder`

  `SignalTransforms` - goes through each of the signal types and associates the `key` for the signal as defined in the `SignalsType` and sets the signal as the `value` for that key.

  ```javascript
  type SignalTransforms<S, Dep, T extends any[]> = {
  [K in keyof T]: SignalGraphDefinitionTransform<
    S,
    Dep,
    T[K] extends [keyof S, keyof S] ? T[K] : never
  >
  }
  ```

  It uses the `SignalGraphDefinitionTransform` to actually do the transformation.

  ```javascript
  export type SignalGraphDefinitionTransform<
  SignalsType,
  Dependencies,
  EP extends [keyof SignalsType, keyof SignalsType]
> = <P extends keyof SignalsType, D extends keyof SignalsType>(
  signalGraphDefinition: SignalGraphDefinition<SignalsType, Dependencies, P, D>
) => SignalGraphDefinition<SignalsType, Dependencies, P | EP[0], D | EP[1]>
```

This returns a `SignalGraphDefinition` that is used to build our signal graph

All of the signals that are listed in our define function similarly add themselves to the signal graph definition

For example if we take a look at `addPrimary` with the example `addPrimary('password$')`
```javascript
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
```
This function will take the singal type and add it to the signal graph definition
















## Enjoy!
