import toposort from '../src/toposort'

describe('toposort', () => {
  const depedencies = {
    ['lemon juice']: ['lemon'],
    filling: ['lemon juice', 'butter', 'apples', 'sugar', 'cinnamon', 'egg'],
    applePie: ['crust', 'filling'],
    crust: ['sugar', 'flour', 'salt', 'butter', 'egg']
  }

  it('sorts depedencies in topological order', () => {
    const sortedDepedencies = toposort(depedencies)
    ;[
      'lemon',
      'lemon juice',
      'butter',
      'apples',
      'sugar',
      'cinnamon',
      'egg',
      'flour',
      'salt'
    ].forEach(item => {
      expect(sortedDepedencies.indexOf(item)).toBeLessThan(sortedDepedencies.indexOf('filling'))
      expect(sortedDepedencies.indexOf(item)).toBeLessThan(sortedDepedencies.indexOf('crust'))
      expect(sortedDepedencies.indexOf(item)).toBeLessThan(sortedDepedencies.indexOf('applePie'))
    })
    expect(sortedDepedencies.indexOf('lemon')).toBeLessThan(
      sortedDepedencies.indexOf('lemon juice')
    )
    expect(sortedDepedencies.indexOf('filling')).toBeLessThan(sortedDepedencies.indexOf('applePie'))
    expect(sortedDepedencies.indexOf('crust')).toBeLessThan(sortedDepedencies.indexOf('applePie'))
  })
})
