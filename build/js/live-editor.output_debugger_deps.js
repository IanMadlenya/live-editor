/*
  Copyright (C) 2012-2013 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
/*jslint vars:false, bitwise:true*/
/*jshint indent:4*/
/*global exports:true, define:true*/
(function (root, factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // and plain browser loading,
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((root.estraverse = {}));
    }
}(this, function (exports) {
    'use strict';

    var Syntax,
        isArray,
        VisitorOption,
        VisitorKeys,
        objectCreate,
        objectKeys,
        BREAK,
        SKIP,
        REMOVE;

    function ignoreJSHintError() { }

    isArray = Array.isArray;
    if (!isArray) {
        isArray = function isArray(array) {
            return Object.prototype.toString.call(array) === '[object Array]';
        };
    }

    function deepCopy(obj) {
        var ret = {}, key, val;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                val = obj[key];
                if (typeof val === 'object' && val !== null) {
                    ret[key] = deepCopy(val);
                } else {
                    ret[key] = val;
                }
            }
        }
        return ret;
    }

    function shallowCopy(obj) {
        var ret = {}, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    ignoreJSHintError(shallowCopy);

    // based on LLVM libc++ upper_bound / lower_bound
    // MIT License

    function upperBound(array, func) {
        var diff, len, i, current;

        len = array.length;
        i = 0;

        while (len) {
            diff = len >>> 1;
            current = i + diff;
            if (func(array[current])) {
                len = diff;
            } else {
                i = current + 1;
                len -= diff + 1;
            }
        }
        return i;
    }

    function lowerBound(array, func) {
        var diff, len, i, current;

        len = array.length;
        i = 0;

        while (len) {
            diff = len >>> 1;
            current = i + diff;
            if (func(array[current])) {
                i = current + 1;
                len -= diff + 1;
            } else {
                len = diff;
            }
        }
        return i;
    }
    ignoreJSHintError(lowerBound);

    objectCreate = Object.create || (function () {
        function F() { }

        return function (o) {
            F.prototype = o;
            return new F();
        };
    })();

    objectKeys = Object.keys || function (o) {
        var keys = [], key;
        for (key in o) {
            keys.push(key);
        }
        return keys;
    };

    function extend(to, from) {
        objectKeys(from).forEach(function (key) {
            to[key] = from[key];
        });
        return to;
    }

    Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        ArrayPattern: 'ArrayPattern',
        ArrowFunctionExpression: 'ArrowFunctionExpression',
        AwaitExpression: 'AwaitExpression', // CAUTION: It's deferred to ES7.
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ClassBody: 'ClassBody',
        ClassDeclaration: 'ClassDeclaration',
        ClassExpression: 'ClassExpression',
        ComprehensionBlock: 'ComprehensionBlock',  // CAUTION: It's deferred to ES7.
        ComprehensionExpression: 'ComprehensionExpression',  // CAUTION: It's deferred to ES7.
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DebuggerStatement: 'DebuggerStatement',
        DirectiveStatement: 'DirectiveStatement',
        DoWhileStatement: 'DoWhileStatement',
        EmptyStatement: 'EmptyStatement',
        ExportBatchSpecifier: 'ExportBatchSpecifier',
        ExportDeclaration: 'ExportDeclaration',
        ExportSpecifier: 'ExportSpecifier',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        ForOfStatement: 'ForOfStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        GeneratorExpression: 'GeneratorExpression',  // CAUTION: It's deferred to ES7.
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        ImportDeclaration: 'ImportDeclaration',
        ImportDefaultSpecifier: 'ImportDefaultSpecifier',
        ImportNamespaceSpecifier: 'ImportNamespaceSpecifier',
        ImportSpecifier: 'ImportSpecifier',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        MethodDefinition: 'MethodDefinition',
        ModuleSpecifier: 'ModuleSpecifier',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        ObjectPattern: 'ObjectPattern',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SpreadElement: 'SpreadElement',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        TaggedTemplateExpression: 'TaggedTemplateExpression',
        TemplateElement: 'TemplateElement',
        TemplateLiteral: 'TemplateLiteral',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement',
        YieldExpression: 'YieldExpression'
    };

    VisitorKeys = {
        AssignmentExpression: ['left', 'right'],
        ArrayExpression: ['elements'],
        ArrayPattern: ['elements'],
        ArrowFunctionExpression: ['params', 'defaults', 'rest', 'body'],
        AwaitExpression: ['argument'], // CAUTION: It's deferred to ES7.
        BlockStatement: ['body'],
        BinaryExpression: ['left', 'right'],
        BreakStatement: ['label'],
        CallExpression: ['callee', 'arguments'],
        CatchClause: ['param', 'body'],
        ClassBody: ['body'],
        ClassDeclaration: ['id', 'body', 'superClass'],
        ClassExpression: ['id', 'body', 'superClass'],
        ComprehensionBlock: ['left', 'right'],  // CAUTION: It's deferred to ES7.
        ComprehensionExpression: ['blocks', 'filter', 'body'],  // CAUTION: It's deferred to ES7.
        ConditionalExpression: ['test', 'consequent', 'alternate'],
        ContinueStatement: ['label'],
        DebuggerStatement: [],
        DirectiveStatement: [],
        DoWhileStatement: ['body', 'test'],
        EmptyStatement: [],
        ExportBatchSpecifier: [],
        ExportDeclaration: ['declaration', 'specifiers', 'source'],
        ExportSpecifier: ['id', 'name'],
        ExpressionStatement: ['expression'],
        ForStatement: ['init', 'test', 'update', 'body'],
        ForInStatement: ['left', 'right', 'body'],
        ForOfStatement: ['left', 'right', 'body'],
        FunctionDeclaration: ['id', 'params', 'defaults', 'rest', 'body'],
        FunctionExpression: ['id', 'params', 'defaults', 'rest', 'body'],
        GeneratorExpression: ['blocks', 'filter', 'body'],  // CAUTION: It's deferred to ES7.
        Identifier: [],
        IfStatement: ['test', 'consequent', 'alternate'],
        ImportDeclaration: ['specifiers', 'source'],
        ImportDefaultSpecifier: ['id'],
        ImportNamespaceSpecifier: ['id'],
        ImportSpecifier: ['id', 'name'],
        Literal: [],
        LabeledStatement: ['label', 'body'],
        LogicalExpression: ['left', 'right'],
        MemberExpression: ['object', 'property'],
        MethodDefinition: ['key', 'value'],
        ModuleSpecifier: [],
        NewExpression: ['callee', 'arguments'],
        ObjectExpression: ['properties'],
        ObjectPattern: ['properties'],
        Program: ['body'],
        Property: ['key', 'value'],
        ReturnStatement: ['argument'],
        SequenceExpression: ['expressions'],
        SpreadElement: ['argument'],
        SwitchStatement: ['discriminant', 'cases'],
        SwitchCase: ['test', 'consequent'],
        TaggedTemplateExpression: ['tag', 'quasi'],
        TemplateElement: [],
        TemplateLiteral: ['quasis', 'expressions'],
        ThisExpression: [],
        ThrowStatement: ['argument'],
        TryStatement: ['block', 'handlers', 'handler', 'guardedHandlers', 'finalizer'],
        UnaryExpression: ['argument'],
        UpdateExpression: ['argument'],
        VariableDeclaration: ['declarations'],
        VariableDeclarator: ['id', 'init'],
        WhileStatement: ['test', 'body'],
        WithStatement: ['object', 'body'],
        YieldExpression: ['argument']
    };

    // unique id
    BREAK = {};
    SKIP = {};
    REMOVE = {};

    VisitorOption = {
        Break: BREAK,
        Skip: SKIP,
        Remove: REMOVE
    };

    function Reference(parent, key) {
        this.parent = parent;
        this.key = key;
    }

    Reference.prototype.replace = function replace(node) {
        this.parent[this.key] = node;
    };

    Reference.prototype.remove = function remove() {
        if (isArray(this.parent)) {
            this.parent.splice(this.key, 1);
            return true;
        } else {
            this.replace(null);
            return false;
        }
    };

    function Element(node, path, wrap, ref) {
        this.node = node;
        this.path = path;
        this.wrap = wrap;
        this.ref = ref;
    }

    function Controller() { }

    // API:
    // return property path array from root to current node
    Controller.prototype.path = function path() {
        var i, iz, j, jz, result, element;

        function addToPath(result, path) {
            if (isArray(path)) {
                for (j = 0, jz = path.length; j < jz; ++j) {
                    result.push(path[j]);
                }
            } else {
                result.push(path);
            }
        }

        // root node
        if (!this.__current.path) {
            return null;
        }

        // first node is sentinel, second node is root element
        result = [];
        for (i = 2, iz = this.__leavelist.length; i < iz; ++i) {
            element = this.__leavelist[i];
            addToPath(result, element.path);
        }
        addToPath(result, this.__current.path);
        return result;
    };

    // API:
    // return type of current node
    Controller.prototype.type = function () {
        var node = this.current();
        return node.type || this.__current.wrap;
    };

    // API:
    // return array of parent elements
    Controller.prototype.parents = function parents() {
        var i, iz, result;

        // first node is sentinel
        result = [];
        for (i = 1, iz = this.__leavelist.length; i < iz; ++i) {
            result.push(this.__leavelist[i].node);
        }

        return result;
    };

    // API:
    // return current node
    Controller.prototype.current = function current() {
        return this.__current.node;
    };

    Controller.prototype.__execute = function __execute(callback, element) {
        var previous, result;

        result = undefined;

        previous  = this.__current;
        this.__current = element;
        this.__state = null;
        if (callback) {
            result = callback.call(this, element.node, this.__leavelist[this.__leavelist.length - 1].node);
        }
        this.__current = previous;

        return result;
    };

    // API:
    // notify control skip / break
    Controller.prototype.notify = function notify(flag) {
        this.__state = flag;
    };

    // API:
    // skip child nodes of current node
    Controller.prototype.skip = function () {
        this.notify(SKIP);
    };

    // API:
    // break traversals
    Controller.prototype['break'] = function () {
        this.notify(BREAK);
    };

    // API:
    // remove node
    Controller.prototype.remove = function () {
        this.notify(REMOVE);
    };

    Controller.prototype.__initialize = function(root, visitor) {
        this.visitor = visitor;
        this.root = root;
        this.__worklist = [];
        this.__leavelist = [];
        this.__current = null;
        this.__state = null;
        this.__fallback = visitor.fallback === 'iteration';
        this.__keys = VisitorKeys;
        if (visitor.keys) {
            this.__keys = extend(objectCreate(this.__keys), visitor.keys);
        }
    };

    function isNode(node) {
        if (node == null) {
            return false;
        }
        return typeof node === 'object' && typeof node.type === 'string';
    }

    function isProperty(nodeType, key) {
        return (nodeType === Syntax.ObjectExpression || nodeType === Syntax.ObjectPattern) && 'properties' === key;
    }

    Controller.prototype.traverse = function traverse(root, visitor) {
        var worklist,
            leavelist,
            element,
            node,
            nodeType,
            ret,
            key,
            current,
            current2,
            candidates,
            candidate,
            sentinel;

        this.__initialize(root, visitor);

        sentinel = {};

        // reference
        worklist = this.__worklist;
        leavelist = this.__leavelist;

        // initialize
        worklist.push(new Element(root, null, null, null));
        leavelist.push(new Element(null, null, null, null));

        while (worklist.length) {
            element = worklist.pop();

            if (element === sentinel) {
                element = leavelist.pop();

                ret = this.__execute(visitor.leave, element);

                if (this.__state === BREAK || ret === BREAK) {
                    return;
                }
                continue;
            }

            if (element.node) {

                ret = this.__execute(visitor.enter, element);

                if (this.__state === BREAK || ret === BREAK) {
                    return;
                }

                worklist.push(sentinel);
                leavelist.push(element);

                if (this.__state === SKIP || ret === SKIP) {
                    continue;
                }

                node = element.node;
                nodeType = element.wrap || node.type;
                candidates = this.__keys[nodeType];
                if (!candidates) {
                    if (this.__fallback) {
                        candidates = objectKeys(node);
                    } else {
                        throw new Error('Unknown node type ' + nodeType + '.');
                    }
                }

                current = candidates.length;
                while ((current -= 1) >= 0) {
                    key = candidates[current];
                    candidate = node[key];
                    if (!candidate) {
                        continue;
                    }

                    if (isArray(candidate)) {
                        current2 = candidate.length;
                        while ((current2 -= 1) >= 0) {
                            if (!candidate[current2]) {
                                continue;
                            }
                            if (isProperty(nodeType, candidates[current])) {
                                element = new Element(candidate[current2], [key, current2], 'Property', null);
                            } else if (isNode(candidate[current2])) {
                                element = new Element(candidate[current2], [key, current2], null, null);
                            } else {
                                continue;
                            }
                            worklist.push(element);
                        }
                    } else if (isNode(candidate)) {
                        worklist.push(new Element(candidate, key, null, null));
                    }
                }
            }
        }
    };

    Controller.prototype.replace = function replace(root, visitor) {
        function removeElem(element) {
            var i,
                key,
                nextElem,
                parent;

            if (element.ref.remove()) {
                // When the reference is an element of an array.
                key = element.ref.key;
                parent = element.ref.parent;

                // If removed from array, then decrease following items' keys.
                i = worklist.length;
                while (i--) {
                    nextElem = worklist[i];
                    if (nextElem.ref && nextElem.ref.parent === parent) {
                        if  (nextElem.ref.key < key) {
                            break;
                        }
                        --nextElem.ref.key;
                    }
                }
            }
        }

        var worklist,
            leavelist,
            node,
            nodeType,
            target,
            element,
            current,
            current2,
            candidates,
            candidate,
            sentinel,
            outer,
            key;

        this.__initialize(root, visitor);

        sentinel = {};

        // reference
        worklist = this.__worklist;
        leavelist = this.__leavelist;

        // initialize
        outer = {
            root: root
        };
        element = new Element(root, null, null, new Reference(outer, 'root'));
        worklist.push(element);
        leavelist.push(element);

        while (worklist.length) {
            element = worklist.pop();

            if (element === sentinel) {
                element = leavelist.pop();

                target = this.__execute(visitor.leave, element);

                // node may be replaced with null,
                // so distinguish between undefined and null in this place
                if (target !== undefined && target !== BREAK && target !== SKIP && target !== REMOVE) {
                    // replace
                    element.ref.replace(target);
                }

                if (this.__state === REMOVE || target === REMOVE) {
                    removeElem(element);
                }

                if (this.__state === BREAK || target === BREAK) {
                    return outer.root;
                }
                continue;
            }

            target = this.__execute(visitor.enter, element);

            // node may be replaced with null,
            // so distinguish between undefined and null in this place
            if (target !== undefined && target !== BREAK && target !== SKIP && target !== REMOVE) {
                // replace
                element.ref.replace(target);
                element.node = target;
            }

            if (this.__state === REMOVE || target === REMOVE) {
                removeElem(element);
                element.node = null;
            }

            if (this.__state === BREAK || target === BREAK) {
                return outer.root;
            }

            // node may be null
            node = element.node;
            if (!node) {
                continue;
            }

            worklist.push(sentinel);
            leavelist.push(element);

            if (this.__state === SKIP || target === SKIP) {
                continue;
            }

            nodeType = element.wrap || node.type;
            candidates = this.__keys[nodeType];
            if (!candidates) {
                if (this.__fallback) {
                    candidates = objectKeys(node);
                } else {
                    throw new Error('Unknown node type ' + nodeType + '.');
                }
            }

            current = candidates.length;
            while ((current -= 1) >= 0) {
                key = candidates[current];
                candidate = node[key];
                if (!candidate) {
                    continue;
                }

                if (isArray(candidate)) {
                    current2 = candidate.length;
                    while ((current2 -= 1) >= 0) {
                        if (!candidate[current2]) {
                            continue;
                        }
                        if (isProperty(nodeType, candidates[current])) {
                            element = new Element(candidate[current2], [key, current2], 'Property', new Reference(candidate, current2));
                        } else if (isNode(candidate[current2])) {
                            element = new Element(candidate[current2], [key, current2], null, new Reference(candidate, current2));
                        } else {
                            continue;
                        }
                        worklist.push(element);
                    }
                } else if (isNode(candidate)) {
                    worklist.push(new Element(candidate, key, null, new Reference(node, key)));
                }
            }
        }

        return outer.root;
    };

    function traverse(root, visitor) {
        var controller = new Controller();
        return controller.traverse(root, visitor);
    }

    function replace(root, visitor) {
        var controller = new Controller();
        return controller.replace(root, visitor);
    }

    function extendCommentRange(comment, tokens) {
        var target;

        target = upperBound(tokens, function search(token) {
            return token.range[0] > comment.range[0];
        });

        comment.extendedRange = [comment.range[0], comment.range[1]];

        if (target !== tokens.length) {
            comment.extendedRange[1] = tokens[target].range[0];
        }

        target -= 1;
        if (target >= 0) {
            comment.extendedRange[0] = tokens[target].range[1];
        }

        return comment;
    }

    function attachComments(tree, providedComments, tokens) {
        // At first, we should calculate extended comment ranges.
        var comments = [], comment, len, i, cursor;

        if (!tree.range) {
            throw new Error('attachComments needs range information');
        }

        // tokens array is empty, we attach comments to tree as 'leadingComments'
        if (!tokens.length) {
            if (providedComments.length) {
                for (i = 0, len = providedComments.length; i < len; i += 1) {
                    comment = deepCopy(providedComments[i]);
                    comment.extendedRange = [0, tree.range[0]];
                    comments.push(comment);
                }
                tree.leadingComments = comments;
            }
            return tree;
        }

        for (i = 0, len = providedComments.length; i < len; i += 1) {
            comments.push(extendCommentRange(deepCopy(providedComments[i]), tokens));
        }

        // This is based on John Freeman's implementation.
        cursor = 0;
        traverse(tree, {
            enter: function (node) {
                var comment;

                while (cursor < comments.length) {
                    comment = comments[cursor];
                    if (comment.extendedRange[1] > node.range[0]) {
                        break;
                    }

                    if (comment.extendedRange[1] === node.range[0]) {
                        if (!node.leadingComments) {
                            node.leadingComments = [];
                        }
                        node.leadingComments.push(comment);
                        comments.splice(cursor, 1);
                    } else {
                        cursor += 1;
                    }
                }

                // already out of owned node
                if (cursor === comments.length) {
                    return VisitorOption.Break;
                }

                if (comments[cursor].extendedRange[0] > node.range[1]) {
                    return VisitorOption.Skip;
                }
            }
        });

        cursor = 0;
        traverse(tree, {
            leave: function (node) {
                var comment;

                while (cursor < comments.length) {
                    comment = comments[cursor];
                    if (node.range[1] < comment.extendedRange[0]) {
                        break;
                    }

                    if (node.range[1] === comment.extendedRange[0]) {
                        if (!node.trailingComments) {
                            node.trailingComments = [];
                        }
                        node.trailingComments.push(comment);
                        comments.splice(cursor, 1);
                    } else {
                        cursor += 1;
                    }
                }

                // already out of owned node
                if (cursor === comments.length) {
                    return VisitorOption.Break;
                }

                if (comments[cursor].extendedRange[0] > node.range[1]) {
                    return VisitorOption.Skip;
                }
            }
        });

        return tree;
    }

    exports.version = '1.8.1-dev';
    exports.Syntax = Syntax;
    exports.traverse = traverse;
    exports.replace = replace;
    exports.attachComments = attachComments;
    exports.VisitorKeys = VisitorKeys;
    exports.VisitorOption = VisitorOption;
    exports.Controller = Controller;
}));
/* vim: set sw=4 ts=4 et tw=80 : */

/*
  Copyright (C) 2012-2013 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2013 Alex Seville <hi@alexanderseville.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global exports:true, define:true, require:true*/
