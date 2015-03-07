util = {};
exports = {};

function isString(arg) {
    return typeof arg === 'string';
}
function isNull(arg) {
    return arg === null;
}
function isObject(arg) {
    return typeof arg === 'object' && arg !== null;
}
function isBoolean(arg) {
    return typeof arg === 'boolean';
}
function isUndefined(arg) {
    return arg === void 0;
}
function stylizeNoColor(str, styleType) {
    return str;
}
function stylizeWithColor(str, styleType) {
    var style = inspect.styles[styleType];

    if (style) {
        return '\u001b[' + inspect.colors[style][0] + 'm' + str +
            '\u001b[' + inspect.colors[style][3] + 'm';
    } else {
        return str;
    }
}
function isFunction(arg) {
    return typeof arg === 'function';
}
function isNumber(arg) {
    return typeof arg === 'number';
}
function isSymbol(arg) {
    return false;
}
function formatPrimitive(ctx, value) {
    if (isUndefined(value))
        return ctx.stylize('undefined', 'undefined');
    if (isString(value)) {
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                .replace(/'/g, "\\'")
                .replace(/\\"/g, '"') + '\'';
        return ctx.stylize(simple, 'string');
    }
    if (isNumber(value)) {
        // Format -0 as '-0'. Strict equality won't distinguish 0 from -0,
        // so instead we use the fact that 1 / -0 < 0 whereas 1 / 0 > 0 .
        if (value === 0 && 1 / value < 0)
            return ctx.stylize('-0', 'number');
        return ctx.stylize('' + value, 'number');
    }
    if (isBoolean(value))
        return ctx.stylize('' + value, 'boolean');
    // For some reason typeof null is "object", so special case here.
    if (isNull(value))
        return ctx.stylize('null', 'null');
    // es6 symbol primitive
    if (isSymbol(value))
        return ctx.stylize(value.toString(), 'symbol');
}
function arrayToHash(array) {
    var hash = {};

    array.forEach(function (val, idx) {
        hash[val] = true;
    });

    return hash;
}
function objectToString(o) {
    return Object.prototype.toString.call(o);
}
function isDate(d) {
    return isObject(d) && objectToString(d) === '[object Date]';
}
function isError(e) {
    return isObject(e) &&
        (objectToString(e) === '[object Error]' || e instanceof Error);
}
function isRegExp(re) {
    return isObject(re) && objectToString(re) === '[object RegExp]';
}
function formatError(value) {
    return '[' + Error.prototype.toString.call(value) + ']';
}
function formatPrimitiveNoColor(ctx, value) {
    var stylize = ctx.stylize;
    ctx.stylize = stylizeNoColor;
    var str = formatPrimitive(ctx, value);
    ctx.stylize = stylize;
    return str;
}
function isArray(ar) {
    return Array.isArray(ar);
}
function hasOwnProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}
function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
    var name, str, desc;
    desc = Object.getOwnPropertyDescriptor(value, key) || {value: value[key]};
    if (desc.get) {
        if (desc.set) {
            str = ctx.stylize('[Getter/Setter]', 'special');
        } else {
            str = ctx.stylize('[Getter]', 'special');
        }
    } else {
        if (desc.set) {
            str = ctx.stylize('[Setter]', 'special');
        }
    }
    if (!hasOwnProperty(visibleKeys, key)) {
        name = '[' + key + ']';
    }
    if (!str) {
        if (ctx.seen.indexOf(desc.value) < 0) {
            if (isNull(recurseTimes)) {
                str = formatValue(ctx, desc.value, null);
            } else {
                str = formatValue(ctx, desc.value, recurseTimes - 1);
            }
            if (str.indexOf('\n') > -1) {
                if (array) {
                    str = str.split('\n').map(function (line) {
                        return '  ' + line;
                    }).join('\n').substr(2);
                } else {
                    str = '\n' + str.split('\n').map(function (line) {
                        return '   ' + line;
                    }).join('\n');
                }
            }
        } else {
            str = ctx.stylize('[Circular]', 'special');
        }
    }
    if (isUndefined(name)) {
        if (array && key.match(/^\d+$/)) {
            return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
            name = name.substr(1, name.length - 2);
            name = ctx.stylize(name, 'name');
        } else {
            name = name.replace(/'/g, "\\'")
                .replace(/\\"/g, '"')
                .replace(/(^"|"$)/g, "'")
                .replace(/\\\\/g, '\\');
            name = ctx.stylize(name, 'string');
        }
    }

    return name + ': ' + str;
}
function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
    var output = [];
    for (var i = 0, l = value.length; i < l; ++i) {
        if (hasOwnProperty(value, String(i))) {
            output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
                String(i), true));
        } else {
            output.push('');
        }
    }
    keys.forEach(function (key) {
        if (!key.match(/^\d+$/)) {
            output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
                key, true));
        }
    });
    return output;
}
function reduceToSingleString(output, base, braces) {
    var length = output.reduce(function (prev, cur) {
        return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
    }, 0);

    if (length > 60) {
        return braces[0] +
            (base === '' ? '' : base + '\n ') +
            ' ' +
            output.join(',\n  ') +
            ' ' +
            braces[1];
    }

    return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}
