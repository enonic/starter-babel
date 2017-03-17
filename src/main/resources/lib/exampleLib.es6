export function toStr(value) {
    var replacer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var space = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4;
    return JSON.stringify(value, replacer, space);
}
