import { combineLatest, zip } from 'rxjs'
import { map, flatMap } from 'rxjs/operators'
import { SignalGraphBuilder, addPrimary, addDependency, addDerived } from '../src/signal'
import {
  User,
  Id,
  Post,
  API,
  stubApi,
  fakeUsers,
  makeFakePosts,
  makeFakeComments,
  PostComment
} from './fixtures'

const signalGraph = new SignalGraphBuilder<
  {
    activeUsers$: User[]
    selectUser$: Id
    selectedUser$: User | undefined
    activePosts$: Post[]
    activePostsWithComments$: Array<[Post, PostComment[]]>
  },
  {
    api: API
  }
>()
  .define(
    addPrimary('selectUser$'),
    addDependency('api', stubApi),
    addDerived('activeUsers$', api => api.getUsers(), 'api'),
    addDerived(
      'selectedUser$',
      (activeUsers$, selectUser$) =>
        combineLatest(activeUsers$, selectUser$).pipe(
          map(([users, selection]) => users.find(user => user.id === selection))
        ),
      'activeUsers$',
      'selectUser$'
    ),
    addDerived(
      'activePosts$',
      (api, selectUser$) => selectUser$.pipe(flatMap(id => api.getPostsForUser(id))),
      'api',
      'selectUser$'
    ),
    addDerived(
      'activePostsWithComments$',
      (api, activePosts$) =>
        activePosts$.pipe(
          flatMap(posts => {
            const postsWithComments = posts.map(post => {
              return api
                .getCommentsForPost(post.id)
                .pipe(map((comments): [Post, PostComment[]] => [post, comments]))
            })
            return zip(...postsWithComments)
          })
        ),
      'api',
      'activePosts$'
    )
  )
  .build()

describe('a full signal graph', () => {
  describe('when given inputs', () => {
    signalGraph.input('selectUser$').next(1)
    it('produces the correct outputs', async () => {
      await new Promise(resolve => {
        signalGraph.output('activeUsers$').subscribe(activeUsers => {
          expect(activeUsers).toHaveLength(2)
          expect(activeUsers).toEqual(fakeUsers)
          resolve(true)
        })
      })
      await new Promise(resolve => {
        signalGraph.output('selectedUser$').subscribe(selectedUser => {
          expect(selectedUser).toEqual(fakeUsers[0])
          resolve(true)
        })
      })

      await new Promise(resolve => {
        signalGraph.output('activePosts$').subscribe(activePosts => {
          expect(activePosts).toEqual(makeFakePosts(1))
          resolve(true)
        })
      })

      await new Promise(resolve => {
        signalGraph.output('activePostsWithComments$').subscribe(activePostsWithComments => {
          expect(activePostsWithComments[0][0]).toEqual(makeFakePosts(1)[0])
          expect(activePostsWithComments[0][1]).toEqual(makeFakeComments(1))
          resolve(true)
        })
      })
    })
  })
})
