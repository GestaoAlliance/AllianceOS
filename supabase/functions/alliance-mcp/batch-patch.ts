export const hasOwn=(value:unknown,key:PropertyKey):boolean =>
  value!==null&&typeof value==='object'&&Object.prototype.hasOwnProperty.call(value,key)

export function cloneBatchItem<T>(value:T):T {
  return structuredClone(value)
}

export function applyPresentFields<T extends Record<string,unknown>>(
  target:T,
  patch:Record<string,unknown>,
  fields:string[],
):T {
  for(const field of fields){
    if(hasOwn(patch,field)) (target as Record<string,unknown>)[field]=structuredClone(patch[field])
  }
  return target
}
