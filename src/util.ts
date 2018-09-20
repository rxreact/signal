export const assoc = <S, P extends keyof S>(k: P, v: S[P], existing: S): S => {
  return Object.assign({}, existing, { [k]: v })
}

export function transformValues<T>(transform: (x: keyof T) => T[keyof T], list: (keyof T)[]): T
export function transformValues<T, U>(
  transform: (x: T[keyof T & keyof U]) => U[keyof T & keyof U],
  list: T
): U
export function transformValues<T, U>(
  transform: (x: T[keyof T & keyof U]) => U[keyof T & keyof U],
  list: T
): U {
  return Array.isArray(list)
    ? list.reduce<U>((acc, cur) => assoc(cur, transform(cur), acc), {} as U)
    : ((Object.keys(list) as (keyof T & keyof U)[]).reduce<Partial<U>>(
        (acc, cur) => assoc(cur, transform(list[cur]), acc),
        {}
      ) as U)
}
