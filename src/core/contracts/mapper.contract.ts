export interface Mapper<TSource, TDestination> {
  map(source: TSource): TDestination;
}

export interface BiDirectionalMapper<TSource, TDestination> {
  mapTo(source: TSource): TDestination;
  mapFrom(destination: TDestination): TSource;
}
