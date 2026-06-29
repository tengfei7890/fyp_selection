/** 剥离 passwordHash 等敏感字段，泛型保留其余结构。 */
export function publicUser<T extends { passwordHash: string }>(
  user: T,
): Omit<T, 'passwordHash'> {
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}
