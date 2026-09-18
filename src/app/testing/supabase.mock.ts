export type QueryChain = {
  select: jasmine.Spy;
  insert: jasmine.Spy;
  update: jasmine.Spy;
  delete: jasmine.Spy;
  eq: jasmine.Spy;
  order: jasmine.Spy;
  single: jasmine.Spy;
  maybeSingle: jasmine.Spy;
  then: PromiseLike<unknown>['then'];
};

/** Builds a chainable Supabase-like query mock that resolves to `result`. */
export function createQueryChain(result: {
  data: unknown;
  error: unknown;
}): QueryChain {
  const chain = {} as QueryChain;
  const methods: (keyof Omit<QueryChain, 'then'>)[] = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'order',
    'single',
    'maybeSingle',
  ];

  for (const method of methods) {
    chain[method] = jasmine.createSpy(method).and.callFake(() => chain);
  }

  chain.then = ((onfulfilled, onrejected) =>
    Promise.resolve(result).then(onfulfilled, onrejected)) as PromiseLike<unknown>['then'];

  return chain;
}

export function createSupabaseMock(fromImpl: (table: string) => QueryChain) {
  return {
    from: jasmine.createSpy('from').and.callFake(fromImpl),
  };
}
