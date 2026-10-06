var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i6 = decorators.length - 1, decorator; i6 >= 0; i6--)
    if (decorator = decorators[i6])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// ../../node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// ../../node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_2) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k2) => typeof obj[obj[k2]] !== "number");
    const filtered = {};
    for (const k2 of validKeys) {
      filtered[k2] = obj[k2];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e7) {
      return obj[e7];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_2, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t5 = typeof data;
  switch (t5) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// ../../node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i6 = 0;
          while (i6 < issue.path.length) {
            const el = issue.path[i6];
            const terminal = i6 === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i6++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// ../../node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// ../../node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// ../../node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage2 = "";
  const maps = errorMaps.filter((m2) => !!m2).slice().reverse();
  for (const map of maps) {
    errorMessage2 = map(fullIssue, { data, defaultError: errorMessage2 }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage2
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x2) => !!x2)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s4 of results) {
      if (s4.status === "aborted")
        return INVALID;
      if (s4.status === "dirty")
        status.dirty();
      arrayValue.push(s4.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x2) => x2.status === "aborted";
var isDirty = (x2) => x2.status === "dirty";
var isValid = (x2) => x2.status === "valid";
var isAsync = (x2) => typeof Promise !== "undefined" && x2 instanceof Promise;

// ../../node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// ../../node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i6) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i6));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i6) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i6));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a3, b3) {
  const aType = getParsedType(a3);
  const bType = getParsedType(b3);
  if (a3 === b3) {
    return { valid: true, data: a3 };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b3);
    const sharedKeys = util.objectKeys(a3).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a3, ...b3 };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a3[key], b3[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a3.length !== b3.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a3.length; index++) {
      const itemA = a3[index];
      const itemB = b3[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a3 === +b3) {
    return { valid: true, data: a3 };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x2) => !!x2);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i6) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i6)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x2) => !!x2),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x2) => !!x2),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e7) => {
          error.addIssue(makeArgsIssue(args, e7));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e7) => {
          error.addIssue(makeReturnsIssue(result, e7));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a3, b3) {
    return new _ZodPipeline({
      in: a3,
      out: b3,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p3 = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p22 = typeof p3 === "string" ? { message: p3 } : p3;
  return p22;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r6 = check(data);
      if (r6 instanceof Promise) {
        return r6.then((r7) => {
          if (!r7) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r6) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// ../../packages/core/dist/index.js
var UserRoleSchema = external_exports.enum(["guest", "member", "moderator", "admin"]);
var UserStatusSchema = external_exports.enum(["active", "suspended", "banned"]);
var IdentityProviderSchema = external_exports.enum(["anonymous", "google", "github", "x"]);
var ThreadStatusSchema = external_exports.enum(["open", "closed", "locked"]);
var CommentStatusSchema = external_exports.enum(["pending", "published", "spam", "deleted"]);
var ReportStatusSchema = external_exports.enum(["open", "resolved", "dismissed"]);
var ReactionTotalsSchema = external_exports.record(external_exports.string(), external_exports.number().int().nonnegative());
var UserSchema = external_exports.object({
  id: external_exports.string().uuid(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  name: external_exports.string().nullable(),
  email: external_exports.string().email().nullable(),
  avatarUrl: external_exports.string().url().nullable(),
  metadata: external_exports.record(external_exports.unknown()).default({}),
  createdAt: external_exports.coerce.date(),
  updatedAt: external_exports.coerce.date(),
  lastActiveAt: external_exports.coerce.date()
});
var UpdateUserBodySchema = external_exports.object({
  role: UserRoleSchema.optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided to update"
});
var UpdateProfileBodySchema = external_exports.object({
  name: external_exports.string().trim().min(1).max(80).nullable().optional(),
  avatarUrl: external_exports.string().url().max(2048).nullable().optional()
}).refine((data) => data.name !== void 0 || data.avatarUrl !== void 0, {
  message: "At least one field must be provided to update"
});
var AdminUpdateUserBodySchema = external_exports.object({
  role: UserRoleSchema.optional(),
  status: UserStatusSchema.optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided to update"
});
var AdminUserListQuerySchema = external_exports.object({
  page: external_exports.coerce.number().int().min(1).default(1),
  pageSize: external_exports.coerce.number().int().min(1).max(100).default(20),
  role: UserRoleSchema.optional(),
  status: UserStatusSchema.optional(),
  search: external_exports.string().trim().min(1).optional()
});
var AdminUserListResponseSchema = external_exports.object({
  users: external_exports.array(UserSchema),
  total: external_exports.number().int().nonnegative(),
  page: external_exports.number().int().min(1),
  pageSize: external_exports.number().int().min(1)
});
var IdentitySchema = external_exports.object({
  id: external_exports.string().uuid(),
  userId: external_exports.string().uuid(),
  provider: IdentityProviderSchema,
  providerUserId: external_exports.string(),
  profileData: external_exports.record(external_exports.unknown()).default({}),
  createdAt: external_exports.coerce.date(),
  updatedAt: external_exports.coerce.date()
});
var ThreadSchema = external_exports.object({
  id: external_exports.string().uuid(),
  externalRef: external_exports.string().min(1),
  title: external_exports.string().nullable(),
  url: external_exports.string().nullable(),
  status: ThreadStatusSchema,
  preModeration: external_exports.boolean(),
  commentCount: external_exports.number().int().nonnegative(),
  reactionTotals: ReactionTotalsSchema.default({}),
  metadata: external_exports.record(external_exports.unknown()).default({}),
  createdAt: external_exports.coerce.date(),
  updatedAt: external_exports.coerce.date()
});
var ThreadResponseSchema = ThreadSchema.extend({
  userReactions: external_exports.array(external_exports.string()).default([])
});
var GetThreadByRefParamsSchema = external_exports.object({
  ref: external_exports.string().min(1)
});
var GetThreadByRefQuerySchema = external_exports.object({
  title: external_exports.string().optional(),
  url: external_exports.string().optional()
});
var VoteValueSchema = external_exports.union([external_exports.literal(1), external_exports.literal(-1)]);
var IdParamSchema = external_exports.object({
  id: external_exports.string().uuid()
});
var VoteSchema = external_exports.object({
  id: external_exports.string().uuid(),
  commentId: external_exports.string().uuid(),
  userId: external_exports.string().uuid(),
  value: VoteValueSchema,
  createdAt: external_exports.coerce.date(),
  updatedAt: external_exports.coerce.date()
});
var CreateVoteBodySchema = external_exports.object({
  value: VoteValueSchema
});
var ReactionTargetTypeSchema = external_exports.enum(["comment", "thread"]);
var EmojiSchema = external_exports.string().min(1).max(16).regex(/^\p{Extended_Pictographic}(?:\uFE0F)?(?:[\u{1F3FB}-\u{1F3FF}])?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?(?:[\u{1F3FB}-\u{1F3FF}])?)*$/u, "Must be an emoji");
var DEFAULT_EMOJI_ALLOWLIST = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F389}", "\u{1F62E}", "\u{1F64F}"];
var EmojiAllowlistSchema = external_exports.array(EmojiSchema).min(1);
var ReactionSchema = external_exports.object({
  id: external_exports.string().uuid(),
  targetType: ReactionTargetTypeSchema,
  targetId: external_exports.string().uuid(),
  userId: external_exports.string().uuid(),
  emoji: EmojiSchema,
  createdAt: external_exports.coerce.date(),
  updatedAt: external_exports.coerce.date()
});
var CreateReactionBodySchema = external_exports.object({
  emoji: EmojiSchema
});
var DeleteReactionParamsSchema = external_exports.object({
  id: external_exports.string().uuid(),
  emoji: EmojiSchema
});
var COMMENT_DEPTH_CAP = 4;
var CommentSchema = external_exports.object({
  id: external_exports.string().uuid(),
  threadId: external_exports.string().uuid(),
  authorId: external_exports.string().uuid(),
  parentId: external_exports.string().uuid().nullable(),
  bodyMd: external_exports.string(),
  bodyHtml: external_exports.string(),
  status: CommentStatusSchema,
  depth: external_exports.number().int().min(0).max(COMMENT_DEPTH_CAP),
  path: external_exports.string(),
  upvotes: external_exports.number().int().default(0),
  downvotes: external_exports.number().int().default(0),
  reactionTotals: ReactionTotalsSchema.default({}),
  metadata: external_exports.record(external_exports.unknown()).default({}),
  editedAt: external_exports.coerce.date().nullable(),
  createdAt: external_exports.coerce.date(),
  updatedAt: external_exports.coerce.date()
});
var CommentNodeSchema = CommentSchema.extend({
  authorName: external_exports.string().nullable().default(null),
  authorAvatarUrl: external_exports.string().url().nullable().default(null),
  children: external_exports.lazy(() => external_exports.array(CommentNodeSchema)),
  userVote: VoteValueSchema.nullable().default(null),
  userReactions: external_exports.array(external_exports.string()).default([])
});
var CreateCommentBodySchema = external_exports.object({
  bodyMd: external_exports.string().min(1).max(1e4),
  parentId: external_exports.string().uuid().optional()
});
var CommentListQuerySchema = external_exports.object({
  page: external_exports.coerce.number().int().min(1).default(1),
  pageSize: external_exports.coerce.number().int().min(1).max(100).default(20)
});
var CommentListResponseSchema = external_exports.object({
  comments: external_exports.array(CommentNodeSchema),
  total: external_exports.number().int().nonnegative(),
  page: external_exports.number().int().min(1),
  pageSize: external_exports.number().int().min(1)
});
var ReportSchema = external_exports.object({
  id: external_exports.string().uuid(),
  commentId: external_exports.string().uuid(),
  reporterId: external_exports.string().uuid(),
  reason: external_exports.string(),
  status: ReportStatusSchema,
  createdAt: external_exports.coerce.date(),
  updatedAt: external_exports.coerce.date()
});
var CreateReportBodySchema = external_exports.object({
  reason: external_exports.string().trim().min(1).max(1e3)
});
var ModerationTargetTypeSchema = external_exports.enum(["comment", "user", "thread"]);
var COMMENT_MODERATION_ACTIONS = ["approve", "reject", "delete", "spam"];
var USER_MODERATION_ACTIONS = ["ban", "suspend"];
var CommentModerationActionVerbSchema = external_exports.enum(COMMENT_MODERATION_ACTIONS);
var UserModerationActionVerbSchema = external_exports.enum(USER_MODERATION_ACTIONS);
var ModerationActionVerbSchema = external_exports.enum([
  ...COMMENT_MODERATION_ACTIONS,
  ...USER_MODERATION_ACTIONS
]);
var CommentModerationActionSchema = external_exports.object({
  commentId: external_exports.string().uuid(),
  action: CommentModerationActionVerbSchema
});
var UserModerationActionSchema = external_exports.object({
  userId: external_exports.string().uuid(),
  action: UserModerationActionVerbSchema
});
var CreateModerationActionBodySchema = external_exports.union([
  CommentModerationActionSchema,
  UserModerationActionSchema
]);
var ThreadContextSchema = ThreadSchema.pick({
  id: true,
  externalRef: true,
  title: true,
  url: true
});
var ModerationQueueItemSchema = CommentSchema.extend({
  thread: ThreadContextSchema,
  authorName: external_exports.string().nullable()
});
var ModerationQueueResponseSchema = external_exports.object({
  comments: external_exports.array(ModerationQueueItemSchema)
});
var ModerationActionSchema = external_exports.object({
  id: external_exports.string().uuid(),
  actorId: external_exports.string().uuid(),
  action: ModerationActionVerbSchema,
  targetType: ModerationTargetTypeSchema,
  targetId: external_exports.string().uuid(),
  metadata: external_exports.record(external_exports.unknown()).default({}),
  createdAt: external_exports.coerce.date()
});
var ModerationActionItemSchema = ModerationActionSchema.extend({
  actorName: external_exports.string().nullable()
});
var ModerationActionListResponseSchema = external_exports.object({
  actions: external_exports.array(ModerationActionItemSchema)
});
var AnonymousAuthResponseSchema = external_exports.object({
  accessToken: external_exports.string(),
  user: UserSchema
});
var OAuthStartQuerySchema = external_exports.object({
  guestUserId: external_exports.string().uuid().optional()
});
var OAuthCallbackQuerySchema = external_exports.object({
  code: external_exports.string().min(1),
  state: external_exports.string().min(1)
});
var AdminSessionSchema = external_exports.object({
  user: UserSchema,
  csrfToken: external_exports.string().min(1)
});
var AdminSessionUserSchema = external_exports.object({
  user: UserSchema
});
var AdminSettingsSchema = external_exports.object({
  commentDepthCap: external_exports.number().int().positive(),
  reactionAllowlist: external_exports.array(external_exports.string()),
  preModerationDefault: external_exports.boolean(),
  googleOAuthEnabled: external_exports.boolean()
});
var SessionSchema = external_exports.object({
  id: external_exports.string().uuid(),
  userId: external_exports.string().uuid(),
  refreshTokenHash: external_exports.string().nullable(),
  expiresAt: external_exports.coerce.date(),
  createdAt: external_exports.coerce.date(),
  updatedAt: external_exports.coerce.date()
});
var ProblemDetailsSchema = external_exports.object({
  type: external_exports.string().default("about:blank"),
  title: external_exports.string(),
  status: external_exports.number().int(),
  detail: external_exports.string().optional(),
  instance: external_exports.string().optional(),
  errors: external_exports.unknown().optional()
});

// ../../packages/sdk/dist/media.js
var MediaUploadError = class extends Error {
  status;
  constructor(message, options = {}) {
    super(message);
    this.name = "MediaUploadError";
    this.status = options.status;
  }
};
var IMGBB_ENDPOINT = "https://api.imgbb.com/1/upload";
var ImgbbResponseSchema = external_exports.object({
  data: external_exports.object({ url: external_exports.string() }).optional(),
  success: external_exports.boolean().optional(),
  error: external_exports.object({ message: external_exports.string() }).optional()
});
function errorMessage(payload, fallback) {
  const parsed = ImgbbResponseSchema.safeParse(payload);
  if (parsed.success && parsed.data.error?.message) {
    return parsed.data.error.message;
  }
  return fallback;
}
function createImgbbMediaProvider(options) {
  if (!options.apiKey) {
    throw new Error("imgbb API key is required");
  }
  const fetchFn = options.fetch ?? globalThis.fetch;
  const url = `${IMGBB_ENDPOINT}?key=${encodeURIComponent(options.apiKey)}`;
  return {
    async upload(file) {
      const form = new FormData();
      form.append("image", file);
      const response = await fetchFn(url, { method: "POST", body: form });
      let payload = void 0;
      try {
        payload = await response.json();
      } catch {
      }
      if (!response.ok) {
        throw new MediaUploadError(errorMessage(payload, `imgbb upload failed (${response.status})`), { status: response.status });
      }
      const parsed = ImgbbResponseSchema.safeParse(payload);
      if (!parsed.success || parsed.data.success === false || !parsed.data.data?.url) {
        throw new MediaUploadError(errorMessage(payload, "imgbb upload failed"), { status: response.status });
      }
      return { url: parsed.data.data.url };
    }
  };
}

// ../../packages/sdk/dist/index.js
var KoeApiError = class extends Error {
  status;
  title;
  type;
  detail;
  instance;
  constructor(options) {
    super(options.detail ?? options.title);
    this.name = "KoeApiError";
    this.status = options.status;
    this.title = options.title;
    this.type = options.type ?? "about:blank";
    this.detail = options.detail;
    this.instance = options.instance;
  }
};
var DEFAULT_API_PREFIX = "/api/v1";
function normalizeApiPrefix(apiPrefix) {
  const prefix = apiPrefix?.trim();
  if (!prefix || prefix === "/") {
    return DEFAULT_API_PREFIX;
  }
  const withLeadingSlash = prefix.startsWith("/") ? prefix : `/${prefix}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}
function buildUrl(baseUrl, apiPrefix, path, query) {
  const normalizedBase = baseUrl ? baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/` : typeof window !== "undefined" ? `${window.location.origin}/` : "http://localhost/";
  const prefix = normalizeApiPrefix(apiPrefix);
  const relativePath = path.startsWith("/") ? path.slice(1) : path;
  const fullPath = `${prefix.slice(1)}/${relativePath}`;
  const url = new URL(fullPath, normalizedBase);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== void 0) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}
function createKoeClient(options) {
  const fetchFn = options.fetch ?? globalThis.fetch;
  async function request(schema, path, requestOptions) {
    const { method, token, query, body } = requestOptions;
    const headers = {};
    const effectiveToken = token ?? options.token;
    if (effectiveToken) {
      headers.authorization = `Bearer ${effectiveToken}`;
    }
    if (body !== void 0) {
      headers["content-type"] = "application/json";
    }
    const response = await fetchFn(buildUrl(options.baseUrl, options.apiPrefix, path, query), {
      method,
      headers,
      body: body !== void 0 ? JSON.stringify(body) : void 0
    });
    if (!response.ok) {
      let problem = {};
      try {
        problem = await response.json();
      } catch {
      }
      throw new KoeApiError({
        status: response.status,
        title: typeof problem.title === "string" ? problem.title : "Request failed",
        type: typeof problem.type === "string" ? problem.type : void 0,
        detail: typeof problem.detail === "string" ? problem.detail : void 0,
        instance: typeof problem.instance === "string" ? problem.instance : void 0
      });
    }
    if (response.status === 204) {
      return void 0;
    }
    const data = await response.json();
    return schema.parse(data);
  }
  function moderateUser(userId, action, token) {
    return request(UserSchema, "/moderation/actions", {
      method: "POST",
      body: { userId, action },
      token
    });
  }
  return {
    auth: {
      anonymous: () => request(AnonymousAuthResponseSchema, "/auth/anonymous", {
        method: "POST"
      }),
      me: (token) => request(UserSchema, "/auth/me", { method: "GET", token }),
      updateMe: (body, token) => request(UserSchema, "/auth/me", { method: "PATCH", body, token })
    },
    threads: {
      getByRef: (ref, query, token) => request(ThreadResponseSchema, `/threads/by-ref/${encodeURIComponent(ref)}`, { method: "GET", query, token }),
      react: async (threadId, emoji, token) => {
        const result = await request(ReactionSchema, `/threads/${threadId}/reactions`, { method: "POST", body: { emoji }, token });
        return result ?? null;
      },
      unreact: async (threadId, emoji, token) => {
        await request(ReactionSchema, `/threads/${threadId}/reactions/${encodeURIComponent(emoji)}`, { method: "DELETE", token });
      }
    },
    comments: {
      list: (threadId, query, token) => request(CommentListResponseSchema, `/threads/${threadId}/comments`, { method: "GET", query, token }),
      create: (threadId, body, token) => request(CommentSchema, `/threads/${threadId}/comments`, {
        method: "POST",
        body,
        token
      }),
      vote: async (commentId, value, token) => {
        const result = await request(VoteSchema, `/comments/${commentId}/vote`, { method: "POST", body: { value }, token });
        return result ?? null;
      },
      unvote: async (commentId, token) => {
        await request(VoteSchema, `/comments/${commentId}/vote`, {
          method: "DELETE",
          token
        });
      },
      react: async (commentId, emoji, token) => {
        const result = await request(ReactionSchema, `/comments/${commentId}/reactions`, { method: "POST", body: { emoji }, token });
        return result ?? null;
      },
      unreact: async (commentId, emoji, token) => {
        await request(ReactionSchema, `/comments/${commentId}/reactions/${encodeURIComponent(emoji)}`, { method: "DELETE", token });
      },
      report: (commentId, reason, token) => request(ReportSchema, `/comments/${commentId}/reports`, {
        method: "POST",
        body: { reason },
        token
      })
    },
    moderation: {
      queue: (token) => request(ModerationQueueResponseSchema, "/moderation/queue", {
        method: "GET",
        token
      }),
      actions: (token) => request(ModerationActionListResponseSchema, "/moderation/actions", { method: "GET", token }),
      act: (commentId, action, token) => request(CommentSchema, "/moderation/actions", {
        method: "POST",
        body: { commentId, action },
        token
      }),
      ban: (userId, token) => moderateUser(userId, "ban", token),
      suspend: (userId, token) => moderateUser(userId, "suspend", token)
    }
  };
}

// ../../node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t5, e7, o7) {
    if (this._$cssResult$ = true, o7 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t5, this.t = e7;
  }
  get styleSheet() {
    let t5 = this.o;
    const s4 = this.t;
    if (e && void 0 === t5) {
      const e7 = void 0 !== s4 && 1 === s4.length;
      e7 && (t5 = o.get(s4)), void 0 === t5 && ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText), e7 && o.set(s4, t5));
    }
    return t5;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
var i = (t5, ...e7) => {
  const o7 = 1 === t5.length ? t5[0] : e7.reduce((e8, s4, o8) => e8 + ((t6) => {
    if (true === t6._$cssResult$) return t6.cssText;
    if ("number" == typeof t6) return t6;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t6 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s4) + t5[o8 + 1], t5[0]);
  return new n(o7, t5, s);
};
var S = (s4, o7) => {
  if (e) s4.adoptedStyleSheets = o7.map((t5) => t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet);
  else for (const e7 of o7) {
    const o8 = document.createElement("style"), n5 = t.litNonce;
    void 0 !== n5 && o8.setAttribute("nonce", n5), o8.textContent = e7.cssText, s4.appendChild(o8);
  }
};
var c = e ? (t5) => t5 : (t5) => t5 instanceof CSSStyleSheet ? ((t6) => {
  let e7 = "";
  for (const s4 of t6.cssRules) e7 += s4.cssText;
  return r(e7);
})(t5) : t5;

// ../../node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t5, s4) => t5;
var u = { toAttribute(t5, s4) {
  switch (s4) {
    case Boolean:
      t5 = t5 ? l : null;
      break;
    case Object:
    case Array:
      t5 = null == t5 ? t5 : JSON.stringify(t5);
  }
  return t5;
}, fromAttribute(t5, s4) {
  let i6 = t5;
  switch (s4) {
    case Boolean:
      i6 = null !== t5;
      break;
    case Number:
      i6 = null === t5 ? null : Number(t5);
      break;
    case Object:
    case Array:
      try {
        i6 = JSON.parse(t5);
      } catch (t6) {
        i6 = null;
      }
  }
  return i6;
} };
var f = (t5, s4) => !i2(t5, s4);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t5) {
    this._$Ei(), (this.l ??= []).push(t5);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t5, s4 = b) {
    if (s4.state && (s4.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t5) && ((s4 = Object.create(s4)).wrapped = true), this.elementProperties.set(t5, s4), !s4.noAccessor) {
      const i6 = Symbol(), h3 = this.getPropertyDescriptor(t5, i6, s4);
      void 0 !== h3 && e2(this.prototype, t5, h3);
    }
  }
  static getPropertyDescriptor(t5, s4, i6) {
    const { get: e7, set: r6 } = h(this.prototype, t5) ?? { get() {
      return this[s4];
    }, set(t6) {
      this[s4] = t6;
    } };
    return { get: e7, set(s5) {
      const h3 = e7?.call(this);
      r6?.call(this, s5), this.requestUpdate(t5, h3, i6);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t5) {
    return this.elementProperties.get(t5) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t5 = n2(this);
    t5.finalize(), void 0 !== t5.l && (this.l = [...t5.l]), this.elementProperties = new Map(t5.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t6 = this.properties, s4 = [...r2(t6), ...o2(t6)];
      for (const i6 of s4) this.createProperty(i6, t6[i6]);
    }
    const t5 = this[Symbol.metadata];
    if (null !== t5) {
      const s4 = litPropertyMetadata.get(t5);
      if (void 0 !== s4) for (const [t6, i6] of s4) this.elementProperties.set(t6, i6);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t6, s4] of this.elementProperties) {
      const i6 = this._$Eu(t6, s4);
      void 0 !== i6 && this._$Eh.set(i6, t6);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s4) {
    const i6 = [];
    if (Array.isArray(s4)) {
      const e7 = new Set(s4.flat(1 / 0).reverse());
      for (const s5 of e7) i6.unshift(c(s5));
    } else void 0 !== s4 && i6.push(c(s4));
    return i6;
  }
  static _$Eu(t5, s4) {
    const i6 = s4.attribute;
    return false === i6 ? void 0 : "string" == typeof i6 ? i6 : "string" == typeof t5 ? t5.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t5) => this.enableUpdating = t5), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t5) => t5(this));
  }
  addController(t5) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t5), void 0 !== this.renderRoot && this.isConnected && t5.hostConnected?.();
  }
  removeController(t5) {
    this._$EO?.delete(t5);
  }
  _$E_() {
    const t5 = /* @__PURE__ */ new Map(), s4 = this.constructor.elementProperties;
    for (const i6 of s4.keys()) this.hasOwnProperty(i6) && (t5.set(i6, this[i6]), delete this[i6]);
    t5.size > 0 && (this._$Ep = t5);
  }
  createRenderRoot() {
    const t5 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t5, this.constructor.elementStyles), t5;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t5) => t5.hostConnected?.());
  }
  enableUpdating(t5) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t5) => t5.hostDisconnected?.());
  }
  attributeChangedCallback(t5, s4, i6) {
    this._$AK(t5, i6);
  }
  _$ET(t5, s4) {
    const i6 = this.constructor.elementProperties.get(t5), e7 = this.constructor._$Eu(t5, i6);
    if (void 0 !== e7 && true === i6.reflect) {
      const h3 = (void 0 !== i6.converter?.toAttribute ? i6.converter : u).toAttribute(s4, i6.type);
      this._$Em = t5, null == h3 ? this.removeAttribute(e7) : this.setAttribute(e7, h3), this._$Em = null;
    }
  }
  _$AK(t5, s4) {
    const i6 = this.constructor, e7 = i6._$Eh.get(t5);
    if (void 0 !== e7 && this._$Em !== e7) {
      const t6 = i6.getPropertyOptions(e7), h3 = "function" == typeof t6.converter ? { fromAttribute: t6.converter } : void 0 !== t6.converter?.fromAttribute ? t6.converter : u;
      this._$Em = e7;
      const r6 = h3.fromAttribute(s4, t6.type);
      this[e7] = r6 ?? this._$Ej?.get(e7) ?? r6, this._$Em = null;
    }
  }
  requestUpdate(t5, s4, i6, e7 = false, h3) {
    if (void 0 !== t5) {
      const r6 = this.constructor;
      if (false === e7 && (h3 = this[t5]), i6 ??= r6.getPropertyOptions(t5), !((i6.hasChanged ?? f)(h3, s4) || i6.useDefault && i6.reflect && h3 === this._$Ej?.get(t5) && !this.hasAttribute(r6._$Eu(t5, i6)))) return;
      this.C(t5, s4, i6);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t5, s4, { useDefault: i6, reflect: e7, wrapped: h3 }, r6) {
    i6 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) && (this._$Ej.set(t5, r6 ?? s4 ?? this[t5]), true !== h3 || void 0 !== r6) || (this._$AL.has(t5) || (this.hasUpdated || i6 || (s4 = void 0), this._$AL.set(t5, s4)), true === e7 && this._$Em !== t5 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t5));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t6) {
      Promise.reject(t6);
    }
    const t5 = this.scheduleUpdate();
    return null != t5 && await t5, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t7, s5] of this._$Ep) this[t7] = s5;
        this._$Ep = void 0;
      }
      const t6 = this.constructor.elementProperties;
      if (t6.size > 0) for (const [s5, i6] of t6) {
        const { wrapped: t7 } = i6, e7 = this[s5];
        true !== t7 || this._$AL.has(s5) || void 0 === e7 || this.C(s5, void 0, i6, e7);
      }
    }
    let t5 = false;
    const s4 = this._$AL;
    try {
      t5 = this.shouldUpdate(s4), t5 ? (this.willUpdate(s4), this._$EO?.forEach((t6) => t6.hostUpdate?.()), this.update(s4)) : this._$EM();
    } catch (s5) {
      throw t5 = false, this._$EM(), s5;
    }
    t5 && this._$AE(s4);
  }
  willUpdate(t5) {
  }
  _$AE(t5) {
    this._$EO?.forEach((t6) => t6.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t5)), this.updated(t5);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t5) {
    return true;
  }
  update(t5) {
    this._$Eq &&= this._$Eq.forEach((t6) => this._$ET(t6, this[t6])), this._$EM();
  }
  updated(t5) {
  }
  firstUpdated(t5) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// ../../node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t5) => t5;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t5) => t5 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t5) => null === t5 || "object" != typeof t5 && "function" != typeof t5;