(function (factory, global) {
    'use strict';

    function namespace(str, obj) {
        var i, iz, names, name;
        names = str.split('.');
        for (i = 0, iz = names.length; i < iz; ++i) {
            name = names[i];
            if (obj.hasOwnProperty(name)) {
                obj = obj[name];
            } else {
                obj = (obj[name] = {});
            }
        }
        return obj;
    }

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // and plain browser loading,
    if (typeof define === 'function' && define.amd) {
        define('escope', ['exports', 'estraverse'], function (exports, estraverse) {
            factory(exports, global, estraverse);
        });
    } else if (typeof exports !== 'undefined') {
        factory(exports, global, require('estraverse'));
    } else {
        factory(namespace('escope', global), global, global.estraverse);
    }
}(function (exports, global, estraverse) {
    'use strict';

    var Syntax,
        Map,
        currentScope,
        globalScope,
        scopes,
        options;

    Syntax = estraverse.Syntax;

    if (typeof global.Map !== 'undefined') {
        // ES6 Map
        Map = global.Map;
    } else {
        Map = function Map() {
            this.__data = {};
        };

        Map.prototype.get = function MapGet(key) {
            key = '$' + key;
            if (this.__data.hasOwnProperty(key)) {
                return this.__data[key];
            }
            return undefined;
        };

        Map.prototype.has = function MapHas(key) {
            key = '$' + key;
            return this.__data.hasOwnProperty(key);
        };

        Map.prototype.set = function MapSet(key, val) {
            key = '$' + key;
            this.__data[key] = val;
        };

        Map.prototype['delete'] = function MapDelete(key) {
            key = '$' + key;
            return delete this.__data[key];
        };
    }

    function assert(cond, text) {
        if (!cond) {
            throw new Error(text);
        }
    }

    function defaultOptions() {
        return {
            optimistic: false,
            directive: false
        };
    }

    function updateDeeply(target, override) {
        var key, val;

        function isHashObject(target) {
            return typeof target === 'object' && target instanceof Object && !(target instanceof RegExp);
        }

        for (key in override) {
            if (override.hasOwnProperty(key)) {
                val = override[key];
                if (isHashObject(val)) {
                    if (isHashObject(target[key])) {
                        updateDeeply(target[key], val);
                    } else {
                        target[key] = updateDeeply({}, val);
                    }
                } else {
                    target[key] = val;
                }
            }
        }
        return target;
    }

    function Reference(ident, scope, flag, writeExpr, maybeImplicitGlobal) {
        this.identifier = ident;
        this.from = scope;
        this.tainted = false;
        this.resolved = null;
        this.flag = flag;
        if (this.isWrite()) {
            this.writeExpr = writeExpr;
        }
        this.__maybeImplicitGlobal = maybeImplicitGlobal;
    }

    Reference.READ = 0x1;
    Reference.WRITE = 0x2;
    Reference.RW = 0x3;

    Reference.prototype.isStatic = function isStatic() {
        return !this.tainted && this.resolved && this.resolved.scope.isStatic();
    };

    Reference.prototype.isWrite = function isWrite() {
        return this.flag & Reference.WRITE;
    };

    Reference.prototype.isRead = function isRead() {
        return this.flag & Reference.READ;
    };

    Reference.prototype.isReadOnly = function isReadOnly() {
        return this.flag === Reference.READ;
    };

    Reference.prototype.isWriteOnly = function isWriteOnly() {
        return this.flag === Reference.WRITE;
    };

    Reference.prototype.isReadWrite = function isReadWrite() {
        return this.flag === Reference.RW;
    };

    function Variable(name, scope) {
        this.name = name;
        this.identifiers = [];
        this.references = [];

        this.defs = [];

        this.tainted = false;
        this.stack = true;
        this.scope = scope;
    }

    Variable.CatchClause = 'CatchClause';
    Variable.Parameter = 'Parameter';
    Variable.FunctionName = 'FunctionName';
    Variable.Variable = 'Variable';
    Variable.ImplicitGlobalVariable = 'ImplicitGlobalVariable';

    function isStrictScope(scope, block) {
        var body, i, iz, stmt, expr;

        // When upper scope is exists and strict, inner scope is also strict.
        if (scope.upper && scope.upper.isStrict) {
            return true;
        }

        if (scope.type === 'function') {
            body = block.body;
        } else if (scope.type === 'global') {
            body = block;
        } else {
            return false;
        }

        if (options.directive) {
            for (i = 0, iz = body.body.length; i < iz; ++i) {
                stmt = body.body[i];
                if (stmt.type !== 'DirectiveStatement') {
                    break;
                }
                if (stmt.raw === '"use strict"' || stmt.raw === '\'use strict\'') {
                    return true;
                }
            }
        } else {
            for (i = 0, iz = body.body.length; i < iz; ++i) {
                stmt = body.body[i];
                if (stmt.type !== Syntax.ExpressionStatement) {
                    break;
                }
                expr = stmt.expression;
                if (expr.type !== Syntax.Literal || typeof expr.value !== 'string') {
                    break;
                }
                if (expr.raw != null) {
                    if (expr.raw === '"use strict"' || expr.raw === '\'use strict\'') {
                        return true;
                    }
                } else {
                    if (expr.value === 'use strict') {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function Scope(block, opt) {
        var variable, body;

        this.type =
            (block.type === Syntax.CatchClause) ? 'catch' :
            (block.type === Syntax.WithStatement) ? 'with' :
            (block.type === Syntax.Program) ? 'global' : 'function';
        this.set = new Map();
        this.taints = new Map();
        this.dynamic = this.type === 'global' || this.type === 'with';
        this.block = block;
        this.through = [];
        this.variables = [];
        this.references = [];
        this.left = [];
        this.variableScope =
            (this.type === 'global' || this.type === 'function') ? this : currentScope.variableScope;
        this.functionExpressionScope = false;
        this.directCallToEvalScope = false;
        this.thisFound = false;
        body = this.type === 'function' ? block.body : block;
        if (opt.naming) {
            this.__define(block.id, {
                type: Variable.FunctionName,
                name: block.id,
                node: block
            });
            this.functionExpressionScope = true;
        } else {
            if (this.type === 'function') {
                variable = new Variable('arguments', this);
                this.taints.set('arguments', true);
                this.set.set('arguments', variable);
                this.variables.push(variable);
            }

            if (block.type === Syntax.FunctionExpression && block.id) {
                new Scope(block, { naming: true });
            }
        }

        this.upper = currentScope;
        this.isStrict = isStrictScope(this, block);

        this.childScopes = [];
        if (currentScope) {
            currentScope.childScopes.push(this);
        }


        // RAII
        currentScope = this;
        if (this.type === 'global') {
            globalScope = this;
            globalScope.implicit = {
                set: new Map(),
                variables: []
            };
        }
        scopes.push(this);
    }

    Scope.prototype.__close = function __close() {
        var i, iz, ref, current, node, implicit;

        // Because if this is global environment, upper is null
        if (!this.dynamic || options.optimistic) {
            // static resolve
            for (i = 0, iz = this.left.length; i < iz; ++i) {
                ref = this.left[i];
                if (!this.__resolve(ref)) {
                    this.__delegateToUpperScope(ref);
                }
            }
        } else {
            // this is "global" / "with" / "function with eval" environment
            if (this.type === 'with') {
                for (i = 0, iz = this.left.length; i < iz; ++i) {
                    ref = this.left[i];
                    ref.tainted = true;
                    this.__delegateToUpperScope(ref);
                }
            } else {
                for (i = 0, iz = this.left.length; i < iz; ++i) {
                    // notify all names are through to global
                    ref = this.left[i];
                    current = this;
                    do {
                        current.through.push(ref);
                        current = current.upper;
                    } while (current);
                }
            }
        }

        if (this.type === 'global') {
            implicit = [];
            for (i = 0, iz = this.left.length; i < iz; ++i) {
                ref = this.left[i];
                if (ref.__maybeImplicitGlobal && !this.set.has(ref.identifier.name)) {
                    implicit.push(ref.__maybeImplicitGlobal);
                }
            }

            // create an implicit global variable from assignment expression
            for (i = 0, iz = implicit.length; i < iz; ++i) {
                node = implicit[i];
                this.__defineImplicit(node.left, {
                    type: Variable.ImplicitGlobalVariable,
                    name: node.left,
                    node: node
                });
            }
        }

        this.left = null;
        currentScope = this.upper;
    };

    Scope.prototype.__resolve = function __resolve(ref) {
        var variable, name;
        name = ref.identifier.name;
        if (this.set.has(name)) {
            variable = this.set.get(name);
            variable.references.push(ref);
            variable.stack = variable.stack && ref.from.variableScope === this.variableScope;
            if (ref.tainted) {
                variable.tainted = true;
                this.taints.set(variable.name, true);
            }
            ref.resolved = variable;
            return true;
        }
        return false;
    };

    Scope.prototype.__delegateToUpperScope = function __delegateToUpperScope(ref) {
        if (this.upper) {
            this.upper.left.push(ref);
        }
        this.through.push(ref);
    };

    Scope.prototype.__defineImplicit = function __defineImplicit(node, info) {
        var name, variable;
        if (node && node.type === Syntax.Identifier) {
            name = node.name;
            if (!this.implicit.set.has(name)) {
                variable = new Variable(name, this);
                variable.identifiers.push(node);
                variable.defs.push(info);
                this.implicit.set.set(name, variable);
                this.implicit.variables.push(variable);
            } else {
                variable = this.implicit.set.get(name);
                variable.identifiers.push(node);
                variable.defs.push(info);
            }
        }
    };

    Scope.prototype.__define = function __define(node, info) {
        var name, variable;
        if (node && node.type === Syntax.Identifier) {
            name = node.name;
            if (!this.set.has(name)) {
                variable = new Variable(name, this);
                variable.identifiers.push(node);
                variable.defs.push(info);
                this.set.set(name, variable);
                this.variables.push(variable);
            } else {
                variable = this.set.get(name);
                variable.identifiers.push(node);
                variable.defs.push(info);
            }
        }
    };

    Scope.prototype.__referencing = function __referencing(node, assign, writeExpr, maybeImplicitGlobal) {
        var ref;
        // because Array element may be null
        if (node && node.type === Syntax.Identifier) {
            ref = new Reference(node, this, assign || Reference.READ, writeExpr, maybeImplicitGlobal);
            this.references.push(ref);
            this.left.push(ref);
        }
    };

    Scope.prototype.__detectEval = function __detectEval() {
        var current;
        current = this;
        this.directCallToEvalScope = true;
        do {
            current.dynamic = true;
            current = current.upper;
        } while (current);
    };

    Scope.prototype.__detectThis = function __detectThis() {
        this.thisFound = true;
    };

    Scope.prototype.__isClosed = function isClosed() {
        return this.left === null;
    };

    // API Scope#resolve(name)
    // returns resolved reference
    Scope.prototype.resolve = function resolve(ident) {
        var ref, i, iz;
        assert(this.__isClosed(), 'scope should be closed');
        assert(ident.type === Syntax.Identifier, 'target should be identifier');
        for (i = 0, iz = this.references.length; i < iz; ++i) {
            ref = this.references[i];
            if (ref.identifier === ident) {
                return ref;
            }
        }
        return null;
    };

    // API Scope#isStatic
    // returns this scope is static
    Scope.prototype.isStatic = function isStatic() {
        return !this.dynamic;
    };

    // API Scope#isArgumentsMaterialized
    // return this scope has materialized arguments
    Scope.prototype.isArgumentsMaterialized = function isArgumentsMaterialized() {
        // TODO(Constellation)
        // We can more aggressive on this condition like this.
        //
        // function t() {
        //     // arguments of t is always hidden.
        //     function arguments() {
        //     }
        // }
        var variable;

        // This is not function scope
        if (this.type !== 'function') {
            return true;
        }

        if (!this.isStatic()) {
            return true;
        }

        variable = this.set.get('arguments');
        assert(variable, 'always have arguments variable');
        return variable.tainted || variable.references.length  !== 0;
    };

    // API Scope#isThisMaterialized
    // return this scope has materialized `this` reference
    Scope.prototype.isThisMaterialized = function isThisMaterialized() {
        // This is not function scope
        if (this.type !== 'function') {
            return true;
        }
        if (!this.isStatic()) {
            return true;
        }
        return this.thisFound;
    };

    Scope.mangledName = '__$escope$__';

    Scope.prototype.attach = function attach() {
        if (!this.functionExpressionScope) {
            this.block[Scope.mangledName] = this;
        }
    };

    Scope.prototype.detach = function detach() {
        if (!this.functionExpressionScope) {
            delete this.block[Scope.mangledName];
        }
    };

    Scope.prototype.isUsedName = function (name) {
        if (this.set.has(name)) {
            return true;
        }
        for (var i = 0, iz = this.through.length; i < iz; ++i) {
            if (this.through[i].identifier.name === name) {
                return true;
            }
        }
        return false;
    };

    function ScopeManager(scopes) {
        this.scopes = scopes;
        this.attached = false;
    }

    // Returns appropliate scope for this node
    ScopeManager.prototype.__get = function __get(node) {
        var i, iz, scope;
        if (this.attached) {
            return node[Scope.mangledName] || null;
        }
        if (Scope.isScopeRequired(node)) {
            for (i = 0, iz = this.scopes.length; i < iz; ++i) {
                scope = this.scopes[i];
                if (!scope.functionExpressionScope) {
                    if (scope.block === node) {
                        return scope;
                    }
                }
            }
        }
        return null;
    };

    ScopeManager.prototype.acquire = function acquire(node) {
        return this.__get(node);
    };

    ScopeManager.prototype.release = function release(node) {
        var scope = this.__get(node);
        if (scope) {
            scope = scope.upper;
            while (scope) {
                if (!scope.functionExpressionScope) {
                    return scope;
                }
                scope = scope.upper;
            }
        }
        return null;
    };

    ScopeManager.prototype.attach = function attach() {
        var i, iz;
        for (i = 0, iz = this.scopes.length; i < iz; ++i) {
            this.scopes[i].attach();
        }
        this.attached = true;
    };

    ScopeManager.prototype.detach = function detach() {
        var i, iz;
        for (i = 0, iz = this.scopes.length; i < iz; ++i) {
            this.scopes[i].detach();
        }
        this.attached = false;
    };

    Scope.isScopeRequired = function isScopeRequired(node) {
        return Scope.isVariableScopeRequired(node) || node.type === Syntax.WithStatement || node.type === Syntax.CatchClause;
    };

    Scope.isVariableScopeRequired = function isVariableScopeRequired(node) {
        return node.type === Syntax.Program || node.type === Syntax.FunctionExpression || node.type === Syntax.FunctionDeclaration;
    };

    function analyze(tree, providedOptions) {
        var resultScopes;

        options = updateDeeply(defaultOptions(), providedOptions);
        resultScopes = scopes = [];
        currentScope = null;
        globalScope = null;

        // attach scope and collect / resolve names
        estraverse.traverse(tree, {
            enter: function enter(node) {
                var i, iz, decl;
                if (Scope.isScopeRequired(node)) {
                    new Scope(node, {});
                }

                switch (node.type) {
                case Syntax.AssignmentExpression:
                    if (node.operator === '=') {
                        currentScope.__referencing(node.left, Reference.WRITE, node.right, (!currentScope.isStrict && node.left.name != null) && node);
                    } else {
                        currentScope.__referencing(node.left, Reference.RW, node.right);
                    }
                    currentScope.__referencing(node.right);
                    break;

                case Syntax.ArrayExpression:
                    for (i = 0, iz = node.elements.length; i < iz; ++i) {
                        currentScope.__referencing(node.elements[i]);
                    }
                    break;

                case Syntax.BlockStatement:
                    break;

                case Syntax.BinaryExpression:
                    currentScope.__referencing(node.left);
                    currentScope.__referencing(node.right);
                    break;

                case Syntax.BreakStatement:
                    break;

                case Syntax.CallExpression:
                    currentScope.__referencing(node.callee);
                    for (i = 0, iz = node['arguments'].length; i < iz; ++i) {
                        currentScope.__referencing(node['arguments'][i]);
                    }

                    // check this is direct call to eval
                    if (!options.ignoreEval && node.callee.type === Syntax.Identifier && node.callee.name === 'eval') {
                        currentScope.variableScope.__detectEval();
                    }
                    break;

                case Syntax.CatchClause:
                    currentScope.__define(node.param, {
                        type: Variable.CatchClause,
                        name: node.param,
                        node: node
                    });
                    break;

                case Syntax.ConditionalExpression:
                    currentScope.__referencing(node.test);
                    currentScope.__referencing(node.consequent);
                    currentScope.__referencing(node.alternate);
                    break;

                case Syntax.ContinueStatement:
                    break;

                case Syntax.DirectiveStatement:
                    break;

                case Syntax.DoWhileStatement:
                    currentScope.__referencing(node.test);
                    break;

                case Syntax.DebuggerStatement:
                    break;

                case Syntax.EmptyStatement:
                    break;

                case Syntax.ExpressionStatement:
                    currentScope.__referencing(node.expression);
                    break;

                case Syntax.ForStatement:
                    currentScope.__referencing(node.init);
                    currentScope.__referencing(node.test);
                    currentScope.__referencing(node.update);
                    break;

                case Syntax.ForInStatement:
                    if (node.left.type === Syntax.VariableDeclaration) {
                        currentScope.__referencing(node.left.declarations[0].id, Reference.WRITE, null, false);
                    } else {
                        currentScope.__referencing(node.left, Reference.WRITE, null, (!currentScope.isStrict && node.left.name != null) && node);
                    }
                    currentScope.__referencing(node.right);
                    break;

                case Syntax.FunctionDeclaration:
                    // FunctionDeclaration name is defined in upper scope
                    currentScope.upper.__define(node.id, {
                        type: Variable.FunctionName,
                        name: node.id,
                        node: node
                    });
                    for (i = 0, iz = node.params.length; i < iz; ++i) {
                        currentScope.__define(node.params[i], {
                            type: Variable.Parameter,
                            name: node.params[i],
                            node: node,
                            index: i
                        });
                    }
                    break;

                case Syntax.FunctionExpression:
                    // id is defined in upper scope
                    for (i = 0, iz = node.params.length; i < iz; ++i) {
                        currentScope.__define(node.params[i], {
                            type: Variable.Parameter,
                            name: node.params[i],
                            node: node,
                            index: i
                        });
                    }
                    break;

                case Syntax.Identifier:
                    break;

                case Syntax.IfStatement:
                    currentScope.__referencing(node.test);
                    break;

                case Syntax.Literal:
                    break;

                case Syntax.LabeledStatement:
                    break;

                case Syntax.LogicalExpression:
                    currentScope.__referencing(node.left);
                    currentScope.__referencing(node.right);
                    break;

                case Syntax.MemberExpression:
                    currentScope.__referencing(node.object);
                    if (node.computed) {
                        currentScope.__referencing(node.property);
                    }
                    break;

                case Syntax.NewExpression:
                    currentScope.__referencing(node.callee);
                    for (i = 0, iz = node['arguments'].length; i < iz; ++i) {
                        currentScope.__referencing(node['arguments'][i]);
                    }
                    break;

                case Syntax.ObjectExpression:
                    break;

                case Syntax.Program:
                    break;

                case Syntax.Property:
                    currentScope.__referencing(node.value);
                    break;

                case Syntax.ReturnStatement:
                    currentScope.__referencing(node.argument);
                    break;

                case Syntax.SequenceExpression:
                    for (i = 0, iz = node.expressions.length; i < iz; ++i) {
                        currentScope.__referencing(node.expressions[i]);
                    }
                    break;

                case Syntax.SwitchStatement:
                    currentScope.__referencing(node.discriminant);
                    break;

                case Syntax.SwitchCase:
                    currentScope.__referencing(node.test);
                    break;

                case Syntax.ThisExpression:
                    currentScope.variableScope.__detectThis();
                    break;

                case Syntax.ThrowStatement:
                    currentScope.__referencing(node.argument);
                    break;

                case Syntax.TryStatement:
                    break;

                case Syntax.UnaryExpression:
                    currentScope.__referencing(node.argument);
                    break;

                case Syntax.UpdateExpression:
                    currentScope.__referencing(node.argument, Reference.RW, null);
                    break;

                case Syntax.VariableDeclaration:
                    for (i = 0, iz = node.declarations.length; i < iz; ++i) {
                        decl = node.declarations[i];
                        currentScope.variableScope.__define(decl.id, {
                            type: Variable.Variable,
                            name: decl.id,
                            node: decl,
                            index: i,
                            parent: node
                        });
                        if (decl.init) {
                            // initializer is found
                            currentScope.__referencing(decl.id, Reference.WRITE, decl.init, false);
                            currentScope.__referencing(decl.init);
                        }
                    }
                    break;

                case Syntax.VariableDeclarator:
                    break;

                case Syntax.WhileStatement:
                    currentScope.__referencing(node.test);
                    break;

                case Syntax.WithStatement:
                    // WithStatement object is referenced at upper scope
                    currentScope.upper.__referencing(node.object);
                    break;
                }
            },

            leave: function leave(node) {
                while (currentScope && node === currentScope.block) {
                    currentScope.__close();
                }
            }
        });

        assert(currentScope === null);
        globalScope = null;
        scopes = null;
        options = null;

        return new ScopeManager(resultScopes);
    }

    exports.version = '1.0.0';
    exports.Reference = Reference;
    exports.Variable = Variable;
    exports.Scope = Scope;
    exports.ScopeManager = ScopeManager;
    exports.analyze = analyze;
}, this));
/* vim: set sw=4 ts=4 et tw=80 : */

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.iframeOverlay=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"./lib/iframe-overlay.js":[function(require,module,exports){
var Poster = require("../node_modules/poster/lib/poster");
var EventSim = require("../node_modules/eventsim/lib/eventsim");
var basic = require("../node_modules/basic-ds/lib/basic");
function createOverlay(iframe) {
    var wrapper = document.createElement("span");
    wrapper.setAttribute("style", "position:relative;padding:0;margin:0;display:inline-block;");
    wrapper.setAttribute("class", "wrapper");
    var overlay = document.createElement("span");
    overlay.setAttribute("style", "position:absolute;left:0;top:0;width:100%;height:100%;");
    overlay.setAttribute("class", "overlay");
    overlay.setAttribute("tabindex", "0");
    var parent = iframe.parentElement;
    parent.insertBefore(wrapper, iframe);
    wrapper.appendChild(iframe);
    wrapper.appendChild(overlay);
    var down = false;
    var paused = false;
    var queue = new basic.LinkedList();
    var poster = new Poster(iframe.contentWindow);
    function postMouseEvent(e) {
        if (paused) {
            e["timestamp"] = Date.now();
            queue.push_front(e);
        }
        else {
            var bounds = wrapper.getBoundingClientRect();
            poster.post("mouse", {
                type: e.type,
                x: e.pageX - bounds.left,
                y: e.pageY - bounds.top,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey
            });
        }
    }
    function postKeyboardEvent(e) {
        if (paused) {
            e["timestamp"] = Date.now();
            queue.push_front(e);
        }
        else {
            poster.post("keyboard", {
                type: e.type,
                keyCode: e.keyCode,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey
            });
        }
    }
    overlay.addEventListener("click", function (e) { return postMouseEvent(e); });
    overlay.addEventListener("dblclick", function (e) { return postMouseEvent(e); });
    overlay.addEventListener("mouseover", function (e) { return postMouseEvent(e); });
    overlay.addEventListener("mouseout", function (e) { return postMouseEvent(e); });
    overlay.addEventListener("mousedown", function (e) {
        down = true;
        postMouseEvent(e);
    });
    overlay.addEventListener("mousemove", function (e) {
        if (!down) {
            postMouseEvent(e);
        }
    });
    window.addEventListener("mousemove", function (e) {
        if (down) {
            postMouseEvent(e);
        }
    });
    window.addEventListener("mouseup", function (e) {
        if (down) {
            down = false;
            postMouseEvent(e);
        }
    });
    overlay.addEventListener("keydown", function (e) { return postKeyboardEvent(e); });
    overlay.addEventListener("keypress", function (e) { return postKeyboardEvent(e); });
    overlay.addEventListener("keyup", function (e) { return postKeyboardEvent(e); });
    var keyEventRegex = /key(up|down|press)/;
    var mouseEventRegex = /click|dblclick|mouse(up|down|move|over|out)/;
    return {
        pause: function () {
            paused = true;
        },
        resume: function () {
            if (!paused) {
                return;
            }
            paused = false;
            function pop() {
                if (paused) {
                    return;
                }
                var e = queue.pop_back();
                if (!e) {
                    return;
                }
                if (e instanceof MouseEvent) {
                    postMouseEvent(e);
                }
                else if (e instanceof KeyboardEvent) {
                    postKeyboardEvent(e);
                }
                else if (mouseEventRegex.test(e.type)) {
                    postMouseEvent(e);
                }
                else if (keyEventRegex.test(e.type)) {
                    postKeyboardEvent(e);
                }
                if (queue.last && queue.last.value) {
                    var next = queue.last.value;
                    var delay = next["timestamp"] - e["timestamp"];
                    setTimeout(pop, delay);
                }
            }
            pop();
        }
    };
}
exports.createOverlay = createOverlay;
function createRelay(element) {
    var poster = new Poster(window.parent);
    poster.listen("mouse", function (e) {
        EventSim.simulate(element, e.type, {
            clientX: e.x,
            clientY: e.y,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            ctrlKey: e.ctrlKey
        });
    });
    poster.listen("keyboard", function (e) {
        EventSim.simulate(element, e.type, {
            keyCode: e.keyCode,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            ctrlKey: e.ctrlKey
        });
    });
}
exports.createRelay = createRelay;

},{"../node_modules/basic-ds/lib/basic":"/Users/kevin/iframe-overlay/node_modules/basic-ds/lib/basic.js","../node_modules/eventsim/lib/eventsim":"/Users/kevin/iframe-overlay/node_modules/eventsim/lib/eventsim.js","../node_modules/poster/lib/poster":"/Users/kevin/iframe-overlay/node_modules/poster/lib/poster.js"}],"/Users/kevin/iframe-overlay/node_modules/basic-ds/lib/LinkedList.js":[function(require,module,exports){
var ListNode = require("./ListNode");
var LinkedList = (function () {
    function LinkedList() {
        this.first = null;
        this.last = null;
    }
    LinkedList.prototype.push_back = function (value) {
        var node = new ListNode(value);
        if (this.first === null && this.last === null) {
            this.first = node;
            this.last = node;
        }
        else {
            node.prev = this.last;
            this.last.next = node;
            this.last = node;
        }
    };
    LinkedList.prototype.push_front = function (value) {
        var node = new ListNode(value);
        if (this.first === null && this.last === null) {
            this.first = node;
            this.last = node;
        }
        else {
            node.next = this.first;
            this.first.prev = node;
            this.first = node;
        }
    };
    LinkedList.prototype.pop_back = function () {
        if (this.last) {
            var value = this.last.value;
            if (this.last.prev) {
                var last = this.last;
                this.last = last.prev;
                this.last.next = null;
                last.destroy();
            }
            else {
                this.last = null;
                this.first = null;
            }
            return value;
        }
        else {
            return null;
        }
    };
    LinkedList.prototype.pop_front = function () {
        if (this.first) {
            var value = this.first.value;
            if (this.first.next) {
                var first = this.first;
                this.first = first.next;
                this.first.prev = null;
                first.destroy();
            }
            else {
                this.first = null;
                this.last = null;
            }
            return value;
        }
        else {
            return null;
        }
    };
    LinkedList.prototype.clear = function () {
        this.first = this.last = null;
    };
    LinkedList.prototype.insertBeforeNode = function (refNode, value) {
        if (refNode === this.first) {
            this.push_front(value);
        }
        else {
            var node = new ListNode(value);
            node.prev = refNode.prev;
            node.next = refNode;
            refNode.prev.next = node;
            refNode.prev = node;
        }
    };
    LinkedList.prototype.forEachNode = function (callback, _this) {
        var node = this.first;
        var index = 0;
        while (node !== null) {
            callback.call(_this, node, index);
            node = node.next;
            index++;
        }
    };
    LinkedList.prototype.forEach = function (callback, _this) {
        this.forEachNode(function (node, index) { return callback.call(_this, node.value, index); }, _this);
    };
    LinkedList.prototype.nodeAtIndex = function (index) {
        var i = 0;
        var node = this.first;
        while (node !== null) {
            if (index === i) {
                return node;
            }
            i++;
            node = node.next;
        }
        return null;
    };
    LinkedList.prototype.valueAtIndex = function (index) {
        var node = this.nodeAtIndex(index);
        return node ? node.value : undefined;
    };
    LinkedList.prototype.toArray = function () {
        var array = [];
        var node = this.first;
        while (node !== null) {
            array.push(node.value);
            node = node.next;
        }
        return array;
    };
    LinkedList.fromArray = function (array) {
        var list = new LinkedList();
        array.forEach(function (value) {
            list.push_back(value);
        });
        return list;
    };
    return LinkedList;
})();
module.exports = LinkedList;

},{"./ListNode":"/Users/kevin/iframe-overlay/node_modules/basic-ds/lib/ListNode.js"}],"/Users/kevin/iframe-overlay/node_modules/basic-ds/lib/ListNode.js":[function(require,module,exports){
var ListNode = (function () {
    function ListNode(value) {
        this.value = value;
        this.next = null;
        this.prev = null;
    }
    ListNode.prototype.destroy = function () {
        this.value = null;
        this.prev = null;
        this.next = null;
    };
    return ListNode;
})();
module.exports = ListNode;

},{}],"/Users/kevin/iframe-overlay/node_modules/basic-ds/lib/Stack.js":[function(require,module,exports){
var Stack = (function () {
    function Stack() {
        this.items = [];
        this.poppedLastItem = function (item) {
        };
    }
    Stack.prototype.push = function (item) {
        this.items.push(item);
    };
    Stack.prototype.pop = function () {
        var item = this.items.pop();
        if (this.isEmpty) {
            this.poppedLastItem(item);
        }
        return item;
    };
    Stack.prototype.peek = function () {
        return this.items[this.items.length - 1];
    };
    Stack.prototype.toArray = function () {
        return this.items.map(function (item) { return item; });
    };
    Object.defineProperty(Stack.prototype, "size", {
        get: function () {
            return this.items.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Stack.prototype, "isEmpty", {
        get: function () {
            return this.items.length === 0;
        },
        enumerable: true,
        configurable: true
    });
    return Stack;
})();
module.exports = Stack;

},{}],"/Users/kevin/iframe-overlay/node_modules/basic-ds/lib/basic.js":[function(require,module,exports){
exports.LinkedList = require("./LinkedList");
exports.Stack = require("./Stack");

},{"./LinkedList":"/Users/kevin/iframe-overlay/node_modules/basic-ds/lib/LinkedList.js","./Stack":"/Users/kevin/iframe-overlay/node_modules/basic-ds/lib/Stack.js"}],"/Users/kevin/iframe-overlay/node_modules/eventsim/lib/createKeyboardEvent.js":[function(require,module,exports){
var initKeyboardEvent_variant = (function (event) {
    try {
        event.initKeyboardEvent("keyup", false, false, window, "+", 3, true, false, true, false, false);
        if ((event["keyIdentifier"] || event["key"]) == "+" && (event["keyLocation"] || event["location"]) == 3) {
            return event.ctrlKey ? (event.altKey ? 1 : 3) : (event.shiftKey ? 2 : 4);
        }
        return 9;
    }
    catch (e) {
        return 0;
    }
})(document.createEvent("KeyboardEvent"));
var keyboardEventProperties = {
    "char": "",
    "key": "",
    "location": 0,
    "ctrlKey": false,
    "shiftKey": false,
    "altKey": false,
    "metaKey": false,
    "repeat": false,
    "locale": "",
    "detail": 0,
    "bubbles": false,
    "cancelable": false,
    "keyCode": 0,
    "charCode": 0,
    "which": 0
};
function createModifersList(dict) {
    var modifiers = ["Ctrl", "Shift", "Alt", "Meta", "AltGraph"];
    return modifiers.filter(function (mod) {
        return dict.hasOwnProperty([mod.toLowerCase() + "Key"]);
    }).join(" ");
}
function createKeyboardEvent(type, dict) {
    var event;
    if (initKeyboardEvent_variant) {
        event = document.createEvent("KeyboardEvent");
    }
    else {
        event = document.createEvent("Event");
    }
    var propName, localDict = {};
    for (propName in keyboardEventProperties) {
        if (keyboardEventProperties.hasOwnProperty(propName)) {
            if (dict && dict.hasOwnProperty(propName)) {
                localDict[propName] = dict[propName];
            }
            else {
                localDict[propName] = keyboardEventProperties[propName];
            }
        }
    }
    var ctrlKey = localDict["ctrlKey"];
    var shiftKey = localDict["shiftKey"];
    var altKey = localDict["altKey"];
    var metaKey = localDict["metaKey"];
    var altGraphKey = localDict["altGraphKey"];
    var key = localDict["key"] + "";
    var char = localDict["char"] + "";
    var location = localDict["location"];
    var keyCode = localDict["keyCode"] || (localDict["keyCode"] = key && key.charCodeAt(0) || 0);
    var charCode = localDict["charCode"] || (localDict["charCode"] = char && char.charCodeAt(0) || 0);
    var bubbles = localDict["bubbles"];
    var cancelable = localDict["cancelable"];
    var repeat = localDict["repeat"];
    var local = localDict["locale"];
    var view = window;
    localDict["which"] || (localDict["which"] = localDict["keyCode"]);
    if ("initKeyEvent" in event) {
        event.initKeyEvent(type, bubbles, cancelable, view, ctrlKey, altKey, shiftKey, metaKey, keyCode, charCode);
    }
    else if (initKeyboardEvent_variant && "initKeyboardEvent" in event) {
        switch (initKeyboardEvent_variant) {
            case 1:
                event.initKeyboardEvent(type, bubbles, cancelable, view, key, location, ctrlKey, shiftKey, altKey, metaKey, altGraphKey);
                break;
            case 2:
                event.initKeyboardEvent(type, bubbles, cancelable, view, ctrlKey, altKey, shiftKey, metaKey, keyCode, charCode);
                break;
            case 3:
                event.initKeyboardEvent(type, bubbles, cancelable, view, key, location, ctrlKey, altKey, shiftKey, metaKey, altGraphKey);
                break;
            case 4:
                event.initKeyboardEvent(type, bubbles, cancelable, view, key, location, createModifersList(localDict), repeat, local);
                break;
            default:
                event.initKeyboardEvent(type, bubbles, cancelable, view, char, key, location, createModifersList(localDict), repeat, local);
        }
    }
    else {
        event.initEvent(type, bubbles, cancelable);
    }
    for (propName in keyboardEventProperties) {
        if (keyboardEventProperties.hasOwnProperty(propName)) {
            if (event[propName] != localDict[propName]) {
                try {
                    delete event[propName];
                    Object.defineProperty(event, propName, { writable: true, value: localDict[propName] });
                }
                catch (e) {
                }
            }
        }
    }
    return event;
}
module.exports = createKeyboardEvent;

},{}],"/Users/kevin/iframe-overlay/node_modules/eventsim/lib/eventsim.js":[function(require,module,exports){
var createKeyboardEvent = require("./createKeyboardEvent");
var EventSim;
(function (EventSim) {
    var mouseRegex = /click|dblclick|(mouse(down|move|up|over|out|enter|leave))/;
    var pointerRegex = /pointer(down|move|up|over|out|enter|leave)/;
    var keyboardRegex = /key(up|down|press)/;
    function simulate(target, name, options) {
        var event;
        if (mouseRegex.test(name)) {
            event = new MouseEvent(name, options);
        }
        else if (keyboardRegex.test(name)) {
            event = createKeyboardEvent(name, options);
        }
        else if (pointerRegex.test(name)) {
            event = new PointerEvent(name, options);
        }
        target.dispatchEvent(event);
    }
    EventSim.simulate = simulate;
})(EventSim || (EventSim = {}));
module.exports = EventSim;

},{"./createKeyboardEvent":"/Users/kevin/iframe-overlay/node_modules/eventsim/lib/createKeyboardEvent.js"}],"/Users/kevin/iframe-overlay/node_modules/poster/lib/poster.js":[function(require,module,exports){
var posters = [];
if (self.document) {
    self.addEventListener("message", function (e) {
        var channel = e.data.channel;
        posters.forEach(function (poster) {
            if (poster.target === e.source) {
                var listeners = poster.channels[channel];
                if (listeners) {
                    listeners.forEach(function (listener) { return listener.apply(null, e.data.args); });
                }
            }
        });
    });
}
else {
    self.addEventListener("message", function (e) {
        var channel = e.data.channel;
        posters.forEach(function (poster) {
            var listeners = poster.channels[channel];
            if (listeners) {
                listeners.forEach(function (listener) { return listener.apply(null, e.data.args); });
            }
        });
    });
}
var Poster = (function () {
    function Poster(target, origin) {
        var _this = this;
        if (origin === void 0) { origin = "*"; }
        if (self.window && target instanceof HTMLIFrameElement) {
            target = target.contentWindow;
        }
        this.origin = origin;
        this.target = target;
        this.channels = {};
        if (self.window && target instanceof Worker) {
            target.addEventListener("message", function (e) {
                var channel = e.data.channel;
                var listeners = _this.channels[channel];
                if (listeners) {
                    listeners.forEach(function (listener) { return listener.apply(null, e.data.args); });
                }
            });
        }
        posters.push(this);
    }
    Poster.prototype.post = function (channel) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var message = {
            channel: channel,
            args: args
        };
        if (self.document && !(this.target instanceof Worker)) {
            this.target.postMessage(message, this.origin);
        }
        else {
            this.target.postMessage(message);
        }
    };
    Poster.prototype.emit = function (channel) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        args.unshift(channel);
        this.post.apply(this, args);
    };
    Poster.prototype.listen = function (channel, callback) {
        var listeners = this.channels[channel];
        if (listeners === undefined) {
            listeners = this.channels[channel] = [];
        }
        listeners.push(callback);
        return this;
    };
    Poster.prototype.addListener = function (channel, callback) {
        return this.listen(channel, callback);
    };
    Poster.prototype.on = function (channel, callback) {
        return this.listen(channel, callback);
    };
    Poster.prototype.removeListener = function (channel, callback) {
        var listeners = this.channels[channel];
        if (listeners) {
            var index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    };
    Poster.prototype.removeAllListeners = function (channel) {
        this.channels[channel] = [];
    };
    Poster.prototype.listeners = function (channel) {
        var listeners = this.channels[channel];
        return listeners || [];
    };
    return Poster;
})();
module.exports = Poster;

},{}]},{},["./lib/iframe-overlay.js"])("./lib/iframe-overlay.js")
});
// Generated by CommonJS Everywhere 0.9.7
(function (global) {
  function require(file, parentModule) {
    if ({}.hasOwnProperty.call(require.cache, file))
      return require.cache[file];
    var resolved = require.resolve(file);
    if (!resolved)
      throw new Error('Failed to resolve module ' + file);
    var module$ = {
        id: file,
        require: require,
        filename: file,
        exports: {},
        loaded: false,
        parent: parentModule,
        children: []
      };
    if (parentModule)
      parentModule.children.push(module$);
    var dirname = file.slice(0, file.lastIndexOf('/') + 1);
    require.cache[file] = module$.exports;
    resolved.call(module$.exports, module$, module$.exports, dirname, file);
    module$.loaded = true;
    return require.cache[file] = module$.exports;
  }
  require.modules = {};
  require.cache = {};
  require.resolve = function (file) {
    return {}.hasOwnProperty.call(require.modules, file) ? require.modules[file] : void 0;
  };
  require.define = function (file, fn) {
    require.modules[file] = fn;
  };
  var process = function () {
      var cwd = '/';
      return {
        title: 'browser',
        version: 'v0.10.24',
        browser: true,
        env: {},
        argv: [],
        nextTick: global.setImmediate || function (fn) {
          setTimeout(fn, 0);
        },
        cwd: function () {
          return cwd;
        },
        chdir: function (dir) {
          cwd = dir;
        }
      };
    }();
  require.define('/tools/entry-point.js', function (module, exports, __dirname, __filename) {
    (function () {
      'use strict';
      global.escodegen = require('/escodegen.js', module);
      escodegen.browser = true;
    }());
  });
  require.define('/escodegen.js', function (module, exports, __dirname, __filename) {
    (function () {
      'use strict';
      var Syntax, Precedence, BinaryPrecedence, SourceNode, estraverse, esutils, isArray, base, indent, json, renumber, hexadecimal, quotes, escapeless, newline, space, parentheses, semicolons, safeConcatenation, directive, extra, parse, sourceMap, FORMAT_MINIFY, FORMAT_DEFAULTS;
      estraverse = require('/node_modules/estraverse/estraverse.js', module);
      esutils = require('/node_modules/esutils/lib/utils.js', module);
      Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        ArrayPattern: 'ArrayPattern',
        ArrowFunctionExpression: 'ArrowFunctionExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ClassBody: 'ClassBody',
        ClassDeclaration: 'ClassDeclaration',
        ClassExpression: 'ClassExpression',
        ComprehensionBlock: 'ComprehensionBlock',
        ComprehensionExpression: 'ComprehensionExpression',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DirectiveStatement: 'DirectiveStatement',
        DoWhileStatement: 'DoWhileStatement',
        DebuggerStatement: 'DebuggerStatement',
        EmptyStatement: 'EmptyStatement',
        ExportBatchSpecifier: 'ExportBatchSpecifier',
        ExportDeclaration: 'ExportDeclaration',
        ExportSpecifier: 'ExportSpecifier',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        ForOfStatement: 'ForOfStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        GeneratorExpression: 'GeneratorExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        ImportDeclaration: 'ImportDeclaration',
        ImportDefaultSpecifier: 'ImportDefaultSpecifier',
        ImportNamespaceSpecifier: 'ImportNamespaceSpecifier',
        ImportSpecifier: 'ImportSpecifier',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        MethodDefinition: 'MethodDefinition',
        ModuleSpecifier: 'ModuleSpecifier',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        ObjectPattern: 'ObjectPattern',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SpreadElement: 'SpreadElement',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        TaggedTemplateExpression: 'TaggedTemplateExpression',
        TemplateElement: 'TemplateElement',
        TemplateLiteral: 'TemplateLiteral',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement',
        YieldExpression: 'YieldExpression'
      };
      function isExpression(node) {
        return CodeGenerator.Expression.hasOwnProperty(node.type);
      }
      function isStatement(node) {
        return CodeGenerator.Statement.hasOwnProperty(node.type);
      }
      Precedence = {
        Sequence: 0,
        Yield: 1,
        Assignment: 1,
        Conditional: 2,
        ArrowFunction: 2,
        LogicalOR: 3,
        LogicalAND: 4,
        BitwiseOR: 5,
        BitwiseXOR: 6,
        BitwiseAND: 7,
        Equality: 8,
        Relational: 9,
        BitwiseSHIFT: 10,
        Additive: 11,
        Multiplicative: 12,
        Unary: 13,
        Postfix: 14,
        Call: 15,
        New: 16,
        TaggedTemplate: 17,
        Member: 18,
        Primary: 19
      };
      BinaryPrecedence = {
        '||': Precedence.LogicalOR,
        '&&': Precedence.LogicalAND,
        '|': Precedence.BitwiseOR,
        '^': Precedence.BitwiseXOR,
        '&': Precedence.BitwiseAND,
        '==': Precedence.Equality,
        '!=': Precedence.Equality,
        '===': Precedence.Equality,
        '!==': Precedence.Equality,
        'is': Precedence.Equality,
        'isnt': Precedence.Equality,
        '<': Precedence.Relational,
        '>': Precedence.Relational,
        '<=': Precedence.Relational,
        '>=': Precedence.Relational,
        'in': Precedence.Relational,
        'instanceof': Precedence.Relational,
        '<<': Precedence.BitwiseSHIFT,
        '>>': Precedence.BitwiseSHIFT,
        '>>>': Precedence.BitwiseSHIFT,
        '+': Precedence.Additive,
        '-': Precedence.Additive,
        '*': Precedence.Multiplicative,
        '%': Precedence.Multiplicative,
        '/': Precedence.Multiplicative
      };
      var F_ALLOW_IN = 1, F_ALLOW_CALL = 1 << 1, F_ALLOW_UNPARATH_NEW = 1 << 2, F_FUNC_BODY = 1 << 3, F_DIRECTIVE_CTX = 1 << 4, F_SEMICOLON_OPT = 1 << 5;
      var E_FTT = F_ALLOW_CALL | F_ALLOW_UNPARATH_NEW, E_TTF = F_ALLOW_IN | F_ALLOW_CALL, E_TTT = F_ALLOW_IN | F_ALLOW_CALL | F_ALLOW_UNPARATH_NEW, E_TFF = F_ALLOW_IN, E_FFT = F_ALLOW_UNPARATH_NEW, E_TFT = F_ALLOW_IN | F_ALLOW_UNPARATH_NEW;
      var S_TFFF = F_ALLOW_IN, S_TFFT = F_ALLOW_IN | F_SEMICOLON_OPT, S_FFFF = 0, S_TFTF = F_ALLOW_IN | F_DIRECTIVE_CTX, S_TTFF = F_ALLOW_IN | F_FUNC_BODY;
      function getDefaultOptions() {
        return {
          indent: null,
          base: null,
          parse: null,
          comment: false,
          format: {
            indent: {
              style: '    ',
              base: 0,
              adjustMultilineComment: false
            },
            newline: '\n',
            space: ' ',
            json: false,
            renumber: false,
            hexadecimal: false,
            quotes: 'single',
            escapeless: false,
            compact: false,
            parentheses: true,
            semicolons: true,
            safeConcatenation: false
          },
          moz: {
            comprehensionExpressionStartsWithAssignment: false,
            starlessGenerator: false
          },
          sourceMap: null,
          sourceMapRoot: null,
          sourceMapWithCode: false,
          directive: false,
          raw: true,
          verbatim: null
        };
      }
      function stringRepeat(str, num) {
        var result = '';
        for (num |= 0; num > 0; num >>>= 1, str += str) {
          if (num & 1) {
            result += str;
          }
        }
        return result;
      }
      isArray = Array.isArray;
      if (!isArray) {
        isArray = function isArray(array) {
          return Object.prototype.toString.call(array) === '[object Array]';
        };
      }
      function hasLineTerminator(str) {
        return /[\r\n]/g.test(str);
      }
      function endsWithLineTerminator(str) {
        var len = str.length;
        return len && esutils.code.isLineTerminator(str.charCodeAt(len - 1));
      }
      function merge(target, override) {
        var key;
        for (key in override) {
          if (override.hasOwnProperty(key)) {
            target[key] = override[key];
          }
        }
        return target;
      }
      function updateDeeply(target, override) {
        var key, val;
        function isHashObject(target) {
          return typeof target === 'object' && target instanceof Object && !(target instanceof RegExp);
        }
        for (key in override) {
          if (override.hasOwnProperty(key)) {
            val = override[key];
            if (isHashObject(val)) {
              if (isHashObject(target[key])) {
                updateDeeply(target[key], val);
              } else {
                target[key] = updateDeeply({}, val);
              }
            } else {
              target[key] = val;
            }
          }
        }
        return target;
      }
      function generateNumber(value) {
        var result, point, temp, exponent, pos;
        if (value !== value) {
          throw new Error('Numeric literal whose value is NaN');
        }
        if (value < 0 || value === 0 && 1 / value < 0) {
          throw new Error('Numeric literal whose value is negative');
        }
        if (value === 1 / 0) {
          return json ? 'null' : renumber ? '1e400' : '1e+400';
        }
        result = '' + value;
        if (!renumber || result.length < 3) {
          return result;
        }
        point = result.indexOf('.');
        if (!json && result.charCodeAt(0) === 48 && point === 1) {
          point = 0;
          result = result.slice(1);
        }
        temp = result;
        result = result.replace('e+', 'e');
        exponent = 0;
        if ((pos = temp.indexOf('e')) > 0) {
          exponent = +temp.slice(pos + 1);
          temp = temp.slice(0, pos);
        }
        if (point >= 0) {
          exponent -= temp.length - point - 1;
          temp = +(temp.slice(0, point) + temp.slice(point + 1)) + '';
        }
        pos = 0;
        while (temp.charCodeAt(temp.length + pos - 1) === 48) {
          --pos;
        }
        if (pos !== 0) {
          exponent -= pos;
          temp = temp.slice(0, pos);
        }
        if (exponent !== 0) {
          temp += 'e' + exponent;
        }
        if ((temp.length < result.length || hexadecimal && value > 1e12 && Math.floor(value) === value && (temp = '0x' + value.toString(16)).length < result.length) && +temp === value) {
          result = temp;
        }
        return result;
      }
      function escapeRegExpCharacter(ch, previousIsBackslash) {
        if ((ch & ~1) === 8232) {
          return (previousIsBackslash ? 'u' : '\\u') + (ch === 8232 ? '2028' : '2029');
        } else if (ch === 10 || ch === 13) {
          return (previousIsBackslash ? '' : '\\') + (ch === 10 ? 'n' : 'r');
        }
        return String.fromCharCode(ch);
      }
      function generateRegExp(reg) {
        var match, result, flags, i, iz, ch, characterInBrack, previousIsBackslash;
        result = reg.toString();
        if (reg.source) {
          match = result.match(/\/([^/]*)$/);
          if (!match) {
            return result;
          }
          flags = match[1];
          result = '';
          characterInBrack = false;
          previousIsBackslash = false;
          for (i = 0, iz = reg.source.length; i < iz; ++i) {
            ch = reg.source.charCodeAt(i);
            if (!previousIsBackslash) {
              if (characterInBrack) {
                if (ch === 93) {
                  characterInBrack = false;
                }
              } else {
                if (ch === 47) {
                  result += '\\';
                } else if (ch === 91) {
                  characterInBrack = true;
                }
              }
              result += escapeRegExpCharacter(ch, previousIsBackslash);
              previousIsBackslash = ch === 92;
            } else {
              result += escapeRegExpCharacter(ch, previousIsBackslash);
              previousIsBackslash = false;
            }
          }
          return '/' + result + '/' + flags;
        }
        return result;
      }
      function escapeAllowedCharacter(code, next) {
        var hex;
        if (code === 8) {
          return '\\b';
        }
        if (code === 12) {
          return '\\f';
        }
        if (code === 9) {
          return '\\t';
        }
        hex = code.toString(16).toUpperCase();
        if (json || code > 255) {
          return '\\u' + '0000'.slice(hex.length) + hex;
        } else if (code === 0 && !esutils.code.isDecimalDigit(next)) {
          return '\\0';
        } else if (code === 11) {
          return '\\x0B';
        } else {
          return '\\x' + '00'.slice(hex.length) + hex;
        }
      }
      function escapeDisallowedCharacter(code) {
        if (code === 92) {
          return '\\\\';
        }
        if (code === 10) {
          return '\\n';
        }
        if (code === 13) {
          return '\\r';
        }
        if (code === 8232) {
          return '\\u2028';
        }
        if (code === 8233) {
          return '\\u2029';
        }
        throw new Error('Incorrectly classified character');
      }
      function escapeDirective(str) {
        var i, iz, code, quote;
        quote = quotes === 'double' ? '"' : "'";
        for (i = 0, iz = str.length; i < iz; ++i) {
          code = str.charCodeAt(i);
          if (code === 39) {
            quote = '"';
            break;
          } else if (code === 34) {
            quote = "'";
            break;
          } else if (code === 92) {
            ++i;
          }
        }
        return quote + str + quote;
      }
      function escapeString(str) {
        var result = '', i, len, code, singleQuotes = 0, doubleQuotes = 0, single, quote;
        for (i = 0, len = str.length; i < len; ++i) {
          code = str.charCodeAt(i);
          if (code === 39) {
            ++singleQuotes;
          } else if (code === 34) {
            ++doubleQuotes;
          } else if (code === 47 && json) {
            result += '\\';
          } else if (esutils.code.isLineTerminator(code) || code === 92) {
            result += escapeDisallowedCharacter(code);
            continue;
          } else if (json && code < 32 || !(json || escapeless || code >= 32 && code <= 126)) {
            result += escapeAllowedCharacter(code, str.charCodeAt(i + 1));
            continue;
          }
          result += String.fromCharCode(code);
        }
        single = !(quotes === 'double' || quotes === 'auto' && doubleQuotes < singleQuotes);
        quote = single ? "'" : '"';
        if (!(single ? singleQuotes : doubleQuotes)) {
          return quote + result + quote;
        }
        str = result;
        result = quote;
        for (i = 0, len = str.length; i < len; ++i) {
          code = str.charCodeAt(i);
          if (code === 39 && single || code === 34 && !single) {
            result += '\\';
          }
          result += String.fromCharCode(code);
        }
        return result + quote;
      }
      function flattenToString(arr) {
        var i, iz, elem, result = '';
        for (i = 0, iz = arr.length; i < iz; ++i) {
          elem = arr[i];
          result += isArray(elem) ? flattenToString(elem) : elem;
        }
        return result;
      }
      function toSourceNodeWhenNeeded(generated, node) {
        if (!sourceMap) {
          if (isArray(generated)) {
            return flattenToString(generated);
          } else {
            return generated;
          }
        }
        if (node == null) {
          if (generated instanceof SourceNode) {
            return generated;
          } else {
            node = {};
          }
        }
        if (node.loc == null) {
          return new SourceNode(null, null, sourceMap, generated, node.name || null);
        }
        return new SourceNode(node.loc.start.line, node.loc.start.column, sourceMap === true ? node.loc.source || null : sourceMap, generated, node.name || null);
      }
      function noEmptySpace() {
        return space ? space : ' ';
      }
      function join(left, right) {
        var leftSource, rightSource, leftCharCode, rightCharCode;
        leftSource = toSourceNodeWhenNeeded(left).toString();
        if (leftSource.length === 0) {
          return [right];
        }
        rightSource = toSourceNodeWhenNeeded(right).toString();
        if (rightSource.length === 0) {
          return [left];
        }
        leftCharCode = leftSource.charCodeAt(leftSource.length - 1);
        rightCharCode = rightSource.charCodeAt(0);
        if ((leftCharCode === 43 || leftCharCode === 45) && leftCharCode === rightCharCode || esutils.code.isIdentifierPart(leftCharCode) && esutils.code.isIdentifierPart(rightCharCode) || leftCharCode === 47 && rightCharCode === 105) {
          return [
            left,
            noEmptySpace(),
            right
          ];
        } else if (esutils.code.isWhiteSpace(leftCharCode) || esutils.code.isLineTerminator(leftCharCode) || esutils.code.isWhiteSpace(rightCharCode) || esutils.code.isLineTerminator(rightCharCode)) {
          return [
            left,
            right
          ];
        }
        return [
          left,
          space,
          right
        ];
      }
      function addIndent(stmt) {
        return [
          base,
          stmt
        ];
      }
      function withIndent(fn) {
        var previousBase;
        previousBase = base;
        base += indent;
        fn(base);
        base = previousBase;
      }
      function calculateSpaces(str) {
        var i;
        for (i = str.length - 1; i >= 0; --i) {
          if (esutils.code.isLineTerminator(str.charCodeAt(i))) {
            break;
          }
        }
        return str.length - 1 - i;
      }
      function adjustMultilineComment(value, specialBase) {
        var array, i, len, line, j, spaces, previousBase, sn;
        array = value.split(/\r\n|[\r\n]/);
        spaces = Number.MAX_VALUE;
        for (i = 1, len = array.length; i < len; ++i) {
          line = array[i];
          j = 0;
          while (j < line.length && esutils.code.isWhiteSpace(line.charCodeAt(j))) {
            ++j;
          }
          if (spaces > j) {
            spaces = j;
          }
        }
        if (typeof specialBase !== 'undefined') {
          previousBase = base;
          if (array[1][spaces] === '*') {
            specialBase += ' ';
          }
          base = specialBase;
        } else {
          if (spaces & 1) {
            --spaces;
          }
          previousBase = base;
        }
        for (i = 1, len = array.length; i < len; ++i) {
          sn = toSourceNodeWhenNeeded(addIndent(array[i].slice(spaces)));
          array[i] = sourceMap ? sn.join('') : sn;
        }
        base = previousBase;
        return array.join('\n');
      }
      function generateComment(comment, specialBase) {
        if (comment.type === 'Line') {
          if (endsWithLineTerminator(comment.value)) {
            return '//' + comment.value;
          } else {
            return '//' + comment.value + '\n';
          }
        }
        if (extra.format.indent.adjustMultilineComment && /[\n\r]/.test(comment.value)) {
          return adjustMultilineComment('/*' + comment.value + '*/', specialBase);
        }
        return '/*' + comment.value + '*/';
      }
      function addComments(stmt, result) {
        var i, len, comment, save, tailingToStatement, specialBase, fragment;
        if (stmt.leadingComments && stmt.leadingComments.length > 0) {
          save = result;
          comment = stmt.leadingComments[0];
          result = [];
          if (safeConcatenation && stmt.type === Syntax.Program && stmt.body.length === 0) {
            result.push('\n');
          }
          result.push(generateComment(comment));
          if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
            result.push('\n');
          }
          for (i = 1, len = stmt.leadingComments.length; i < len; ++i) {
            comment = stmt.leadingComments[i];
            fragment = [generateComment(comment)];
            if (!endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
              fragment.push('\n');
            }
            result.push(addIndent(fragment));
          }
          result.push(addIndent(save));
        }
        if (stmt.trailingComments) {
          tailingToStatement = !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString());
          specialBase = stringRepeat(' ', calculateSpaces(toSourceNodeWhenNeeded([
            base,
            result,
            indent
          ]).toString()));
          for (i = 0, len = stmt.trailingComments.length; i < len; ++i) {
            comment = stmt.trailingComments[i];
            if (tailingToStatement) {
              if (i === 0) {
                result = [
                  result,
                  indent
                ];
              } else {
                result = [
                  result,
                  specialBase
                ];
              }
              result.push(generateComment(comment, specialBase));
            } else {
              result = [
                result,
                addIndent(generateComment(comment))
              ];
            }
            if (i !== len - 1 && !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
              result = [
                result,
                '\n'
              ];
            }
          }
        }
        return result;
      }
      function parenthesize(text, current, should) {
        if (current < should) {
          return [
            '(',
            text,
            ')'
          ];
        }
        return text;
      }
      function generateVerbatimString(string) {
        var i, iz, result;
        result = string.split(/\r\n|\n/);
        for (i = 1, iz = result.length; i < iz; i++) {
          result[i] = newline + base + result[i];
        }
        return result;
      }
      function generateVerbatim(expr, precedence) {
        var verbatim, result, prec;
        verbatim = expr[extra.verbatim];
        if (typeof verbatim === 'string') {
          result = parenthesize(generateVerbatimString(verbatim), Precedence.Sequence, precedence);
        } else {
          result = generateVerbatimString(verbatim.content);
          prec = verbatim.precedence != null ? verbatim.precedence : Precedence.Sequence;
          result = parenthesize(result, prec, precedence);
        }
        return toSourceNodeWhenNeeded(result, expr);
      }
      function CodeGenerator() {
      }
      CodeGenerator.prototype.maybeBlock = function (stmt, flags) {
        var result, noLeadingComment, that = this;
        noLeadingComment = !extra.comment || !stmt.leadingComments;
        if (stmt.type === Syntax.BlockStatement && noLeadingComment) {
          return [
            space,
            this.generateStatement(stmt, flags)
          ];
        }
        if (stmt.type === Syntax.EmptyStatement && noLeadingComment) {
          return ';';
        }
        withIndent(function () {
          result = [
            newline,
            addIndent(that.generateStatement(stmt, flags))
          ];
        });
        return result;
      };
      CodeGenerator.prototype.maybeBlockSuffix = function (stmt, result) {
        var ends = endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString());
        if (stmt.type === Syntax.BlockStatement && (!extra.comment || !stmt.leadingComments) && !ends) {
          return [
            result,
            space
          ];
        }
        if (ends) {
          return [
            result,
            base
          ];
        }
        return [
          result,
          newline,
          base
        ];
      };
      function generateIdentifier(node) {
        return toSourceNodeWhenNeeded(node.name, node);
      }
      CodeGenerator.prototype.generatePattern = function (node, precedence, flags) {
        if (node.type === Syntax.Identifier) {
          return generateIdentifier(node);
        }
        return this.generateExpression(node, precedence, flags);
      };
      CodeGenerator.prototype.generateFunctionParams = function (node) {
        var i, iz, result, hasDefault;
        hasDefault = false;
        if (node.type === Syntax.ArrowFunctionExpression && !node.rest && (!node.defaults || node.defaults.length === 0) && node.params.length === 1 && node.params[0].type === Syntax.Identifier) {
          result = [generateIdentifier(node.params[0])];
        } else {
          result = ['('];
          if (node.defaults) {
            hasDefault = true;
          }
          for (i = 0, iz = node.params.length; i < iz; ++i) {
            if (hasDefault && node.defaults[i]) {
              result.push(this.generateAssignment(node.params[i], node.defaults[i], '=', Precedence.Assignment, E_TTT));
            } else {
              result.push(this.generatePattern(node.params[i], Precedence.Assignment, E_TTT));
            }
            if (i + 1 < iz) {
              result.push(',' + space);
            }
          }
          if (node.rest) {
            if (node.params.length) {
              result.push(',' + space);
            }
            result.push('...');
            result.push(generateIdentifier(node.rest));
          }
          result.push(')');
        }
        return result;
      };
      CodeGenerator.prototype.generateFunctionBody = function (node) {
        var result, expr;
        result = this.generateFunctionParams(node);
        if (node.type === Syntax.ArrowFunctionExpression) {
          result.push(space);
          result.push('=>');
        }
        if (node.expression) {
          result.push(space);
          expr = this.generateExpression(node.body, Precedence.Assignment, E_TTT);
          if (expr.toString().charAt(0) === '{') {
            expr = [
              '(',
              expr,
              ')'
            ];
          }
          result.push(expr);
        } else {
          result.push(this.maybeBlock(node.body, S_TTFF));
        }
        return result;
      };
      CodeGenerator.prototype.generateIterationForStatement = function (operator, stmt, flags) {
        var result = ['for' + space + '('], that = this;
        withIndent(function () {
          if (stmt.left.type === Syntax.VariableDeclaration) {
            withIndent(function () {
              result.push(stmt.left.kind + noEmptySpace());
              result.push(that.generateStatement(stmt.left.declarations[0], S_FFFF));
            });
          } else {
            result.push(that.generateExpression(stmt.left, Precedence.Call, E_TTT));
          }
          result = join(result, operator);
          result = [
            join(result, that.generateExpression(stmt.right, Precedence.Sequence, E_TTT)),
            ')'
          ];
        });
        result.push(this.maybeBlock(stmt.body, flags));
        return result;
      };
      CodeGenerator.prototype.generatePropertyKey = function (expr, computed) {
        var result = [];
        if (computed) {
          result.push('[');
        }
        result.push(this.generateExpression(expr, Precedence.Sequence, E_TTT));
        if (computed) {
          result.push(']');
        }
        return result;
      };
      CodeGenerator.prototype.generateAssignment = function (left, right, operator, precedence, flags) {
        if (Precedence.Assignment < precedence) {
          flags |= F_ALLOW_IN;
        }
        return parenthesize([
          this.generateExpression(left, Precedence.Call, flags),
          space + operator + space,
          this.generateExpression(right, Precedence.Assignment, flags)
        ], Precedence.Assignment, precedence);
      };
      CodeGenerator.prototype.semicolon = function (flags) {
        if (!semicolons && flags & F_SEMICOLON_OPT) {
          return '';
        }
        return ';';
      };
      CodeGenerator.Statement = {
        BlockStatement: function (stmt, flags) {
          var result = [
              '{',
              newline
            ], that = this;
          withIndent(function () {
            var i, iz, fragment, bodyFlags;
            bodyFlags = S_TFFF;
            if (flags & F_FUNC_BODY) {
              bodyFlags |= F_DIRECTIVE_CTX;
            }
            for (i = 0, iz = stmt.body.length; i < iz; ++i) {
              if (i === iz - 1) {
                bodyFlags |= F_SEMICOLON_OPT;
              }
              fragment = addIndent(that.generateStatement(stmt.body[i], bodyFlags));
              result.push(fragment);
              if (!endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                result.push(newline);
              }
            }
          });
          result.push(addIndent('}'));
          return result;
        },
        BreakStatement: function (stmt, flags) {
          if (stmt.label) {
            return 'break ' + stmt.label.name + this.semicolon(flags);
          }
          return 'break' + this.semicolon(flags);
        },
        ContinueStatement: function (stmt, flags) {
          if (stmt.label) {
            return 'continue ' + stmt.label.name + this.semicolon(flags);
          }
          return 'continue' + this.semicolon(flags);
        },
        ClassBody: function (stmt, flags) {
          var result = [
              '{',
              newline
            ], that = this;
          withIndent(function (indent) {
            var i, iz;
            for (i = 0, iz = stmt.body.length; i < iz; ++i) {
              result.push(indent);
              result.push(that.generateExpression(stmt.body[i], Precedence.Sequence, E_TTT));
              if (i + 1 < iz) {
                result.push(newline);
              }
            }
          });
          if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
            result.push(newline);
          }
          result.push(base);
          result.push('}');
          return result;
        },
        ClassDeclaration: function (stmt, flags) {
          var result, fragment;
          result = ['class ' + stmt.id.name];
          if (stmt.superClass) {
            fragment = join('extends', this.generateExpression(stmt.superClass, Precedence.Assignment, E_TTT));
            result = join(result, fragment);
          }
          result.push(space);
          result.push(this.generateStatement(stmt.body, S_TFFT));
          return result;
        },
        DirectiveStatement: function (stmt, flags) {
          if (extra.raw && stmt.raw) {
            return stmt.raw + this.semicolon(flags);
          }
          return escapeDirective(stmt.directive) + this.semicolon(flags);
        },
        DoWhileStatement: function (stmt, flags) {
          var result = join('do', this.maybeBlock(stmt.body, S_TFFF));
          result = this.maybeBlockSuffix(stmt.body, result);
          return join(result, [
            'while' + space + '(',
            this.generateExpression(stmt.test, Precedence.Sequence, E_TTT),
            ')' + this.semicolon(flags)
          ]);
        },
        CatchClause: function (stmt, flags) {
          var result, that = this;
          withIndent(function () {
            var guard;
            result = [
              'catch' + space + '(',
              that.generateExpression(stmt.param, Precedence.Sequence, E_TTT),
              ')'
            ];
            if (stmt.guard) {
              guard = that.generateExpression(stmt.guard, Precedence.Sequence, E_TTT);
              result.splice(2, 0, ' if ', guard);
            }
          });
          result.push(this.maybeBlock(stmt.body, S_TFFF));
          return result;
        },
        DebuggerStatement: function (stmt, flags) {
          return 'debugger' + this.semicolon(flags);
        },
        EmptyStatement: function (stmt, flags) {
          return ';';
        },
        ExportDeclaration: function (stmt, flags) {
          var result = ['export'], bodyFlags, that = this;
          bodyFlags = flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF;
          if (stmt['default']) {
            result = join(result, 'default');
            if (isStatement(stmt.declaration)) {
              result = join(result, this.generateStatement(stmt.declaration, bodyFlags));
            } else {
              result = join(result, this.generateExpression(stmt.declaration, Precedence.Assignment, E_TTT) + this.semicolon(flags));
            }
            return result;
          }
          if (stmt.declaration) {
            return join(result, this.generateStatement(stmt.declaration, bodyFlags));
          }
          if (stmt.specifiers) {
            if (stmt.specifiers.length === 0) {
              result = join(result, '{' + space + '}');
            } else if (stmt.specifiers[0].type === Syntax.ExportBatchSpecifier) {
              result = join(result, this.generateExpression(stmt.specifiers[0], Precedence.Sequence, E_TTT));
            } else {
              result = join(result, '{');
              withIndent(function (indent) {
                var i, iz;
                result.push(newline);
                for (i = 0, iz = stmt.specifiers.length; i < iz; ++i) {
                  result.push(indent);
                  result.push(that.generateExpression(stmt.specifiers[i], Precedence.Sequence, E_TTT));
                  if (i + 1 < iz) {
                    result.push(',' + newline);
                  }
                }
              });
              if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                result.push(newline);
              }
              result.push(base + '}');
            }
            if (stmt.source) {
              result = join(result, [
                'from' + space,
                this.generateExpression(stmt.source, Precedence.Sequence, E_TTT),
                this.semicolon(flags)
              ]);
            } else {
              result.push(this.semicolon(flags));
            }
          }
          return result;
        },
        ExpressionStatement: function (stmt, flags) {
          var result, fragment;
          result = [this.generateExpression(stmt.expression, Precedence.Sequence, E_TTT)];
          fragment = toSourceNodeWhenNeeded(result).toString();
          if (fragment.charAt(0) === '{' || fragment.slice(0, 5) === 'class' && ' {'.indexOf(fragment.charAt(5)) >= 0 || fragment.slice(0, 8) === 'function' && '* ('.indexOf(fragment.charAt(8)) >= 0 || directive && flags & F_DIRECTIVE_CTX && stmt.expression.type === Syntax.Literal && typeof stmt.expression.value === 'string') {
            result = [
              '(',
              result,
              ')' + this.semicolon(flags)
            ];
          } else {
            result.push(this.semicolon(flags));
          }
          return result;
        },
        ImportDeclaration: function (stmt, flags) {
          var result, cursor, that = this;
          if (stmt.specifiers.length === 0) {
            return [
              'import',
              space,
              this.generateExpression(stmt.source, Precedence.Sequence, E_TTT),
              this.semicolon(flags)
            ];
          }
          result = ['import'];
          cursor = 0;
          if (stmt.specifiers[cursor].type === Syntax.ImportDefaultSpecifier) {
            result = join(result, [this.generateExpression(stmt.specifiers[cursor], Precedence.Sequence, E_TTT)]);
            ++cursor;
          }
          if (stmt.specifiers[cursor]) {
            if (cursor !== 0) {
              result.push(',');
            }
            if (stmt.specifiers[cursor].type === Syntax.ImportNamespaceSpecifier) {
              result = join(result, [
                space,
                this.generateExpression(stmt.specifiers[cursor], Precedence.Sequence, E_TTT)
              ]);
            } else {
              result.push(space + '{');
              if (stmt.specifiers.length - cursor === 1) {
                result.push(space);
                result.push(this.generateExpression(stmt.specifiers[cursor], Precedence.Sequence, E_TTT));
                result.push(space + '}' + space);
              } else {
                withIndent(function (indent) {
                  var i, iz;
                  result.push(newline);
                  for (i = cursor, iz = stmt.specifiers.length; i < iz; ++i) {
                    result.push(indent);
                    result.push(that.generateExpression(stmt.specifiers[i], Precedence.Sequence, E_TTT));
                    if (i + 1 < iz) {
                      result.push(',' + newline);
                    }
                  }
                });
                if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                  result.push(newline);
                }
                result.push(base + '}' + space);
              }
            }
          }
          result = join(result, [
            'from' + space,
            this.generateExpression(stmt.source, Precedence.Sequence, E_TTT),
            this.semicolon(flags)
          ]);
          return result;
        },
        VariableDeclarator: function (stmt, flags) {
          var itemFlags = flags & F_ALLOW_IN ? E_TTT : E_FTT;
          if (stmt.init) {
            return [
              this.generateExpression(stmt.id, Precedence.Assignment, itemFlags),
              space,
              '=',
              space,
              this.generateExpression(stmt.init, Precedence.Assignment, itemFlags)
            ];
          }
          return this.generatePattern(stmt.id, Precedence.Assignment, itemFlags);
        },
        VariableDeclaration: function (stmt, flags) {
          var result, i, iz, node, bodyFlags, that = this;
          result = [stmt.kind];
          bodyFlags = flags & F_ALLOW_IN ? S_TFFF : S_FFFF;
          function block() {
            node = stmt.declarations[0];
            if (extra.comment && node.leadingComments) {
              result.push('\n');
              result.push(addIndent(that.generateStatement(node, bodyFlags)));
            } else {
              result.push(noEmptySpace());
              result.push(that.generateStatement(node, bodyFlags));
            }
            for (i = 1, iz = stmt.declarations.length; i < iz; ++i) {
              node = stmt.declarations[i];
              if (extra.comment && node.leadingComments) {
                result.push(',' + newline);
                result.push(addIndent(that.generateStatement(node, bodyFlags)));
              } else {
                result.push(',' + space);
                result.push(that.generateStatement(node, bodyFlags));
              }
            }
          }
          if (stmt.declarations.length > 1) {
            withIndent(block);
          } else {
            block();
          }
          result.push(this.semicolon(flags));
          return result;
        },
        ThrowStatement: function (stmt, flags) {
          return [
            join('throw', this.generateExpression(stmt.argument, Precedence.Sequence, E_TTT)),
            this.semicolon(flags)
          ];
        },
        TryStatement: function (stmt, flags) {
          var result, i, iz, guardedHandlers;
          result = [
            'try',
            this.maybeBlock(stmt.block, S_TFFF)
          ];
          result = this.maybeBlockSuffix(stmt.block, result);
          if (stmt.handlers) {
            for (i = 0, iz = stmt.handlers.length; i < iz; ++i) {
              result = join(result, this.generateStatement(stmt.handlers[i], S_TFFF));
              if (stmt.finalizer || i + 1 !== iz) {
                result = this.maybeBlockSuffix(stmt.handlers[i].body, result);
              }
            }
          } else {
            guardedHandlers = stmt.guardedHandlers || [];
            for (i = 0, iz = guardedHandlers.length; i < iz; ++i) {
              result = join(result, this.generateStatement(guardedHandlers[i], S_TFFF));
              if (stmt.finalizer || i + 1 !== iz) {
                result = this.maybeBlockSuffix(guardedHandlers[i].body, result);
              }
            }
            if (stmt.handler) {
              if (isArray(stmt.handler)) {
                for (i = 0, iz = stmt.handler.length; i < iz; ++i) {
                  result = join(result, this.generateStatement(stmt.handler[i], S_TFFF));
                  if (stmt.finalizer || i + 1 !== iz) {
                    result = this.maybeBlockSuffix(stmt.handler[i].body, result);
                  }
                }
              } else {
                result = join(result, this.generateStatement(stmt.handler, S_TFFF));
                if (stmt.finalizer) {
                  result = this.maybeBlockSuffix(stmt.handler.body, result);
                }
              }
            }
          }
          if (stmt.finalizer) {
            result = join(result, [
              'finally',
              this.maybeBlock(stmt.finalizer, S_TFFF)
            ]);
          }
          return result;
        },
        SwitchStatement: function (stmt, flags) {
          var result, fragment, i, iz, bodyFlags, that = this;
          withIndent(function () {
            result = [
              'switch' + space + '(',
              that.generateExpression(stmt.discriminant, Precedence.Sequence, E_TTT),
              ')' + space + '{' + newline
            ];
          });
          if (stmt.cases) {
            bodyFlags = S_TFFF;
            for (i = 0, iz = stmt.cases.length; i < iz; ++i) {
              if (i === iz - 1) {
                bodyFlags |= F_SEMICOLON_OPT;
              }
              fragment = addIndent(this.generateStatement(stmt.cases[i], bodyFlags));
              result.push(fragment);
              if (!endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                result.push(newline);
              }
            }
          }
          result.push(addIndent('}'));
          return result;
        },
        SwitchCase: function (stmt, flags) {
          var result, fragment, i, iz, bodyFlags, that = this;
          withIndent(function () {
            if (stmt.test) {
              result = [
                join('case', that.generateExpression(stmt.test, Precedence.Sequence, E_TTT)),
                ':'
              ];
            } else {
              result = ['default:'];
            }
            i = 0;
            iz = stmt.consequent.length;
            if (iz && stmt.consequent[0].type === Syntax.BlockStatement) {
              fragment = that.maybeBlock(stmt.consequent[0], S_TFFF);
              result.push(fragment);
              i = 1;
            }
            if (i !== iz && !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
              result.push(newline);
            }
            bodyFlags = S_TFFF;
            for (; i < iz; ++i) {
              if (i === iz - 1 && flags & F_SEMICOLON_OPT) {
                bodyFlags |= F_SEMICOLON_OPT;
              }
              fragment = addIndent(that.generateStatement(stmt.consequent[i], bodyFlags));
              result.push(fragment);
              if (i + 1 !== iz && !endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                result.push(newline);
              }
            }
          });
          return result;
        },
        IfStatement: function (stmt, flags) {
          var result, bodyFlags, semicolonOptional, that = this;
          withIndent(function () {
            result = [
              'if' + space + '(',
              that.generateExpression(stmt.test, Precedence.Sequence, E_TTT),
              ')'
            ];
          });
          semicolonOptional = flags & F_SEMICOLON_OPT;
          bodyFlags = S_TFFF;
          if (semicolonOptional) {
            bodyFlags |= F_SEMICOLON_OPT;
          }
          if (stmt.alternate) {
            result.push(this.maybeBlock(stmt.consequent, S_TFFF));
            result = this.maybeBlockSuffix(stmt.consequent, result);
            if (stmt.alternate.type === Syntax.IfStatement) {
              result = join(result, [
                'else ',
                this.generateStatement(stmt.alternate, bodyFlags)
              ]);
            } else {
              result = join(result, join('else', this.maybeBlock(stmt.alternate, bodyFlags)));
            }
          } else {
            result.push(this.maybeBlock(stmt.consequent, bodyFlags));
          }
          return result;
        },
        ForStatement: function (stmt, flags) {
          var result, that = this;
          withIndent(function () {
            result = ['for' + space + '('];
            if (stmt.init) {
              if (stmt.init.type === Syntax.VariableDeclaration) {
                result.push(that.generateStatement(stmt.init, S_FFFF));
              } else {
                result.push(that.generateExpression(stmt.init, Precedence.Sequence, E_FTT));
                result.push(';');
              }
            } else {
              result.push(';');
            }
            if (stmt.test) {
              result.push(space);
              result.push(that.generateExpression(stmt.test, Precedence.Sequence, E_TTT));
              result.push(';');
            } else {
              result.push(';');
            }
            if (stmt.update) {
              result.push(space);
              result.push(that.generateExpression(stmt.update, Precedence.Sequence, E_TTT));
              result.push(')');
            } else {
              result.push(')');
            }
          });
          result.push(this.maybeBlock(stmt.body, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF));
          return result;
        },
        ForInStatement: function (stmt, flags) {
          return this.generateIterationForStatement('in', stmt, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF);
        },
        ForOfStatement: function (stmt, flags) {
          return this.generateIterationForStatement('of', stmt, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF);
        },
        LabeledStatement: function (stmt, flags) {
          return [
            stmt.label.name + ':',
            this.maybeBlock(stmt.body, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF)
          ];
        },
        Program: function (stmt, flags) {
          var result, fragment, i, iz, bodyFlags;
          iz = stmt.body.length;
          result = [safeConcatenation && iz > 0 ? '\n' : ''];
          bodyFlags = S_TFTF;
          for (i = 0; i < iz; ++i) {
            if (!safeConcatenation && i === iz - 1) {
              bodyFlags |= F_SEMICOLON_OPT;
            }
            fragment = addIndent(this.generateStatement(stmt.body[i], bodyFlags));
            result.push(fragment);
            if (i + 1 < iz && !endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
              result.push(newline);
            }
          }
          return result;
        },
        FunctionDeclaration: function (stmt, flags) {
          var isGenerator = stmt.generator && !extra.moz.starlessGenerator;
          return [
            isGenerator ? 'function*' : 'function',
            isGenerator ? space : noEmptySpace(),
            generateIdentifier(stmt.id),
            this.generateFunctionBody(stmt)
          ];
        },
        ReturnStatement: function (stmt, flags) {
          if (stmt.argument) {
            return [
              join('return', this.generateExpression(stmt.argument, Precedence.Sequence, E_TTT)),
              this.semicolon(flags)
            ];
          }
          return ['return' + this.semicolon(flags)];
        },
        WhileStatement: function (stmt, flags) {
          var result, that = this;
          withIndent(function () {
            result = [
              'while' + space + '(',
              that.generateExpression(stmt.test, Precedence.Sequence, E_TTT),
              ')'
            ];
          });
          result.push(this.maybeBlock(stmt.body, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF));
          return result;
        },
        WithStatement: function (stmt, flags) {
          var result, that = this;
          withIndent(function () {
            result = [
              'with' + space + '(',
              that.generateExpression(stmt.object, Precedence.Sequence, E_TTT),
              ')'
            ];
          });
          result.push(this.maybeBlock(stmt.body, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF));
          return result;
        }
      };
      merge(CodeGenerator.prototype, CodeGenerator.Statement);
      CodeGenerator.Expression = {
        SequenceExpression: function (expr, precedence, flags) {
          var result, i, iz;
          if (Precedence.Sequence < precedence) {
            flags |= F_ALLOW_IN;
          }
          result = [];
          for (i = 0, iz = expr.expressions.length; i < iz; ++i) {
            result.push(this.generateExpression(expr.expressions[i], Precedence.Assignment, flags));
            if (i + 1 < iz) {
              result.push(',' + space);
            }
          }
          return parenthesize(result, Precedence.Sequence, precedence);
        },
        AssignmentExpression: function (expr, precedence, flags) {
          return this.generateAssignment(expr.left, expr.right, expr.operator, precedence, flags);
        },
        ArrowFunctionExpression: function (expr, precedence, flags) {
          return parenthesize(this.generateFunctionBody(expr), Precedence.ArrowFunction, precedence);
        },
        ConditionalExpression: function (expr, precedence, flags) {
          if (Precedence.Conditional < precedence) {
            flags |= F_ALLOW_IN;
          }
          return parenthesize([
            this.generateExpression(expr.test, Precedence.LogicalOR, flags),
            space + '?' + space,
            this.generateExpression(expr.consequent, Precedence.Assignment, flags),
            space + ':' + space,
            this.generateExpression(expr.alternate, Precedence.Assignment, flags)
          ], Precedence.Conditional, precedence);
        },
        LogicalExpression: function (expr, precedence, flags) {
          return this.BinaryExpression(expr, precedence, flags);
        },
        BinaryExpression: function (expr, precedence, flags) {
          var result, currentPrecedence, fragment, leftSource;
          currentPrecedence = BinaryPrecedence[expr.operator];
          if (currentPrecedence < precedence) {
            flags |= F_ALLOW_IN;
          }
          fragment = this.generateExpression(expr.left, currentPrecedence, flags);
          leftSource = fragment.toString();
          if (leftSource.charCodeAt(leftSource.length - 1) === 47 && esutils.code.isIdentifierPart(expr.operator.charCodeAt(0))) {
            result = [
              fragment,
              noEmptySpace(),
              expr.operator
            ];
          } else {
            result = join(fragment, expr.operator);
          }
          fragment = this.generateExpression(expr.right, currentPrecedence + 1, flags);
          if (expr.operator === '/' && fragment.toString().charAt(0) === '/' || expr.operator.slice(-1) === '<' && fragment.toString().slice(0, 3) === '!--') {
            result.push(noEmptySpace());
            result.push(fragment);
          } else {
            result = join(result, fragment);
          }
          if (expr.operator === 'in' && !(flags & F_ALLOW_IN)) {
            return [
              '(',
              result,
              ')'
            ];
          }
          return parenthesize(result, currentPrecedence, precedence);
        },
        CallExpression: function (expr, precedence, flags) {
          var result, i, iz;
          result = [this.generateExpression(expr.callee, Precedence.Call, E_TTF)];
          result.push('(');
          for (i = 0, iz = expr['arguments'].length; i < iz; ++i) {
            result.push(this.generateExpression(expr['arguments'][i], Precedence.Assignment, E_TTT));
            if (i + 1 < iz) {
              result.push(',' + space);
            }
          }
          result.push(')');
          if (!(flags & F_ALLOW_CALL)) {
            return [
              '(',
              result,
              ')'
            ];
          }
          return parenthesize(result, Precedence.Call, precedence);
        },
        NewExpression: function (expr, precedence, flags) {
          var result, length, i, iz, itemFlags;
          length = expr['arguments'].length;
          itemFlags = flags & F_ALLOW_UNPARATH_NEW && !parentheses && length === 0 ? E_TFT : E_TFF;
          result = join('new', this.generateExpression(expr.callee, Precedence.New, itemFlags));
          if (!(flags & F_ALLOW_UNPARATH_NEW) || parentheses || length > 0) {
            result.push('(');
            for (i = 0, iz = length; i < iz; ++i) {
              result.push(this.generateExpression(expr['arguments'][i], Precedence.Assignment, E_TTT));
              if (i + 1 < iz) {
                result.push(',' + space);
              }
            }
            result.push(')');
          }
          return parenthesize(result, Precedence.New, precedence);
        },
        MemberExpression: function (expr, precedence, flags) {
          var result, fragment;
          result = [this.generateExpression(expr.object, Precedence.Call, flags & F_ALLOW_CALL ? E_TTF : E_TFF)];
          if (expr.computed) {
            result.push('[');
            result.push(this.generateExpression(expr.property, Precedence.Sequence, flags & F_ALLOW_CALL ? E_TTT : E_TFT));
            result.push(']');
          } else {
            if (expr.object.type === Syntax.Literal && typeof expr.object.value === 'number') {
              fragment = toSourceNodeWhenNeeded(result).toString();
              if (fragment.indexOf('.') < 0 && !/[eExX]/.test(fragment) && esutils.code.isDecimalDigit(fragment.charCodeAt(fragment.length - 1)) && !(fragment.length >= 2 && fragment.charCodeAt(0) === 48)) {
                result.push('.');
              }
            }
            result.push('.');
            result.push(generateIdentifier(expr.property));
          }
          return parenthesize(result, Precedence.Member, precedence);
        },
        UnaryExpression: function (expr, precedence, flags) {
          var result, fragment, rightCharCode, leftSource, leftCharCode;
          fragment = this.generateExpression(expr.argument, Precedence.Unary, E_TTT);
          if (space === '') {
            result = join(expr.operator, fragment);
          } else {
            result = [expr.operator];
            if (expr.operator.length > 2) {
              result = join(result, fragment);
            } else {
              leftSource = toSourceNodeWhenNeeded(result).toString();
              leftCharCode = leftSource.charCodeAt(leftSource.length - 1);
              rightCharCode = fragment.toString().charCodeAt(0);
              if ((leftCharCode === 43 || leftCharCode === 45) && leftCharCode === rightCharCode || esutils.code.isIdentifierPart(leftCharCode) && esutils.code.isIdentifierPart(rightCharCode)) {
                result.push(noEmptySpace());
                result.push(fragment);
              } else {
                result.push(fragment);
              }
            }
          }
          return parenthesize(result, Precedence.Unary, precedence);
        },
        YieldExpression: function (expr, precedence, flags) {
          var result;
          if (expr.delegate) {
            result = 'yield*';
          } else {
            result = 'yield';
          }
          if (expr.argument) {
            result = join(result, this.generateExpression(expr.argument, Precedence.Yield, E_TTT));
          }
          return parenthesize(result, Precedence.Yield, Infinity);
        },
        UpdateExpression: function (expr, precedence, flags) {
          if (expr.prefix) {
            return parenthesize([
              expr.operator,
              this.generateExpression(expr.argument, Precedence.Unary, E_TTT)
            ], Precedence.Unary, precedence);
          }
          return parenthesize([
            this.generateExpression(expr.argument, Precedence.Postfix, E_TTT),
            expr.operator
          ], Precedence.Postfix, precedence);
        },
        FunctionExpression: function (expr, precedence, flags) {
          var result, isGenerator;
          isGenerator = expr.generator && !extra.moz.starlessGenerator;
          result = isGenerator ? 'function*' : 'function';
          if (expr.id) {
            return [
              result,
              isGenerator ? space : noEmptySpace(),
              generateIdentifier(expr.id),
              this.generateFunctionBody(expr)
            ];
          }
          return [
            result + space,
            this.generateFunctionBody(expr)
          ];
        },
        ExportBatchSpecifier: function (expr, precedence, flags) {
          return '*';
        },
        ArrayPattern: function (expr, precedence, flags) {
          return this.ArrayExpression(expr, precedence, flags);
        },
        ArrayExpression: function (expr, precedence, flags) {
          var result, multiline, that = this;
          if (!expr.elements.length) {
            return '[]';
          }
          multiline = expr.elements.length > 1;
          result = [
            '[',
            multiline ? newline : ''
          ];
          withIndent(function (indent) {
            var i, iz;
            for (i = 0, iz = expr.elements.length; i < iz; ++i) {
              if (!expr.elements[i]) {
                if (multiline) {
                  result.push(indent);
                }
                if (i + 1 === iz) {
                  result.push(',');
                }
              } else {
                result.push(multiline ? indent : '');
                result.push(that.generateExpression(expr.elements[i], Precedence.Assignment, E_TTT));
              }
              if (i + 1 < iz) {
                result.push(',' + (multiline ? newline : space));
              }
            }
          });
          if (multiline && !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
            result.push(newline);
          }
          result.push(multiline ? base : '');
          result.push(']');
          return result;
        },
        ClassExpression: function (expr, precedence, flags) {
          var result, fragment;
          result = ['class'];
          if (expr.id) {
            result = join(result, this.generateExpression(expr.id, Precedence.Sequence, E_TTT));
          }
          if (expr.superClass) {
            fragment = join('extends', this.generateExpression(expr.superClass, Precedence.Assignment, E_TTT));
            result = join(result, fragment);
          }
          result.push(space);
          result.push(this.generateStatement(expr.body, S_TFFT));
          return result;
        },
        MethodDefinition: function (expr, precedence, flags) {
          var result, fragment;
          if (expr['static']) {
            result = ['static' + space];
          } else {
            result = [];
          }
          if (expr.kind === 'get' || expr.kind === 'set') {
            result = join(result, [
              join(expr.kind, this.generatePropertyKey(expr.key, expr.computed)),
              this.generateFunctionBody(expr.value)
            ]);
          } else {
            fragment = [
              this.generatePropertyKey(expr.key, expr.computed),
              this.generateFunctionBody(expr.value)
            ];
            if (expr.value.generator) {
              result.push('*');
              result.push(fragment);
            } else {
              result = join(result, fragment);
            }
          }
          return result;
        },
        Property: function (expr, precedence, flags) {
          var result;
          if (expr.kind === 'get' || expr.kind === 'set') {
            return [
              expr.kind,
              noEmptySpace(),
              this.generatePropertyKey(expr.key, expr.computed),
              this.generateFunctionBody(expr.value)
            ];
          }
          if (expr.shorthand) {
            return this.generatePropertyKey(expr.key, expr.computed);
          }
          if (expr.method) {
            result = [];
            if (expr.value.generator) {
              result.push('*');
            }
            result.push(this.generatePropertyKey(expr.key, expr.computed));
            result.push(this.generateFunctionBody(expr.value));
            return result;
          }
          return [
            this.generatePropertyKey(expr.key, expr.computed),
            ':' + space,
            this.generateExpression(expr.value, Precedence.Assignment, E_TTT)
          ];
        },
        ObjectExpression: function (expr, precedence, flags) {
          var multiline, result, fragment, that = this;
          if (!expr.properties.length) {
            return '{}';
          }
          multiline = expr.properties.length > 1;
          withIndent(function () {
            fragment = that.generateExpression(expr.properties[0], Precedence.Sequence, E_TTT);
          });
          if (!multiline) {
            if (!hasLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
              return [
                '{',
                space,
                fragment,
                space,
                '}'
              ];
            }
          }
          withIndent(function (indent) {
            var i, iz;
            result = [
              '{',
              newline,
              indent,
              fragment
            ];
            if (multiline) {
              result.push(',' + newline);
              for (i = 1, iz = expr.properties.length; i < iz; ++i) {
                result.push(indent);
                result.push(that.generateExpression(expr.properties[i], Precedence.Sequence, E_TTT));
                if (i + 1 < iz) {
                  result.push(',' + newline);
                }
              }
            }
          });
          if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
            result.push(newline);
          }
          result.push(base);
          result.push('}');
          return result;
        },
        ObjectPattern: function (expr, precedence, flags) {
          var result, i, iz, multiline, property, that = this;
          if (!expr.properties.length) {
            return '{}';
          }
          multiline = false;
          if (expr.properties.length === 1) {
            property = expr.properties[0];
            if (property.value.type !== Syntax.Identifier) {
              multiline = true;
            }
          } else {
            for (i = 0, iz = expr.properties.length; i < iz; ++i) {
              property = expr.properties[i];
              if (!property.shorthand) {
                multiline = true;
                break;
              }
            }
          }
          result = [
            '{',
            multiline ? newline : ''
          ];
          withIndent(function (indent) {
            var i, iz;
            for (i = 0, iz = expr.properties.length; i < iz; ++i) {
              result.push(multiline ? indent : '');
              result.push(that.generateExpression(expr.properties[i], Precedence.Sequence, E_TTT));
              if (i + 1 < iz) {
                result.push(',' + (multiline ? newline : space));
              }
            }
          });
          if (multiline && !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
            result.push(newline);
          }
          result.push(multiline ? base : '');
          result.push('}');
          return result;
        },
        ThisExpression: function (expr, precedence, flags) {
          return 'this';
        },
        Identifier: function (expr, precedence, flags) {
          return generateIdentifier(expr);
        },
        ImportDefaultSpecifier: function (expr, precedence, flags) {
          return generateIdentifier(expr.id);
        },
        ImportNamespaceSpecifier: function (expr, precedence, flags) {
          var result = ['*'];
          if (expr.id) {
            result.push(space + 'as' + noEmptySpace() + generateIdentifier(expr.id));
          }
          return result;
        },
        ImportSpecifier: function (expr, precedence, flags) {
          return this.ExportSpecifier(expr, precedence, flags);
        },
        ExportSpecifier: function (expr, precedence, flags) {
          var result = [expr.id.name];
          if (expr.name) {
            result.push(noEmptySpace() + 'as' + noEmptySpace() + generateIdentifier(expr.name));
          }
          return result;
        },
        Literal: function (expr, precedence, flags) {
          var raw;
          if (expr.hasOwnProperty('raw') && parse && extra.raw) {
            try {
              raw = parse(expr.raw).body[0].expression;
              if (raw.type === Syntax.Literal) {
                if (raw.value === expr.value) {
                  return expr.raw;
                }
              }
            } catch (e) {
            }
          }
          if (expr.value === null) {
            return 'null';
          }
          if (typeof expr.value === 'string') {
            return escapeString(expr.value);
          }
          if (typeof expr.value === 'number') {
            return generateNumber(expr.value);
          }
          if (typeof expr.value === 'boolean') {
            return expr.value ? 'true' : 'false';
          }
          return generateRegExp(expr.value);
        },
        GeneratorExpression: function (expr, precedence, flags) {
          return this.ComprehensionExpression(expr, precedence, flags);
        },
        ComprehensionExpression: function (expr, precedence, flags) {
          var result, i, iz, fragment, that = this;
          result = expr.type === Syntax.GeneratorExpression ? ['('] : ['['];
          if (extra.moz.comprehensionExpressionStartsWithAssignment) {
            fragment = this.generateExpression(expr.body, Precedence.Assignment, E_TTT);
            result.push(fragment);
          }
          if (expr.blocks) {
            withIndent(function () {
              for (i = 0, iz = expr.blocks.length; i < iz; ++i) {
                fragment = that.generateExpression(expr.blocks[i], Precedence.Sequence, E_TTT);
                if (i > 0 || extra.moz.comprehensionExpressionStartsWithAssignment) {
                  result = join(result, fragment);
                } else {
                  result.push(fragment);
                }
              }
            });
          }
          if (expr.filter) {
            result = join(result, 'if' + space);
            fragment = this.generateExpression(expr.filter, Precedence.Sequence, E_TTT);
            result = join(result, [
              '(',
              fragment,
              ')'
            ]);
          }
          if (!extra.moz.comprehensionExpressionStartsWithAssignment) {
            fragment = this.generateExpression(expr.body, Precedence.Assignment, E_TTT);
            result = join(result, fragment);
          }
          result.push(expr.type === Syntax.GeneratorExpression ? ')' : ']');
          return result;
        },
        ComprehensionBlock: function (expr, precedence, flags) {
          var fragment;
          if (expr.left.type === Syntax.VariableDeclaration) {
            fragment = [
              expr.left.kind,
              noEmptySpace(),
              this.generateStatement(expr.left.declarations[0], S_FFFF)
            ];
          } else {
            fragment = this.generateExpression(expr.left, Precedence.Call, E_TTT);
          }
          fragment = join(fragment, expr.of ? 'of' : 'in');
          fragment = join(fragment, this.generateExpression(expr.right, Precedence.Sequence, E_TTT));
          return [
            'for' + space + '(',
            fragment,
            ')'
          ];
        },
        SpreadElement: function (expr, precedence, flags) {
          return [
            '...',
            this.generateExpression(expr.argument, Precedence.Assignment, E_TTT)
          ];
        },
        TaggedTemplateExpression: function (expr, precedence, flags) {
          var itemFlags = E_TTF;
          if (!(flags & F_ALLOW_CALL)) {
            itemFlags = E_TFF;
          }
          var result = [
              this.generateExpression(expr.tag, Precedence.Call, itemFlags),
              this.generateExpression(expr.quasi, Precedence.Primary, E_FFT)
            ];
          return parenthesize(result, Precedence.TaggedTemplate, precedence);
        },
        TemplateElement: function (expr, precedence, flags) {
          return expr.value.raw;
        },
        TemplateLiteral: function (expr, precedence, flags) {
          var result, i, iz;
          result = ['`'];
          for (i = 0, iz = expr.quasis.length; i < iz; ++i) {
            result.push(this.generateExpression(expr.quasis[i], Precedence.Primary, E_TTT));
            if (i + 1 < iz) {
              result.push('${' + space);
              result.push(this.generateExpression(expr.expressions[i], Precedence.Sequence, E_TTT));
              result.push(space + '}');
            }
          }
          result.push('`');
          return result;
        },
        ModuleSpecifier: function (expr, precedence, flags) {
          return this.Literal(expr, precedence, flags);
        }
      };
      merge(CodeGenerator.prototype, CodeGenerator.Expression);
      CodeGenerator.prototype.generateExpression = function (expr, precedence, flags) {
        var result, type;
        type = expr.type || Syntax.Property;
        if (extra.verbatim && expr.hasOwnProperty(extra.verbatim)) {
          return generateVerbatim(expr, precedence);
        }
        result = this[type](expr, precedence, flags);
        if (extra.comment) {
          result = addComments(expr, result);
        }
        return toSourceNodeWhenNeeded(result, expr);
      };
      CodeGenerator.prototype.generateStatement = function (stmt, flags) {
        var result, fragment;
        result = this[stmt.type](stmt, flags);
        if (extra.comment) {
          result = addComments(stmt, result);
        }
        fragment = toSourceNodeWhenNeeded(result).toString();
        if (stmt.type === Syntax.Program && !safeConcatenation && newline === '' && fragment.charAt(fragment.length - 1) === '\n') {
          result = sourceMap ? toSourceNodeWhenNeeded(result).replaceRight(/\s+$/, '') : fragment.replace(/\s+$/, '');
        }
        return toSourceNodeWhenNeeded(result, stmt);
      };
      function generateInternal(node) {
        var codegen;
        codegen = new CodeGenerator;
        if (isStatement(node)) {
          return codegen.generateStatement(node, S_TFFF);
        }
        if (isExpression(node)) {
          return codegen.generateExpression(node, Precedence.Sequence, E_TTT);
        }
        throw new Error('Unknown node type: ' + node.type);
      }
      function generate(node, options) {
        var defaultOptions = getDefaultOptions(), result, pair;
        if (options != null) {
          if (typeof options.indent === 'string') {
            defaultOptions.format.indent.style = options.indent;
          }
          if (typeof options.base === 'number') {
            defaultOptions.format.indent.base = options.base;
          }
          options = updateDeeply(defaultOptions, options);
          indent = options.format.indent.style;
          if (typeof options.base === 'string') {
            base = options.base;
          } else {
            base = stringRepeat(indent, options.format.indent.base);
          }
        } else {
          options = defaultOptions;
          indent = options.format.indent.style;
          base = stringRepeat(indent, options.format.indent.base);
        }
        json = options.format.json;
        renumber = options.format.renumber;
        hexadecimal = json ? false : options.format.hexadecimal;
        quotes = json ? 'double' : options.format.quotes;
        escapeless = options.format.escapeless;
        newline = options.format.newline;
        space = options.format.space;
        if (options.format.compact) {
          newline = space = indent = base = '';
        }
        parentheses = options.format.parentheses;
        semicolons = options.format.semicolons;
        safeConcatenation = options.format.safeConcatenation;
        directive = options.directive;
        parse = json ? null : options.parse;
        sourceMap = options.sourceMap;
        extra = options;
        if (sourceMap) {
          if (!exports.browser) {
            SourceNode = require('/node_modules/source-map/lib/source-map.js', module).SourceNode;
          } else {
            SourceNode = global.sourceMap.SourceNode;
          }
        }
        result = generateInternal(node);
        if (!sourceMap) {
          pair = {
            code: result.toString(),
            map: null
          };
          return options.sourceMapWithCode ? pair : pair.code;
        }
        pair = result.toStringWithSourceMap({
          file: options.file,
          sourceRoot: options.sourceMapRoot
        });
        if (options.sourceContent) {
          pair.map.setSourceContent(options.sourceMap, options.sourceContent);
        }
        if (options.sourceMapWithCode) {
          return pair;
        }
        return pair.map.toString();
      }
      FORMAT_MINIFY = {
        indent: {
          style: '',
          base: 0
        },
        renumber: true,
        hexadecimal: true,
        quotes: 'auto',
        escapeless: true,
        compact: true,
        parentheses: false,
        semicolons: false
      };
      FORMAT_DEFAULTS = getDefaultOptions().format;
      exports.version = require('/package.json', module).version;
      exports.generate = generate;
      exports.attachComments = estraverse.attachComments;
      exports.Precedence = updateDeeply({}, Precedence);
      exports.browser = false;
      exports.FORMAT_MINIFY = FORMAT_MINIFY;
      exports.FORMAT_DEFAULTS = FORMAT_DEFAULTS;
    }());
  });
  require.define('/package.json', function (module, exports, __dirname, __filename) {
    module.exports = {
      'name': 'escodegen',
      'description': 'ECMAScript code generator',
      'homepage': 'http://github.com/estools/escodegen',
      'main': 'escodegen.js',
      'bin': {
        'esgenerate': './bin/esgenerate.js',
        'escodegen': './bin/escodegen.js'
      },
      'files': [
        'LICENSE.BSD',
        'LICENSE.source-map',
        'README.md',
        'bin',
        'escodegen.js',
        'package.json'
      ],
      'version': '1.4.4-dev',
      'engines': { 'node': '>=0.10.0' },
      'maintainers': [{
          'name': 'Yusuke Suzuki',
          'email': 'utatane.tea@gmail.com',
          'web': 'http://github.com/Constellation'
        }],
      'repository': {
        'type': 'git',
        'url': 'http://github.com/estools/escodegen.git'
      },
      'dependencies': {
        'estraverse': '^1.9.0',
        'esutils': '^1.1.6',
        'esprima': '^1.2.2',
        'optionator': '^0.5.0'
      },
      'optionalDependencies': { 'source-map': '~0.1.40' },
      'devDependencies': {
        'bluebird': '^2.3.11',
        'bower-registry-client': '^0.2.1',
        'browserify': '^7.0.1',
        'chai': '^1.10.0',
        'commonjs-everywhere': '^0.9.7',
        'esprima-moz': '*',
        'gulp': '^3.8.10',
        'gulp-eslint': '^0.2.0',
        'gulp-mocha': '^2.0.0',
        'semver': '^4.1.0'
      },
      'licenses': [{
          'type': 'BSD',
          'url': 'http://github.com/estools/escodegen/raw/master/LICENSE.BSD'
        }],
      'scripts': {
        'test': 'gulp travis',
        'unit-test': 'gulp test',
        'lint': 'gulp lint',
        'release': 'node tools/release.js',
        'build-min': './node_modules/.bin/cjsify -ma path: tools/entry-point.js > escodegen.browser.min.js',
        'build': './node_modules/.bin/cjsify -a path: tools/entry-point.js > escodegen.browser.js'
      }
    };
  });
  require.define('/node_modules/source-map/lib/source-map.js', function (module, exports, __dirname, __filename) {
    exports.SourceMapGenerator = require('/node_modules/source-map/lib/source-map/source-map-generator.js', module).SourceMapGenerator;
    exports.SourceMapConsumer = require('/node_modules/source-map/lib/source-map/source-map-consumer.js', module).SourceMapConsumer;
    exports.SourceNode = require('/node_modules/source-map/lib/source-map/source-node.js', module).SourceNode;
  });
  require.define('/node_modules/source-map/lib/source-map/source-node.js', function (module, exports, __dirname, __filename) {
    if (typeof define !== 'function') {
      var define = require('/node_modules/source-map/node_modules/amdefine/amdefine.js', module)(module, require);
    }
    define(function (require, exports, module) {
      var SourceMapGenerator = require('/node_modules/source-map/lib/source-map/source-map-generator.js', module).SourceMapGenerator;
      var util = require('/node_modules/source-map/lib/source-map/util.js', module);
      var REGEX_NEWLINE = /(\r?\n)/;
      var REGEX_CHARACTER = /\r\n|[\s\S]/g;
      function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
        this.children = [];
        this.sourceContents = {};
        this.line = aLine == null ? null : aLine;
        this.column = aColumn == null ? null : aColumn;
        this.source = aSource == null ? null : aSource;
        this.name = aName == null ? null : aName;
        if (aChunks != null)
          this.add(aChunks);
      }
      SourceNode.fromStringWithSourceMap = function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
        var node = new SourceNode;
        var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
        var shiftNextLine = function () {
          var lineContents = remainingLines.shift();
          var newLine = remainingLines.shift() || '';
          return lineContents + newLine;
        };
        var lastGeneratedLine = 1, lastGeneratedColumn = 0;
        var lastMapping = null;
        aSourceMapConsumer.eachMapping(function (mapping) {
          if (lastMapping !== null) {
            if (lastGeneratedLine < mapping.generatedLine) {
              var code = '';
              addMappingWithCode(lastMapping, shiftNextLine());
              lastGeneratedLine++;
              lastGeneratedColumn = 0;
            } else {
              var nextLine = remainingLines[0];
              var code = nextLine.substr(0, mapping.generatedColumn - lastGeneratedColumn);
              remainingLines[0] = nextLine.substr(mapping.generatedColumn - lastGeneratedColumn);
              lastGeneratedColumn = mapping.generatedColumn;
              addMappingWithCode(lastMapping, code);
              lastMapping = mapping;
              return;
            }
          }
          while (lastGeneratedLine < mapping.generatedLine) {
            node.add(shiftNextLine());
            lastGeneratedLine++;
          }
          if (lastGeneratedColumn < mapping.generatedColumn) {
            var nextLine = remainingLines[0];
            node.add(nextLine.substr(0, mapping.generatedColumn));
            remainingLines[0] = nextLine.substr(mapping.generatedColumn);
            lastGeneratedColumn = mapping.generatedColumn;
          }
          lastMapping = mapping;
        }, this);
        if (remainingLines.length > 0) {
          if (lastMapping) {
            addMappingWithCode(lastMapping, shiftNextLine());
          }
          node.add(remainingLines.join(''));
        }
        aSourceMapConsumer.sources.forEach(function (sourceFile) {
          var content = aSourceMapConsumer.sourceContentFor(sourceFile);
          if (content != null) {
            if (aRelativePath != null) {
              sourceFile = util.join(aRelativePath, sourceFile);
            }
            node.setSourceContent(sourceFile, content);
          }
        });
        return node;
        function addMappingWithCode(mapping, code) {
          if (mapping === null || mapping.source === undefined) {
            node.add(code);
          } else {
            var source = aRelativePath ? util.join(aRelativePath, mapping.source) : mapping.source;
            node.add(new SourceNode(mapping.originalLine, mapping.originalColumn, source, code, mapping.name));
          }
        }
      };
      SourceNode.prototype.add = function SourceNode_add(aChunk) {
        if (Array.isArray(aChunk)) {
          aChunk.forEach(function (chunk) {
            this.add(chunk);
          }, this);
        } else if (aChunk instanceof SourceNode || typeof aChunk === 'string') {
          if (aChunk) {
            this.children.push(aChunk);
          }
        } else {
          throw new TypeError('Expected a SourceNode, string, or an array of SourceNodes and strings. Got ' + aChunk);
        }
        return this;
      };
      SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
        if (Array.isArray(aChunk)) {
          for (var i = aChunk.length - 1; i >= 0; i--) {
            this.prepend(aChunk[i]);
          }
        } else if (aChunk instanceof SourceNode || typeof aChunk === 'string') {
          this.children.unshift(aChunk);
        } else {
          throw new TypeError('Expected a SourceNode, string, or an array of SourceNodes and strings. Got ' + aChunk);
        }
        return this;
      };
      SourceNode.prototype.walk = function SourceNode_walk(aFn) {
        var chunk;
        for (var i = 0, len = this.children.length; i < len; i++) {
          chunk = this.children[i];
          if (chunk instanceof SourceNode) {
            chunk.walk(aFn);
          } else {
            if (chunk !== '') {
              aFn(chunk, {
                source: this.source,
                line: this.line,
                column: this.column,
                name: this.name
              });
            }
          }
        }
      };
      SourceNode.prototype.join = function SourceNode_join(aSep) {
        var newChildren;
        var i;
        var len = this.children.length;
        if (len > 0) {
          newChildren = [];
          for (i = 0; i < len - 1; i++) {
            newChildren.push(this.children[i]);
            newChildren.push(aSep);
          }
          newChildren.push(this.children[i]);
          this.children = newChildren;
        }
        return this;
      };
      SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
        var lastChild = this.children[this.children.length - 1];
        if (lastChild instanceof SourceNode) {
          lastChild.replaceRight(aPattern, aReplacement);
        } else if (typeof lastChild === 'string') {
          this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
        } else {
          this.children.push(''.replace(aPattern, aReplacement));
        }
        return this;
      };
      SourceNode.prototype.setSourceContent = function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
        this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
      };
      SourceNode.prototype.walkSourceContents = function SourceNode_walkSourceContents(aFn) {
        for (var i = 0, len = this.children.length; i < len; i++) {
          if (this.children[i] instanceof SourceNode) {
            this.children[i].walkSourceContents(aFn);
          }
        }
        var sources = Object.keys(this.sourceContents);
        for (var i = 0, len = sources.length; i < len; i++) {
          aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
        }
      };
      SourceNode.prototype.toString = function SourceNode_toString() {
        var str = '';
        this.walk(function (chunk) {
          str += chunk;
        });
        return str;
      };
      SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
        var generated = {
            code: '',
            line: 1,
            column: 0
          };
        var map = new SourceMapGenerator(aArgs);
        var sourceMappingActive = false;
        var lastOriginalSource = null;
        var lastOriginalLine = null;
        var lastOriginalColumn = null;
        var lastOriginalName = null;
        this.walk(function (chunk, original) {
          generated.code += chunk;
          if (original.source !== null && original.line !== null && original.column !== null) {
            if (lastOriginalSource !== original.source || lastOriginalLine !== original.line || lastOriginalColumn !== original.column || lastOriginalName !== original.name) {
              map.addMapping({
                source: original.source,
                original: {
                  line: original.line,
                  column: original.column
                },
                generated: {
                  line: generated.line,
                  column: generated.column
                },
                name: original.name
              });
            }
            lastOriginalSource = original.source;
            lastOriginalLine = original.line;
            lastOriginalColumn = original.column;
            lastOriginalName = original.name;
            sourceMappingActive = true;
          } else if (sourceMappingActive) {
            map.addMapping({
              generated: {
                line: generated.line,
                column: generated.column
              }
            });
            lastOriginalSource = null;
            sourceMappingActive = false;
          }
          chunk.match(REGEX_CHARACTER).forEach(function (ch, idx, array) {
            if (REGEX_NEWLINE.test(ch)) {
              generated.line++;
              generated.column = 0;
              if (idx + 1 === array.length) {
                lastOriginalSource = null;
                sourceMappingActive = false;
              } else if (sourceMappingActive) {
                map.addMapping({
                  source: original.source,
                  original: {
                    line: original.line,
                    column: original.column
                  },
                  generated: {
                    line: generated.line,
                    column: generated.column
                  },
                  name: original.name
                });
              }
            } else {
              generated.column += ch.length;
            }
          });
        });
        this.walkSourceContents(function (sourceFile, sourceContent) {
          map.setSourceContent(sourceFile, sourceContent);
        });
        return {
          code: generated.code,
          map: map
        };
      };
      exports.SourceNode = SourceNode;
    });
  });
  require.define('/node_modules/source-map/lib/source-map/util.js', function (module, exports, __dirname, __filename) {
    if (typeof define !== 'function') {
      var define = require('/node_modules/source-map/node_modules/amdefine/amdefine.js', module)(module, require);
    }
    define(function (require, exports, module) {
      function getArg(aArgs, aName, aDefaultValue) {
        if (aName in aArgs) {
          return aArgs[aName];
        } else if (arguments.length === 3) {
          return aDefaultValue;
        } else {
          throw new Error('"' + aName + '" is a required argument.');
        }
      }
      exports.getArg = getArg;
      var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/;
      var dataUrlRegexp = /^data:.+\,.+$/;
      function urlParse(aUrl) {
        var match = aUrl.match(urlRegexp);
        if (!match) {
          return null;
        }
        return {
          scheme: match[1],
          auth: match[2],
          host: match[3],
          port: match[4],
          path: match[5]
        };
      }
      exports.urlParse = urlParse;
      function urlGenerate(aParsedUrl) {
        var url = '';
        if (aParsedUrl.scheme) {
          url += aParsedUrl.scheme + ':';
        }
        url += '//';
        if (aParsedUrl.auth) {
          url += aParsedUrl.auth + '@';
        }
        if (aParsedUrl.host) {
          url += aParsedUrl.host;
        }
        if (aParsedUrl.port) {
          url += ':' + aParsedUrl.port;
        }
        if (aParsedUrl.path) {
          url += aParsedUrl.path;
        }
        return url;
      }
      exports.urlGenerate = urlGenerate;
      function normalize(aPath) {
        var path = aPath;
        var url = urlParse(aPath);
        if (url) {
          if (!url.path) {
            return aPath;
          }
          path = url.path;
        }
        var isAbsolute = path.charAt(0) === '/';
        var parts = path.split(/\/+/);
        for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
          part = parts[i];
          if (part === '.') {
            parts.splice(i, 1);
          } else if (part === '..') {
            up++;
          } else if (up > 0) {
            if (part === '') {
              parts.splice(i + 1, up);
              up = 0;
            } else {
              parts.splice(i, 2);
              up--;
            }
          }
        }
        path = parts.join('/');
        if (path === '') {
          path = isAbsolute ? '/' : '.';
        }
        if (url) {
          url.path = path;
          return urlGenerate(url);
        }
        return path;
      }
      exports.normalize = normalize;
      function join(aRoot, aPath) {
        if (aRoot === '') {
          aRoot = '.';
        }
        if (aPath === '') {
          aPath = '.';
        }
        var aPathUrl = urlParse(aPath);
        var aRootUrl = urlParse(aRoot);
        if (aRootUrl) {
          aRoot = aRootUrl.path || '/';
        }
        if (aPathUrl && !aPathUrl.scheme) {
          if (aRootUrl) {
            aPathUrl.scheme = aRootUrl.scheme;
          }
          return urlGenerate(aPathUrl);
        }
        if (aPathUrl || aPath.match(dataUrlRegexp)) {
          return aPath;
        }
        if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
          aRootUrl.host = aPath;
          return urlGenerate(aRootUrl);
        }
        var joined = aPath.charAt(0) === '/' ? aPath : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);
        if (aRootUrl) {
          aRootUrl.path = joined;
          return urlGenerate(aRootUrl);
        }
        return joined;
      }
      exports.join = join;
      function relative(aRoot, aPath) {
        if (aRoot === '') {
          aRoot = '.';
        }
        aRoot = aRoot.replace(/\/$/, '');
        var url = urlParse(aRoot);
        if (aPath.charAt(0) == '/' && url && url.path == '/') {
          return aPath.slice(1);
        }
        return aPath.indexOf(aRoot + '/') === 0 ? aPath.substr(aRoot.length + 1) : aPath;
      }
      exports.relative = relative;
      function toSetString(aStr) {
        return '$' + aStr;
      }
      exports.toSetString = toSetString;
      function fromSetString(aStr) {
        return aStr.substr(1);
      }
      exports.fromSetString = fromSetString;
      function strcmp(aStr1, aStr2) {
        var s1 = aStr1 || '';
        var s2 = aStr2 || '';
        return (s1 > s2) - (s1 < s2);
      }
      function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
        var cmp;
        cmp = strcmp(mappingA.source, mappingB.source);
        if (cmp) {
          return cmp;
        }
        cmp = mappingA.originalLine - mappingB.originalLine;
        if (cmp) {
          return cmp;
        }
        cmp = mappingA.originalColumn - mappingB.originalColumn;
        if (cmp || onlyCompareOriginal) {
          return cmp;
        }
        cmp = strcmp(mappingA.name, mappingB.name);
        if (cmp) {
          return cmp;
        }
        cmp = mappingA.generatedLine - mappingB.generatedLine;
        if (cmp) {
          return cmp;
        }
        return mappingA.generatedColumn - mappingB.generatedColumn;
      }
      ;
      exports.compareByOriginalPositions = compareByOriginalPositions;
      function compareByGeneratedPositions(mappingA, mappingB, onlyCompareGenerated) {
        var cmp;
        cmp = mappingA.generatedLine - mappingB.generatedLine;
        if (cmp) {
          return cmp;
        }
        cmp = mappingA.generatedColumn - mappingB.generatedColumn;
        if (cmp || onlyCompareGenerated) {
          return cmp;
        }
        cmp = strcmp(mappingA.source, mappingB.source);
        if (cmp) {
          return cmp;
        }
        cmp = mappingA.originalLine - mappingB.originalLine;
        if (cmp) {
          return cmp;
        }
        cmp = mappingA.originalColumn - mappingB.originalColumn;
        if (cmp) {
          return cmp;
        }
        return strcmp(mappingA.name, mappingB.name);
      }
      ;
      exports.compareByGeneratedPositions = compareByGeneratedPositions;
    });
  });
  require.define('/node_modules/source-map/node_modules/amdefine/amdefine.js', function (module, exports, __dirname, __filename) {
    'use strict';
    function amdefine(module, requireFn) {
      'use strict';
      var defineCache = {}, loaderCache = {}, alreadyCalled = false, path = require('path', module), makeRequire, stringRequire;
      function trimDots(ary) {
        var i, part;
        for (i = 0; ary[i]; i += 1) {
          part = ary[i];
          if (part === '.') {
            ary.splice(i, 1);
            i -= 1;
          } else if (part === '..') {
            if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
              break;
            } else if (i > 0) {
              ary.splice(i - 1, 2);
              i -= 2;
            }
          }
        }
      }
      function normalize(name, baseName) {
        var baseParts;
        if (name && name.charAt(0) === '.') {
          if (baseName) {
            baseParts = baseName.split('/');
            baseParts = baseParts.slice(0, baseParts.length - 1);
            baseParts = baseParts.concat(name.split('/'));
            trimDots(baseParts);
            name = baseParts.join('/');
          }
        }
        return name;
      }
      function makeNormalize(relName) {
        return function (name) {
          return normalize(name, relName);
        };
      }
      function makeLoad(id) {
        function load(value) {
          loaderCache[id] = value;
        }
        load.fromText = function (id, text) {
          throw new Error('amdefine does not implement load.fromText');
        };
        return load;
      }
      makeRequire = function (systemRequire, exports, module, relId) {
        function amdRequire(deps, callback) {
          if (typeof deps === 'string') {
            return stringRequire(systemRequire, exports, module, deps, relId);
          } else {
            deps = deps.map(function (depName) {
              return stringRequire(systemRequire, exports, module, depName, relId);
            });
            process.nextTick(function () {
              callback.apply(null, deps);
            });
          }
        }
        amdRequire.toUrl = function (filePath) {
          if (filePath.indexOf('.') === 0) {
            return normalize(filePath, path.dirname(module.filename));
          } else {
            return filePath;
          }
        };
        return amdRequire;
      };
      requireFn = requireFn || function req() {
        return module.require.apply(module, arguments);
      };
      function runFactory(id, deps, factory) {
        var r, e, m, result;
        if (id) {
          e = loaderCache[id] = {};
          m = {
            id: id,
            uri: __filename,
            exports: e
          };
          r = makeRequire(requireFn, e, m, id);
        } else {
          if (alreadyCalled) {
            throw new Error('amdefine with no module ID cannot be called more than once per file.');
          }
          alreadyCalled = true;
          e = module.exports;
          m = module;
          r = makeRequire(requireFn, e, m, module.id);
        }
        if (deps) {
          deps = deps.map(function (depName) {
            return r(depName);
          });
        }
        if (typeof factory === 'function') {
          result = factory.apply(m.exports, deps);
        } else {
          result = factory;
        }
        if (result !== undefined) {
          m.exports = result;
          if (id) {
            loaderCache[id] = m.exports;
          }
        }
      }
      stringRequire = function (systemRequire, exports, module, id, relId) {
        var index = id.indexOf('!'), originalId = id, prefix, plugin;
        if (index === -1) {
          id = normalize(id, relId);
          if (id === 'require') {
            return makeRequire(systemRequire, exports, module, relId);
          } else if (id === 'exports') {
            return exports;
          } else if (id === 'module') {
            return module;
          } else if (loaderCache.hasOwnProperty(id)) {
            return loaderCache[id];
          } else if (defineCache[id]) {
            runFactory.apply(null, defineCache[id]);
            return loaderCache[id];
          } else {
            if (systemRequire) {
              return systemRequire(originalId);
            } else {
              throw new Error('No module with ID: ' + id);
            }
          }
        } else {
          prefix = id.substring(0, index);
          id = id.substring(index + 1, id.length);
          plugin = stringRequire(systemRequire, exports, module, prefix, relId);
          if (plugin.normalize) {
            id = plugin.normalize(id, makeNormalize(relId));
          } else {
            id = normalize(id, relId);
          }
          if (loaderCache[id]) {
            return loaderCache[id];
          } else {
            plugin.load(id, makeRequire(systemRequire, exports, module, relId), makeLoad(id), {});
            return loaderCache[id];
          }
        }
      };
      function define(id, deps, factory) {
        if (Array.isArray(id)) {
          factory = deps;
          deps = id;
          id = undefined;
        } else if (typeof id !== 'string') {
          factory = id;
          id = deps = undefined;
        }
        if (deps && !Array.isArray(deps)) {
          factory = deps;
          deps = undefined;
        }
        if (!deps) {
          deps = [
            'require',
            'exports',
            'module'
          ];
        }
        if (id) {
          defineCache[id] = [
            id,
            deps,
            factory
          ];
        } else {
          runFactory(id, deps, factory);
        }
      }
      define.require = function (id) {
        if (loaderCache[id]) {
          return loaderCache[id];
        }
        if (defineCache[id]) {
          runFactory.apply(null, defineCache[id]);
          return loaderCache[id];
        }
      };
      define.amd = {};
      return define;
    }
    module.exports = amdefine;
  });
  require.define('/node_modules/source-map/lib/source-map/source-map-generator.js', function (module, exports, __dirname, __filename) {
    if (typeof define !== 'function') {
      var define = require('/node_modules/source-map/node_modules/amdefine/amdefine.js', module)(module, require);
    }
    define(function (require, exports, module) {
      var base64VLQ = require('/node_modules/source-map/lib/source-map/base64-vlq.js', module);
      var util = require('/node_modules/source-map/lib/source-map/util.js', module);
      var ArraySet = require('/node_modules/source-map/lib/source-map/array-set.js', module).ArraySet;
      function SourceMapGenerator(aArgs) {
        if (!aArgs) {
          aArgs = {};
        }
        this._file = util.getArg(aArgs, 'file', null);
        this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
        this._sources = new ArraySet;
        this._names = new ArraySet;
        this._mappings = [];
        this._sourcesContents = null;
      }
      SourceMapGenerator.prototype._version = 3;
      SourceMapGenerator.fromSourceMap = function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
        var sourceRoot = aSourceMapConsumer.sourceRoot;
        var generator = new SourceMapGenerator({
            file: aSourceMapConsumer.file,
            sourceRoot: sourceRoot
          });
        aSourceMapConsumer.eachMapping(function (mapping) {
          var newMapping = {
              generated: {
                line: mapping.generatedLine,
                column: mapping.generatedColumn
              }
            };
          if (mapping.source != null) {
            newMapping.source = mapping.source;
            if (sourceRoot != null) {
              newMapping.source = util.relative(sourceRoot, newMapping.source);
            }
            newMapping.original = {
              line: mapping.originalLine,
              column: mapping.originalColumn
            };
            if (mapping.name != null) {
              newMapping.name = mapping.name;
            }
          }
          generator.addMapping(newMapping);
        });
        aSourceMapConsumer.sources.forEach(function (sourceFile) {
          var content = aSourceMapConsumer.sourceContentFor(sourceFile);
          if (content != null) {
            generator.setSourceContent(sourceFile, content);
          }
        });
        return generator;
      };
      SourceMapGenerator.prototype.addMapping = function SourceMapGenerator_addMapping(aArgs) {
        var generated = util.getArg(aArgs, 'generated');
        var original = util.getArg(aArgs, 'original', null);
        var source = util.getArg(aArgs, 'source', null);
        var name = util.getArg(aArgs, 'name', null);
        this._validateMapping(generated, original, source, name);
        if (source != null && !this._sources.has(source)) {
          this._sources.add(source);
        }
        if (name != null && !this._names.has(name)) {
          this._names.add(name);
        }
        this._mappings.push({
          generatedLine: generated.line,
          generatedColumn: generated.column,
          originalLine: original != null && original.line,
          originalColumn: original != null && original.column,
          source: source,
          name: name
        });
      };
      SourceMapGenerator.prototype.setSourceContent = function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
        var source = aSourceFile;
        if (this._sourceRoot != null) {
          source = util.relative(this._sourceRoot, source);
        }
        if (aSourceContent != null) {
          if (!this._sourcesContents) {
            this._sourcesContents = {};
          }
          this._sourcesContents[util.toSetString(source)] = aSourceContent;
        } else if (this._sourcesContents) {
          delete this._sourcesContents[util.toSetString(source)];
          if (Object.keys(this._sourcesContents).length === 0) {
            this._sourcesContents = null;
          }
        }
      };
      SourceMapGenerator.prototype.applySourceMap = function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
        var sourceFile = aSourceFile;
        if (aSourceFile == null) {
          if (aSourceMapConsumer.file == null) {
            throw new Error('SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' + 'or the source map\'s "file" property. Both were omitted.');
          }
          sourceFile = aSourceMapConsumer.file;
        }
        var sourceRoot = this._sourceRoot;
        if (sourceRoot != null) {
          sourceFile = util.relative(sourceRoot, sourceFile);
        }
        var newSources = new ArraySet;
        var newNames = new ArraySet;
        this._mappings.forEach(function (mapping) {
          if (mapping.source === sourceFile && mapping.originalLine != null) {
            var original = aSourceMapConsumer.originalPositionFor({
                line: mapping.originalLine,
                column: mapping.originalColumn
              });
            if (original.source != null) {
              mapping.source = original.source;
              if (aSourceMapPath != null) {
                mapping.source = util.join(aSourceMapPath, mapping.source);
              }
              if (sourceRoot != null) {
                mapping.source = util.relative(sourceRoot, mapping.source);
              }
              mapping.originalLine = original.line;
              mapping.originalColumn = original.column;
              if (original.name != null) {
                mapping.name = original.name;
              }
            }
          }
          var source = mapping.source;
          if (source != null && !newSources.has(source)) {
            newSources.add(source);
          }
          var name = mapping.name;
          if (name != null && !newNames.has(name)) {
            newNames.add(name);
          }
        }, this);
        this._sources = newSources;
        this._names = newNames;
        aSourceMapConsumer.sources.forEach(function (sourceFile) {
          var content = aSourceMapConsumer.sourceContentFor(sourceFile);
          if (content != null) {
            if (aSourceMapPath != null) {
              sourceFile = util.join(aSourceMapPath, sourceFile);
            }
            if (sourceRoot != null) {
              sourceFile = util.relative(sourceRoot, sourceFile);
            }
            this.setSourceContent(sourceFile, content);
          }
        }, this);
      };
      SourceMapGenerator.prototype._validateMapping = function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource, aName) {
        if (aGenerated && 'line' in aGenerated && 'column' in aGenerated && aGenerated.line > 0 && aGenerated.column >= 0 && !aOriginal && !aSource && !aName) {
          return;
        } else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated && aOriginal && 'line' in aOriginal && 'column' in aOriginal && aGenerated.line > 0 && aGenerated.column >= 0 && aOriginal.line > 0 && aOriginal.column >= 0 && aSource) {
          return;
        } else {
          throw new Error('Invalid mapping: ' + JSON.stringify({
            generated: aGenerated,
            source: aSource,
            original: aOriginal,
            name: aName
          }));
        }
      };
      SourceMapGenerator.prototype._serializeMappings = function SourceMapGenerator_serializeMappings() {
        var previousGeneratedColumn = 0;
        var previousGeneratedLine = 1;
        var previousOriginalColumn = 0;
        var previousOriginalLine = 0;
        var previousName = 0;
        var previousSource = 0;
        var result = '';
        var mapping;
        this._mappings.sort(util.compareByGeneratedPositions);
        for (var i = 0, len = this._mappings.length; i < len; i++) {
          mapping = this._mappings[i];
          if (mapping.generatedLine !== previousGeneratedLine) {
            previousGeneratedColumn = 0;
            while (mapping.generatedLine !== previousGeneratedLine) {
              result += ';';
              previousGeneratedLine++;
            }
          } else {
            if (i > 0) {
              if (!util.compareByGeneratedPositions(mapping, this._mappings[i - 1])) {
                continue;
              }
              result += ',';
            }
          }
          result += base64VLQ.encode(mapping.generatedColumn - previousGeneratedColumn);
          previousGeneratedColumn = mapping.generatedColumn;
          if (mapping.source != null) {
            result += base64VLQ.encode(this._sources.indexOf(mapping.source) - previousSource);
            previousSource = this._sources.indexOf(mapping.source);
            result += base64VLQ.encode(mapping.originalLine - 1 - previousOriginalLine);
            previousOriginalLine = mapping.originalLine - 1;
            result += base64VLQ.encode(mapping.originalColumn - previousOriginalColumn);
            previousOriginalColumn = mapping.originalColumn;
            if (mapping.name != null) {
              result += base64VLQ.encode(this._names.indexOf(mapping.name) - previousName);
              previousName = this._names.indexOf(mapping.name);
            }
          }
        }
        return result;
      };
      SourceMapGenerator.prototype._generateSourcesContent = function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
        return aSources.map(function (source) {
          if (!this._sourcesContents) {
            return null;
          }
          if (aSourceRoot != null) {
            source = util.relative(aSourceRoot, source);
          }
          var key = util.toSetString(source);
          return Object.prototype.hasOwnProperty.call(this._sourcesContents, key) ? this._sourcesContents[key] : null;
        }, this);
      };
      SourceMapGenerator.prototype.toJSON = function SourceMapGenerator_toJSON() {
        var map = {
            version: this._version,
            sources: this._sources.toArray(),
            names: this._names.toArray(),
            mappings: this._serializeMappings()
          };
        if (this._file != null) {
          map.file = this._file;
        }
        if (this._sourceRoot != null) {
          map.sourceRoot = this._sourceRoot;
        }
        if (this._sourcesContents) {
          map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
        }
        return map;
      };
      SourceMapGenerator.prototype.toString = function SourceMapGenerator_toString() {
        return JSON.stringify(this);
      };
      exports.SourceMapGenerator = SourceMapGenerator;
    });
  });
  require.define('/node_modules/source-map/lib/source-map/array-set.js', function (module, exports, __dirname, __filename) {
    if (typeof define !== 'function') {
      var define = require('/node_modules/source-map/node_modules/amdefine/amdefine.js', module)(module, require);
    }
    define(function (require, exports, module) {
      var util = require('/node_modules/source-map/lib/source-map/util.js', module);
      function ArraySet() {
        this._array = [];
        this._set = {};
      }
      ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
        var set = new ArraySet;
        for (var i = 0, len = aArray.length; i < len; i++) {
          set.add(aArray[i], aAllowDuplicates);
        }
        return set;
      };
      ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
        var isDuplicate = this.has(aStr);
        var idx = this._array.length;
        if (!isDuplicate || aAllowDuplicates) {
          this._array.push(aStr);
        }
        if (!isDuplicate) {
          this._set[util.toSetString(aStr)] = idx;
        }
      };
      ArraySet.prototype.has = function ArraySet_has(aStr) {
        return Object.prototype.hasOwnProperty.call(this._set, util.toSetString(aStr));
      };
      ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
        if (this.has(aStr)) {
          return this._set[util.toSetString(aStr)];
        }
        throw new Error('"' + aStr + '" is not in the set.');
      };
      ArraySet.prototype.at = function ArraySet_at(aIdx) {
        if (aIdx >= 0 && aIdx < this._array.length) {
          return this._array[aIdx];
        }
        throw new Error('No element indexed by ' + aIdx);
      };
      ArraySet.prototype.toArray = function ArraySet_toArray() {
        return this._array.slice();
      };
      exports.ArraySet = ArraySet;
    });
  });
  require.define('/node_modules/source-map/lib/source-map/base64-vlq.js', function (module, exports, __dirname, __filename) {
    if (typeof define !== 'function') {
      var define = require('/node_modules/source-map/node_modules/amdefine/amdefine.js', module)(module, require);
    }
    define(function (require, exports, module) {
      var base64 = require('/node_modules/source-map/lib/source-map/base64.js', module);
      var VLQ_BASE_SHIFT = 5;
      var VLQ_BASE = 1 << VLQ_BASE_SHIFT;
      var VLQ_BASE_MASK = VLQ_BASE - 1;
      var VLQ_CONTINUATION_BIT = VLQ_BASE;
      function toVLQSigned(aValue) {
        return aValue < 0 ? (-aValue << 1) + 1 : (aValue << 1) + 0;
      }
      function fromVLQSigned(aValue) {
        var isNegative = (aValue & 1) === 1;
        var shifted = aValue >> 1;
        return isNegative ? -shifted : shifted;
      }
      exports.encode = function base64VLQ_encode(aValue) {
        var encoded = '';
        var digit;
        var vlq = toVLQSigned(aValue);
        do {
          digit = vlq & VLQ_BASE_MASK;
          vlq >>>= VLQ_BASE_SHIFT;
          if (vlq > 0) {
            digit |= VLQ_CONTINUATION_BIT;
          }
          encoded += base64.encode(digit);
        } while (vlq > 0);
        return encoded;
      };
      exports.decode = function base64VLQ_decode(aStr, aOutParam) {
        var i = 0;
        var strLen = aStr.length;
        var result = 0;
        var shift = 0;
        var continuation, digit;
        do {
          if (i >= strLen) {
            throw new Error('Expected more digits in base 64 VLQ value.');
          }
          digit = base64.decode(aStr.charAt(i++));
          continuation = !!(digit & VLQ_CONTINUATION_BIT);
          digit &= VLQ_BASE_MASK;
          result = result + (digit << shift);
          shift += VLQ_BASE_SHIFT;
        } while (continuation);
        aOutParam.value = fromVLQSigned(result);
        aOutParam.rest = aStr.slice(i);
      };
    });
  });
  require.define('/node_modules/source-map/lib/source-map/base64.js', function (module, exports, __dirname, __filename) {
    if (typeof define !== 'function') {
      var define = require('/node_modules/source-map/node_modules/amdefine/amdefine.js', module)(module, require);
    }
    define(function (require, exports, module) {
      var charToIntMap = {};
      var intToCharMap = {};
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('').forEach(function (ch, index) {
        charToIntMap[ch] = index;
        intToCharMap[index] = ch;
      });
      exports.encode = function base64_encode(aNumber) {
        if (aNumber in intToCharMap) {
          return intToCharMap[aNumber];
        }
        throw new TypeError('Must be between 0 and 63: ' + aNumber);
      };
      exports.decode = function base64_decode(aChar) {
        if (aChar in charToIntMap) {
          return charToIntMap[aChar];
        }
        throw new TypeError('Not a valid base 64 digit: ' + aChar);
      };
    });
  });
  require.define('/node_modules/source-map/lib/source-map/source-map-consumer.js', function (module, exports, __dirname, __filename) {
    if (typeof define !== 'function') {
      var define = require('/node_modules/source-map/node_modules/amdefine/amdefine.js', module)(module, require);
    }
    define(function (require, exports, module) {
      var util = require('/node_modules/source-map/lib/source-map/util.js', module);
      var binarySearch = require('/node_modules/source-map/lib/source-map/binary-search.js', module);
      var ArraySet = require('/node_modules/source-map/lib/source-map/array-set.js', module).ArraySet;
      var base64VLQ = require('/node_modules/source-map/lib/source-map/base64-vlq.js', module);
      function SourceMapConsumer(aSourceMap) {
        var sourceMap = aSourceMap;
        if (typeof aSourceMap === 'string') {
          sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
        }
        var version = util.getArg(sourceMap, 'version');
        var sources = util.getArg(sourceMap, 'sources');
        var names = util.getArg(sourceMap, 'names', []);
        var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
        var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
        var mappings = util.getArg(sourceMap, 'mappings');
        var file = util.getArg(sourceMap, 'file', null);
        if (version != this._version) {
          throw new Error('Unsupported version: ' + version);
        }
        this._names = ArraySet.fromArray(names, true);
        this._sources = ArraySet.fromArray(sources, true);
        this.sourceRoot = sourceRoot;
        this.sourcesContent = sourcesContent;
        this._mappings = mappings;
        this.file = file;
      }
      SourceMapConsumer.fromSourceMap = function SourceMapConsumer_fromSourceMap(aSourceMap) {
        var smc = Object.create(SourceMapConsumer.prototype);
        smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
        smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
        smc.sourceRoot = aSourceMap._sourceRoot;
        smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(), smc.sourceRoot);
        smc.file = aSourceMap._file;
        smc.__generatedMappings = aSourceMap._mappings.slice().sort(util.compareByGeneratedPositions);
        smc.__originalMappings = aSourceMap._mappings.slice().sort(util.compareByOriginalPositions);
        return smc;
      };
      SourceMapConsumer.prototype._version = 3;
      Object.defineProperty(SourceMapConsumer.prototype, 'sources', {
        get: function () {
          return this._sources.toArray().map(function (s) {
            return this.sourceRoot != null ? util.join(this.sourceRoot, s) : s;
          }, this);
        }
      });
      SourceMapConsumer.prototype.__generatedMappings = null;
      Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
        get: function () {
          if (!this.__generatedMappings) {
            this.__generatedMappings = [];
            this.__originalMappings = [];
            this._parseMappings(this._mappings, this.sourceRoot);
          }
          return this.__generatedMappings;
        }
      });
      SourceMapConsumer.prototype.__originalMappings = null;
      Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
        get: function () {
          if (!this.__originalMappings) {
            this.__generatedMappings = [];
            this.__originalMappings = [];
            this._parseMappings(this._mappings, this.sourceRoot);
          }
          return this.__originalMappings;
        }
      });
      SourceMapConsumer.prototype._nextCharIsMappingSeparator = function SourceMapConsumer_nextCharIsMappingSeparator(aStr) {
        var c = aStr.charAt(0);
        return c === ';' || c === ',';
      };
      SourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
        var generatedLine = 1;
        var previousGeneratedColumn = 0;
        var previousOriginalLine = 0;
        var previousOriginalColumn = 0;
        var previousSource = 0;
        var previousName = 0;
        var str = aStr;
        var temp = {};
        var mapping;
        while (str.length > 0) {
          if (str.charAt(0) === ';') {
            generatedLine++;
            str = str.slice(1);
            previousGeneratedColumn = 0;
          } else if (str.charAt(0) === ',') {
            str = str.slice(1);
          } else {
            mapping = {};
            mapping.generatedLine = generatedLine;
            base64VLQ.decode(str, temp);
            mapping.generatedColumn = previousGeneratedColumn + temp.value;
            previousGeneratedColumn = mapping.generatedColumn;
            str = temp.rest;
            if (str.length > 0 && !this._nextCharIsMappingSeparator(str)) {
              base64VLQ.decode(str, temp);
              mapping.source = this._sources.at(previousSource + temp.value);
              previousSource += temp.value;
              str = temp.rest;
              if (str.length === 0 || this._nextCharIsMappingSeparator(str)) {
                throw new Error('Found a source, but no line and column');
              }
              base64VLQ.decode(str, temp);
              mapping.originalLine = previousOriginalLine + temp.value;
              previousOriginalLine = mapping.originalLine;
              mapping.originalLine += 1;
              str = temp.rest;
              if (str.length === 0 || this._nextCharIsMappingSeparator(str)) {
                throw new Error('Found a source and line, but no column');
              }
              base64VLQ.decode(str, temp);
              mapping.originalColumn = previousOriginalColumn + temp.value;
              previousOriginalColumn = mapping.originalColumn;
              str = temp.rest;
              if (str.length > 0 && !this._nextCharIsMappingSeparator(str)) {
                base64VLQ.decode(str, temp);
                mapping.name = this._names.at(previousName + temp.value);
                previousName += temp.value;
                str = temp.rest;
              }
            }
            this.__generatedMappings.push(mapping);
            if (typeof mapping.originalLine === 'number') {
              this.__originalMappings.push(mapping);
            }
          }
        }
        this.__generatedMappings.sort(util.compareByGeneratedPositions);
        this.__originalMappings.sort(util.compareByOriginalPositions);
      };
      SourceMapConsumer.prototype._findMapping = function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName, aColumnName, aComparator) {
        if (aNeedle[aLineName] <= 0) {
          throw new TypeError('Line must be greater than or equal to 1, got ' + aNeedle[aLineName]);
        }
        if (aNeedle[aColumnName] < 0) {
          throw new TypeError('Column must be greater than or equal to 0, got ' + aNeedle[aColumnName]);
        }
        return binarySearch.search(aNeedle, aMappings, aComparator);
      };
      SourceMapConsumer.prototype.originalPositionFor = function SourceMapConsumer_originalPositionFor(aArgs) {
        var needle = {
            generatedLine: util.getArg(aArgs, 'line'),
            generatedColumn: util.getArg(aArgs, 'column')
          };
        var mapping = this._findMapping(needle, this._generatedMappings, 'generatedLine', 'generatedColumn', util.compareByGeneratedPositions);
        if (mapping && mapping.generatedLine === needle.generatedLine) {
          var source = util.getArg(mapping, 'source', null);
          if (source != null && this.sourceRoot != null) {
            source = util.join(this.sourceRoot, source);
          }
          return {
            source: source,
            line: util.getArg(mapping, 'originalLine', null),
            column: util.getArg(mapping, 'originalColumn', null),
            name: util.getArg(mapping, 'name', null)
          };
        }
        return {
          source: null,
          line: null,
          column: null,
          name: null
        };
      };
      SourceMapConsumer.prototype.sourceContentFor = function SourceMapConsumer_sourceContentFor(aSource) {
        if (!this.sourcesContent) {
          return null;
        }
        if (this.sourceRoot != null) {
          aSource = util.relative(this.sourceRoot, aSource);
        }
        if (this._sources.has(aSource)) {
          return this.sourcesContent[this._sources.indexOf(aSource)];
        }
        var url;
        if (this.sourceRoot != null && (url = util.urlParse(this.sourceRoot))) {
          var fileUriAbsPath = aSource.replace(/^file:\/\//, '');
          if (url.scheme == 'file' && this._sources.has(fileUriAbsPath)) {
            return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)];
          }
          if ((!url.path || url.path == '/') && this._sources.has('/' + aSource)) {
            return this.sourcesContent[this._sources.indexOf('/' + aSource)];
          }
        }
        throw new Error('"' + aSource + '" is not in the SourceMap.');
      };
      SourceMapConsumer.prototype.generatedPositionFor = function SourceMapConsumer_generatedPositionFor(aArgs) {
        var needle = {
            source: util.getArg(aArgs, 'source'),
            originalLine: util.getArg(aArgs, 'line'),
            originalColumn: util.getArg(aArgs, 'column')
          };
        if (this.sourceRoot != null) {
          needle.source = util.relative(this.sourceRoot, needle.source);
        }
        var mapping = this._findMapping(needle, this._originalMappings, 'originalLine', 'originalColumn', util.compareByOriginalPositions);
        if (mapping) {
          return {
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null)
          };
        }
        return {
          line: null,
          column: null
        };
      };
      SourceMapConsumer.GENERATED_ORDER = 1;
      SourceMapConsumer.ORIGINAL_ORDER = 2;
      SourceMapConsumer.prototype.eachMapping = function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
        var context = aContext || null;
        var order = aOrder || SourceMapConsumer.GENERATED_ORDER;
        var mappings;
        switch (order) {
        case SourceMapConsumer.GENERATED_ORDER:
          mappings = this._generatedMappings;
          break;
        case SourceMapConsumer.ORIGINAL_ORDER:
          mappings = this._originalMappings;
          break;
        default:
          throw new Error('Unknown order of iteration.');
        }
        var sourceRoot = this.sourceRoot;
        mappings.map(function (mapping) {
          var source = mapping.source;
          if (source != null && sourceRoot != null) {
            source = util.join(sourceRoot, source);
          }
          return {
            source: source,
            generatedLine: mapping.generatedLine,
            generatedColumn: mapping.generatedColumn,
            originalLine: mapping.originalLine,
            originalColumn: mapping.originalColumn,
            name: mapping.name
          };
        }).forEach(aCallback, context);
      };
      exports.SourceMapConsumer = SourceMapConsumer;
    });
  });
  require.define('/node_modules/source-map/lib/source-map/binary-search.js', function (module, exports, __dirname, __filename) {
    if (typeof define !== 'function') {
      var define = require('/node_modules/source-map/node_modules/amdefine/amdefine.js', module)(module, require);
    }
    define(function (require, exports, module) {
      function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare) {
        var mid = Math.floor((aHigh - aLow) / 2) + aLow;
        var cmp = aCompare(aNeedle, aHaystack[mid], true);
        if (cmp === 0) {
          return aHaystack[mid];
        } else if (cmp > 0) {
          if (aHigh - mid > 1) {
            return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare);
          }
          return aHaystack[mid];
        } else {
          if (mid - aLow > 1) {
            return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare);
          }
          return aLow < 0 ? null : aHaystack[aLow];
        }
      }
      exports.search = function search(aNeedle, aHaystack, aCompare) {
        return aHaystack.length > 0 ? recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack, aCompare) : null;
      };
    });
  });
  require.define('/node_modules/esutils/lib/utils.js', function (module, exports, __dirname, __filename) {
    (function () {
      'use strict';
      exports.ast = require('/node_modules/esutils/lib/ast.js', module);
      exports.code = require('/node_modules/esutils/lib/code.js', module);
      exports.keyword = require('/node_modules/esutils/lib/keyword.js', module);
    }());
  });
  require.define('/node_modules/esutils/lib/keyword.js', function (module, exports, __dirname, __filename) {
    (function () {
      'use strict';
      var code = require('/node_modules/esutils/lib/code.js', module);
      function isStrictModeReservedWordES6(id) {
        switch (id) {
        case 'implements':
        case 'interface':
        case 'package':
        case 'private':
        case 'protected':
        case 'public':
        case 'static':
        case 'let':
          return true;
        default:
          return false;
        }
      }
      function isKeywordES5(id, strict) {
        if (!strict && id === 'yield') {
          return false;
        }
        return isKeywordES6(id, strict);
      }
      function isKeywordES6(id, strict) {
        if (strict && isStrictModeReservedWordES6(id)) {
          return true;
        }
        switch (id.length) {
        case 2:
          return id === 'if' || id === 'in' || id === 'do';
        case 3:
          return id === 'var' || id === 'for' || id === 'new' || id === 'try';
        case 4:
          return id === 'this' || id === 'else' || id === 'case' || id === 'void' || id === 'with' || id === 'enum';
        case 5:
          return id === 'while' || id === 'break' || id === 'catch' || id === 'throw' || id === 'const' || id === 'yield' || id === 'class' || id === 'super';
        case 6:
          return id === 'return' || id === 'typeof' || id === 'delete' || id === 'switch' || id === 'export' || id === 'import';
        case 7:
          return id === 'default' || id === 'finally' || id === 'extends';
        case 8:
          return id === 'function' || id === 'continue' || id === 'debugger';
        case 10:
          return id === 'instanceof';
        default:
          return false;
        }
      }
      function isReservedWordES5(id, strict) {
        return id === 'null' || id === 'true' || id === 'false' || isKeywordES5(id, strict);
      }
      function isReservedWordES6(id, strict) {
        return id === 'null' || id === 'true' || id === 'false' || isKeywordES6(id, strict);
      }
      function isRestrictedWord(id) {
        return id === 'eval' || id === 'arguments';
      }
      function isIdentifierName(id) {
        var i, iz, ch;
        if (id.length === 0) {
          return false;
        }
        ch = id.charCodeAt(0);
        if (!code.isIdentifierStart(ch) || ch === 92) {
          return false;
        }
        for (i = 1, iz = id.length; i < iz; ++i) {
          ch = id.charCodeAt(i);
          if (!code.isIdentifierPart(ch) || ch === 92) {
            return false;
          }
        }
        return true;
      }
      function isIdentifierES5(id, strict) {
        return isIdentifierName(id) && !isReservedWordES5(id, strict);
      }
      function isIdentifierES6(id, strict) {
        return isIdentifierName(id) && !isReservedWordES6(id, strict);
      }
      module.exports = {
        isKeywordES5: isKeywordES5,
        isKeywordES6: isKeywordES6,
        isReservedWordES5: isReservedWordES5,
        isReservedWordES6: isReservedWordES6,
        isRestrictedWord: isRestrictedWord,
        isIdentifierName: isIdentifierName,
        isIdentifierES5: isIdentifierES5,
        isIdentifierES6: isIdentifierES6
      };
    }());
  });
  require.define('/node_modules/esutils/lib/code.js', function (module, exports, __dirname, __filename) {
    (function () {
      'use strict';
      var Regex, NON_ASCII_WHITESPACES;
      Regex = {
        NonAsciiIdentifierStart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]'),
        NonAsciiIdentifierPart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0\u08A2-\u08AC\u08E4-\u08FE\u0900-\u0963\u0966-\u096F\u0971-\u0977\u0979-\u097F\u0981-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C01-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C82\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D02\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191C\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1D00-\u1DE6\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA697\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A\uAA7B\uAA80-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE26\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]')
      };
      function isDecimalDigit(ch) {
        return ch >= 48 && ch <= 57;
      }
      function isHexDigit(ch) {
        return isDecimalDigit(ch) || 97 <= ch && ch <= 102 || 65 <= ch && ch <= 70;
      }
      function isOctalDigit(ch) {
        return ch >= 48 && ch <= 55;
      }
      NON_ASCII_WHITESPACES = [
        5760,
        6158,
        8192,
        8193,
        8194,
        8195,
        8196,
        8197,
        8198,
        8199,
        8200,
        8201,
        8202,
        8239,
        8287,
        12288,
        65279
      ];
      function isWhiteSpace(ch) {
        return ch === 32 || ch === 9 || ch === 11 || ch === 12 || ch === 160 || ch >= 5760 && NON_ASCII_WHITESPACES.indexOf(ch) >= 0;
      }
      function isLineTerminator(ch) {
        return ch === 10 || ch === 13 || ch === 8232 || ch === 8233;
      }
      function isIdentifierStart(ch) {
        return ch >= 97 && ch <= 122 || ch >= 65 && ch <= 90 || ch === 36 || ch === 95 || ch === 92 || ch >= 128 && Regex.NonAsciiIdentifierStart.test(String.fromCharCode(ch));
      }
      function isIdentifierPart(ch) {
        return ch >= 97 && ch <= 122 || ch >= 65 && ch <= 90 || ch >= 48 && ch <= 57 || ch === 36 || ch === 95 || ch === 92 || ch >= 128 && Regex.NonAsciiIdentifierPart.test(String.fromCharCode(ch));
      }
      module.exports = {
        isDecimalDigit: isDecimalDigit,
        isHexDigit: isHexDigit,
        isOctalDigit: isOctalDigit,
        isWhiteSpace: isWhiteSpace,
        isLineTerminator: isLineTerminator,
        isIdentifierStart: isIdentifierStart,
        isIdentifierPart: isIdentifierPart
      };
    }());
  });
  require.define('/node_modules/esutils/lib/ast.js', function (module, exports, __dirname, __filename) {
    (function () {
      'use strict';
      function isExpression(node) {
        if (node == null) {
          return false;
        }
        switch (node.type) {
        case 'ArrayExpression':
        case 'AssignmentExpression':
        case 'BinaryExpression':
        case 'CallExpression':
        case 'ConditionalExpression':
        case 'FunctionExpression':
        case 'Identifier':
        case 'Literal':
        case 'LogicalExpression':
        case 'MemberExpression':
        case 'NewExpression':
        case 'ObjectExpression':
        case 'SequenceExpression':
        case 'ThisExpression':
        case 'UnaryExpression':
        case 'UpdateExpression':
          return true;
        }
        return false;
      }
      function isIterationStatement(node) {
        if (node == null) {
          return false;
        }
        switch (node.type) {
        case 'DoWhileStatement':
        case 'ForInStatement':
        case 'ForStatement':
        case 'WhileStatement':
          return true;
        }
        return false;
      }
      function isStatement(node) {
        if (node == null) {
          return false;
        }
        switch (node.type) {
        case 'BlockStatement':
        case 'BreakStatement':
        case 'ContinueStatement':
        case 'DebuggerStatement':
        case 'DoWhileStatement':
        case 'EmptyStatement':
        case 'ExpressionStatement':
        case 'ForInStatement':
        case 'ForStatement':
        case 'IfStatement':
        case 'LabeledStatement':
        case 'ReturnStatement':
        case 'SwitchStatement':
        case 'ThrowStatement':
        case 'TryStatement':
        case 'VariableDeclaration':
        case 'WhileStatement':
        case 'WithStatement':
          return true;
        }
        return false;
      }
      function isSourceElement(node) {
        return isStatement(node) || node != null && node.type === 'FunctionDeclaration';
      }
      function trailingStatement(node) {
        switch (node.type) {
        case 'IfStatement':
          if (node.alternate != null) {
            return node.alternate;
          }
          return node.consequent;
        case 'LabeledStatement':
        case 'ForStatement':
        case 'ForInStatement':
        case 'WhileStatement':
        case 'WithStatement':
          return node.body;
        }
        return null;
      }
      function isProblematicIfStatement(node) {
        var current;
        if (node.type !== 'IfStatement') {
          return false;
        }
        if (node.alternate == null) {
          return false;
        }
        current = node.consequent;
        do {
          if (current.type === 'IfStatement') {
            if (current.alternate == null) {
              return true;
            }
          }
          current = trailingStatement(current);
        } while (current);
        return false;
      }
      module.exports = {
        isExpression: isExpression,
        isStatement: isStatement,
        isIterationStatement: isIterationStatement,
        isSourceElement: isSourceElement,
        isProblematicIfStatement: isProblematicIfStatement,
        trailingStatement: trailingStatement
      };
    }());
  });
  require.define('/node_modules/estraverse/estraverse.js', function (module, exports, __dirname, __filename) {
    (function (root, factory) {
      'use strict';
      if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
      } else if (typeof exports !== 'undefined') {
        factory(exports);
      } else {
        factory(root.estraverse = {});
      }
    }(this, function (exports) {
      'use strict';
      var Syntax, isArray, VisitorOption, VisitorKeys, objectCreate, objectKeys, BREAK, SKIP, REMOVE;
      function ignoreJSHintError() {
      }
      isArray = Array.isArray;
      if (!isArray) {
        isArray = function isArray(array) {
          return Object.prototype.toString.call(array) === '[object Array]';
        };
      }
      function deepCopy(obj) {
        var ret = {}, key, val;
        for (key in obj) {
          if (obj.hasOwnProperty(key)) {
            val = obj[key];
            if (typeof val === 'object' && val !== null) {
              ret[key] = deepCopy(val);
            } else {
              ret[key] = val;
            }
          }
        }
        return ret;
      }
      function shallowCopy(obj) {
        var ret = {}, key;
        for (key in obj) {
          if (obj.hasOwnProperty(key)) {
            ret[key] = obj[key];
          }
        }
        return ret;
      }
      ignoreJSHintError(shallowCopy);
      function upperBound(array, func) {
        var diff, len, i, current;
        len = array.length;
        i = 0;
        while (len) {
          diff = len >>> 1;
          current = i + diff;
          if (func(array[current])) {
            len = diff;
          } else {
            i = current + 1;
            len -= diff + 1;
          }
        }
        return i;
      }
      function lowerBound(array, func) {
        var diff, len, i, current;
        len = array.length;
        i = 0;
        while (len) {
          diff = len >>> 1;
          current = i + diff;
          if (func(array[current])) {
            i = current + 1;
            len -= diff + 1;
          } else {
            len = diff;
          }
        }
        return i;
      }
      ignoreJSHintError(lowerBound);
      objectCreate = Object.create || function () {
        function F() {
        }
        return function (o) {
          F.prototype = o;
          return new F;
        };
      }();
      objectKeys = Object.keys || function (o) {
        var keys = [], key;
        for (key in o) {
          keys.push(key);
        }
        return keys;
      };
      function extend(to, from) {
        objectKeys(from).forEach(function (key) {
          to[key] = from[key];
        });
        return to;
      }
      Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        ArrayPattern: 'ArrayPattern',
        ArrowFunctionExpression: 'ArrowFunctionExpression',
        AwaitExpression: 'AwaitExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ClassBody: 'ClassBody',
        ClassDeclaration: 'ClassDeclaration',
        ClassExpression: 'ClassExpression',
        ComprehensionBlock: 'ComprehensionBlock',
        ComprehensionExpression: 'ComprehensionExpression',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DebuggerStatement: 'DebuggerStatement',
        DirectiveStatement: 'DirectiveStatement',
        DoWhileStatement: 'DoWhileStatement',
        EmptyStatement: 'EmptyStatement',
        ExportBatchSpecifier: 'ExportBatchSpecifier',
        ExportDeclaration: 'ExportDeclaration',
        ExportSpecifier: 'ExportSpecifier',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        ForOfStatement: 'ForOfStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        GeneratorExpression: 'GeneratorExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        ImportDeclaration: 'ImportDeclaration',
        ImportDefaultSpecifier: 'ImportDefaultSpecifier',
        ImportNamespaceSpecifier: 'ImportNamespaceSpecifier',
        ImportSpecifier: 'ImportSpecifier',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        MethodDefinition: 'MethodDefinition',
        ModuleSpecifier: 'ModuleSpecifier',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        ObjectPattern: 'ObjectPattern',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SpreadElement: 'SpreadElement',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        TaggedTemplateExpression: 'TaggedTemplateExpression',
        TemplateElement: 'TemplateElement',
        TemplateLiteral: 'TemplateLiteral',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement',
        YieldExpression: 'YieldExpression'
      };
      VisitorKeys = {
        AssignmentExpression: [
          'left',
          'right'
        ],
        ArrayExpression: ['elements'],
        ArrayPattern: ['elements'],
        ArrowFunctionExpression: [
          'params',
          'defaults',
          'rest',
          'body'
        ],
        AwaitExpression: ['argument'],
        BlockStatement: ['body'],
        BinaryExpression: [
          'left',
          'right'
        ],
        BreakStatement: ['label'],
        CallExpression: [
          'callee',
          'arguments'
        ],
        CatchClause: [
          'param',
          'body'
        ],
        ClassBody: ['body'],
        ClassDeclaration: [
          'id',
          'body',
          'superClass'
        ],
        ClassExpression: [
          'id',
          'body',
          'superClass'
        ],
        ComprehensionBlock: [
          'left',
          'right'
        ],
        ComprehensionExpression: [
          'blocks',
          'filter',
          'body'
        ],
        ConditionalExpression: [
          'test',
          'consequent',
          'alternate'
        ],
        ContinueStatement: ['label'],
        DebuggerStatement: [],
        DirectiveStatement: [],
        DoWhileStatement: [
          'body',
          'test'
        ],
        EmptyStatement: [],
        ExportBatchSpecifier: [],
        ExportDeclaration: [
          'declaration',
          'specifiers',
          'source'
        ],
        ExportSpecifier: [
          'id',
          'name'
        ],
        ExpressionStatement: ['expression'],
        ForStatement: [
          'init',
          'test',
          'update',
          'body'
        ],
        ForInStatement: [
          'left',
          'right',
          'body'
        ],
        ForOfStatement: [
          'left',
          'right',
          'body'
        ],
        FunctionDeclaration: [
          'id',
          'params',
          'defaults',
          'rest',
          'body'
        ],
        FunctionExpression: [
          'id',
          'params',
          'defaults',
          'rest',
          'body'
        ],
        GeneratorExpression: [
          'blocks',
          'filter',
          'body'
        ],
        Identifier: [],
        IfStatement: [
          'test',
          'consequent',
          'alternate'
        ],
        ImportDeclaration: [
          'specifiers',
          'source'
        ],
        ImportDefaultSpecifier: ['id'],
        ImportNamespaceSpecifier: ['id'],
        ImportSpecifier: [
          'id',
          'name'
        ],
        Literal: [],
        LabeledStatement: [
          'label',
          'body'
        ],
        LogicalExpression: [
          'left',
          'right'
        ],
        MemberExpression: [
          'object',
          'property'
        ],
        MethodDefinition: [
          'key',
          'value'
        ],
        ModuleSpecifier: [],
        NewExpression: [
          'callee',
          'arguments'
        ],
        ObjectExpression: ['properties'],
        ObjectPattern: ['properties'],
        Program: ['body'],
        Property: [
          'key',
          'value'
        ],
        ReturnStatement: ['argument'],
        SequenceExpression: ['expressions'],
        SpreadElement: ['argument'],
        SwitchStatement: [
          'discriminant',
          'cases'
        ],
        SwitchCase: [
          'test',
          'consequent'
        ],
        TaggedTemplateExpression: [
          'tag',
          'quasi'
        ],
        TemplateElement: [],
        TemplateLiteral: [
          'quasis',
          'expressions'
        ],
        ThisExpression: [],
        ThrowStatement: ['argument'],
        TryStatement: [
          'block',
          'handlers',
          'handler',
          'guardedHandlers',
          'finalizer'
        ],
        UnaryExpression: ['argument'],
        UpdateExpression: ['argument'],
        VariableDeclaration: ['declarations'],
        VariableDeclarator: [
          'id',
          'init'
        ],
        WhileStatement: [
          'test',
          'body'
        ],
        WithStatement: [
          'object',
          'body'
        ],
        YieldExpression: ['argument']
      };
      BREAK = {};
      SKIP = {};
      REMOVE = {};
      VisitorOption = {
        Break: BREAK,
        Skip: SKIP,
        Remove: REMOVE
      };
      function Reference(parent, key) {
        this.parent = parent;
        this.key = key;
      }
      Reference.prototype.replace = function replace(node) {
        this.parent[this.key] = node;
      };
      Reference.prototype.remove = function remove() {
        if (isArray(this.parent)) {
          this.parent.splice(this.key, 1);
          return true;
        } else {
          this.replace(null);
          return false;
        }
      };
      function Element(node, path, wrap, ref) {
        this.node = node;
        this.path = path;
        this.wrap = wrap;
        this.ref = ref;
      }
      function Controller() {
      }
      Controller.prototype.path = function path() {
        var i, iz, j, jz, result, element;
        function addToPath(result, path) {
          if (isArray(path)) {
            for (j = 0, jz = path.length; j < jz; ++j) {
              result.push(path[j]);
            }
          } else {
            result.push(path);
          }
        }
        if (!this.__current.path) {
          return null;
        }
        result = [];
        for (i = 2, iz = this.__leavelist.length; i < iz; ++i) {
          element = this.__leavelist[i];
          addToPath(result, element.path);
        }
        addToPath(result, this.__current.path);
        return result;
      };
      Controller.prototype.type = function () {
        var node = this.current();
        return node.type || this.__current.wrap;
      };
      Controller.prototype.parents = function parents() {
        var i, iz, result;
        result = [];
        for (i = 1, iz = this.__leavelist.length; i < iz; ++i) {
          result.push(this.__leavelist[i].node);
        }
        return result;
      };
      Controller.prototype.current = function current() {
        return this.__current.node;
      };
      Controller.prototype.__execute = function __execute(callback, element) {
        var previous, result;
        result = undefined;
        previous = this.__current;
        this.__current = element;
        this.__state = null;
        if (callback) {
          result = callback.call(this, element.node, this.__leavelist[this.__leavelist.length - 1].node);
        }
        this.__current = previous;
        return result;
      };
      Controller.prototype.notify = function notify(flag) {
        this.__state = flag;
      };
      Controller.prototype.skip = function () {
        this.notify(SKIP);
      };
      Controller.prototype['break'] = function () {
        this.notify(BREAK);
      };
      Controller.prototype.remove = function () {
        this.notify(REMOVE);
      };
      Controller.prototype.__initialize = function (root, visitor) {
        this.visitor = visitor;
        this.root = root;
        this.__worklist = [];
        this.__leavelist = [];
        this.__current = null;
        this.__state = null;
        this.__fallback = visitor.fallback === 'iteration';
        this.__keys = VisitorKeys;
        if (visitor.keys) {
          this.__keys = extend(objectCreate(this.__keys), visitor.keys);
        }
      };
      function isNode(node) {
        if (node == null) {
          return false;
        }
        return typeof node === 'object' && typeof node.type === 'string';
      }
      function isProperty(nodeType, key) {
        return (nodeType === Syntax.ObjectExpression || nodeType === Syntax.ObjectPattern) && 'properties' === key;
      }
      Controller.prototype.traverse = function traverse(root, visitor) {
        var worklist, leavelist, element, node, nodeType, ret, key, current, current2, candidates, candidate, sentinel;
        this.__initialize(root, visitor);
        sentinel = {};
        worklist = this.__worklist;
        leavelist = this.__leavelist;
        worklist.push(new Element(root, null, null, null));
        leavelist.push(new Element(null, null, null, null));
        while (worklist.length) {
          element = worklist.pop();
          if (element === sentinel) {
            element = leavelist.pop();
            ret = this.__execute(visitor.leave, element);
            if (this.__state === BREAK || ret === BREAK) {
              return;
            }
            continue;
          }
          if (element.node) {
            ret = this.__execute(visitor.enter, element);
            if (this.__state === BREAK || ret === BREAK) {
              return;
            }
            worklist.push(sentinel);
            leavelist.push(element);
            if (this.__state === SKIP || ret === SKIP) {
              continue;
            }
            node = element.node;
            nodeType = element.wrap || node.type;
            candidates = this.__keys[nodeType];
            if (!candidates) {
              if (this.__fallback) {
                candidates = objectKeys(node);
              } else {
                throw new Error('Unknown node type ' + nodeType + '.');
              }
            }
            current = candidates.length;
            while ((current -= 1) >= 0) {
              key = candidates[current];
              candidate = node[key];
              if (!candidate) {
                continue;
              }
              if (isArray(candidate)) {
                current2 = candidate.length;
                while ((current2 -= 1) >= 0) {
                  if (!candidate[current2]) {
                    continue;
                  }
                  if (isProperty(nodeType, candidates[current])) {
                    element = new Element(candidate[current2], [
                      key,
                      current2
                    ], 'Property', null);
                  } else if (isNode(candidate[current2])) {
                    element = new Element(candidate[current2], [
                      key,
                      current2
                    ], null, null);
                  } else {
                    continue;
                  }
                  worklist.push(element);
                }
              } else if (isNode(candidate)) {
                worklist.push(new Element(candidate, key, null, null));
              }
            }
          }
        }
      };
      Controller.prototype.replace = function replace(root, visitor) {
        function removeElem(element) {
          var i, key, nextElem, parent;
          if (element.ref.remove()) {
            key = element.ref.key;
            parent = element.ref.parent;
            i = worklist.length;
            while (i--) {
              nextElem = worklist[i];
              if (nextElem.ref && nextElem.ref.parent === parent) {
                if (nextElem.ref.key < key) {
                  break;
                }
                --nextElem.ref.key;
              }
            }
          }
        }
        var worklist, leavelist, node, nodeType, target, element, current, current2, candidates, candidate, sentinel, outer, key;
        this.__initialize(root, visitor);
        sentinel = {};
        worklist = this.__worklist;
        leavelist = this.__leavelist;
        outer = { root: root };
        element = new Element(root, null, null, new Reference(outer, 'root'));
        worklist.push(element);
        leavelist.push(element);
        while (worklist.length) {
          element = worklist.pop();
          if (element === sentinel) {
            element = leavelist.pop();
            target = this.__execute(visitor.leave, element);
            if (target !== undefined && target !== BREAK && target !== SKIP && target !== REMOVE) {
              element.ref.replace(target);
            }
            if (this.__state === REMOVE || target === REMOVE) {
              removeElem(element);
            }
            if (this.__state === BREAK || target === BREAK) {
              return outer.root;
            }
            continue;
          }
          target = this.__execute(visitor.enter, element);
          if (target !== undefined && target !== BREAK && target !== SKIP && target !== REMOVE) {
            element.ref.replace(target);
            element.node = target;
          }
          if (this.__state === REMOVE || target === REMOVE) {
            removeElem(element);
            element.node = null;
          }
          if (this.__state === BREAK || target === BREAK) {
            return outer.root;
          }
          node = element.node;
          if (!node) {
            continue;
          }
          worklist.push(sentinel);
          leavelist.push(element);
          if (this.__state === SKIP || target === SKIP) {
            continue;
          }
          nodeType = element.wrap || node.type;
          candidates = this.__keys[nodeType];
          if (!candidates) {
            if (this.__fallback) {
              candidates = objectKeys(node);
            } else {
              throw new Error('Unknown node type ' + nodeType + '.');
            }
          }
          current = candidates.length;
          while ((current -= 1) >= 0) {
            key = candidates[current];
            candidate = node[key];
            if (!candidate) {
              continue;
            }
            if (isArray(candidate)) {
              current2 = candidate.length;
              while ((current2 -= 1) >= 0) {
                if (!candidate[current2]) {
                  continue;
                }
                if (isProperty(nodeType, candidates[current])) {
                  element = new Element(candidate[current2], [
                    key,
                    current2
                  ], 'Property', new Reference(candidate, current2));
                } else if (isNode(candidate[current2])) {
                  element = new Element(candidate[current2], [
                    key,
                    current2
                  ], null, new Reference(candidate, current2));
                } else {
                  continue;
                }
                worklist.push(element);
              }
            } else if (isNode(candidate)) {
              worklist.push(new Element(candidate, key, null, new Reference(node, key)));
            }
          }
        }
        return outer.root;
      };
      function traverse(root, visitor) {
        var controller = new Controller;
        return controller.traverse(root, visitor);
      }
      function replace(root, visitor) {
        var controller = new Controller;
        return controller.replace(root, visitor);
      }
      function extendCommentRange(comment, tokens) {
        var target;
        target = upperBound(tokens, function search(token) {
          return token.range[0] > comment.range[0];
        });
        comment.extendedRange = [
          comment.range[0],
          comment.range[1]
        ];
        if (target !== tokens.length) {
          comment.extendedRange[1] = tokens[target].range[0];
        }
        target -= 1;
        if (target >= 0) {
          comment.extendedRange[0] = tokens[target].range[1];
        }
        return comment;
      }
      function attachComments(tree, providedComments, tokens) {
        var comments = [], comment, len, i, cursor;
        if (!tree.range) {
          throw new Error('attachComments needs range information');
        }
        if (!tokens.length) {
          if (providedComments.length) {
            for (i = 0, len = providedComments.length; i < len; i += 1) {
              comment = deepCopy(providedComments[i]);
              comment.extendedRange = [
                0,
                tree.range[0]
              ];
              comments.push(comment);
            }
            tree.leadingComments = comments;
          }
          return tree;
        }
        for (i = 0, len = providedComments.length; i < len; i += 1) {
          comments.push(extendCommentRange(deepCopy(providedComments[i]), tokens));
        }
        cursor = 0;
        traverse(tree, {
          enter: function (node) {
            var comment;
            while (cursor < comments.length) {
              comment = comments[cursor];
              if (comment.extendedRange[1] > node.range[0]) {
                break;
              }
              if (comment.extendedRange[1] === node.range[0]) {
                if (!node.leadingComments) {
                  node.leadingComments = [];
                }
                node.leadingComments.push(comment);
                comments.splice(cursor, 1);
              } else {
                cursor += 1;
              }
            }
            if (cursor === comments.length) {
              return VisitorOption.Break;
            }
            if (comments[cursor].extendedRange[0] > node.range[1]) {
              return VisitorOption.Skip;
            }
          }
        });
        cursor = 0;
        traverse(tree, {
          leave: function (node) {
            var comment;
            while (cursor < comments.length) {
              comment = comments[cursor];
              if (node.range[1] < comment.extendedRange[0]) {
                break;
              }
              if (node.range[1] === comment.extendedRange[0]) {
                if (!node.trailingComments) {
                  node.trailingComments = [];
                }
                node.trailingComments.push(comment);
                comments.splice(cursor, 1);
              } else {
                cursor += 1;
              }
            }
            if (cursor === comments.length) {
              return VisitorOption.Break;
            }
            if (comments[cursor].extendedRange[0] > node.range[1]) {
              return VisitorOption.Skip;
            }
          }
        });
        return tree;
      }
      exports.version = '1.8.1-dev';
      exports.Syntax = Syntax;
      exports.traverse = traverse;
      exports.replace = replace;
      exports.attachComments = attachComments;
      exports.VisitorKeys = VisitorKeys;
      exports.VisitorOption = VisitorOption;
      exports.Controller = Controller;
    }));
  });
  require('/tools/entry-point.js');
}.call(this, this));

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.ProcessingDebugger=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"./lib/processing-debugger.js":[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Debugger = require("./debugger");
function emptyFunction() {
}
var ProcessingDebugger = (function (_super) {
    __extends(ProcessingDebugger, _super);
    function ProcessingDebugger(context, onBreakpoint, onFunctionDone) {
        _super.call(this, context, onBreakpoint, onFunctionDone);
        this._repeater = null;
    }
    ProcessingDebugger.prototype.onMainStart = function () {
        var _this = this;
        if (this._repeater) {
            this._repeater.stop();
        }
        ProcessingDebugger.events.forEach(function (event) { return _this.context[event] = emptyFunction; });
        this.context.draw = emptyFunction;
    };
    ProcessingDebugger.prototype.onMainDone = function () {
        var _this = this;
        var draw = this.context.draw;
        if (draw !== emptyFunction) {
            this._repeater = this.scheduler.createRepeater(function () { return _this._createStepper(draw()); }, 1000 / 60);
            this._repeater.start();
        }
        ProcessingDebugger.events.forEach(function (name) {
            var eventHandler = _this.context[name];
            if (_isGeneratorFunction(eventHandler)) {
                if (name === "keyTyped") {
                    _this.context.keyCode = 0;
                }
                _this.context[name] = function () {
                    _this.queueGenerator(eventHandler);
                };
            }
        });
    };
    ProcessingDebugger.events = [
        "mouseClicked",
        "mouseDragged",
        "mousePressed",
        "mouseMoved",
        "mouseReleased",
        "keyPressed",
        "keyReleased",
        "keyTyped"
    ];
    return ProcessingDebugger;
})(Debugger);
function _isGeneratorFunction(value) {
    return value && Object.getPrototypeOf(value).constructor.name === "GeneratorFunction";
}
module.exports = ProcessingDebugger;

},{"./debugger":"/Users/kevin/live-editor-stepper/external/stepper/lib/debugger.js"}],"/Users/kevin/live-editor-stepper/external/stepper/external/scheduler/lib/scheduler.js":[function(require,module,exports){
var LinkedList = require("../node_modules/basic-ds/lib/LinkedList");
var Scheduler = (function () {
    function Scheduler() {
        this.queue = new LinkedList();
    }
    Scheduler.prototype.addTask = function (task) {
        var _this = this;
        var done = task.doneCallback;
        task.doneCallback = function () {
            _this.removeTask(task);
            done();
        };
        this.queue.push_front(task);
        this.tick();
    };
    Scheduler.prototype.tick = function () {
        var _this = this;
        setTimeout(function () {
            var currentTask = _this.currentTask();
            if (currentTask !== null && !currentTask.started) {
                currentTask.start();
                _this.tick();
            }
        }, 0);
    };
    Scheduler.prototype.removeTask = function (task) {
        if (task === this.currentTask()) {
            this.queue.pop_back();
            this.tick();
        }
        else {
            throw "not the current task";
        }
    };
    Scheduler.prototype.currentTask = function () {
        return this.queue.last ? this.queue.last.value : null;
    };
    Scheduler.prototype.clear = function () {
        this.queue.clear();
    };
    Scheduler.prototype.createRepeater = function (createFunc, delay) {
        var _repeat = true;
        var _scheduler = this;
        var _delay = delay;
        function repeatFunc() {
            if (!_repeat) {
                return;
            }
            var task = createFunc();
            var done = task.doneCallback;
            task.doneCallback = function () {
                if (_repeat) {
                    setTimeout(repeatFunc, _delay);
                }
                done();
            };
            _scheduler.addTask(task);
        }
        var repeater = {
            stop: function () {
                _repeat = false;
            },
            start: function () {
                repeatFunc();
            }
        };
        Object.defineProperty(repeater, "delay", {
            get: function () {
                return _delay;
            },
            set: function (delay) {
                _delay = delay;
            }
        });
        return repeater;
    };
    return Scheduler;
})();
module.exports = Scheduler;

},{"../node_modules/basic-ds/lib/LinkedList":"/Users/kevin/live-editor-stepper/external/stepper/external/scheduler/node_modules/basic-ds/lib/LinkedList.js"}],"/Users/kevin/live-editor-stepper/external/stepper/external/scheduler/node_modules/basic-ds/lib/LinkedList.js":[function(require,module,exports){
var ListNode = require("./ListNode");
var LinkedList = (function () {
    function LinkedList() {
        this.first = null;
        this.last = null;
    }
    LinkedList.prototype.push_back = function (value) {
        var node = new ListNode(value);
        if (this.first === null && this.last === null) {
            this.first = node;
            this.last = node;
        }
        else {
            node.prev = this.last;
            this.last.next = node;
            this.last = node;
        }
    };
    LinkedList.prototype.push_front = function (value) {
        var node = new ListNode(value);
        if (this.first === null && this.last === null) {
            this.first = node;
            this.last = node;
        }
        else {
            node.next = this.first;
            this.first.prev = node;
            this.first = node;
        }
    };
    LinkedList.prototype.pop_back = function () {
        if (this.last) {
            var value = this.last.value;
            if (this.last.prev) {
                var last = this.last;
                this.last = last.prev;
                this.last.next = null;
                last.destroy();
            }
            else {
                this.last = null;
                this.first = null;
            }
            return value;
        }
        else {
            return null;
        }
    };
    LinkedList.prototype.pop_front = function () {
        if (this.first) {
            var value = this.first.value;
            if (this.first.next) {
                var first = this.first;
                this.first = first.next;
                this.first.prev = null;
                first.destroy();
            }
            else {
                this.first = null;
                this.last = null;
            }
            return value;
        }
        else {
            return null;
        }
    };
    LinkedList.prototype.clear = function () {
        this.first = this.last = null;
    };
    LinkedList.prototype.insertBeforeNode = function (refNode, value) {
        if (refNode === this.first) {
            this.push_front(value);
        }
        else {
            var node = new ListNode(value);
            node.prev = refNode.prev;
            node.next = refNode;
            refNode.prev.next = node;
            refNode.prev = node;
        }
    };
    LinkedList.prototype.forEachNode = function (callback, _this) {
        var node = this.first;
        var index = 0;
        while (node !== null) {
            callback.call(_this, node, index);
            node = node.next;
            index++;
        }
    };
    LinkedList.prototype.forEach = function (callback, _this) {
        this.forEachNode(function (node, index) { return callback.call(_this, node.value, index); }, _this);
    };
    LinkedList.prototype.nodeAtIndex = function (index) {
        var i = 0;
        var node = this.first;
        while (node !== null) {
            if (index === i) {
                return node;
            }
            i++;
            node = node.next;
        }
        return null;
    };
    LinkedList.prototype.valueAtIndex = function (index) {
        var node = this.nodeAtIndex(index);
        return node ? node.value : undefined;
    };
    LinkedList.prototype.toArray = function () {
        var array = [];
        var node = this.first;
        while (node !== null) {
            array.push(node.value);
            node = node.next;
        }
        return array;
    };
    LinkedList.fromArray = function (array) {
        var list = new LinkedList();
        array.forEach(function (value) {
            list.push_back(value);
        });
        return list;
    };
    return LinkedList;
})();
module.exports = LinkedList;

},{"./ListNode":"/Users/kevin/live-editor-stepper/external/stepper/external/scheduler/node_modules/basic-ds/lib/ListNode.js"}],"/Users/kevin/live-editor-stepper/external/stepper/external/scheduler/node_modules/basic-ds/lib/ListNode.js":[function(require,module,exports){
var ListNode = (function () {
    function ListNode(value) {
        this.value = value;
        this.next = null;
        this.prev = null;
    }
    ListNode.prototype.destroy = function () {
        this.value = null;
        this.prev = null;
        this.next = null;
    };
    return ListNode;
})();
module.exports = ListNode;

},{}],"/Users/kevin/live-editor-stepper/external/stepper/lib/debugger.js":[function(require,module,exports){
var Stepper = require("./stepper");
var Scheduler = require("../external/scheduler/lib/scheduler");
var transform = require("../src/transform");
var Debugger = (function () {
    function Debugger(context, onBreakpoint, onFunctionDone) {
        this.context = context || {};
        this.onBreakpoint = onBreakpoint || function () {
        };
        this.onFunctionDone = onFunctionDone || function () {
        };
        this.scheduler = new Scheduler();
        this.breakpoints = {};
        this.breakpointsEnabled = true;
        this._paused = false;
    }
    Object.defineProperty(Debugger.prototype, "context", {
        get: function () {
            return this._context;
        },
        set: function (context) {
            var _this = this;
            this._context = context;
            this._context.__instantiate__ = function (classFn, className) {
                var obj = Object.create(classFn.prototype);
                var args = Array.prototype.slice.call(arguments, 2);
                var gen = classFn.apply(obj, args);
                _this.onNewObject(classFn, className, obj, args);
                if (gen) {
                    gen.obj = obj;
                    return gen;
                }
                else {
                    return obj;
                }
            };
            this._context.__usingDebugger = true;
        },
        enumerable: true,
        configurable: true
    });
    Debugger.isBrowserSupported = function () {
        try {
            var code = "\n" + "var generator = (function* () {\n" + "  yield* (function* () {\n" + "    yield 5; yield 6;\n" + "  }());\n" + "}());\n" + "\n" + "var item = generator.next();\n" + "var passed = item.value === 5 && item.done === false;\n" + "item = generator.next();\n" + "passed &= item.value === 6 && item.done === false;\n" + "item = generator.next();\n" + "passed &= item.value === undefined && item.done === true;\n" + "return passed;";
            return Function(code)();
        }
        catch (e) {
            return false;
        }
    };
    Debugger.prototype.load = function (code) {
        var debugCode = transform(code, this.context);
        var debugFunction = new Function(debugCode);
        this.mainGeneratorFunction = debugFunction();
    };
    Debugger.prototype.start = function (paused) {
        this.scheduler.clear();
        this.onMainStart();
        var mainGeneratorObject = this.mainGeneratorFunction(this.context);
        var stepper = this._createStepper(mainGeneratorObject, true);
        this.scheduler.addTask(stepper);
        stepper.start(paused);
    };
    Debugger.prototype.queueGenerator = function (gen) {
        if (!this.done) {
            var stepper = this._createStepper(gen());
            this.scheduler.addTask(stepper);
        }
    };
    Debugger.prototype.resume = function () {
        if (this._paused) {
            this._paused = false;
            this._currentStepper.resume();
        }
    };
    Debugger.prototype.stepIn = function () {
        if (this._paused) {
            this._currentStepper.stepIn();
        }
    };
    Debugger.prototype.stepOver = function () {
        if (this._paused) {
            this._currentStepper.stepOver();
        }
    };
    Debugger.prototype.stepOut = function () {
        if (this._paused) {
            this._currentStepper.stepOut();
        }
    };
    Debugger.prototype.stop = function () {
        this.done = true;
    };
    Object.defineProperty(Debugger.prototype, "paused", {
        get: function () {
            return this._paused;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Debugger.prototype, "currentStack", {
        get: function () {
            var stepper = this._currentStepper;
            if (stepper !== null) {
                return stepper.stack.toArray().map(function (frame) {
                    return {
                        name: frame.name,
                        line: frame.line
                    };
                });
            }
            else {
                return [];
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Debugger.prototype, "currentScope", {
        get: function () {
            var stepper = this._currentStepper;
            if (stepper) {
                var scope = stepper.stack.peek().scope;
                if (scope) {
                    return scope;
                }
            }
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Debugger.prototype, "currentLine", {
        get: function () {
            if (this._paused) {
                return this._currentStepper.line;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Debugger.prototype, "line", {
        get: function () {
            if (this._paused) {
                return this._currentStepper.line;
            }
        },
        enumerable: true,
        configurable: true
    });
    Debugger.prototype.setBreakpoint = function (line) {
        this.breakpoints[line] = true;
    };
    Debugger.prototype.clearBreakpoint = function (line) {
        delete this.breakpoints[line];
    };
    Object.defineProperty(Debugger.prototype, "_currentStepper", {
        get: function () {
            return this.scheduler.currentTask();
        },
        enumerable: true,
        configurable: true
    });
    Debugger.prototype._createStepper = function (genObj, isMain) {
        var _this = this;
        var stepper = new Stepper(genObj, this.breakpoints, function () {
            _this._paused = true;
            _this.onBreakpoint();
        }, function () {
            _this._paused = false;
            _this.onFunctionDone();
            if (isMain) {
                _this.onMainDone();
            }
        });
        stepper.breakpointsEnabled = this.breakpointsEnabled;
        return stepper;
    };
    Debugger.prototype.onMainStart = function () {
    };
    Debugger.prototype.onMainDone = function () {
    };
    Debugger.prototype.onNewObject = function (classFn, className, obj, args) {
    };
    return Debugger;
})();
module.exports = Debugger;

},{"../external/scheduler/lib/scheduler":"/Users/kevin/live-editor-stepper/external/stepper/external/scheduler/lib/scheduler.js","../src/transform":"/Users/kevin/live-editor-stepper/external/stepper/src/transform.js","./stepper":"/Users/kevin/live-editor-stepper/external/stepper/lib/stepper.js"}],"/Users/kevin/live-editor-stepper/external/stepper/lib/stepper.js":[function(require,module,exports){
var Stack = require("../node_modules/basic-ds/lib/Stack");
var Stepper = (function () {
    function Stepper(genObj, breakpoints, breakCallback, doneCallback) {
        var _this = this;
        this.breakCallback = breakCallback || function () {
        };
        this.doneCallback = doneCallback || function () {
        };
        this._breakpoints = breakpoints || {};
        this.breakpointsEnabled = true;
        this._started = false;
        this._paused = false;
        this._stopped = false;
        this.stack = new Stack();
        this.stack.push({
            gen: genObj,
            line: -1
        });
        this.stack.poppedLastItem = function () {
            _this._stopped = true;
            _this.doneCallback();
        };
        this._retVal = undefined;
    }
    Stepper.prototype.stepIn = function () {
        var result;
        if (result = this._step()) {
            if (result.value && result.value.hasOwnProperty('gen')) {
                if (_isGenerator(result.value.gen)) {
                    this.stack.push({
                        gen: result.value.gen,
                        line: this.line
                    });
                    this.stepIn();
                    return "stepIn";
                }
                else {
                    this._retVal = result.value.gen;
                    if (result.value.stepAgain) {
                        result = this._step();
                    }
                }
            }
            if (result.done) {
                this._popAndStoreReturnValue(result.value);
                return "stepOut";
            }
            return "stepOver";
        }
    };
    Stepper.prototype.stepOver = function () {
        var result;
        if (result = this._step()) {
            if (result.value && result.value.hasOwnProperty('gen')) {
                if (_isGenerator(result.value.gen)) {
                    this._runScope(result.value.gen);
                    if (result.value.stepAgain) {
                        this.stepOver();
                    }
                    return "stepOver";
                }
                else {
                    this._retVal = result.value.gen;
                    if (result.value.stepAgain) {
                        result = this._step();
                    }
                }
            }
            if (result.done) {
                this._popAndStoreReturnValue(result.value);
                return "stepOut";
            }
            return "stepOver";
        }
    };
    Stepper.prototype.stepOut = function () {
        var result;
        if (result = this._step()) {
            while (!result.done) {
                if (result.value.hasOwnProperty('gen')) {
                    if (_isGenerator(result.value.gen)) {
                        this._runScope(result.value.gen);
                    }
                    else {
                        this._retVal = result.value.gen;
                    }
                }
                result = this._step();
            }
            this._popAndStoreReturnValue(result.value);
            return "stepOut";
        }
    };
    Stepper.prototype.start = function (paused) {
        this._started = true;
        this._paused = !!paused;
        this._run();
    };
    Stepper.prototype.resume = function () {
        this._paused = false;
        this._run();
    };
    Stepper.prototype._run = function () {
        var currentLine = this.line;
        while (true) {
            if (this.stack.isEmpty) {
                break;
            }
            var action = this.stepIn();
            if (this.breakpointsEnabled && this._breakpoints[this.line] && action !== "stepOut" && currentLine !== this.line) {
                this._paused = true;
            }
            if (this._paused) {
                this.breakCallback();
                break;
            }
            currentLine = this.line;
        }
    };
    Stepper.prototype.setBreakpoint = function (line) {
        this._breakpoints[line] = true;
    };
    Stepper.prototype.clearBreakpoint = function (line) {
        delete this._breakpoints[line];
    };
    Object.defineProperty(Stepper.prototype, "started", {
        get: function () {
            return this._started;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Stepper.prototype, "stopped", {
        get: function () {
            return this._stopped;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Stepper.prototype, "line", {
        get: function () {
            if (!this._stopped) {
                return this.stack.peek().line;
            }
            else {
                return -1;
            }
        },
        enumerable: true,
        configurable: true
    });
    Stepper.prototype._step = function () {
        if (this.stack.isEmpty) {
            return;
        }
        var frame = this.stack.peek();
        var result = frame.gen.next(this._retVal);
        this._retVal = undefined;
        if (result.value) {
            if (result.value.scope) {
                this.stack.peek().scope = result.value.scope;
            }
            if (result.value.name) {
                this.stack.peek().name = result.value.name;
            }
            if (result.value.line) {
                frame.line = result.value.line;
            }
        }
        return result;
    };
    Stepper.prototype._runScope = function (gen) {
        this.stack.push({
            gen: gen,
            line: this.line
        });
        var result = this._step();
        while (!result.done) {
            if (result.value.gen) {
                if (_isGenerator(result.value.gen)) {
                    this._runScope(result.value.gen);
                }
                else {
                    this._retVal = result.value.gen;
                }
            }
            result = this._step();
        }
        this._popAndStoreReturnValue(result.value);
    };
    Stepper.prototype._popAndStoreReturnValue = function (value) {
        var frame = this.stack.pop();
        this._retVal = frame.gen["obj"] || value;
    };
    return Stepper;
})();
var _isGenerator = function (obj) {
    return obj instanceof Object && obj.toString() === "[object Generator]";
};
module.exports = Stepper;

},{"../node_modules/basic-ds/lib/Stack":"/Users/kevin/live-editor-stepper/external/stepper/node_modules/basic-ds/lib/Stack.js"}],"/Users/kevin/live-editor-stepper/external/stepper/node_modules/basic-ds/lib/LinkedList.js":[function(require,module,exports){
module.exports=require("/Users/kevin/live-editor-stepper/external/stepper/external/scheduler/node_modules/basic-ds/lib/LinkedList.js")
},{"/Users/kevin/live-editor-stepper/external/stepper/external/scheduler/node_modules/basic-ds/lib/LinkedList.js":"/Users/kevin/live-editor-stepper/external/stepper/external/scheduler/node_modules/basic-ds/lib/LinkedList.js"}],"/Users/kevin/live-editor-stepper/external/stepper/node_modules/basic-ds/lib/ListNode.js":[function(require,module,exports){
module.exports=require("/Users/kevin/live-editor-stepper/external/stepper/external/scheduler/node_modules/basic-ds/lib/ListNode.js")
},{"/Users/kevin/live-editor-stepper/external/stepper/external/scheduler/node_modules/basic-ds/lib/ListNode.js":"/Users/kevin/live-editor-stepper/external/stepper/external/scheduler/node_modules/basic-ds/lib/ListNode.js"}],"/Users/kevin/live-editor-stepper/external/stepper/node_modules/basic-ds/lib/Stack.js":[function(require,module,exports){
var Stack = (function () {
    function Stack() {
        this.items = [];
        this.poppedLastItem = function (item) {
        };
    }
    Stack.prototype.push = function (item) {
        this.items.push(item);
    };
    Stack.prototype.pop = function () {
        var item = this.items.pop();
        if (this.isEmpty) {
            this.poppedLastItem(item);
        }
        return item;
    };
    Stack.prototype.peek = function () {
        return this.items[this.items.length - 1];
    };
    Stack.prototype.toArray = function () {
        return this.items.map(function (item) { return item; });
    };
    Object.defineProperty(Stack.prototype, "size", {
        get: function () {
            return this.items.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Stack.prototype, "isEmpty", {
        get: function () {
            return this.items.length === 0;
        },
        enumerable: true,
        configurable: true
    });
    return Stack;
})();
module.exports = Stack;

},{}],"/Users/kevin/live-editor-stepper/external/stepper/node_modules/basic-ds/lib/basic.js":[function(require,module,exports){
exports.LinkedList = require("./LinkedList");
exports.Stack = require("./Stack");

},{"./LinkedList":"/Users/kevin/live-editor-stepper/external/stepper/node_modules/basic-ds/lib/LinkedList.js","./Stack":"/Users/kevin/live-editor-stepper/external/stepper/node_modules/basic-ds/lib/Stack.js"}],"/Users/kevin/live-editor-stepper/external/stepper/src/ast-builder.js":[function(require,module,exports){
/* build Parser API style AST nodes and trees */

var createExpressionStatement = function (expression) {
    return {
        type: "ExpressionStatement",
        expression: expression
    };
};

var createBlockStatement = function (body) {
    return {
        type: "BlockStatement",
        body: body
    }
};

var createCallExpression = function (name, arguments) {
    return {
        type: "CallExpression",
        callee: createIdentifier(name),
        arguments: arguments
    };
};

var createYieldExpression = function (argument) {
    return {
        type: "YieldExpression",
        argument: argument
    };
};

var createObjectExpression = function (obj) {
    var properties = Object.keys(obj).map(function (key) {
        var value = obj[key];
        return createProperty(key, value);
    });

    return {
        type: "ObjectExpression",
        properties: properties
    };
};

var createProperty = function (key, value) {
    var expression;
    if (value instanceof Object) {
        if (value.type === "CallExpression" || value.type === "NewExpression") {
            expression = value;
        } else {
            expression = createObjectExpression(value);
        }
    } else if (value === undefined) {
        expression = createIdentifier("undefined");
    } else {
        expression = createLiteral(value);
    }

    return {
        type: "Property",
        key: createIdentifier(key),
        value: expression,
        kind: "init"
    }
};

var createIdentifier = function (name) {
    return {
        type: "Identifier",
        name: name
    };
};

var createLiteral = function (value) {
    if (value === undefined) {
        throw "literal value undefined";
    }
    return {
        type: "Literal",
        value: value
    }
};

var createWithStatement = function (obj, body) {
    return {
        type: "WithStatement",
        object: obj,
        body: body
    };
};

var createAssignmentExpression = function (name, value) {
    return {
        type: "AssignmentExpression",
        operator: "=",
        left: createIdentifier(name),
        right: value
    }
};

var createVariableDeclarator = function (name, value) {
    return {
        type: "VariableDeclarator",
        id: createIdentifier(name),
        init: value
    };
};

// a declaration is a subclass of statement
var createVariableDeclaration = function (declarations) {
    return {
        type: "VariableDeclaration",
        declarations: declarations,
        kind: "var"
    };
};

var replaceNode = function (parent, name, replacementNode) {
    if (name.indexOf("arguments") === 0) {
        var index = name.match(/\[([0-1]+)\]/)[1];
        parent.arguments[index] = replacementNode;
    } else {
        parent[name] = replacementNode;
    }
};

exports.createExpressionStatement = createExpressionStatement;
exports.createBlockStatement = createBlockStatement;
exports.createCallExpression = createCallExpression;
exports.createYieldExpression = createYieldExpression;
exports.createObjectExpression = createObjectExpression;
exports.createProperty = createProperty;
exports.createIdentifier = createIdentifier;
exports.createLiteral = createLiteral;
exports.createWithStatement = createWithStatement;
exports.createAssignmentExpression = createAssignmentExpression;
exports.createVariableDeclaration = createVariableDeclaration;
exports.createVariableDeclarator = createVariableDeclarator;
exports.replaceNode = replaceNode;

},{}],"/Users/kevin/live-editor-stepper/external/stepper/src/transform.js":[function(require,module,exports){
/*global recast, esprima, escodegen, injector */

var builder = require("./ast-builder");
var basic = require("basic-ds");

function getScopeVariables (node, parent, context) {
    var variables = parent.__$escope$__.variables;
    return variables.filter(function (variable) {
        // don't include context variables in the scopes
        if (node.type === "Program" && context.hasOwnProperty(variable.name)) {
            return false;
        }
        // function declarations like "function Point() {}"
        // don't work properly when defining methods on the
        // prototoype so filter those out as well
        var isFunctionDeclaration = variable.defs.some(function (def) {
            return def.type      === "FunctionName" &&
                def.node.type === "FunctionDeclaration";
        });
        if (isFunctionDeclaration) {
            return false;
        }
        // filter out "arguments"
        // TODO: make this optional, advanced users may want to inspect this
        if (variable.name === "arguments") {
            return false;
        }
        return true;
    });
}

// insert yield { line: <line_number> } in between each line
function insertYields (bodyList) {
    bodyList.forEachNode(function (node) {  // this is a linked list node
        // TODO: separate vars for list nodes and ast nodes
        var loc = node.value.loc;   
        var yieldExpression = builder.createExpressionStatement(
            builder.createYieldExpression(
                builder.createObjectExpression({ line: loc.start.line })
            )
        );
        // add an extra property to differentiate function calls
        // that are followed by a statment from those that aren't
        // the former requires taking an extra _step() to get the
        // next line
        if (node.value.type === "ExpressionStatement") {
            if (node.value.expression.type === "YieldExpression") {
                node.value.expression.argument.properties.push(
                    builder.createProperty("stepAgain", true)
                );
            }
            if (node.value.expression.type === "AssignmentExpression") {
                var expr = node.value.expression.right;
                if (expr.type === "YieldExpression") {
                    expr.argument.properties.push(
                        builder.createProperty("stepAgain", true)
                    );
                }
            }
        }
        // TODO: add test case for "var x = foo()" stepAgain
        // TODO: add test case for "var x = foo(), y = foo()" stepAgain on last decl
        if (node.value.type === "VariableDeclaration") {
            var lastDecl = node.value.declarations[node.value.declarations.length - 1];
            if (lastDecl.init && lastDecl.init.type === "YieldExpression") {
                lastDecl.init.argument.properties.push(
                    builder.createProperty("stepAgain", true)
                );
            }
        }
        bodyList.insertBeforeNode(node, yieldExpression);
    });
}

function create__scope__ (node, bodyList, scope) {
    var properties = scope.map(function (variable) {
        var isParam = variable.defs.some(function (def) {
            return def.type === "Parameter";
        });
        var name = variable.name;

        // if the variable is a parameter initialize its
        // value with the value of the parameter
        var value = isParam ? builder.createIdentifier(name) : builder.createIdentifier("undefined");
        return {
            type: "Property",
            key: builder.createIdentifier(name),
            value: value,
            kind: "init"
        }
    });

    // modify the first yield statement to include the scope
    // as part of the value
    var firstStatement = bodyList.first.value;
    firstStatement.expression.argument.properties.push({
        type: "Property",
        key: builder.createIdentifier("scope"),
        value: builder.createIdentifier("__scope__"),
        kind: "init"
    });

    // wrap the body with a yield statement
    var withStatement = builder.createWithStatement(
        builder.createIdentifier("__scope__"),
        builder.createBlockStatement(bodyList.toArray())
    );
    var objectExpression = {
        type: "ObjectExpression",
        properties: properties
    };

    // replace the body with "var __scope__ = { ... }; with(__scope___) { body }"
    node.body = [
        builder.createVariableDeclaration([
            builder.createVariableDeclarator("__scope__", objectExpression)
        ]),
        withStatement
    ];
}

function stringForId(node) {
    var name = "";
    if (node.type === "Identifier") {
        name = node.name;
    } else if (node.type === "MemberExpression") {
        name = stringForId(node.object) + "." + node.property.name;
    } else if (node.type === "ThisExpression") {
        name = "this";
    } else {
        throw "can't call stringForId on nodes of type '" + node.type + "'";
    }
    return name;
}

function getNameForFunctionExpression(node) {
    var name = "";
    if (node._parent.type === "Property") {
        name = node._parent.key.name;
        if (node._parent._parent.type === "ObjectExpression") {
            name = getNameForFunctionExpression(node._parent._parent) + "." + name;
        }
    } else if (node._parent.type === "AssignmentExpression") {
        name = stringForId(node._parent.left);
    } else if (node._parent.type === "VariableDeclarator") {
        name = stringForId(node._parent.id);
    } else {
        name = "<anonymous>"; // TODO: test anonymous callbacks
    }
    return name;
}

function transform(code, context) {
    var ast = esprima.parse(code, { loc: true });
    var scopeManager = escope.analyze(ast);
    scopeManager.attach();

    estraverse.replace(ast, {
        enter: function(node, parent) {
            node._parent = parent;
        },
        leave: function(node, parent) {
            if (node.type === "Program" || node.type === "BlockStatement") {
                if (parent.type === "FunctionExpression" || parent.type === "FunctionDeclaration" || node.type === "Program") {
                    var scope = getScopeVariables(node, parent, context);
                }

                var bodyList = basic.LinkedList.fromArray(node.body);
                insertYields(bodyList);

                if (bodyList.first) {
                    if (parent.type === "FunctionDeclaration") {
                        bodyList.first.value.expression.argument.properties.push({
                            type: "Property",
                            key: builder.createIdentifier("name"),
                            value: builder.createLiteral(stringForId(parent.id)),   // NOTE: identifier can be a member expression too!
                            kind: "init"
                        });
                    } else if (parent.type === "FunctionExpression") {
                        var name = getNameForFunctionExpression(parent);
                        bodyList.first.value.expression.argument.properties.push({
                            type: "Property",
                            key: builder.createIdentifier("name"),
                            value: builder.createLiteral(name),
                            kind: "init"
                        });
                    } else if (node.type === "Program") {
                        bodyList.first.value.expression.argument.properties.push({
                            type: "Property",
                            key: builder.createIdentifier("name"),
                            value: builder.createLiteral("<PROGRAM>"),
                            kind: "init"
                        });
                    }
                }

                // if there are any variables defined in this scope
                // create a __scope__ dictionary containing their values
                // and include in the first yield
                if (scope && scope.length > 0 && bodyList.first) {
                    // TODO: inject at least one yield statement into an empty bodyList so that we can step into empty functions
                    create__scope__(node, bodyList, scope);
                } else {
                    node.body = bodyList.toArray();
                }
            } else if (node.type === "FunctionExpression" || node.type === "FunctionDeclaration") {
                node.generator = true;
            } else if (node.type === "CallExpression" || node.type === "NewExpression") {
                if (node.callee.type === "Identifier" || node.callee.type === "MemberExpression" || node.callee.type === "YieldExpression") {

                    var gen = node;

                    // if "new" then build a call to "__instantiate__"
                    if (node.type === "NewExpression") {
                        // put the constructor name as the 2nd param
                        if (node.callee.type === "Identifier") {
                            node.arguments.unshift(builder.createLiteral(node.callee.name));
                        } else {
                            node.arguments.unshift(builder.createLiteral(null));
                        }
                        // put the constructor itself as the 1st param
                        node.arguments.unshift(node.callee);
                        gen = builder.createCallExpression("__instantiate__", node.arguments);
                    }

                    // create a yieldExpress to wrap the call
                    var loc = node.loc;
                    return builder.createYieldExpression(
                        // TODO: this is the current line, but we should actually be passing next node's line
                        // TODO: handle this in when the ForStatement is parsed where we have more information
                        builder.createObjectExpression({ gen: gen, line: loc.start.line })
                    );
                } else {
                    throw "we don't handle '" + node.callee.type + "' callees";
                }
            }

            delete node._parent;
        }
    });

    return "return function*(context){\nwith(context){\n" +
            escodegen.generate(ast) + "\n}\n}";
}

module.exports = transform;

},{"./ast-builder":"/Users/kevin/live-editor-stepper/external/stepper/src/ast-builder.js","basic-ds":"/Users/kevin/live-editor-stepper/external/stepper/node_modules/basic-ds/lib/basic.js"}]},{},["./lib/processing-debugger.js"])("./lib/processing-debugger.js")
});
window.PJSDebugger = Backbone.View.extend({
    
    initialize: function(options) {
        this.output = options.output;
        
        this.debugger = new ProcessingDebugger();
        this.debugger.context = options.context;
        this.debugger.breakpointsEnabled = false;
        
        this.bind();
    },
    
    exec: function(code) {
        this.debugger.load(code);
        this.debugger.start();
    },
    
    bind: function() {
        window.addEventListener("message", this.handleMessage.bind(this), false);

        this.debugger.onNewObject = PJSOutput.newCallback.bind(PJSOutput);

        this.debugger.onBreakpoint = function() {
            this.postParent({
                type: "debugger",
                action: "step",
                line: this.debugger.currentLine
            });
        }.bind(this);

        this.debugger.onFunctionDone = function() {
            this.postParent({
                type: "debugger",
                action: "done"
            });
        }.bind(this);
    },

    handleMessage: function(event) {
        var data;

        this.frameSource = event.source;
        this.frameOrigin = event.origin;
        
        if (typeof event.data === "object") {
            return;
        }

        try {
            data = JSON.parse(event.data);
        } catch (err) {
            return;
        }
        
        if (data.type !== "debugger") {
            return;
        }

        if (data.action === "debug") {
            if (data.state === "on") {
                this.debugger.breakpointsEnabled = true;
            } else if (data.state === "off") {
                this.debugger.breakpointsEnabled = false;
                this.debugger.resume();
                this.output.restart();
            }
        }

        if (data.action === "start") {
            this.output.clear();
            this.debugger.breakpoints = data.breakpoints;
            this.debugger.start(data.paused);
        }

        if (data.action === "resume") {
            this.debugger.resume();
        }

        if (data.action === "stepIn") {
            this.debugger.stepIn();
            this.postParent({
                type: "debugger",
                action: "step",
                line: this.debugger.currentLine
            });
        }

        if (data.action === "stepOver") {
            this.debugger.stepOver();
            this.postParent({
                type: "debugger",
                action: "step",
                line: this.debugger.currentLine
            });
        }

        if (data.action === "stepOut") {
            this.debugger.stepOut();
            this.postParent({
                type: "debugger",
                action: "step",
                line: this.debugger.currentLine
            });
        }

        if (data.action === "setBreakpoint") {
            this.debugger.setBreakpoint(data.line);
        }

        if (data.action === "clearBreakpoint") {
            this.debugger.clearBreakpoint(data.line);
        }
    },

    // Send a message back to the parent frame
    postParent: function(data) {
        // If there is no frameSource (e.g. we're not embedded in another page)
        // Then we don't need to care about sending the messages anywhere!
        if (this.frameSource) {
            this.frameSource.postMessage(
                typeof data === "string" ? data : JSON.stringify(data),
                this.frameOrigin);
        }
    }
});
