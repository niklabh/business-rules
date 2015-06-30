/**
 * Copyright 2013 Chris Powers
 * http://chrisjpowers.com
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var standardOperators = {
  present: function (actual, target) {
    return !!actual;
  },
  blank: function (actual, target) {
    return !actual;
  },
  equalTo: function (actual, target) {
    return "" + actual === "" + target;
  },
  equals: function (actual, target) {
    return "" + actual === "" + target;
  },
  notEqualTo: function (actual, target) {
    return "" + actual !== "" + target;
  },
  notEquals: function (actual, target) {
    return "" + actual !== "" + target;
  },
  greaterThan: function (actual, target) {
    return parseFloat(actual, 10) > parseFloat(target, 10);
  },
  greaterThanEqual: function (actual, target) {
    return parseFloat(actual, 10) >= parseFloat(target, 10);
  },
  lessThan: function (actual, target) {
    return parseFloat(actual, 10) < parseFloat(target, 10);
  },
  lessThanEqual: function (actual, target) {
    return parseFloat(actual, 10) <= parseFloat(target, 10);
  },
  isOneOf: function (actual, target) {
    return (target + '').indexOf(actual) > -1;
  },
  notOneOf: function (actual, target) {
    return (target).indexOf(actual + '') == -1;
  },
  isIn: function (actual, target) {
    return (target).indexOf(actual) > -1;
  },
  matchesRegex: function (actual, target) {
    var r = target.replace(/^\/|\/$/g, "");
    var regex = new RegExp(r);
    return regex.test("" + actual);
  },
  // assumes both arrays are sorted.
  intersection: function (actual, target) {
    var ai = 0,
      ti = 0;
    while (ai < actual.length & ti < target.length) {
      if (actual[ai] < target[ti]) {
        ai++;
      } else if (actual[ai] > target[ti]) {
        ti++;
      } else {
        return true;
      }
    }
    return false;
  },
  complement: function (actual, target) {
    var i;
    for (i = 0; i < actual.length; i++) {
      if (target.indexOf(actual[i]) !== -1) {
        return false;
      }
    }
    return true;
  },
  //all elements of actual present in target
  hasAll: function (actual, target) {
    var i;
    for (i = 0; i < actual.length; i++) {
      if (target.indexOf(actual[i]) === -1) {
        return false;
      }
    }
    return true;
  }

};

function getError(node) {
  var err = new Error(node.error || 'Rule application failed');
  err.failedRule = node.name;
  return err;
}

var RuleEngine = window.RuleEngine = function RuleEngine(rule) {
  rule = rule || {};
  this.operators = {};
  this.actions = rule.actions || [];
  this.conditions = rule.conditions || {
    all: []
  };
  this.addOperators(standardOperators);
};

RuleEngine.prototype = {
  run: function (conditionsAdapter, actionsAdapter, cb) {
    var out, error, _this = this;
    this.matches(conditionsAdapter, function (err, result) {
      out = result;
      error = err;
      if (result && !err) _this.runActions(actionsAdapter, conditionsAdapter);
      if (cb) cb(err, result);
    });
    return out;
  },

  matches: function (conditionsAdapter, cb) {
    var out, err;
    handleNode(this.conditions, conditionsAdapter, this, function (e, result) {
      if (e) {
        err = e;
        console.log("ERR", e.message, e.stack);
      }
      out = result;
      if (cb) cb(e, result);
    });
    if (!cb) return out;
  },

  operator: function (name) {
    return this.operators[name];
  },

  addOperators: function (newOperators) {
    var _this = this;
    for (var key in newOperators) {
      if (newOperators.hasOwnProperty(key)) {
        (function () {
          var op = newOperators[key];
          // synchronous style operator, needs to be wrapped
          if (op.length === 2) {
            _this.operators[key] = function (actual, target, cb) {
              try {
                var result = op(actual, target);
                cb(null, result);
              } catch (e) {
                cb(e);
              }
            };
          }
          // asynchronous style, no wrapping needed
          else if (op.length === 3) {
            _this.operators[key] = op;
          } else {
            throw "Operators should have an arity of 2 or 3; " + key + " has " + op.length;
          }
        })();
      }
    }
  },

  runActions: function (actionsAdapter, conditionsAdapter) {
    for (var i = 0; i < this.actions.length; i++) {
      var actionData = this.actions[i];
      var actionName = actionData.value;
      var actionFunction = actionsAdapter[actionName];
      if (actionFunction) {
        actionFunction(new Finder(actionData), conditionsAdapter);
      }
    }
  }
};

function Finder(data) {
  this.data = data;
}

Finder.prototype = {
  find: function () {
    var currentNode = this.data;
    for (var i = 0; i < arguments.length; i++) {
      var name = arguments[i];
      currentNode = findByName(name, currentNode);
      if (!currentNode) {
        return null;
      }
    }
    return currentNode.value;
  }
};

function findByName(name, node) {
  var fields = node.fields || [];
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    if (field.name === name) {
      return field;
    }
  }
  return null;
}

function handleNode(node, obj, engine, cb) {
  if (node.all || node.any || node.none) {
    handleConditionalNode(node, obj, engine, cb);
  } else {
    handleRuleNode(node, obj, engine, cb);
  }
}

function handleConditionalNode(node, obj, engine, cb) {
  try {
    var isAll = !! node.all;
    var isAny = !! node.any;
    var isNone = !! node.none;
    var nodes = isAll ? node.all : node.any;
    if (isNone) {
      nodes = node.none;
    }
    if (!nodes.length) {
      return cb(null, true);
    }
    var currentNode, i = 0;
    var next = function () {
      try {
        currentNode = nodes[i];
        i++;
        if (currentNode) {
          handleNode(currentNode, obj, engine, done);
        } else {
          // If we have gone through all of the nodes and gotten
          // here, either they have all been true (success for `all`)
          // or all false (failure for `any`);
          var r = isNone ? true : isAll;
          cb(null, r);
        }
      } catch (e) {
        console.log("error " + e);
        cb(e);
      }
    };

    var done = function (err, result) {
      if (err) return cb(err);
      if (isAll && !result) {
        console.log('failed for ' + currentNode.name);
        return cb(getError(currentNode), false);
      }
      if (isAny && !! result) return cb(null, true);
      if (isNone && !! result) {
        return cb(getError(currentNode), false);
      }
      next();
    };

    next();
  } catch (e) {
    cb(e);
  }
}

function handleRuleNode(node, obj, engine, cb) {
  try {
    var value = obj[node.name];
    if (value && value.call) {
      if (value.length === 1) {
        return value.call(obj, function (result) {
          console.log("applying rule: " + node.name);
          obj[node.name] = result;
          compareValues(result, node.operator, node.value, engine, cb);
        });
      } else {
        console.log("fetching value from " + node.name);
        obj[node.name] = value = value();
      }
    }
    console.log("applying rule: " + node.name);
    compareValues(value, node.operator, node.value, engine, cb);
  } catch (e) {
    cb(e);
  }
}

function compareValues(actual, operator, value, engine, cb) {
  try {
    var operatorFunction = engine.operator(operator);
    if (!operatorFunction) throw "Missing " + operator + " operator";
    console.log(actual + " " + operator + " " + value);
    operatorFunction(actual, value, cb);
  } catch (e) {
    cb(e);
  }
}

//module.exports = RuleEngine;

// // -- Test Code ---------------------------------------------------------
// if (require.main === module) {
//   (function () {
//     var node = {name: 'promocode_usage_count', error: 'unknown error'};
//     console.log(getError(node));
//   })();
// }
