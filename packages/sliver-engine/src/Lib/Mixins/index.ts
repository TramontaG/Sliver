type AnyFn = (this: any, ...args: any[]) => any;

const _mixin = {
  before<TObj>() {
    return function <TFn extends AnyFn>(
      cb: (obj: TObj, ...args: Parameters<TFn>) => boolean | void
    ) {
      return function (
        _t: Object,
        _k: string | symbol,
        descriptor: TypedPropertyDescriptor<TFn>
      ) {
        const original = descriptor.value!;
        descriptor.value = function (this: TObj, ...args: Parameters<TFn>) {
          const shouldCancel = cb(this, ...args);
          if (shouldCancel === true) return undefined as ReturnType<TFn>;
          return original.apply(this, args);
        } as TFn;
        return descriptor;
      };
    };
  },

  after<TObj>() {
    return function <TFn extends AnyFn>(
      cb: (
        obj: TObj,
        result: ReturnType<TFn>,
        ...args: Parameters<TFn>
      ) => ReturnType<TFn> | void
    ) {
      return function (
        _t: Object,
        _k: string | symbol,
        descriptor: TypedPropertyDescriptor<TFn>
      ) {
        const original = descriptor.value!;
        descriptor.value = function (this: TObj, ...args: Parameters<TFn>) {
          const result = original.apply(this, args) as ReturnType<TFn>;
          const newResult = cb(this, result, ...args);
          return (newResult ?? result) as ReturnType<TFn>;
        } as TFn;
        return descriptor;
      };
    };
  },

  replace<TObj>() {
    return function <TFn extends AnyFn>(
      cb: (obj: TObj, ...args: Parameters<TFn>) => ReturnType<TFn>
    ) {
      return function (
        _t: Object,
        _k: string | symbol,
        descriptor: TypedPropertyDescriptor<TFn>
      ) {
        descriptor.value = function (this: TObj, ...args: Parameters<TFn>) {
          return cb(this, ...args);
        } as TFn;
        return descriptor;
      };
    };
  },
};

export const mixin = {
  before: <T>() => _mixin.before<T>(),
  after: <T>() => _mixin.after<T>(),
  replace: <T>() => _mixin.replace<T>(),
};
