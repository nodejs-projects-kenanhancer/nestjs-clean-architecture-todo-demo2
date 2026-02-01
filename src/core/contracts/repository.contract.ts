export interface Repository<T, TId> {
  findById(id: TId): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  update(entity: T): Promise<T>;
  delete(id: TId): Promise<void>;
  exists(id: TId): Promise<boolean>;
}