function formatValue(ctx, value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (ctx.customInspect &&
        value &&
        isFunction(value.inspect) &&
            // Filter out the util module, it's inspect function is special
        value.inspect !== exports.inspect &&
            // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
        var ret = value.inspect(recurseTimes, ctx);
        if (!isString(ret)) {
            ret = formatValue(ctx, ret, recurseTimes);
        }
        return ret;
    }

    // Primitive types cannot have properties
    var primitive = formatPrimitive(ctx, value);
    if (primitive) {
        return primitive;
    }

    // Look up the keys of the object.
    var keys = Object.keys(value);
    var visibleKeys = arrayToHash(keys);

    if (ctx.showHidden) {
        keys = Object.getOwnPropertyNames(value);
    }

    // This could be a boxed primitive (new String(), etc.), check valueOf()
    // NOTE: Avoid calling `valueOf` on `Date` instance because it will return
    // a number which, when object has some additional user-stored `keys`,
    // will be printed out.
    var formatted;
    var raw = value;
    try {
        // the .valueOf() call can fail for a multitude of reasons
        if (!isDate(value))
            raw = value.valueOf();
    } catch (e) {
        // ignore...
    }

    if (isString(raw)) {
        // for boxed Strings, we have to remove the 0-n indexed entries,
        // since they just noisey up the output and are redundant
        keys = keys.filter(function (key) {
            return !(key >= 0 && key < raw.length);
        });
    }

    // Some type of object without properties can be shortcutted.
    if (keys.length === 0) {
        if (isFunction(value)) {
            var name = value.name ? ': ' + value.name : '';
            return ctx.stylize('[Function' + name + ']', 'special');
        }
        if (isRegExp(value)) {
            return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
        }
        if (isDate(value)) {
            return ctx.stylize(Date.prototype.toString.call(value), 'date');
        }
        if (isError(value)) {
            return formatError(value);
        }
        // now check the `raw` value to handle boxed primitives
        if (isString(raw)) {
            formatted = formatPrimitiveNoColor(ctx, raw);
            return ctx.stylize('[String: ' + formatted + ']', 'string');
        }
        if (isNumber(raw)) {
            formatted = formatPrimitiveNoColor(ctx, raw);
            return ctx.stylize('[Number: ' + formatted + ']', 'number');
        }
        if (isBoolean(raw)) {
            formatted = formatPrimitiveNoColor(ctx, raw);
            return ctx.stylize('[Boolean: ' + formatted + ']', 'boolean');
        }
    }

    var base = '', array = false, braces = ['{', '}'];

    // Make Array say that they are Array
    if (isArray(value)) {
        array = true;
        braces = ['[', ']'];
    }

    // Make functions say that they are functions
    if (isFunction(value)) {
        var n = value.name ? ': ' + value.name : '';
        base = ' [Function' + n + ']';
    }

    // Make RegExps say that they are RegExps
    if (isRegExp(value)) {
        base = ' ' + RegExp.prototype.toString.call(value);
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
        base = ' ' + Date.prototype.toUTCString.call(value);
    }

    // Make error with message first say the error
    if (isError(value)) {
        base = ' ' + formatError(value);
    }

    // Make boxed primitive Strings look like such
    if (isString(raw)) {
        formatted = formatPrimitiveNoColor(ctx, raw);
        base = ' ' + '[String: ' + formatted + ']';
    }

    // Make boxed primitive Numbers look like such
    if (isNumber(raw)) {
        formatted = formatPrimitiveNoColor(ctx, raw);
        base = ' ' + '[Number: ' + formatted + ']';
    }

    // Make boxed primitive Booleans look like such
    if (isBoolean(raw)) {
        formatted = formatPrimitiveNoColor(ctx, raw);
        base = ' ' + '[Boolean: ' + formatted + ']';
    }

    if (keys.length === 0 && (!array || value.length === 0)) {
        return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
        if (isRegExp(value)) {
            return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
        } else {
            return ctx.stylize('[Object]', 'special');
        }
    }

    ctx.seen.push(value);

    var output;
    if (array) {
        output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
    } else {
        output = keys.map(function (key) {
            return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
        });
    }

    ctx.seen.pop();

    return reduceToSingleString(output, base, braces);
}
function inspect(obj, opts) {
    // default options
    var ctx = {
        seen: [],
        stylize: stylizeNoColor
    };
    // legacy...
    if (arguments.length >= 3) ctx.depth = arguments[2];
    if (arguments.length >= 4) ctx.colors = arguments[3];
    if (isBoolean(opts)) {
        // legacy...
        ctx.showHidden = opts;
    } else if (opts) {
        // got an "options" object
        exports._extend(ctx, opts);
    }
    // set default options
    if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
    if (isUndefined(ctx.depth)) ctx.depth = 2;
    if (isUndefined(ctx.colors)) ctx.colors = false;
    if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
    if (ctx.colors) ctx.stylize = stylizeWithColor;
    return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;

var formatRegExp = /%[sdj%]/g;
util.format = function (f) {
    if (!isString(f)) {
        var objects = [];
        for (var j = 0; j < arguments.length; j++) {
            objects.push(inspect(arguments[j]));
        }
        return objects.join(' ');
    }

    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function (x) {
        if (x === '%%') return '%';
        if (i >= len) return x;
        switch (x) {
            case '%s':
                return String(args[i++]);
            case '%d':
                return Number(args[i++]);
            default:
                return x;
        }
    });
    for (var x = args[i]; i < len; x = args[++i]) {
        if (isNull(x) || !isObject(x)) {
            str += ' ' + x;
        } else {
            str += ' ' + inspect(x);
        }
    }
    return str;
};