var u2 = Array.isArray;
var d2 = (t5) => u2(t5) || "function" == typeof t5?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t5) => (i6, ...s4) => ({ _$litType$: t5, strings: i6, values: s4 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = Symbol.for("lit-noChange");
var A = Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t5, i6) {
  if (!u2(t5) || !t5.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i6) : i6;
}
var N = (t5, i6) => {
  const s4 = t5.length - 1, e7 = [];
  let n5, l3 = 2 === i6 ? "<svg>" : 3 === i6 ? "<math>" : "", c4 = v;
  for (let i7 = 0; i7 < s4; i7++) {
    const s5 = t5[i7];
    let a3, u3, d3 = -1, f3 = 0;
    for (; f3 < s5.length && (c4.lastIndex = f3, u3 = c4.exec(s5), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n5 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n5 ?? v, d3 = -1) : void 0 === u3[1] ? d3 = -2 : (d3 = c4.lastIndex - u3[2].length, a3 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n5 = void 0);
    const x2 = c4 === p2 && t5[i7 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s5 + r3 : d3 >= 0 ? (e7.push(a3), s5.slice(0, d3) + h2 + s5.slice(d3) + o3 + x2) : s5 + o3 + (-2 === d3 ? i7 : x2);
  }
  return [V(t5, l3 + (t5[s4] || "<?>") + (2 === i6 ? "</svg>" : 3 === i6 ? "</math>" : "")), e7];
};
var S2 = class _S {
  constructor({ strings: t5, _$litType$: i6 }, e7) {
    let r6;
    this.parts = [];
    let l3 = 0, a3 = 0;
    const u3 = t5.length - 1, d3 = this.parts, [f3, v2] = N(t5, i6);
    if (this.el = _S.createElement(f3, e7), P.currentNode = this.el.content, 2 === i6 || 3 === i6) {
      const t6 = this.el.content.firstChild;
      t6.replaceWith(...t6.childNodes);
    }
    for (; null !== (r6 = P.nextNode()) && d3.length < u3; ) {
      if (1 === r6.nodeType) {
        if (r6.hasAttributes()) for (const t6 of r6.getAttributeNames()) if (t6.endsWith(h2)) {
          const i7 = v2[a3++], s4 = r6.getAttribute(t6).split(o3), e8 = /([.?@])?(.*)/.exec(i7);
          d3.push({ type: 1, index: l3, name: e8[2], strings: s4, ctor: "." === e8[1] ? I : "?" === e8[1] ? L : "@" === e8[1] ? z : H }), r6.removeAttribute(t6);
        } else t6.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r6.removeAttribute(t6));
        if (y2.test(r6.tagName)) {
          const t6 = r6.textContent.split(o3), i7 = t6.length - 1;
          if (i7 > 0) {
            r6.textContent = s2 ? s2.emptyScript : "";
            for (let s4 = 0; s4 < i7; s4++) r6.append(t6[s4], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r6.append(t6[i7], c3());
          }
        }
      } else if (8 === r6.nodeType) if (r6.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t6 = -1;
        for (; -1 !== (t6 = r6.data.indexOf(o3, t6 + 1)); ) d3.push({ type: 7, index: l3 }), t6 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t5, i6) {
    const s4 = l2.createElement("template");
    return s4.innerHTML = t5, s4;
  }
};
function M(t5, i6, s4 = t5, e7) {
  if (i6 === E) return i6;
  let h3 = void 0 !== e7 ? s4._$Co?.[e7] : s4._$Cl;
  const o7 = a2(i6) ? void 0 : i6._$litDirective$;
  return h3?.constructor !== o7 && (h3?._$AO?.(false), void 0 === o7 ? h3 = void 0 : (h3 = new o7(t5), h3._$AT(t5, s4, e7)), void 0 !== e7 ? (s4._$Co ??= [])[e7] = h3 : s4._$Cl = h3), void 0 !== h3 && (i6 = M(t5, h3._$AS(t5, i6.values), h3, e7)), i6;
}
var R = class {
  constructor(t5, i6) {
    this._$AV = [], this._$AN = void 0, this._$AD = t5, this._$AM = i6;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t5) {
    const { el: { content: i6 }, parts: s4 } = this._$AD, e7 = (t5?.creationScope ?? l2).importNode(i6, true);
    P.currentNode = e7;
    let h3 = P.nextNode(), o7 = 0, n5 = 0, r6 = s4[0];
    for (; void 0 !== r6; ) {
      if (o7 === r6.index) {
        let i7;
        2 === r6.type ? i7 = new k(h3, h3.nextSibling, this, t5) : 1 === r6.type ? i7 = new r6.ctor(h3, r6.name, r6.strings, this, t5) : 6 === r6.type && (i7 = new Z(h3, this, t5)), this._$AV.push(i7), r6 = s4[++n5];
      }
      o7 !== r6?.index && (h3 = P.nextNode(), o7++);
    }
    return P.currentNode = l2, e7;
  }
  p(t5) {
    let i6 = 0;
    for (const s4 of this._$AV) void 0 !== s4 && (void 0 !== s4.strings ? (s4._$AI(t5, s4, i6), i6 += s4.strings.length - 2) : s4._$AI(t5[i6])), i6++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t5, i6, s4, e7) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t5, this._$AB = i6, this._$AM = s4, this.options = e7, this._$Cv = e7?.isConnected ?? true;
  }
  get parentNode() {
    let t5 = this._$AA.parentNode;
    const i6 = this._$AM;
    return void 0 !== i6 && 11 === t5?.nodeType && (t5 = i6.parentNode), t5;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t5, i6 = this) {
    t5 = M(this, t5, i6), a2(t5) ? t5 === A || null == t5 || "" === t5 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t5 !== this._$AH && t5 !== E && this._(t5) : void 0 !== t5._$litType$ ? this.$(t5) : void 0 !== t5.nodeType ? this.T(t5) : d2(t5) ? this.k(t5) : this._(t5);
  }
  O(t5) {
    return this._$AA.parentNode.insertBefore(t5, this._$AB);
  }
  T(t5) {
    this._$AH !== t5 && (this._$AR(), this._$AH = this.O(t5));
  }
  _(t5) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t5 : this.T(l2.createTextNode(t5)), this._$AH = t5;
  }
  $(t5) {
    const { values: i6, _$litType$: s4 } = t5, e7 = "number" == typeof s4 ? this._$AC(t5) : (void 0 === s4.el && (s4.el = S2.createElement(V(s4.h, s4.h[0]), this.options)), s4);
    if (this._$AH?._$AD === e7) this._$AH.p(i6);
    else {
      const t6 = new R(e7, this), s5 = t6.u(this.options);
      t6.p(i6), this.T(s5), this._$AH = t6;
    }
  }
  _$AC(t5) {
    let i6 = C.get(t5.strings);
    return void 0 === i6 && C.set(t5.strings, i6 = new S2(t5)), i6;
  }
  k(t5) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i6 = this._$AH;
    let s4, e7 = 0;
    for (const h3 of t5) e7 === i6.length ? i6.push(s4 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s4 = i6[e7], s4._$AI(h3), e7++;
    e7 < i6.length && (this._$AR(s4 && s4._$AB.nextSibling, e7), i6.length = e7);
  }
  _$AR(t5 = this._$AA.nextSibling, s4) {
    for (this._$AP?.(false, true, s4); t5 !== this._$AB; ) {
      const s5 = i3(t5).nextSibling;
      i3(t5).remove(), t5 = s5;
    }
  }
  setConnected(t5) {
    void 0 === this._$AM && (this._$Cv = t5, this._$AP?.(t5));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t5, i6, s4, e7, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t5, this.name = i6, this._$AM = e7, this.options = h3, s4.length > 2 || "" !== s4[0] || "" !== s4[1] ? (this._$AH = Array(s4.length - 1).fill(new String()), this.strings = s4) : this._$AH = A;
  }
  _$AI(t5, i6 = this, s4, e7) {
    const h3 = this.strings;
    let o7 = false;
    if (void 0 === h3) t5 = M(this, t5, i6, 0), o7 = !a2(t5) || t5 !== this._$AH && t5 !== E, o7 && (this._$AH = t5);
    else {
      const e8 = t5;
      let n5, r6;
      for (t5 = h3[0], n5 = 0; n5 < h3.length - 1; n5++) r6 = M(this, e8[s4 + n5], i6, n5), r6 === E && (r6 = this._$AH[n5]), o7 ||= !a2(r6) || r6 !== this._$AH[n5], r6 === A ? t5 = A : t5 !== A && (t5 += (r6 ?? "") + h3[n5 + 1]), this._$AH[n5] = r6;
    }
    o7 && !e7 && this.j(t5);
  }
  j(t5) {
    t5 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t5 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t5) {
    this.element[this.name] = t5 === A ? void 0 : t5;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t5) {
    this.element.toggleAttribute(this.name, !!t5 && t5 !== A);
  }
};
var z = class extends H {
  constructor(t5, i6, s4, e7, h3) {
    super(t5, i6, s4, e7, h3), this.type = 5;
  }
  _$AI(t5, i6 = this) {
    if ((t5 = M(this, t5, i6, 0) ?? A) === E) return;
    const s4 = this._$AH, e7 = t5 === A && s4 !== A || t5.capture !== s4.capture || t5.once !== s4.once || t5.passive !== s4.passive, h3 = t5 !== A && (s4 === A || e7);
    e7 && this.element.removeEventListener(this.name, this, s4), h3 && this.element.addEventListener(this.name, this, t5), this._$AH = t5;
  }
  handleEvent(t5) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t5) : this._$AH.handleEvent(t5);
  }
};
var Z = class {
  constructor(t5, i6, s4) {
    this.element = t5, this.type = 6, this._$AN = void 0, this._$AM = i6, this.options = s4;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t5) {
    M(this, t5);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
var D = (t5, i6, s4) => {
  const e7 = s4?.renderBefore ?? i6;
  let h3 = e7._$litPart$;
  if (void 0 === h3) {
    const t6 = s4?.renderBefore ?? null;
    e7._$litPart$ = h3 = new k(i6.insertBefore(c3(), t6), t6, void 0, s4 ?? {});
  }
  return h3._$AI(t5), h3;
};

// ../../node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t5 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t5.firstChild, t5;
  }
  update(t5) {
    const r6 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t5), this._$Do = D(r6, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i4._$litElement$ = true, i4["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i4 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i4 });
(s3.litElementVersions ??= []).push("4.2.2");

// ../../node_modules/@lit/reactive-element/decorators/custom-element.js
var t3 = (t5) => (e7, o7) => {
  void 0 !== o7 ? o7.addInitializer(() => {
    customElements.define(t5, e7);
  }) : customElements.define(t5, e7);
};

// ../../node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t5 = o5, e7, r6) => {
  const { kind: n5, metadata: i6 } = r6;
  let s4 = globalThis.litPropertyMetadata.get(i6);
  if (void 0 === s4 && globalThis.litPropertyMetadata.set(i6, s4 = /* @__PURE__ */ new Map()), "setter" === n5 && ((t5 = Object.create(t5)).wrapped = true), s4.set(r6.name, t5), "accessor" === n5) {
    const { name: o7 } = r6;
    return { set(r7) {
      const n6 = e7.get.call(this);
      e7.set.call(this, r7), this.requestUpdate(o7, n6, t5, true, r7);
    }, init(e8) {
      return void 0 !== e8 && this.C(o7, void 0, t5, e8), e8;
    } };
  }
  if ("setter" === n5) {
    const { name: o7 } = r6;
    return function(r7) {
      const n6 = this[o7];
      e7.call(this, r7), this.requestUpdate(o7, n6, t5, true, r7);
    };
  }
  throw Error("Unsupported decorator location: " + n5);
};
function n4(t5) {
  return (e7, o7) => "object" == typeof o7 ? r4(t5, e7, o7) : ((t6, e8, o8) => {
    const r6 = e8.hasOwnProperty(o8);
    return e8.constructor.createProperty(o8, t6), r6 ? Object.getOwnPropertyDescriptor(e8, o8) : void 0;
  })(t5, e7, o7);
}

// ../../node_modules/@lit/reactive-element/decorators/state.js
function r5(r6) {
  return n4({ ...r6, state: true, attribute: false });
}

// ../../node_modules/lit-html/directive.js
var t4 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e5 = (t5) => (...e7) => ({ _$litDirective$: t5, values: e7 });
var i5 = class {
  constructor(t5) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t5, e7, i6) {
    this._$Ct = t5, this._$AM = e7, this._$Ci = i6;
  }
  _$AS(t5, e7) {
    return this.update(t5, e7);
  }
  update(t5, e7) {
    return this.render(...e7);
  }
};

// ../../node_modules/lit-html/directives/unsafe-html.js
var e6 = class extends i5 {
  constructor(i6) {
    if (super(i6), this.it = A, i6.type !== t4.CHILD) throw Error(this.constructor.directiveName + "() can only be used in child bindings");
  }
  render(r6) {
    if (r6 === A || null == r6) return this._t = void 0, this.it = r6;
    if (r6 === E) return r6;
    if ("string" != typeof r6) throw Error(this.constructor.directiveName + "() called with a non-string value");
    if (r6 === this.it) return this._t;
    this.it = r6;
    const s4 = [r6];
    return s4.raw = s4, this._t = { _$litType$: this.constructor.resultType, strings: s4, values: [] };
  }
};
e6.directiveName = "unsafeHTML", e6.resultType = 1;
var o6 = e5(e6);

// ../../packages/widget/src/generated/tailwind.styles.ts
var tailwindStyles = i`
/*! tailwindcss v4.3.3 | MIT License | https://tailwindcss.com */
@layer properties{@supports (((-webkit-hyphens:none)) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){*,:before,:after,::backdrop{--tw-space-y-reverse:0;--tw-border-style:solid;--tw-gradient-position:initial;--tw-gradient-from:#0000;--tw-gradient-via:#0000;--tw-gradient-to:#0000;--tw-gradient-stops:initial;--tw-gradient-via-stops:initial;--tw-gradient-from-position:0%;--tw-gradient-via-position:50%;--tw-gradient-to-position:100%;--tw-leading:initial;--tw-font-weight:initial;--tw-tracking:initial;--tw-ordinal:initial;--tw-slashed-zero:initial;--tw-numeric-figure:initial;--tw-numeric-spacing:initial;--tw-numeric-fraction:initial;--tw-shadow:0 0 #0000;--tw-shadow-color:initial;--tw-shadow-alpha:100%;--tw-inset-shadow:0 0 #0000;--tw-inset-shadow-color:initial;--tw-inset-shadow-alpha:100%;--tw-ring-color:initial;--tw-ring-shadow:0 0 #0000;--tw-inset-ring-color:initial;--tw-inset-ring-shadow:0 0 #0000;--tw-ring-inset:initial;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-backdrop-blur:initial;--tw-backdrop-brightness:initial;--tw-backdrop-contrast:initial;--tw-backdrop-grayscale:initial;--tw-backdrop-hue-rotate:initial;--tw-backdrop-invert:initial;--tw-backdrop-opacity:initial;--tw-backdrop-saturate:initial;--tw-backdrop-sepia:initial;--tw-duration:initial}}}@layer theme{:root,:host{--font-sans:var(--koe-font);--font-serif:ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;--font-mono:var(--koe-font-mono);--spacing:var(--koe-space);--text-xs:.75rem;--text-xs--line-height:calc(1 / .75);--text-sm:.875rem;--text-sm--line-height:calc(1.25 / .875);--text-base:1rem;--text-base--line-height:calc(1.5 / 1);--text-lg:1.125rem;--text-lg--line-height:calc(1.75 / 1.125);--text-xl:1.25rem;--text-xl--line-height:calc(1.75 / 1.25);--text-3xl:1.875rem;--text-3xl--line-height:calc(2.25 / 1.875);--font-weight-medium:500;--font-weight-semibold:600;--font-weight-bold:700;--font-weight-extrabold:800;--tracking-tight:-.025em;--tracking-wide:.025em;--leading-relaxed:1.625;--radius-md:var(--koe-radius-md);--radius-lg:var(--koe-radius-lg);--radius-xl:var(--koe-radius-xl);--radius-2xl:var(--koe-radius-2xl);--animate-pulse:pulse 2s cubic-bezier(.4, 0, .6, 1) infinite;--blur-sm:8px;--default-transition-duration:.15s;--default-transition-timing-function:cubic-bezier(.4, 0, .2, 1);--default-font-family:var(--font-sans);--default-mono-font-family:var(--font-mono);--color-koe-surface:var(--koe-surface);--color-koe-surface-muted:var(--koe-surface-muted);--color-koe-surface-sunken:var(--koe-surface-sunken);--color-koe-surface-strong:var(--koe-surface-strong);--color-koe-skeleton:var(--koe-skeleton);--color-koe-text:var(--koe-text);--color-koe-text-muted:var(--koe-text-muted);--color-koe-text-subtle:var(--koe-text-subtle);--color-koe-text-inverse:var(--koe-text-inverse);--color-koe-accent:var(--koe-accent);--color-koe-accent-soft:var(--koe-accent-soft);--color-koe-accent-contrast:var(--koe-accent-contrast);--color-koe-border:var(--koe-border);--color-koe-border-strong:var(--koe-border-strong);--color-koe-danger:var(--koe-danger);--color-koe-danger-soft:var(--koe-danger-soft);--color-koe-danger-border:var(--koe-danger-border);--color-koe-danger-contrast:var(--koe-danger-contrast);--color-koe-gif-from:var(--koe-gif-from);--color-koe-gif-to:var(--koe-gif-to);--radius-full:var(--koe-radius-full)}}@layer base{*,:after,:before,::backdrop{box-sizing:border-box;border:0 solid;margin:0;padding:0}::file-selector-button{box-sizing:border-box;border:0 solid;margin:0;padding:0}html,:host{-webkit-text-size-adjust:100%;tab-size:4;line-height:1.5;font-family:var(--default-font-family,-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji");font-feature-settings:var(--default-font-feature-settings,normal);font-variation-settings:var(--default-font-variation-settings,normal);-webkit-tap-highlight-color:transparent}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,samp,pre{font-family:var(--default-mono-font-family,ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace);font-feature-settings:var(--default-mono-font-feature-settings,normal);font-variation-settings:var(--default-mono-font-variation-settings,normal);font-size:1em}small{font-size:80%}sub,sup{vertical-align:baseline;font-size:75%;line-height:0;position:relative}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}:-moz-focusring:where(:not(iframe)){outline:auto}progress{vertical-align:baseline}summary{display:list-item}ol,ul,menu{list-style:none}img,svg,video,canvas,audio,iframe,embed,object{vertical-align:middle;display:block}img,video{max-width:100%;height:auto}button,input,select,optgroup,textarea{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}::file-selector-button{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}:where(select:is([multiple],[size])) optgroup{font-weight:bolder}:where(select:is([multiple],[size])) optgroup option{padding-inline-start:20px}::file-selector-button{margin-inline-end:4px}::placeholder{opacity:1}@supports (not ((-webkit-appearance:-apple-pay-button))) or (contain-intrinsic-size:1px){::placeholder{color:currentColor}@supports (color:color-mix(in lab, red, red)){::placeholder{color:color-mix(in oklab, currentcolor 50%, transparent)}}}textarea{resize:vertical}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-date-and-time-value{min-height:1lh;text-align:inherit}::-webkit-datetime-edit{display:inline-flex}::-webkit-datetime-edit-fields-wrapper{padding:0}::-webkit-datetime-edit{padding-block:0}::-webkit-datetime-edit-year-field{padding-block:0}::-webkit-datetime-edit-month-field{padding-block:0}::-webkit-datetime-edit-day-field{padding-block:0}::-webkit-datetime-edit-hour-field{padding-block:0}::-webkit-datetime-edit-minute-field{padding-block:0}::-webkit-datetime-edit-second-field{padding-block:0}::-webkit-datetime-edit-millisecond-field{padding-block:0}::-webkit-datetime-edit-meridiem-field{padding-block:0}::-webkit-calendar-picker-indicator{line-height:1}:-moz-ui-invalid{box-shadow:none}button,input:where([type=button],[type=reset],[type=submit]){appearance:button}::file-selector-button{appearance:button}::-webkit-inner-spin-button{height:auto}::-webkit-outer-spin-button{height:auto}[hidden]:where(:not([hidden=until-found])){display:none!important}}@layer components{:host{--koe-font:system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;--koe-font-mono:ui-monospace, SFMono-Regular, Menlo, monospace;--koe-space:.25rem;--koe-radius-sm:.25rem;--koe-radius-md:.375rem;--koe-radius-lg:.5rem;--koe-radius-xl:.75rem;--koe-radius-2xl:1rem;--koe-radius-full:9999px;--koe-surface:#fff;--koe-surface-muted:#f8fafc;--koe-surface-sunken:#f1f5f9;--koe-surface-strong:#0f172a;--koe-skeleton:#e2e8f0;--koe-text:#0f172a;--koe-text-muted:#64748b;--koe-text-subtle:#94a3b8;--koe-text-inverse:#fff;--koe-accent:#2563eb;--koe-accent-soft:#eff6ff;--koe-accent-contrast:#fff;--koe-border:#e2e8f0;--koe-border-strong:#cbd5e1;--koe-focus-ring:#0f172a14;--koe-danger:#dc2626;--koe-danger-soft:#fef2f2;--koe-danger-border:#fecaca;--koe-danger-contrast:#fff;--koe-warning:#92400e;--koe-warning-soft:#fef3c7;--koe-gif-from:#d946ef;--koe-gif-to:#ec4899;--koe-thread-line-0:#e5e7eb;--koe-thread-line-1:#bae6fd;--koe-thread-line-2:#ddd6fe;--koe-thread-line-3:#a7f3d0;font-family:var(--koe-font);color:var(--koe-text);display:block}:host([theme=dark]){--koe-surface:#0f172a;--koe-surface-muted:#1e293b;--koe-surface-sunken:#1e293b;--koe-surface-strong:#f8fafc;--koe-skeleton:#1e293b;--koe-text:#e2e8f0;--koe-text-muted:#94a3b8;--koe-text-subtle:#64748b;--koe-text-inverse:#0f172a;--koe-accent:#60a5fa;--koe-accent-soft:#2563eb2e;--koe-accent-contrast:#fff;--koe-border:#1e293b;--koe-border-strong:#475569;--koe-focus-ring:#ffffff0f;--koe-danger:#f87171;--koe-danger-soft:#dc26262e;--koe-danger-border:#dc262680;--koe-danger-contrast:#fff;--koe-warning:#fcd34d;--koe-warning-soft:#fbbf241f;--koe-thread-line-0:#334155;--koe-thread-line-1:#075985;--koe-thread-line-2:#5b21b6;--koe-thread-line-3:#065f46;color:var(--koe-text)}.comment-list{margin:0;padding:0;list-style:none}.comment-list--root>.comment+.comment{margin-top:calc(var(--koe-space) * 6);padding-top:calc(var(--koe-space) * 6);border-top:1px solid var(--koe-border)}.thread-line{border-left-style:solid;border-left-width:2px}.comment-body>:first-child{margin-top:0}.comment-body>:last-child{margin-bottom:0}.comment-body img{border-radius:var(--koe-radius-xl);max-width:min(320px,100%);height:auto;margin:var(--koe-space) 0;display:inline-block}.pending-badge{padding:1px calc(var(--koe-space) * 2);border-radius:var(--koe-radius-full);color:var(--koe-warning);background-color:var(--koe-warning-soft);white-space:nowrap;align-items:center;font-size:.7rem;font-weight:500;display:inline-flex}.toolbar-button{width:calc(var(--koe-space) * 8);height:calc(var(--koe-space) * 8);border-radius:var(--koe-radius-lg);color:var(--koe-text-muted);justify-content:center;align-items:center;transition:background-color .15s,color .15s;display:inline-flex}.toolbar-button:hover{background-color:var(--koe-surface-sunken);color:var(--koe-text)}}@layer utilities{.absolute{position:absolute}.relative{position:relative}.static{position:static}.top-full{top:100%}.right-2{right:calc(var(--spacing) * 2)}.z-20{z-index:20}.col-span-3{grid-column:span 3/span 3}.mx-1{margin-inline:var(--spacing)}.prose{color:var(--tw-prose-body);max-width:65ch}.prose :where(p):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.25em;margin-bottom:1.25em}.prose :where([class~=lead]):not(:where([class~=not-prose],[class~=not-prose] *)){color:var(--tw-prose-lead);margin-top:1.2em;margin-bottom:1.2em;font-size:1.25em;line-height:1.6}.prose :where(a):not(:where([class~=not-prose],[class~=not-prose] *)){color:var(--tw-prose-links);font-weight:500;text-decoration:underline}.prose :where(strong):not(:where([class~=not-prose],[class~=not-prose] *)){color:var(--tw-prose-bold);font-weight:600}.prose :where(a strong):not(:where([class~=not-prose],[class~=not-prose] *)),.prose :where(blockquote strong):not(:where([class~=not-prose],[class~=not-prose] *)),.prose :where(thead th strong):not(:where([class~=not-prose],[class~=not-prose] *)){color:inherit}.prose :where(ol):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.25em;margin-bottom:1.25em;padding-inline-start:1.625em;list-style-type:decimal}.prose :where(ol[type=A]):not(:where([class~=not-prose],[class~=not-prose] *)){list-style-type:upper-alpha}.prose :where(ol[type=a]):not(:where([class~=not-prose],[class~=not-prose] *)){list-style-type:lower-alpha}.prose :where(ol[type=A s]):not(:where([class~=not-prose],[class~=not-prose] *)){list-style-type:upper-alpha}.prose :where(ol[type=a s]):not(:where([class~=not-prose],[class~=not-prose] *)){list-style-type:lower-alpha}.prose :where(ol[type=I]):not(:where([class~=not-prose],[class~=not-prose] *)){list-style-type:upper-roman}.prose :where(ol[type=i]):not(:where([class~=not-prose],[class~=not-prose] *)){list-style-type:lower-roman}.prose :where(ol[type=I s]):not(:where([class~=not-prose],[class~=not-prose] *)){list-style-type:upper-roman}.prose :where(ol[type=i s]):not(:where([class~=not-prose],[class~=not-prose] *)){list-style-type:lower-roman}.prose :where(ol[type="1"]):not(:where([class~=not-prose],[class~=not-prose] *)){list-style-type:decimal}.prose :where(ul):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.25em;margin-bottom:1.25em;padding-inline-start:1.625em;list-style-type:disc}.prose :where(ol>li):not(:where([class~=not-prose],[class~=not-prose] *))::marker{color:var(--tw-prose-counters);font-weight:400}.prose :where(ul>li):not(:where([class~=not-prose],[class~=not-prose] *))::marker{color:var(--tw-prose-bullets)}.prose :where(dt):not(:where([class~=not-prose],[class~=not-prose] *)){color:var(--tw-prose-headings);margin-top:1.25em;font-weight:600}.prose :where(hr):not(:where([class~=not-prose],[class~=not-prose] *)){border-color:var(--tw-prose-hr);border-top-width:1px;margin-top:3em;margin-bottom:3em}.prose :where(blockquote):not(:where([class~=not-prose],[class~=not-prose] *)){color:var(--tw-prose-quotes);border-inline-start-width:.25rem;border-inline-start-color:var(--tw-prose-quote-borders);quotes:"“""”""‘""’";margin-top:1.6em;margin-bottom:1.6em;padding-inline-start:1em;font-style:italic;font-weight:500}.prose :where(blockquote p:first-of-type):not(:where([class~=not-prose],[class~=not-prose] *)):before{content:open-quote}.prose :where(blockquote p:last-of-type):not(:where([class~=not-prose],[class~=not-prose] *)):after{content:close-quote}.prose :where(h1):not(:where([class~=not-prose],[class~=not-prose] *)){color:var(--tw-prose-headings);margin-top:0;margin-bottom:.888889em;font-size:2.25em;font-weight:800;line-height:1.11111}.prose :where(h1 strong):not(:where([class~=not-prose],[class~=not-prose] *)){color:inherit;font-weight:900}.prose :where(h2):not(:where([class~=not-prose],[class~=not-prose] *)){color:var(--tw-prose-headings);margin-top:2em;margin-bottom:1em;font-size:1.5em;font-weight:700;line-height:1.33333}.prose :where(h2 strong):not(:where([class~=not-prose],[class~=not-prose] *)){color:inherit;font-weight:800}.prose :where(h3):not(:where([class~=not-prose],[class~=not-prose] *)){color:var(--tw-prose-headings);margin-top:1.6em;margin-bottom:.6em;font-size:1.25em;font-weight:600;line-height:1.6}.prose :where(h3 strong):not(:where([class~=not-prose],[class~=not-prose] *)){color:inherit;font-weight:700}.prose :where(h4):not(:where([class~=not-prose],[class~=not-prose] *)){color:var(--tw-prose-headings);margin-top:1.5em;margin-bottom:.5em;font-weight:600;line-height:1.5}.prose :where(h4 strong):not(:where([class~=not-prose],[class~=not-prose] *)){color:inherit;font-weight:700}.prose :where(img):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:2em;margin-bottom:2em}.prose :where(picture):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:2em;margin-bottom:2em;display:block}.prose :where(video):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:2em;margin-bottom:2em}.prose :where(kbd):not(:where([class~=not-prose],[class~=not-prose] *)){color:var(--tw-prose-kbd);box-shadow:0 0 0 1px var(--tw-prose-kbd-shadows), 0 3px 0 var(--tw-prose-kbd-shadows);padding-top:.1875em;padding-inline-end:.375em;padding-bottom:.1875em;border-radius:.3125rem;padding-inline-start:.375em;font-family:inherit;font-size:.875em;font-weight:500}.prose :where(code):not(:where([class~=not-prose],[class~=not-prose] *)){color:var(--tw-prose-code);font-size:.875em;font-weight:600}.prose :where(code):not(:where([class~=not-prose],[class~=not-prose] *)):before,.prose :where(code):not(:where([class~=not-prose],[class~=not-prose] *)):after{content:"\`"}.prose :where(a code):not(:where([class~=not-prose],[class~=not-prose] *)),.prose :where(h1 code):not(:where([class~=not-prose],[class~=not-prose] *)){color:inherit}.prose :where(h2 code):not(:where([class~=not-prose],[class~=not-prose] *)){color:inherit;font-size:.875em}.prose :where(h3 code):not(:where([class~=not-prose],[class~=not-prose] *)){color:inherit;font-size:.9em}.prose :where(h4 code):not(:where([class~=not-prose],[class~=not-prose] *)),.prose :where(blockquote code):not(:where([class~=not-prose],[class~=not-prose] *)),.prose :where(thead th code):not(:where([class~=not-prose],[class~=not-prose] *)){color:inherit}.prose :where(pre):not(:where([class~=not-prose],[class~=not-prose] *)){color:var(--tw-prose-pre-code);background-color:var(--tw-prose-pre-bg);padding-top:.857143em;padding-inline-end:1.14286em;padding-bottom:.857143em;border-radius:.375rem;margin-top:1.71429em;margin-bottom:1.71429em;padding-inline-start:1.14286em;font-size:.875em;font-weight:400;line-height:1.71429;overflow-x:auto}.prose :where(pre code):not(:where([class~=not-prose],[class~=not-prose] *)){font-weight:inherit;color:inherit;font-size:inherit;font-family:inherit;line-height:inherit;background-color:#0000;border-width:0;border-radius:0;padding:0}.prose :where(pre code):not(:where([class~=not-prose],[class~=not-prose] *)):before,.prose :where(pre code):not(:where([class~=not-prose],[class~=not-prose] *)):after{content:none}.prose :where(table):not(:where([class~=not-prose],[class~=not-prose] *)){table-layout:auto;width:100%;margin-top:2em;margin-bottom:2em;font-size:.875em;line-height:1.71429}.prose :where(thead):not(:where([class~=not-prose],[class~=not-prose] *)){border-bottom-width:1px;border-bottom-color:var(--tw-prose-th-borders)}.prose :where(thead th):not(:where([class~=not-prose],[class~=not-prose] *)){color:var(--tw-prose-headings);vertical-align:bottom;padding-inline-end:.571429em;padding-bottom:.571429em;padding-inline-start:.571429em;font-weight:600}.prose :where(tbody tr):not(:where([class~=not-prose],[class~=not-prose] *)){border-bottom-width:1px;border-bottom-color:var(--tw-prose-td-borders)}.prose :where(tbody tr:last-child):not(:where([class~=not-prose],[class~=not-prose] *)){border-bottom-width:0}.prose :where(tbody td):not(:where([class~=not-prose],[class~=not-prose] *)){vertical-align:baseline}.prose :where(tfoot):not(:where([class~=not-prose],[class~=not-prose] *)){border-top-width:1px;border-top-color:var(--tw-prose-th-borders)}.prose :where(tfoot td):not(:where([class~=not-prose],[class~=not-prose] *)){vertical-align:top}.prose :where(th,td):not(:where([class~=not-prose],[class~=not-prose] *)){text-align:start}.prose :where(figure>*):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:0;margin-bottom:0}.prose :where(figcaption):not(:where([class~=not-prose],[class~=not-prose] *)){color:var(--tw-prose-captions);margin-top:.857143em;font-size:.875em;line-height:1.42857}.prose{--tw-prose-body:oklch(37.3% .034 259.733);--tw-prose-headings:oklch(21% .034 264.665);--tw-prose-lead:oklch(44.6% .03 256.802);--tw-prose-links:oklch(21% .034 264.665);--tw-prose-bold:oklch(21% .034 264.665);--tw-prose-counters:oklch(55.1% .027 264.364);--tw-prose-bullets:oklch(87.2% .01 258.338);--tw-prose-hr:oklch(92.8% .006 264.531);--tw-prose-quotes:oklch(21% .034 264.665);--tw-prose-quote-borders:oklch(92.8% .006 264.531);--tw-prose-captions:oklch(55.1% .027 264.364);--tw-prose-kbd:oklch(21% .034 264.665);--tw-prose-kbd-shadows:oklab(21% -.00316127 -.0338527/.1);--tw-prose-code:oklch(21% .034 264.665);--tw-prose-pre-code:oklch(92.8% .006 264.531);--tw-prose-pre-bg:oklch(27.8% .033 256.848);--tw-prose-th-borders:oklch(87.2% .01 258.338);--tw-prose-td-borders:oklch(92.8% .006 264.531);--tw-prose-invert-body:oklch(87.2% .01 258.338);--tw-prose-invert-headings:#fff;--tw-prose-invert-lead:oklch(70.7% .022 261.325);--tw-prose-invert-links:#fff;--tw-prose-invert-bold:#fff;--tw-prose-invert-counters:oklch(70.7% .022 261.325);--tw-prose-invert-bullets:oklch(44.6% .03 256.802);--tw-prose-invert-hr:oklch(37.3% .034 259.733);--tw-prose-invert-quotes:oklch(96.7% .003 264.542);--tw-prose-invert-quote-borders:oklch(37.3% .034 259.733);--tw-prose-invert-captions:oklch(70.7% .022 261.325);--tw-prose-invert-kbd:#fff;--tw-prose-invert-kbd-shadows:#ffffff1a;--tw-prose-invert-code:#fff;--tw-prose-invert-pre-code:oklch(87.2% .01 258.338);--tw-prose-invert-pre-bg:#00000080;--tw-prose-invert-th-borders:oklch(44.6% .03 256.802);--tw-prose-invert-td-borders:oklch(37.3% .034 259.733);font-size:1rem;line-height:1.75}.prose :where(picture>img):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:0;margin-bottom:0}.prose :where(li):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:.5em;margin-bottom:.5em}.prose :where(ol>li):not(:where([class~=not-prose],[class~=not-prose] *)),.prose :where(ul>li):not(:where([class~=not-prose],[class~=not-prose] *)){padding-inline-start:.375em}.prose :where(.prose>ul>li p):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:.75em;margin-bottom:.75em}.prose :where(.prose>ul>li>p:first-child):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.25em}.prose :where(.prose>ul>li>p:last-child):not(:where([class~=not-prose],[class~=not-prose] *)){margin-bottom:1.25em}.prose :where(.prose>ol>li>p:first-child):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.25em}.prose :where(.prose>ol>li>p:last-child):not(:where([class~=not-prose],[class~=not-prose] *)){margin-bottom:1.25em}.prose :where(ul ul,ul ol,ol ul,ol ol):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:.75em;margin-bottom:.75em}.prose :where(dl):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.25em;margin-bottom:1.25em}.prose :where(dd):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:.5em;padding-inline-start:1.625em}.prose :where(hr+*):not(:where([class~=not-prose],[class~=not-prose] *)),.prose :where(h2+*):not(:where([class~=not-prose],[class~=not-prose] *)),.prose :where(h3+*):not(:where([class~=not-prose],[class~=not-prose] *)),.prose :where(h4+*):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:0}.prose :where(thead th:first-child):not(:where([class~=not-prose],[class~=not-prose] *)){padding-inline-start:0}.prose :where(thead th:last-child):not(:where([class~=not-prose],[class~=not-prose] *)){padding-inline-end:0}.prose :where(tbody td,tfoot td):not(:where([class~=not-prose],[class~=not-prose] *)){padding-top:.571429em;padding-inline-end:.571429em;padding-bottom:.571429em;padding-inline-start:.571429em}.prose :where(tbody td:first-child,tfoot td:first-child):not(:where([class~=not-prose],[class~=not-prose] *)){padding-inline-start:0}.prose :where(tbody td:last-child,tfoot td:last-child):not(:where([class~=not-prose],[class~=not-prose] *)){padding-inline-end:0}.prose :where(figure):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:2em;margin-bottom:2em}.prose :where(.prose>:first-child):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:0}.prose :where(.prose>:last-child):not(:where([class~=not-prose],[class~=not-prose] *)){margin-bottom:0}.prose-sm{font-size:.875rem;line-height:1.71429}.prose-sm :where(p):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.14286em;margin-bottom:1.14286em}.prose-sm :where([class~=lead]):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:.888889em;margin-bottom:.888889em;font-size:1.28571em;line-height:1.55556}.prose-sm :where(blockquote):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.33333em;margin-bottom:1.33333em;padding-inline-start:1.11111em}.prose-sm :where(h1):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:0;margin-bottom:.8em;font-size:2.14286em;line-height:1.2}.prose-sm :where(h2):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.6em;margin-bottom:.8em;font-size:1.42857em;line-height:1.4}.prose-sm :where(h3):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.55556em;margin-bottom:.444444em;font-size:1.28571em;line-height:1.55556}.prose-sm :where(h4):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.42857em;margin-bottom:.571429em;line-height:1.42857}.prose-sm :where(img):not(:where([class~=not-prose],[class~=not-prose] *)),.prose-sm :where(picture):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.71429em;margin-bottom:1.71429em}.prose-sm :where(picture>img):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:0;margin-bottom:0}.prose-sm :where(video):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.71429em;margin-bottom:1.71429em}.prose-sm :where(kbd):not(:where([class~=not-prose],[class~=not-prose] *)){padding-top:.142857em;padding-inline-end:.357143em;padding-bottom:.142857em;border-radius:.3125rem;padding-inline-start:.357143em;font-size:.857143em}.prose-sm :where(code):not(:where([class~=not-prose],[class~=not-prose] *)){font-size:.857143em}.prose-sm :where(h2 code):not(:where([class~=not-prose],[class~=not-prose] *)){font-size:.9em}.prose-sm :where(h3 code):not(:where([class~=not-prose],[class~=not-prose] *)){font-size:.888889em}.prose-sm :where(pre):not(:where([class~=not-prose],[class~=not-prose] *)){padding-top:.666667em;padding-inline-end:1em;padding-bottom:.666667em;border-radius:.25rem;margin-top:1.66667em;margin-bottom:1.66667em;padding-inline-start:1em;font-size:.857143em;line-height:1.66667}.prose-sm :where(ol):not(:where([class~=not-prose],[class~=not-prose] *)),.prose-sm :where(ul):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.14286em;margin-bottom:1.14286em;padding-inline-start:1.57143em}.prose-sm :where(li):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:.285714em;margin-bottom:.285714em}.prose-sm :where(ol>li):not(:where([class~=not-prose],[class~=not-prose] *)),.prose-sm :where(ul>li):not(:where([class~=not-prose],[class~=not-prose] *)){padding-inline-start:.428571em}.prose-sm :where(.prose-sm>ul>li p):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:.571429em;margin-bottom:.571429em}.prose-sm :where(.prose-sm>ul>li>p:first-child):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.14286em}.prose-sm :where(.prose-sm>ul>li>p:last-child):not(:where([class~=not-prose],[class~=not-prose] *)){margin-bottom:1.14286em}.prose-sm :where(.prose-sm>ol>li>p:first-child):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.14286em}.prose-sm :where(.prose-sm>ol>li>p:last-child):not(:where([class~=not-prose],[class~=not-prose] *)){margin-bottom:1.14286em}.prose-sm :where(ul ul,ul ol,ol ul,ol ol):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:.571429em;margin-bottom:.571429em}.prose-sm :where(dl):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.14286em;margin-bottom:1.14286em}.prose-sm :where(dt):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.14286em}.prose-sm :where(dd):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:.285714em;padding-inline-start:1.57143em}.prose-sm :where(hr):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:2.85714em;margin-bottom:2.85714em}.prose-sm :where(hr+*):not(:where([class~=not-prose],[class~=not-prose] *)),.prose-sm :where(h2+*):not(:where([class~=not-prose],[class~=not-prose] *)),.prose-sm :where(h3+*):not(:where([class~=not-prose],[class~=not-prose] *)),.prose-sm :where(h4+*):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:0}.prose-sm :where(table):not(:where([class~=not-prose],[class~=not-prose] *)){font-size:.857143em;line-height:1.5}.prose-sm :where(thead th):not(:where([class~=not-prose],[class~=not-prose] *)){padding-inline-end:1em;padding-bottom:.666667em;padding-inline-start:1em}.prose-sm :where(thead th:first-child):not(:where([class~=not-prose],[class~=not-prose] *)){padding-inline-start:0}.prose-sm :where(thead th:last-child):not(:where([class~=not-prose],[class~=not-prose] *)){padding-inline-end:0}.prose-sm :where(tbody td,tfoot td):not(:where([class~=not-prose],[class~=not-prose] *)){padding-top:.666667em;padding-inline-end:1em;padding-bottom:.666667em;padding-inline-start:1em}.prose-sm :where(tbody td:first-child,tfoot td:first-child):not(:where([class~=not-prose],[class~=not-prose] *)){padding-inline-start:0}.prose-sm :where(tbody td:last-child,tfoot td:last-child):not(:where([class~=not-prose],[class~=not-prose] *)){padding-inline-end:0}.prose-sm :where(figure):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:1.71429em;margin-bottom:1.71429em}.prose-sm :where(figure>*):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:0;margin-bottom:0}.prose-sm :where(figcaption):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:.666667em;font-size:.857143em;line-height:1.33333}.prose-sm :where(.prose-sm>:first-child):not(:where([class~=not-prose],[class~=not-prose] *)){margin-top:0}.prose-sm :where(.prose-sm>:last-child):not(:where([class~=not-prose],[class~=not-prose] *)){margin-bottom:0}.mt-1{margin-top:var(--spacing)}.mt-1\\.5{margin-top:calc(var(--spacing) * 1.5)}.mt-2{margin-top:calc(var(--spacing) * 2)}.mt-2\\.5{margin-top:calc(var(--spacing) * 2.5)}.mt-3{margin-top:calc(var(--spacing) * 3)}.mb-1{margin-bottom:var(--spacing)}.mb-1\\.5{margin-bottom:calc(var(--spacing) * 1.5)}.mb-2{margin-bottom:calc(var(--spacing) * 2)}.mb-3{margin-bottom:calc(var(--spacing) * 3)}.mb-4{margin-bottom:calc(var(--spacing) * 4)}.mb-5{margin-bottom:calc(var(--spacing) * 5)}.mb-8{margin-bottom:calc(var(--spacing) * 8)}.ml-2{margin-left:calc(var(--spacing) * 2)}.ml-auto{margin-left:auto}.block{display:block}.flex{display:flex}.grid{display:grid}.hidden{display:none}.inline{display:inline}.inline-flex{display:inline-flex}.\\!h-6{height:calc(var(--spacing) * 6)!important}.h-3{height:calc(var(--spacing) * 3)}.h-4{height:calc(var(--spacing) * 4)}.h-5{height:calc(var(--spacing) * 5)}.h-8{height:calc(var(--spacing) * 8)}.h-9{height:calc(var(--spacing) * 9)}.h-20{height:calc(var(--spacing) * 20)}.h-\\[18px\\]{height:18px}.h-full{height:100%}.max-h-56{max-height:calc(var(--spacing) * 56)}.\\!w-6{width:calc(var(--spacing) * 6)!important}.w-1\\/4{width:25%}.w-3\\/4{width:75%}.w-4{width:calc(var(--spacing) * 4)}.w-8{width:calc(var(--spacing) * 8)}.w-9{width:calc(var(--spacing) * 9)}.w-16{width:calc(var(--spacing) * 16)}.w-80{width:calc(var(--spacing) * 80)}.w-\\[18px\\]{width:18px}.w-full{width:100%}.w-px{width:1px}.max-w-\\[calc\\(100vw-4rem\\)\\]{max-width:calc(100vw - 4rem)}.max-w-none{max-width:none}.min-w-0{min-width:0}.min-w-6{min-width:calc(var(--spacing) * 6)}.flex-1{flex:1}.shrink-0{flex-shrink:0}.animate-pulse{animation:var(--animate-pulse)}.cursor-pointer{cursor:pointer}.resize-y{resize:vertical}.grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.flex-wrap{flex-wrap:wrap}.items-baseline{align-items:baseline}.items-center{align-items:center}.justify-between{justify-content:space-between}.justify-center{justify-content:center}.justify-end{justify-content:flex-end}.gap-0\\.5{gap:calc(var(--spacing) * .5)}.gap-1{gap:var(--spacing)}.gap-1\\.5{gap:calc(var(--spacing) * 1.5)}.gap-2{gap:calc(var(--spacing) * 2)}.gap-3{gap:calc(var(--spacing) * 3)}:where(.space-y-2>:not(:last-child)){--tw-space-y-reverse:0;margin-block-start:calc(calc(var(--spacing) * 2) * var(--tw-space-y-reverse));margin-block-end:calc(calc(var(--spacing) * 2) * calc(1 - var(--tw-space-y-reverse)))}:where(.space-y-3>:not(:last-child)){--tw-space-y-reverse:0;margin-block-start:calc(calc(var(--spacing) * 3) * var(--tw-space-y-reverse));margin-block-end:calc(calc(var(--spacing) * 3) * calc(1 - var(--tw-space-y-reverse)))}:where(.space-y-5>:not(:last-child)){--tw-space-y-reverse:0;margin-block-start:calc(calc(var(--spacing) * 5) * var(--tw-space-y-reverse));margin-block-end:calc(calc(var(--spacing) * 5) * calc(1 - var(--tw-space-y-reverse)))}.gap-x-2{column-gap:calc(var(--spacing) * 2)}.gap-y-0\\.5{row-gap:calc(var(--spacing) * .5)}.overflow-hidden{overflow:hidden}.overflow-y-auto{overflow-y:auto}.rounded-2xl{border-radius:var(--radius-2xl)}.rounded-full{border-radius:var(--radius-full)}.rounded-lg{border-radius:var(--radius-lg)}.rounded-md{border-radius:var(--radius-md)}.rounded-xl{border-radius:var(--radius-xl)}.border{border-style:var(--tw-border-style);border-width:1px}.border-0{border-style:var(--tw-border-style);border-width:0}.border-b{border-bottom-style:var(--tw-border-style);border-bottom-width:1px}.border-dashed{--tw-border-style:dashed;border-style:dashed}.border-koe-border{border-color:var(--color-koe-border)}.border-koe-border-strong{border-color:var(--color-koe-border-strong)}.border-koe-danger-border{border-color:var(--color-koe-danger-border)}.bg-koe-border{background-color:var(--color-koe-border)}.bg-koe-danger{background-color:var(--color-koe-danger)}.bg-koe-danger-soft{background-color:var(--color-koe-danger-soft)}.bg-koe-skeleton{background-color:var(--color-koe-skeleton)}.bg-koe-surface{background-color:var(--color-koe-surface)}.bg-koe-surface-muted{background-color:var(--color-koe-surface-muted)}.bg-koe-surface-strong{background-color:var(--color-koe-surface-strong)}.bg-koe-surface-sunken{background-color:var(--color-koe-surface-sunken)}.bg-transparent{background-color:#0000}.bg-gradient-to-br{--tw-gradient-position:to bottom right in oklab;background-image:linear-gradient(var(--tw-gradient-stops))}.bg-gradient-to-r{--tw-gradient-position:to right in oklab;background-image:linear-gradient(var(--tw-gradient-stops))}.from-koe-gif-from{--tw-gradient-from:var(--color-koe-gif-from);--tw-gradient-stops:var(--tw-gradient-via-stops,var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-to) var(--tw-gradient-to-position))}.from-koe-surface-muted{--tw-gradient-from:var(--color-koe-surface-muted);--tw-gradient-stops:var(--tw-gradient-via-stops,var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-to) var(--tw-gradient-to-position))}.to-koe-gif-to{--tw-gradient-to:var(--color-koe-gif-to);--tw-gradient-stops:var(--tw-gradient-via-stops,var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-to) var(--tw-gradient-to-position))}.to-koe-skeleton{--tw-gradient-to:var(--color-koe-skeleton);--tw-gradient-stops:var(--tw-gradient-via-stops,var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-to) var(--tw-gradient-to-position))}.object-cover{object-fit:cover}.p-1\\.5{padding:calc(var(--spacing) * 1.5)}.p-3{padding:calc(var(--spacing) * 3)}.px-1\\.5{padding-inline:calc(var(--spacing) * 1.5)}.px-2{padding-inline:calc(var(--spacing) * 2)}.px-2\\.5{padding-inline:calc(var(--spacing) * 2.5)}.px-3{padding-inline:calc(var(--spacing) * 3)}.px-4{padding-inline:calc(var(--spacing) * 4)}.px-6{padding-inline:calc(var(--spacing) * 6)}.py-0\\.5{padding-block:calc(var(--spacing) * .5)}.py-1{padding-block:var(--spacing)}.py-1\\.5{padding-block:calc(var(--spacing) * 1.5)}.py-2{padding-block:calc(var(--spacing) * 2)}.py-3{padding-block:calc(var(--spacing) * 3)}.py-6{padding-block:calc(var(--spacing) * 6)}.py-12{padding-block:calc(var(--spacing) * 12)}.pt-1{padding-top:var(--spacing)}.pb-3{padding-bottom:calc(var(--spacing) * 3)}.pl-4{padding-left:calc(var(--spacing) * 4)}.text-center{text-align:center}.font-mono{font-family:var(--font-mono)}.font-sans{font-family:var(--font-sans)}.font-serif{font-family:var(--font-serif)}.text-3xl{font-size:var(--text-3xl);line-height:var(--tw-leading,var(--text-3xl--line-height))}.text-base{font-size:var(--text-base);line-height:var(--tw-leading,var(--text-base--line-height))}.text-lg{font-size:var(--text-lg);line-height:var(--tw-leading,var(--text-lg--line-height))}.text-sm{font-size:var(--text-sm);line-height:var(--tw-leading,var(--text-sm--line-height))}.text-xl{font-size:var(--text-xl);line-height:var(--tw-leading,var(--text-xl--line-height))}.text-xs{font-size:var(--text-xs);line-height:var(--tw-leading,var(--text-xs--line-height))}.text-\\[10px\\]{font-size:10px}.leading-none{--tw-leading:1;line-height:1}.leading-relaxed{--tw-leading:var(--leading-relaxed);line-height:var(--leading-relaxed)}.font-bold{--tw-font-weight:var(--font-weight-bold);font-weight:var(--font-weight-bold)}.font-extrabold{--tw-font-weight:var(--font-weight-extrabold);font-weight:var(--font-weight-extrabold)}.font-medium{--tw-font-weight:var(--font-weight-medium);font-weight:var(--font-weight-medium)}.font-semibold{--tw-font-weight:var(--font-weight-semibold);font-weight:var(--font-weight-semibold)}.tracking-tight{--tw-tracking:var(--tracking-tight);letter-spacing:var(--tracking-tight)}.tracking-wide{--tw-tracking:var(--tracking-wide);letter-spacing:var(--tracking-wide)}.text-koe-accent-contrast{color:var(--color-koe-accent-contrast)}.text-koe-border-strong{color:var(--color-koe-border-strong)}.text-koe-danger{color:var(--color-koe-danger)}.text-koe-danger-contrast{color:var(--color-koe-danger-contrast)}.text-koe-text{color:var(--color-koe-text)}.text-koe-text-inverse{color:var(--color-koe-text-inverse)}.text-koe-text-muted{color:var(--color-koe-text-muted)}.text-koe-text-subtle{color:var(--color-koe-text-subtle)}.uppercase{text-transform:uppercase}.italic{font-style:italic}.tabular-nums{--tw-numeric-spacing:tabular-nums;font-variant-numeric:var(--tw-ordinal,) var(--tw-slashed-zero,) var(--tw-numeric-figure,) var(--tw-numeric-spacing,) var(--tw-numeric-fraction,)}.line-through{text-decoration-line:line-through}.antialiased{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}.shadow-lg{--tw-shadow:0 10px 15px -3px var(--tw-shadow-color,#0000001a), 0 4px 6px -4px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.shadow-sm{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,#0000001a), 0 1px 2px -1px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.shadow-xl{--tw-shadow:0 20px 25px -5px var(--tw-shadow-color,#0000001a), 0 8px 10px -6px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.ring-4{--tw-ring-shadow:var(--tw-ring-inset,) 0 0 0 calc(4px + var(--tw-ring-offset-width)) var(--tw-ring-color,currentcolor);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.ring-\\[var\\(--koe-focus-ring\\)\\]{--tw-ring-color:var(--koe-focus-ring)}.backdrop-blur-sm{--tw-backdrop-blur:blur(var(--blur-sm));-webkit-backdrop-filter:var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,) var(--tw-backdrop-contrast,) var(--tw-backdrop-grayscale,) var(--tw-backdrop-hue-rotate,) var(--tw-backdrop-invert,) var(--tw-backdrop-opacity,) var(--tw-backdrop-saturate,) var(--tw-backdrop-sepia,);backdrop-filter:var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,) var(--tw-backdrop-contrast,) var(--tw-backdrop-grayscale,) var(--tw-backdrop-hue-rotate,) var(--tw-backdrop-invert,) var(--tw-backdrop-opacity,) var(--tw-backdrop-saturate,) var(--tw-backdrop-sepia,)}.transition-all{transition-property:all;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-colors{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-opacity{transition-property:opacity;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.duration-200{--tw-duration:.2s;transition-duration:.2s}.select-none{-webkit-user-select:none;user-select:none}.placeholder\\:text-koe-text-subtle::placeholder{color:var(--color-koe-text-subtle)}@media (hover:hover){.hover\\:rotate-12:hover{rotate:12deg}.hover\\:border-koe-border-strong:hover{border-color:var(--color-koe-border-strong)}.hover\\:bg-koe-surface-sunken:hover{background-color:var(--color-koe-surface-sunken)}.hover\\:text-koe-accent:hover{color:var(--color-koe-accent)}.hover\\:text-koe-danger:hover{color:var(--color-koe-danger)}.hover\\:text-koe-text:hover{color:var(--color-koe-text)}.hover\\:text-koe-text-muted:hover{color:var(--color-koe-text-muted)}.hover\\:opacity-75:hover{opacity:.75}.hover\\:opacity-90:hover{opacity:.9}}.focus\\:border-koe-accent:focus{border-color:var(--color-koe-accent)}.focus\\:border-koe-border-strong:focus{border-color:var(--color-koe-border-strong)}.focus\\:outline-none:focus{--tw-outline-style:none;outline-style:none}.focus-visible\\:ring-2:focus-visible{--tw-ring-shadow:var(--tw-ring-inset,) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color,currentcolor);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.focus-visible\\:ring-koe-accent-soft:focus-visible{--tw-ring-color:var(--color-koe-accent-soft)}.focus-visible\\:ring-koe-danger-soft:focus-visible{--tw-ring-color:var(--color-koe-danger-soft)}.disabled\\:cursor-not-allowed:disabled{cursor:not-allowed}.disabled\\:opacity-40:disabled{opacity:.4}.disabled\\:opacity-50:disabled{opacity:.5}.disabled\\:opacity-60:disabled{opacity:.6}@media (min-width:40rem){.sm\\:inline{display:inline}}}@keyframes koe-pop{0%{opacity:0;transform:translateY(4px)scale(.98)}to{opacity:1;transform:none}}.pop-in{animation:.15s ease-out koe-pop}.vote-button.active.up{color:var(--koe-accent);background-color:var(--koe-accent-soft)}.vote-button.active.down{color:var(--koe-danger);background-color:var(--koe-danger-soft)}.reaction-button.active{color:var(--koe-accent);border-color:var(--koe-accent);background-color:var(--koe-accent-soft);font-weight:600}.reaction-button.active .reaction-count{color:var(--koe-accent)}.comment-body{white-space:pre-wrap;word-break:break-word;--tw-prose-body:var(--koe-text);--tw-prose-headings:var(--koe-text);--tw-prose-lead:var(--koe-text-muted);--tw-prose-links:var(--koe-accent);--tw-prose-bold:var(--koe-text);--tw-prose-counters:var(--koe-text-muted);--tw-prose-bullets:var(--koe-border-strong);--tw-prose-hr:var(--koe-border);--tw-prose-quotes:var(--koe-text-muted);--tw-prose-quote-borders:var(--koe-border);--tw-prose-captions:var(--koe-text-muted);--tw-prose-code:var(--koe-text);--tw-prose-pre-code:var(--koe-text);--tw-prose-pre-bg:var(--koe-surface-sunken);--tw-prose-th-borders:var(--koe-border);--tw-prose-td-borders:var(--koe-border)}@property --tw-space-y-reverse{syntax:"*";inherits:false;initial-value:0}@property --tw-border-style{syntax:"*";inherits:false;initial-value:solid}@property --tw-gradient-position{syntax:"*";inherits:false}@property --tw-gradient-from{syntax:"<color>";inherits:false;initial-value:#0000}@property --tw-gradient-via{syntax:"<color>";inherits:false;initial-value:#0000}@property --tw-gradient-to{syntax:"<color>";inherits:false;initial-value:#0000}@property --tw-gradient-stops{syntax:"*";inherits:false}@property --tw-gradient-via-stops{syntax:"*";inherits:false}@property --tw-gradient-from-position{syntax:"<length-percentage>";inherits:false;initial-value:0%}@property --tw-gradient-via-position{syntax:"<length-percentage>";inherits:false;initial-value:50%}@property --tw-gradient-to-position{syntax:"<length-percentage>";inherits:false;initial-value:100%}@property --tw-leading{syntax:"*";inherits:false}@property --tw-font-weight{syntax:"*";inherits:false}@property --tw-tracking{syntax:"*";inherits:false}@property --tw-ordinal{syntax:"*";inherits:false}@property --tw-slashed-zero{syntax:"*";inherits:false}@property --tw-numeric-figure{syntax:"*";inherits:false}@property --tw-numeric-spacing{syntax:"*";inherits:false}@property --tw-numeric-fraction{syntax:"*";inherits:false}@property --tw-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-shadow-color{syntax:"*";inherits:false}@property --tw-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-inset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-shadow-color{syntax:"*";inherits:false}@property --tw-inset-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-ring-color{syntax:"*";inherits:false}@property --tw-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-ring-color{syntax:"*";inherits:false}@property --tw-inset-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-ring-inset{syntax:"*";inherits:false}@property --tw-ring-offset-width{syntax:"<length>";inherits:false;initial-value:0}@property --tw-ring-offset-color{syntax:"*";inherits:false;initial-value:#fff}@property --tw-ring-offset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-backdrop-blur{syntax:"*";inherits:false}@property --tw-backdrop-brightness{syntax:"*";inherits:false}@property --tw-backdrop-contrast{syntax:"*";inherits:false}@property --tw-backdrop-grayscale{syntax:"*";inherits:false}@property --tw-backdrop-hue-rotate{syntax:"*";inherits:false}@property --tw-backdrop-invert{syntax:"*";inherits:false}@property --tw-backdrop-opacity{syntax:"*";inherits:false}@property --tw-backdrop-saturate{syntax:"*";inherits:false}@property --tw-backdrop-sepia{syntax:"*";inherits:false}@property --tw-duration{syntax:"*";inherits:false}@keyframes pulse{50%{opacity:.5}}
`;

// ../../packages/widget/src/session.ts
var ACCESS_TOKEN_KEY = "koe_access_token";
var AUTH_EXPIRED_EVENT = "koe-auth-expired";
async function ensureGuestSession(client, storage) {
  const stored = storage.getItem(ACCESS_TOKEN_KEY);
  if (stored) {
    try {
      await client.auth.me(stored);
      return stored;
    } catch {
      storage.removeItem(ACCESS_TOKEN_KEY);
    }
  }
  const response = await client.auth.anonymous();
  storage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
  return response.accessToken;
}
function emitAuthExpired(target, threadRef) {
  target.dispatchEvent(
    new CustomEvent(AUTH_EXPIRED_EVENT, {
      detail: { threadRef },
      bubbles: true,
      composed: true
    })
  );
}
async function runWithAuthRetry(operation, onUnauthorized) {
  try {
    return await operation();
  } catch (err) {
    if (err instanceof KoeApiError && err.status === 401) {
      const shouldRetry = await onUnauthorized();
      if (shouldRetry) {
        return await operation();
      }
    }
    throw err;
  }
}
function createAuthSession(options) {
  let accessToken = "";
  async function resolve() {
    const hostToken = options.hostToken();
    if (hostToken) {
      accessToken = hostToken;
      try {
        await options.client.auth.me(hostToken);
      } catch (err) {
        if (err instanceof KoeApiError && err.status === 401) {
          options.onExpired();
        }
        throw err;
      }
      return;
    }
    accessToken = await ensureGuestSession(options.client, options.storage);
  }
  async function runWithRetry(operation) {
    return runWithAuthRetry(operation, async () => {
      if (options.hostToken()) {
        options.onExpired();
        return false;
      }
      options.storage.removeItem(ACCESS_TOKEN_KEY);
      accessToken = "";
      await resolve();
      return true;
    });
  }
  return {
    get accessToken() {
      return accessToken;
    },
    resolve,
    runWithRetry
  };
}

// ../../packages/widget/src/koe-comments.ts
var COMPOSER_SCOPE = "composer";
var MAX_VISIBLE_REACTIONS = 3;
var AVATAR_EMOJIS = [
  "\u{1F98A}",
  "\u{1F43C}",
  "\u{1F428}",
  "\u{1F981}",
  "\u{1F438}",
  "\u{1F419}",
  "\u{1F989}",
  "\u{1F42F}",
  "\u{1F435}",
  "\u{1F430}",
  "\u{1F439}",
  "\u{1F433}",
  "\u{1F422}",
  "\u{1F427}",
  "\u{1F984}",
  "\u{1F41D}"
];
function hashString(value) {
  let hash = 0;
  for (let i6 = 0; i6 < value.length; i6++) {
    hash = hash * 31 + value.charCodeAt(i6) >>> 0;
  }
  return hash;
}
function avatarEmoji(id) {
  return AVATAR_EMOJIS[hashString(id) % AVATAR_EMOJIS.length];
}
function formatRelativeTime(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1e3);
  if (seconds < 45) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return date.toLocaleDateString(void 0, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
var ICON_PATHS = {
  quote: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z",
  code: "M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5",
  link: "M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244",
  image: "m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Zm10.5-11.25h.008v.008H16.5V9Z",
  upload: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 7.5m0 0L7.5 12m4.5-4.5V21",
  smile: "M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.25 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Z",
  chevronUp: "m4.5 15.75 7.5-7.5 7.5 7.5",
  chevronDown: "m19.5 8.25-7.5 7.5-7.5-7.5",
  reply: "M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 6 6v3",
  sun: "M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z",
  moon: "M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z",
  close: "M6 18 18 6M6 6l12 12",
  alert: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
  flag: "M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"
};
var KoeComments = class extends i4 {
  constructor() {
    super(...arguments);
    this.baseUrl = "";
    this.apiBase = "";
    this.threadRef = "";
    this.reactionEmojis = "";
    this.gifApiKey = "";
    this.mediaApiKey = "";
    this.token = "";
    this.theme = "light";
    this.showThemeToggle = false;
    this.comments = [];
    this.threadId = "";
    this.loading = true;
    this.submitting = false;
    this.submittingReply = false;
    this.voting = false;
    this.reacting = false;
    this.draft = "";
    this.replyDraft = "";
    this.replyTo = null;
    this.expandedReactions = /* @__PURE__ */ new Set();
    this.collapsedThreads = /* @__PURE__ */ new Set();
    this.openReactionPicker = null;
    this.error = "";
    this.activeScope = null;
    this.openGifPicker = null;
    this.gifQuery = "";
    this.gifResults = [];
    this.gifLoading = false;
    this.gifError = "";
    this.gifUrl = "";
    this.uploadingScope = null;
    this.openReportPicker = null;
    this.reportReason = "";
    this.reporting = false;
    this.reportedComments = /* @__PURE__ */ new Set();
    this.client = null;
    this.auth = null;
    this.mediaProvider = null;
    this.gifAbort = null;
  }
  get emojis() {
    return this.reactionEmojis ? this.reactionEmojis.split(",").map((emoji) => emoji.trim()).filter(Boolean) : DEFAULT_EMOJI_ALLOWLIST;
  }
  connectedCallback() {
    super.connectedCallback();
    if (this.threadRef) {
      const effectiveBaseUrl = this.baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
      this.client = createKoeClient({
        baseUrl: effectiveBaseUrl,
        apiPrefix: this.apiBase
      });
      this.auth = createAuthSession({
        client: this.client,
        storage: localStorage,
        hostToken: () => this.token,
        onExpired: () => emitAuthExpired(this, this.threadRef)
      });
      if (this.hasUpdated) {
        void this.loadThread();
      }
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearTimeout(this.gifDebounce);
    this.gifAbort?.abort();
  }
  firstUpdated() {
    if (this.client) {
      void this.loadThread();
    }
  }
  willUpdate(changed) {
    if (changed.has("mediaApiKey")) {
      this.mediaProvider = this.mediaApiKey ? createImgbbMediaProvider({ apiKey: this.mediaApiKey }) : null;
    }
    if (this.hasUpdated && changed.has("token")) {
      void this.loadThread();
    }
  }
  toggleTheme() {
    this.theme = this.theme === "dark" ? "light" : "dark";
  }
  setMediaProvider(provider) {
    this.mediaProvider = provider;
    this.requestUpdate();
  }
  async loadThread() {
    this.loading = true;
    this.error = "";
    try {
      await this.auth.resolve();
      const thread = await this.client.threads.getByRef(
        this.threadRef,
        void 0,
        this.auth.accessToken
      );
      this.threadId = thread.id;
      await this.reloadComments();
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to load comments";
    } finally {
      this.loading = false;
    }
  }
  async reloadComments() {
    if (!this.threadId) {
      return;
    }
    const list = await this.client.comments.list(
      this.threadId,
      void 0,
      this.auth.accessToken
    );
    this.comments = list.comments;
  }
  countAll(comments) {
    return comments.reduce((sum, c4) => sum + 1 + this.countAll(c4.children), 0);
  }
  draftFor(scope) {
    return scope === COMPOSER_SCOPE ? this.draft : this.replyDraft;
  }
  setDraft(scope, value) {
    if (scope === COMPOSER_SCOPE) {
      this.draft = value;
    } else {
      this.replyDraft = value;
    }
  }
  textareaFor(scope) {
    return this.renderRoot.querySelector(
      `textarea[data-scope="${scope}"]`
    );
  }
  handleComposerFocus(scope) {
    this.activeScope = scope;
  }
  handleComposerBlur(e7) {
    const next = e7.relatedTarget;
    if (next && this.renderRoot.contains(next)) {
      return;
    }
    const scope = this.activeScope;
    if (scope && !this.draftFor(scope).trim() && this.openGifPicker !== scope && this.uploadingScope !== scope) {
      this.activeScope = null;
    }
  }
  isActive(scope) {
    return this.activeScope === scope || this.draftFor(scope).trim() !== "" || this.openGifPicker === scope || this.uploadingScope === scope;
  }
  async wrapSelection(scope, prefix, suffix, placeholder) {
    const textarea = this.textareaFor(scope);
    if (!textarea) {
      return;
    }
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const selected = textarea.value.slice(start, end);
    const inner = selected || placeholder;
    const inserted = prefix + inner + suffix;
    this.setDraft(
      scope,
      textarea.value.slice(0, start) + inserted + textarea.value.slice(end)
    );
    await this.updateComplete;
    const updated = this.textareaFor(scope);
    if (!updated) {
      return;
    }
    updated.focus();
    updated.setSelectionRange(start + prefix.length, start + prefix.length + inner.length);
  }
  async insertLink(scope) {
    const textarea = this.textareaFor(scope);
    if (!textarea) {
      return;
    }
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const selected = textarea.value.slice(start, end);
    const inner = selected || "text";
    const inserted = `[${inner}](url)`;
    this.setDraft(
      scope,
      textarea.value.slice(0, start) + inserted + textarea.value.slice(end)
    );
    await this.updateComplete;
    const updated = this.textareaFor(scope);
    if (!updated) {
      return;
    }
    const urlStart = start + inner.length + 3;
    updated.focus();
    updated.setSelectionRange(urlStart, urlStart + 3);
  }
  async insertText(scope, text) {
    const textarea = this.textareaFor(scope);
    if (!textarea) {
      return;
    }
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    this.setDraft(
      scope,
      textarea.value.slice(0, start) + text + textarea.value.slice(end)
    );
    await this.updateComplete;
    const updated = this.textareaFor(scope);
    if (!updated) {
      return;
    }
    updated.focus();
    updated.setSelectionRange(start + text.length, start + text.length);
  }
  openGifPickerFor(scope) {
    this.openGifPicker = scope;
    this.gifQuery = "";
    this.gifResults = [];
    this.gifError = "";
    this.gifUrl = "";
    if (this.gifApiKey) {
      void this.loadGifs("");
    }
  }
  closeGifPicker() {
    this.openGifPicker = null;
    this.gifQuery = "";
    this.gifResults = [];
    this.gifError = "";
    this.gifUrl = "";
  }
  async loadGifs(query) {
    if (!this.gifApiKey) {
      return;
    }
    this.gifAbort?.abort();
    const controller = new AbortController();
    this.gifAbort = controller;
    this.gifLoading = true;
    this.gifError = "";
    try {
      const params = new URLSearchParams({
        api_key: this.gifApiKey,
        limit: "12",
        rating: "pg"
      });
      const endpoint = query ? "https://api.giphy.com/v1/gifs/search" : "https://api.giphy.com/v1/gifs/trending";
      if (query) {
        params.set("q", query);
      }
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`Giphy request failed (${response.status})`);
      }
      const payload = await response.json();
      this.gifResults = (payload.data ?? []).map(
        (gif) => gif.images?.downsized_medium?.url ?? gif.images?.original?.url ?? ""
      ).filter(Boolean);
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      this.gifError = err instanceof Error ? err.message : "Failed to load GIFs";
    } finally {
      if (!controller.signal.aborted) {
        this.gifLoading = false;
      }
    }
  }
  handleGifSearchInput(value) {
    this.gifQuery = value;
    window.clearTimeout(this.gifDebounce);
    this.gifDebounce = window.setTimeout(() => {
      void this.loadGifs(value);
    }, 300);
  }
  async insertGif(scope, url) {
    await this.insertText(scope, `![image](${url})`);
    this.closeGifPicker();
  }
  async insertCustomGif(scope) {
    const url = this.gifUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      this.gifError = "Enter a valid http(s) image URL";
      return;
    }
    await this.insertGif(scope, url);
  }
  openMediaPicker(scope) {
    const input = Array.from(
      this.renderRoot.querySelectorAll(
        "input[data-media-scope]"
      )
    ).find((el) => el.dataset.mediaScope === scope);
    input?.click();
  }
  async handleMediaSelected(scope, e7) {
    const input = e7.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) {
      return;
    }
    await this.uploadAndInsert(scope, file);
  }
  imageFromClipboard(clipboard) {
    for (const item of Array.from(clipboard.items ?? [])) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          return file;
        }
      }
    }
    for (const file of Array.from(clipboard.files ?? [])) {
      if (file.type.startsWith("image/")) {
        return file;
      }
    }
    return null;
  }
  async handlePaste(scope, e7) {
    const clipboard = e7.clipboardData;
    if (!clipboard) {
      return;
    }
    const file = this.imageFromClipboard(clipboard);
    if (!file) {
      return;
    }
    e7.preventDefault();
    await this.uploadAndInsert(scope, file);
  }
  async uploadAndInsert(scope, file) {
    if (!this.mediaProvider) {
      this.error = "Image upload is not configured";
      return;
    }
    this.uploadingScope = scope;
    this.error = "";
    try {
      const { url } = await this.mediaProvider.upload(file);
      await this.insertText(scope, `![image](${url})`);
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to upload image";
    } finally {
      this.uploadingScope = null;
    }
  }
  handleInput(e7) {
    this.draft = e7.target.value;
  }
  handleReplyInput(e7) {
    this.replyDraft = e7.target.value;
  }
  async submitComment(body, parentId) {
    await this.auth.runWithRetry(
      () => this.client.comments.create(
        this.threadId,
        {
          bodyMd: body,
          ...parentId ? { parentId } : {}
        },
        this.auth.accessToken
      )
    );
    await this.reloadComments();
  }
  async handleSubmit(e7) {
    e7.preventDefault();
    const body = this.draft.trim();
    if (!body || !this.threadId || this.submitting) {
      return;
    }
    this.submitting = true;
    this.error = "";
    try {
      await this.submitComment(body);
      this.draft = "";
      if (this.openGifPicker === COMPOSER_SCOPE) {
        this.closeGifPicker();
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to post comment";
    } finally {
      this.submitting = false;
    }
  }
  async handleReplySubmit(e7) {
    e7.preventDefault();
    const body = this.replyDraft.trim();
    if (!body || !this.threadId || !this.replyTo || this.submittingReply) {
      return;
    }
    this.submittingReply = true;
    this.error = "";
    try {
      await this.submitComment(body, this.replyTo);
      this.replyDraft = "";
      this.replyTo = null;
      this.closeGifPicker();
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to post reply";
    } finally {
      this.submittingReply = false;
    }
  }
  startReply(commentId) {
    this.replyTo = commentId;
    this.replyDraft = "";
    this.openGifPicker = null;
  }
  cancelReply() {
    if (this.replyTo && this.openGifPicker === this.replyTo) {
      this.closeGifPicker();
    }
    this.replyTo = null;
    this.replyDraft = "";
  }
  emojiIndex(emoji) {
    const index = this.emojis.indexOf(emoji);
    return index === -1 ? this.emojis.length : index;
  }
  visibleReactions(comment) {
    return Object.entries(comment.reactionTotals ?? {}).filter(([, count]) => count > 0).sort(
      (a3, b3) => b3[1] - a3[1] || this.emojiIndex(a3[0]) - this.emojiIndex(b3[0])
    );
  }
  toggleThread(commentId) {
    const next = new Set(this.collapsedThreads);
    if (next.has(commentId)) {
      next.delete(commentId);
    } else {
      next.add(commentId);
    }
    this.collapsedThreads = next;
  }
  toggleReactions(commentId) {
    const next = new Set(this.expandedReactions);
    if (next.has(commentId)) {
      next.delete(commentId);
    } else {
      next.add(commentId);
    }
    this.expandedReactions = next;
  }
  toggleReactionPicker(commentId) {
    this.openReactionPicker = this.openReactionPicker === commentId ? null : commentId;
  }
  async voteComment(commentId, value) {
    if (!this.threadId || this.voting) {
      return;
    }
    this.voting = true;
    this.error = "";
    try {
      await this.auth.runWithRetry(
        () => this.client.comments.vote(commentId, value, this.auth.accessToken)
      );
      await this.reloadComments();
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to vote";
    } finally {
      this.voting = false;
    }
  }
  async reactToComment(commentId, emoji) {
    if (!this.threadId || this.reacting) {
      return;
    }
    this.reacting = true;
    this.error = "";
    try {
      await this.auth.runWithRetry(
        () => this.client.comments.react(commentId, emoji, this.auth.accessToken)
      );
      this.openReactionPicker = null;
      await this.reloadComments();
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to react";
    } finally {
      this.reacting = false;
    }
  }
  toggleReportPicker(commentId) {
    this.openReportPicker = this.openReportPicker === commentId ? null : commentId;
    this.reportReason = "";
  }
  closeReportPicker() {
    this.openReportPicker = null;
    this.reportReason = "";
  }
  async submitReport(commentId) {
    const reason = this.reportReason.trim();
    if (!reason || !this.threadId || this.reporting) {
      return;
    }
    this.reporting = true;
    this.error = "";
    try {
      await this.auth.runWithRetry(
        () => this.client.comments.report(commentId, reason, this.auth.accessToken)
      );
      const reported = new Set(this.reportedComments);
      reported.add(commentId);
      this.reportedComments = reported;
      this.closeReportPicker();
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to report comment";
    } finally {
      this.reporting = false;
    }
  }
  icon(path, extraClass = "") {
    return b2`<svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      class="h-4 w-4 ${extraClass}"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d=${path} />
    </svg>`;
  }
  avatar(seed, options = {}) {
    const { composer = false, url = null } = options;
    const emoji = composer ? "\u{1F642}" : avatarEmoji(seed);
    return b2`
      <div
        part="avatar"
        class="koe-avatar flex h-9 w-9 shrink-0 select-none items-center justify-center overflow-hidden rounded-full border border-koe-border bg-gradient-to-br from-koe-surface-muted to-koe-skeleton text-lg leading-none shadow-sm"
        aria-hidden="true"
      >
        ${url ? b2`<img
              src=${url}
              alt=""
              class="h-full w-full object-cover"
            />` : b2`<span>${emoji}</span>`}
      </div>
    `;
  }
  render() {
    const total = this.countAll(this.comments);
    return b2`
      <section
        part="root"
        class="koe-comments font-sans antialiased"
        style="color-scheme: ${this.theme};"
      >
        <div part="header" class="mb-5 flex items-center justify-between gap-3">
          <slot name="header">
            <h3
              part="title"
              class="flex items-baseline gap-2 text-xl font-bold tracking-tight text-koe-text"
            >
              Comments
              ${total > 0 ? b2`<span
                    part="count"
                    class="text-sm font-medium text-koe-text-subtle"
                  >
                    ${total}
                  </span>` : A}
            </h3>
          </slot>
          ${this.showThemeToggle ? b2`
                <button
                  type="button"
                  part="theme-toggle"
                  class="theme-toggle inline-flex h-9 w-9 items-center justify-center rounded-full border border-koe-border bg-koe-surface text-koe-text-muted shadow-sm transition-all hover:rotate-12 hover:text-koe-text"
                  aria-label=${this.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  title=${this.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  @click=${this.toggleTheme}
                >
                  ${this.icon(
      this.theme === "dark" ? ICON_PATHS.sun : ICON_PATHS.moon,
      "h-[18px] w-[18px]"
    )}
                </button>
              ` : A}
        </div>

        ${this.error ? b2`<p
              part="error"
              class="error pop-in mb-4 flex items-center gap-2 rounded-xl border border-koe-danger-border bg-koe-danger-soft px-3 py-2 text-sm text-koe-danger"
              role="alert"
            >
              ${this.icon(ICON_PATHS.alert, "h-4 w-4 shrink-0")}
              <span>${this.error}</span>
            </p>` : A}

        <form part="composer" class="composer mb-8" @submit=${this.handleSubmit}>
          ${this.renderComposer({
      scope: COMPOSER_SCOPE,
      placeholder: "What are your thoughts?",
      rows: 3,
      draft: this.draft,
      submitting: this.submitting,
      submitLabel: "Comment",
      postingLabel: "Posting...",
      onInput: this.handleInput,
      onSubmit: this.handleSubmit
    })}
        </form>

        ${this.loading ? this.renderLoading() : this.renderCommentList()}
        <slot name="footer"></slot>
      </section>
    `;
  }
  renderLoading() {
    return b2`
      <div part="loading" class="space-y-5" aria-busy="true">
        ${[1, 2, 3].map(
      () => b2`
            <div class="flex animate-pulse gap-3">
              <div
                class="h-8 w-8 shrink-0 rounded-full bg-koe-skeleton"
              ></div>
              <div class="flex-1 space-y-2 py-1">
                <div class="h-3 w-1/4 rounded-full bg-koe-skeleton"></div>
                <div class="h-3 w-3/4 rounded-full bg-koe-skeleton"></div>
              </div>
            </div>
          `
    )}
      </div>
    `;
  }
  renderCommentList() {
    return b2`
      <ul part="list" class="comment-list comment-list--root">
        ${this.comments.map((comment) => this.renderComment(comment))}
      </ul>
      ${this.comments.length === 0 ? b2`
            <div
              part="empty"
              class="empty rounded-2xl border border-dashed border-koe-border-strong px-6 py-12 text-center"
            >
              <slot name="empty">
                <div class="mb-3 text-3xl" aria-hidden="true">💬</div>
                <p
                  part="empty-title"
                  class="text-sm font-semibold text-koe-text-muted"
                >
                  No comments yet
                </p>
                <p part="empty-text" class="mt-1 text-xs text-koe-text-subtle">
                  Be the first to share your thoughts.
                </p>
              </slot>
            </div>
          ` : A}
    `;
  }
  renderComposer(options) {
    const { scope } = options;
    const active = this.isActive(scope);
    return b2`
      <div class="flex gap-3">
        ${this.avatar("composer", { composer: true })}
        <div
          part="composer-shell"
          class="composer-shell relative min-w-0 flex-1 rounded-2xl border bg-koe-surface transition-all duration-200 ${active ? "border-koe-border-strong shadow-sm ring-4 ring-[var(--koe-focus-ring)]" : "border-koe-border hover:border-koe-border-strong"}"
        >
          <input
            type="file"
            accept="image/*"
            class="hidden"
            data-media-scope=${scope}
            @change=${(e7) => this.handleMediaSelected(scope, e7)}
          />
          ${active ? this.renderToolbar(scope) : A}
          <textarea
            part="textarea"
            rows=${options.rows}
            data-scope=${scope}
            placeholder=${options.placeholder}
            class="block w-full resize-y border-0 bg-transparent px-4 py-3 text-sm leading-relaxed text-koe-text placeholder:text-koe-text-subtle focus:outline-none"
            .value=${options.draft}
            @input=${options.onInput}
            @paste=${(e7) => this.handlePaste(scope, e7)}
            @focus=${() => this.handleComposerFocus(scope)}
            @blur=${this.handleComposerBlur}
          ></textarea>
          ${active ? b2`
                <div
                  part="composer-actions"
                  class="flex items-center justify-between gap-2 px-3 pb-3 pt-1"
                >
                  <span
                    class="hidden text-xs text-koe-text-subtle sm:inline"
                  >
                    Markdown supported
                  </span>
                  <div class="flex items-center gap-2">
                    ${options.onCancel ? b2`
                          <button
                            type="button"
                            part="cancel"
                            class="rounded-full px-3 py-1.5 text-sm font-medium text-koe-text-muted transition-colors hover:bg-koe-surface-sunken hover:text-koe-text"
                            @click=${options.onCancel}
                          >
                            Cancel
                          </button>
                        ` : A}
                    <button
                      type="submit"
                      part="submit"
                      class="rounded-full bg-koe-surface-strong px-4 py-1.5 text-sm font-semibold text-koe-text-inverse shadow-sm transition-all hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-koe-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
                      ?disabled=${options.submitting || !options.draft.trim()}
                    >
                      ${options.submitting ? options.postingLabel : options.submitLabel}
                    </button>
                  </div>
                </div>
              ` : A}
          ${this.openGifPicker === scope ? this.renderGifPicker(scope) : A}
        </div>
      </div>
    `;
  }
  renderToolbar(scope) {
    const preventFocus = (e7) => e7.preventDefault();
    return b2`
      <div
        part="toolbar"
        class="composer-toolbar flex flex-wrap items-center gap-0.5 border-b border-koe-border px-2 py-1.5"
      >
        <button
          type="button"
          part="toolbar-button"
          class="toolbar-button"
          aria-label="Bold"
          title="Bold"
          @mousedown=${preventFocus}
          @click=${() => this.wrapSelection(scope, "**", "**", "bold text")}
        >
          <span class="text-sm font-extrabold">B</span>
        </button>
        <button
          type="button"
          part="toolbar-button"
          class="toolbar-button"
          aria-label="Italic"
          title="Italic"
          @mousedown=${preventFocus}
          @click=${() => this.wrapSelection(scope, "*", "*", "italic text")}
        >
          <span class="font-serif text-sm italic">I</span>
        </button>
        <button
          type="button"
          part="toolbar-button"
          class="toolbar-button"
          aria-label="Strikethrough"
          title="Strikethrough"
          @mousedown=${preventFocus}
          @click=${() => this.wrapSelection(scope, "~~", "~~", "struck text")}
        >
          <span class="text-sm line-through">S</span>
        </button>
        <span
          class="mx-1 h-5 w-px bg-koe-border"
          aria-hidden="true"
        ></span>
        <button
          type="button"
          part="toolbar-button"
          class="toolbar-button"
          aria-label="Quote"
          title="Quote"
          @mousedown=${preventFocus}
          @click=${() => this.wrapSelection(scope, "> ", "", "quoted text")}
        >
          ${this.icon(ICON_PATHS.quote)}
        </button>
        <button
          type="button"
          part="toolbar-button"
          class="toolbar-button"
          aria-label="Code"
          title="Code"
          @mousedown=${preventFocus}
          @click=${() => this.wrapSelection(scope, "`", "`", "code")}
        >
          ${this.icon(ICON_PATHS.code)}
        </button>
        <button
          type="button"
          part="toolbar-button"
          class="toolbar-button"
          aria-label="Link"
          title="Link"
          @mousedown=${preventFocus}
          @click=${() => this.insertLink(scope)}
        >
          ${this.icon(ICON_PATHS.link)}
        </button>
        <span
          class="mx-1 h-5 w-px bg-koe-border"
          aria-hidden="true"
        ></span>
        <button
          type="button"
          part="toolbar-gif"
          class="gif-button flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-koe-text-muted transition-colors hover:bg-koe-surface-sunken hover:text-koe-text ${this.openGifPicker === scope ? "bg-koe-surface-sunken text-koe-text" : ""}"
          aria-label="Insert image or GIF"
          title="Insert image or GIF"
          @mousedown=${preventFocus}
          @click=${() => this.openGifPicker === scope ? this.closeGifPicker() : this.openGifPickerFor(scope)}
        >
          ${this.icon(ICON_PATHS.image)}
          <span
            class="rounded-md bg-gradient-to-r from-koe-gif-from to-koe-gif-to px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-koe-accent-contrast"
          >
            GIF
          </span>
        </button>
        ${this.mediaProvider ? b2`
              <button
                type="button"
                part="toolbar-upload"
                class="media-upload-button flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-koe-text-muted transition-colors hover:bg-koe-surface-sunken hover:text-koe-text disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Upload image"
                title=${this.uploadingScope === scope ? "Uploading..." : "Upload image"}
                ?disabled=${this.uploadingScope === scope}
                @mousedown=${preventFocus}
                @click=${() => this.openMediaPicker(scope)}
              >
                ${this.icon(
      this.uploadingScope === scope ? ICON_PATHS.image : ICON_PATHS.upload
    )}
              </button>
            ` : A}
      </div>
    `;
  }
  renderGifPicker(scope) {
    return b2`
      <div
        part="gif-picker"
        class="gif-picker pop-in absolute right-2 top-full z-20 mt-2 w-80 max-w-[calc(100vw-4rem)] rounded-2xl border border-koe-border bg-koe-surface p-3 shadow-xl backdrop-blur-sm"
      >
        <div class="mb-2 flex items-center justify-between">
          <span
            class="text-xs font-semibold uppercase tracking-wide text-koe-text-subtle"
          >
            Image / GIF
          </span>
          <button
            type="button"
            part="gif-close"
            class="toolbar-button !h-6 !w-6"
            aria-label="Close image picker"
            @click=${this.closeGifPicker}
          >
            ${this.icon(ICON_PATHS.close)}
          </button>
        </div>
        ${this.gifApiKey ? b2`
              <input
                type="text"
                part="gif-search"
                class="mb-2 w-full rounded-lg border border-koe-border bg-koe-surface-muted px-2.5 py-1.5 text-xs text-koe-text placeholder:text-koe-text-subtle focus:border-koe-accent focus:outline-none"
                placeholder="Search Giphy..."
                .value=${this.gifQuery}
                @input=${(e7) => this.handleGifSearchInput(
      e7.target.value
    )}
              />
              <div
                part="gif-grid"
                class="gif-grid mb-2 grid max-h-56 grid-cols-3 gap-2 overflow-y-auto"
              >
                ${this.gifLoading ? b2`<p
                      class="col-span-3 py-6 text-center text-xs text-koe-text-subtle"
                    >
                      Loading GIFs...
                    </p>` : this.gifError ? b2`<p
                        class="col-span-3 py-6 text-center text-xs text-koe-danger"
                      >
                        ${this.gifError}
                      </p>` : this.gifResults.length === 0 ? b2`<p
                          class="col-span-3 py-6 text-center text-xs text-koe-text-subtle"
                        >
                          No GIFs found.
                        </p>` : this.gifResults.map(
      (url) => b2`<img
                            src=${url}
                            alt="GIF option"
                            loading="lazy"
                            class="h-20 w-full cursor-pointer rounded-lg bg-koe-surface-sunken object-cover transition-opacity hover:opacity-75"
                            @click=${() => this.insertGif(scope, url)}
                          />`
    )}
              </div>
            ` : b2`<p class="mb-2 text-xs text-koe-text-subtle">
              Paste an image URL below, or set the
              <code class="font-mono">gif-api-key</code> attribute to search
              Giphy.
            </p>`}
        <div class="flex gap-2">
          <input
            type="text"
            part="gif-url"
            class="min-w-0 flex-1 rounded-lg border border-koe-border bg-koe-surface-muted px-2.5 py-1.5 text-xs text-koe-text placeholder:text-koe-text-subtle focus:border-koe-accent focus:outline-none"
            placeholder="https://example.com/image.gif"
            .value=${this.gifUrl}
            @input=${(e7) => this.gifUrl = e7.target.value}
            @keydown=${(e7) => {
      if (e7.key === "Enter") {
        e7.preventDefault();
        e7.stopPropagation();
        void this.insertCustomGif(scope);
      }
    }}
          />
          <button
            type="button"
            part="gif-insert"
            class="shrink-0 rounded-lg bg-koe-surface-strong px-3 py-1.5 text-xs font-semibold text-koe-text-inverse transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            ?disabled=${!this.gifUrl.trim()}
            @click=${() => void this.insertCustomGif(scope)}
          >
            Insert
          </button>
        </div>
        ${this.gifError && this.gifApiKey ? A : this.gifError ? b2`<p class="mt-1.5 text-xs text-koe-danger">${this.gifError}</p>` : A}
      </div>
    `;
  }
  renderReportPicker(commentId) {
    return b2`
      <div
        part="report-picker"
        class="report-picker pop-in mt-3 rounded-2xl border border-koe-border bg-koe-surface p-3 shadow-sm"
      >
        <label
          class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-koe-text-subtle"
          for="report-reason-${commentId}"
        >
          Report this comment
        </label>
        <textarea
          id="report-reason-${commentId}"
          part="report-input"
          rows="2"
          class="report-reason-input block w-full resize-y rounded-xl border border-koe-border bg-koe-surface-muted px-3 py-2 text-sm text-koe-text placeholder:text-koe-text-subtle focus:border-koe-border-strong focus:outline-none"
          placeholder="Why are you reporting this comment?"
          .value=${this.reportReason}
          @input=${(e7) => this.reportReason = e7.target.value}
        ></textarea>
        <div class="mt-2 flex justify-end gap-2">
          <button
            type="button"
            part="report-cancel"
            class="rounded-full px-3 py-1.5 text-sm font-medium text-koe-text-muted transition-colors hover:bg-koe-surface-sunken hover:text-koe-text"
            @click=${this.closeReportPicker}
          >
            Cancel
          </button>
          <button
            type="button"
            part="report-submit"
            class="report-submit rounded-full bg-koe-danger px-4 py-1.5 text-sm font-semibold text-koe-danger-contrast shadow-sm transition-all hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-koe-danger-soft disabled:cursor-not-allowed disabled:opacity-40"
            ?disabled=${this.reporting || !this.reportReason.trim()}
            @click=${() => this.submitReport(commentId)}
          >
            ${this.reporting ? "Reporting..." : "Report"}
          </button>
        </div>
      </div>
    `;
  }
  renderComment(comment, depth = 0) {
    const createdAt = new Date(comment.createdAt);
    const reactions = this.visibleReactions(comment);
    const expanded = this.expandedReactions.has(comment.id);
    const shown = expanded ? reactions : reactions.slice(0, MAX_VISIBLE_REACTIONS);
    const hiddenCount = reactions.length - MAX_VISIBLE_REACTIONS;
    const canToggle = reactions.length > MAX_VISIBLE_REACTIONS;
    const collapsed = this.collapsedThreads.has(comment.id);
    const reported = this.reportedComments.has(comment.id);
    const childCount = comment.children.length;
    return b2`
      <li part="comment" class="comment">
        <div class="flex gap-3">
          ${this.avatar(comment.authorId, {
      url: comment.authorAvatarUrl
    })}
          <div class="min-w-0 flex-1">
            <div class="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span
                part="author"
                class="text-sm font-semibold text-koe-text"
              >
                ${comment.authorName ?? "Guest"}
              </span>
              <span class="text-koe-border-strong" aria-hidden="true"
                >·</span
              >
              <time
                part="time"
                class="comment-time text-xs text-koe-text-subtle"
                datetime=${createdAt.toISOString()}
                title=${createdAt.toLocaleString()}
              >
                ${formatRelativeTime(createdAt)}
              </time>
              ${comment.status === "pending" ? b2`<span part="pending-badge" class="pending-badge"
                    >Pending approval</span
                  >` : A}
            </div>
            <div
              part="body"
              class="comment-body prose prose-sm max-w-none"
            >${o6(comment.bodyHtml)}</div>

            <div
              part="actions"
              class="comment-actions mt-2.5 flex flex-wrap items-center gap-2"
            >
              <div
                part="vote-controls"
                class="vote-controls inline-flex items-center overflow-hidden rounded-full border border-koe-border"
              >
                <button
                  type="button"
                  part="vote-up"
                  class="vote-button flex h-8 w-8 items-center justify-center text-koe-text-subtle transition-colors hover:bg-koe-surface-sunken hover:text-koe-accent disabled:opacity-50 ${comment.userVote === 1 ? "active up" : ""}"
                  ?disabled=${this.voting}
                  @click=${() => this.voteComment(comment.id, 1)}
                  aria-label="Upvote"
                >
                  ${this.icon(ICON_PATHS.chevronUp)}
                </button>
                <span
                  part="vote-score"
                  class="vote-score min-w-6 text-center text-xs font-semibold tabular-nums text-koe-text-muted"
                >
                  ${comment.upvotes - comment.downvotes}
                </span>
                <button
                  type="button"
                  part="vote-down"
                  class="vote-button flex h-8 w-8 items-center justify-center text-koe-text-subtle transition-colors hover:bg-koe-surface-sunken hover:text-koe-danger disabled:opacity-50 ${comment.userVote === -1 ? "active down" : ""}"
                  ?disabled=${this.voting}
                  @click=${() => this.voteComment(comment.id, -1)}
                  aria-label="Downvote"
                >
                  ${this.icon(ICON_PATHS.chevronDown)}
                </button>
              </div>

              <div
                part="reactions"
                class="reaction-list flex flex-wrap items-center gap-1.5"
              >
                ${shown.map(
      ([emoji, count]) => {
        const active = comment.userReactions?.includes(emoji) ?? false;
        return b2`
                      <button
                        type="button"
                        part="reaction"
                        class="reaction-button inline-flex items-center gap-1 rounded-full border border-koe-border px-2.5 py-1 text-xs text-koe-text-muted transition-colors hover:border-koe-border-strong disabled:opacity-50 ${active ? "active" : ""}"
                        ?disabled=${this.reacting}
                        @click=${() => this.reactToComment(comment.id, emoji)}
                        aria-label=${`React with ${emoji}`}
                        aria-pressed=${active}
                      >
                        <span>${emoji}</span>
                        <span
                          part="reaction-count"
                          class="reaction-count tabular-nums text-koe-text-subtle"
                        >
                          ${count}
                        </span>
                      </button>
                    `;
      }
    )}
                ${canToggle ? b2`
                      <button
                        type="button"
                        part="reactions-toggle"
                        class="reactions-toggle inline-flex items-center rounded-full border border-koe-border px-2.5 py-1 text-xs font-medium text-koe-text-muted transition-colors hover:border-koe-border-strong hover:text-koe-text"
                        @click=${() => this.toggleReactions(comment.id)}
                      >
                        ${expanded ? "Show fewer" : `+${hiddenCount} more`}
                      </button>
                    ` : A}
                <button
                  type="button"
                  part="add-reaction"
                  class="add-reaction-button inline-flex h-8 w-8 items-center justify-center rounded-full border border-koe-border text-koe-text-subtle transition-colors hover:border-koe-border-strong hover:text-koe-text-muted"
                  aria-label="Add reaction"
                  @click=${() => this.toggleReactionPicker(comment.id)}
                >
                  ${this.icon(ICON_PATHS.smile)}
                </button>
                ${this.openReactionPicker === comment.id ? b2`
                      <div
                        part="reaction-picker"
                        class="reaction-picker pop-in inline-flex flex-wrap gap-1 rounded-xl border border-koe-border bg-koe-surface p-1.5 shadow-lg"
                      >
                        ${this.emojis.map(
      (emoji) => b2`
                            <button
                              type="button"
                              part="reaction-picker-button"
                              class="reaction-picker-button flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors hover:bg-koe-surface-sunken"
                              aria-label=${`React with ${emoji}`}
                              @click=${() => this.reactToComment(comment.id, emoji)}
                            >
                              ${emoji}
                            </button>
                          `
    )}
                      </div>
                    ` : A}
              </div>

              <button
                type="button"
                part="report-button"
                class="report-button ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-koe-text-muted transition-colors hover:bg-koe-surface-sunken hover:text-koe-text disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Report comment"
                title=${reported ? "Reported" : "Report"}
                ?disabled=${reported}
                @click=${() => this.toggleReportPicker(comment.id)}
              >
                ${this.icon(ICON_PATHS.flag)}
                ${reported ? "Reported" : "Report"}
              </button>
              <button
                type="button"
                part="reply-button"
                class="reply-button inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-koe-text-muted transition-colors hover:bg-koe-surface-sunken hover:text-koe-text"
                @click=${() => this.startReply(comment.id)}
              >
                ${this.icon(ICON_PATHS.reply)}
                Reply
              </button>
            </div>

            ${this.openReportPicker === comment.id ? this.renderReportPicker(comment.id) : A}

            ${comment.id === this.replyTo ? b2`
                  <div part="reply-composer" class="reply-composer pop-in mt-3">
                    <form
                      @submit=${this.handleReplySubmit}
                    >
                      ${this.renderComposer({
      scope: comment.id,
      placeholder: "Reply to this comment...",
      rows: 2,
      draft: this.replyDraft,
      submitting: this.submittingReply,
      submitLabel: "Reply",
      postingLabel: "Posting...",
      onInput: this.handleReplyInput,
      onSubmit: this.handleReplySubmit,
      onCancel: () => this.cancelReply()
    })}
                    </form>
                  </div>
                ` : A}

            ${childCount > 0 ? b2`
                  <button
                    type="button"
                    part="thread-toggle"
                    class="thread-toggle mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-koe-text-muted transition-colors hover:text-koe-text"
                    @click=${() => this.toggleThread(comment.id)}
                  >
                    ${this.icon(
      collapsed ? ICON_PATHS.chevronDown : ICON_PATHS.chevronUp
    )}
                    ${collapsed ? `Show ${childCount} ${childCount === 1 ? "reply" : "replies"}` : `Hide ${childCount} ${childCount === 1 ? "reply" : "replies"}`}
                  </button>
                  ${collapsed ? A : b2`
                        <ul
                          part="nested-list"
                          class="comment-list comment-list--nested thread-line mt-2 ml-2 space-y-3 pl-4"
                          style="border-color: var(--koe-thread-line-${depth % 4});"
                        >
                          ${comment.children.map(
      (child) => this.renderComment(child, depth + 1)
    )}
                        </ul>
                      `}
                ` : A}
          </div>
        </div>
      </li>
    `;
  }
};
KoeComments.styles = [tailwindStyles];
__decorateClass([
  n4({ type: String, attribute: "base-url" })
], KoeComments.prototype, "baseUrl", 2);
__decorateClass([
  n4({ type: String, attribute: "api-base" })
], KoeComments.prototype, "apiBase", 2);
__decorateClass([
  n4({ type: String, attribute: "thread-ref" })
], KoeComments.prototype, "threadRef", 2);
__decorateClass([
  n4({ type: String, attribute: "reaction-emojis" })
], KoeComments.prototype, "reactionEmojis", 2);
__decorateClass([
  n4({ type: String, attribute: "gif-api-key" })
], KoeComments.prototype, "gifApiKey", 2);
__decorateClass([
  n4({ type: String, attribute: "media-api-key" })
], KoeComments.prototype, "mediaApiKey", 2);
__decorateClass([
  n4({ type: String })
], KoeComments.prototype, "token", 2);
__decorateClass([
  n4({ type: String, reflect: true })
], KoeComments.prototype, "theme", 2);
__decorateClass([
  n4({ type: Boolean, attribute: "show-theme-toggle" })
], KoeComments.prototype, "showThemeToggle", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "comments", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "threadId", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "loading", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "submitting", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "submittingReply", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "voting", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "reacting", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "draft", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "replyDraft", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "replyTo", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "expandedReactions", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "collapsedThreads", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "openReactionPicker", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "error", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "activeScope", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "openGifPicker", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "gifQuery", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "gifResults", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "gifLoading", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "gifError", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "gifUrl", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "uploadingScope", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "openReportPicker", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "reportReason", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "reporting", 2);
__decorateClass([
  r5()
], KoeComments.prototype, "reportedComments", 2);
KoeComments = __decorateClass([
  t3("koe-comments")
], KoeComments);

// ../../packages/widget/src/koe-article-reactions.ts
var KoeArticleReactions = class extends i4 {
  constructor() {
    super(...arguments);
    this.baseUrl = "";
    this.apiBase = "";
    this.threadRef = "";
    this.reactionEmojis = "";
    this.token = "";
    this.theme = "light";
    this.threadId = "";
    this.reactionTotals = {};
    this.userReactions = [];
    this.loading = true;
    this.reacting = false;
    this.error = "";
    this.client = null;
    this.auth = null;
  }
  get emojis() {
    return this.reactionEmojis ? this.reactionEmojis.split(",").map((emoji) => emoji.trim()).filter(Boolean) : DEFAULT_EMOJI_ALLOWLIST;
  }
  connectedCallback() {
    super.connectedCallback();
    if (this.threadRef) {
      const effectiveBaseUrl = this.baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
      this.client = createKoeClient({
        baseUrl: effectiveBaseUrl,
        apiPrefix: this.apiBase
      });
      this.auth = createAuthSession({
        client: this.client,
        storage: localStorage,
        hostToken: () => this.token,
        onExpired: () => emitAuthExpired(this, this.threadRef)
      });
      if (this.hasUpdated) {
        void this.load();
      }
    }
  }
  firstUpdated() {
    if (this.client) {
      void this.load();
    }
  }
  willUpdate(changed) {
    if (this.hasUpdated && changed.has("token")) {
      void this.load();
    }
  }
  async load() {
    this.loading = true;
    this.error = "";
    try {
      await this.auth.resolve();
      await this.refresh();
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to load reactions";
    } finally {
      this.loading = false;
    }
  }
  async refresh() {
    const thread = await this.auth.runWithRetry(
      () => this.client.threads.getByRef(
        this.threadRef,
        void 0,
        this.auth.accessToken
      )
    );
    this.threadId = thread.id;
    this.reactionTotals = thread.reactionTotals ?? {};
    this.userReactions = thread.userReactions ?? [];
  }
  countFor(emoji) {
    return this.reactionTotals[emoji] ?? 0;
  }
  isActive(emoji) {
    return this.userReactions.includes(emoji);
  }
  async toggleReaction(emoji) {
    if (!this.threadId || this.reacting) {
      return;
    }
    this.reacting = true;
    this.error = "";
    const active = this.isActive(emoji);
    try {
      await this.auth.runWithRetry(async () => {
        if (active) {
          await this.client.threads.unreact(
            this.threadId,
            emoji,
            this.auth.accessToken
          );
        } else {
          await this.client.threads.react(
            this.threadId,
            emoji,
            this.auth.accessToken
          );
        }
      });
      await this.refresh();
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to react";
    } finally {
      this.reacting = false;
    }
  }
  render() {
    return b2`
      <section
        part="root"
        class="koe-article-reactions font-sans antialiased"
        style="color-scheme: ${this.theme};"
      >
        <slot name="label"></slot>
        ${this.error ? b2`<p
              part="error"
              class="error mb-2 rounded-xl border border-koe-danger-border bg-koe-danger-soft px-3 py-2 text-sm text-koe-danger"
              role="alert"
            >
              ${this.error}
            </p>` : A}
        ${this.loading ? this.renderLoading() : this.renderReactions()}
        <slot name="footer"></slot>
      </section>
    `;
  }
  renderLoading() {
    return b2`
      <div part="loading" class="flex gap-1.5" aria-busy="true">
        ${this.emojis.map(
      () => b2`
            <div class="h-8 w-16 animate-pulse rounded-full bg-koe-skeleton"></div>
          `
    )}
      </div>
    `;
  }
  renderReactions() {
    return b2`
      <div
        part="group"
        class="article-reactions inline-flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Article reactions"
      >
        ${this.emojis.map((emoji) => {
      const active = this.isActive(emoji);
      return b2`
            <button
              type="button"
              part="reaction"
              class="article-reaction-button reaction-button inline-flex items-center gap-1 rounded-full border border-koe-border px-2.5 py-1 text-xs text-koe-text-muted transition-colors hover:border-koe-border-strong disabled:opacity-50 ${active ? "active" : ""}"
              data-emoji=${emoji}
              ?disabled=${this.reacting}
              aria-label=${`React with ${emoji}`}
              aria-pressed=${active}
              @click=${() => this.toggleReaction(emoji)}
            >
              <span>${emoji}</span>
              <span
                part="reaction-count"
                class="reaction-count tabular-nums text-koe-text-subtle"
              >
                ${this.countFor(emoji)}
              </span>
            </button>
          `;
    })}
      </div>
    `;
  }
};
KoeArticleReactions.styles = [tailwindStyles];
__decorateClass([
  n4({ type: String, attribute: "base-url" })
], KoeArticleReactions.prototype, "baseUrl", 2);
__decorateClass([
  n4({ type: String, attribute: "api-base" })
], KoeArticleReactions.prototype, "apiBase", 2);
__decorateClass([
  n4({ type: String, attribute: "thread-ref" })
], KoeArticleReactions.prototype, "threadRef", 2);
__decorateClass([
  n4({ type: String, attribute: "reaction-emojis" })
], KoeArticleReactions.prototype, "reactionEmojis", 2);
__decorateClass([
  n4({ type: String })
], KoeArticleReactions.prototype, "token", 2);
__decorateClass([
  n4({ type: String, reflect: true })
], KoeArticleReactions.prototype, "theme", 2);
__decorateClass([
  r5()
], KoeArticleReactions.prototype, "threadId", 2);
__decorateClass([
  r5()
], KoeArticleReactions.prototype, "reactionTotals", 2);
__decorateClass([
  r5()
], KoeArticleReactions.prototype, "userReactions", 2);
__decorateClass([
  r5()
], KoeArticleReactions.prototype, "loading", 2);
__decorateClass([
  r5()
], KoeArticleReactions.prototype, "reacting", 2);
__decorateClass([
  r5()
], KoeArticleReactions.prototype, "error", 2);
KoeArticleReactions = __decorateClass([
  t3("koe-article-reactions")
], KoeArticleReactions);
export {
  AUTH_EXPIRED_EVENT,
  KoeArticleReactions,
  KoeComments
};
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
@lit/reactive-element/decorators/custom-element.js:
@lit/reactive-element/decorators/property.js:
@lit/reactive-element/decorators/state.js:
@lit/reactive-element/decorators/event-options.js:
@lit/reactive-element/decorators/base.js:
@lit/reactive-element/decorators/query.js:
@lit/reactive-element/decorators/query-all.js:
@lit/reactive-element/decorators/query-async.js:
@lit/reactive-element/decorators/query-assigned-nodes.js:
lit-html/directive.js:
lit-html/directives/unsafe-html.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-elements.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
//# sourceMappingURL=widget.js.map
