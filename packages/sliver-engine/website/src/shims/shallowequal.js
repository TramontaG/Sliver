export default function shallowEqual(objA, objB, compare, compareContext) {
  const compareResult = compare
    ? compare.call(compareContext, objA, objB)
    : undefined;

  if (compareResult !== undefined) {
    return Boolean(compareResult);
  }

  if (objA === objB) {
    return true;
  }

  if (
    typeof objA !== "object" ||
    !objA ||
    typeof objB !== "object" ||
    !objB
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  const objBHasOwnProperty = Object.prototype.hasOwnProperty.bind(objB);

  for (let index = 0; index < keysA.length; index += 1) {
    const key = keysA[index];

    if (!objBHasOwnProperty(key)) {
      return false;
    }

    const valueA = objA[key];
    const valueB = objB[key];
    const compareResult = compare
      ? compare.call(compareContext, valueA, valueB, key)
      : undefined;

    if (compareResult === false || (compareResult === undefined && valueA !== valueB)) {
      return false;
    }
  }

  return true;
}
