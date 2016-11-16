/**
 * @license
 * Copyright 2016 Palantir Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Lint = require("../index");
var ts = require("typescript");
var Rule = (function (_super) {
    __extends(Rule, _super);
    function Rule() {
        _super.apply(this, arguments);
    }
    Rule.prototype.apply = function (sourceFile) {
        var languageService = Lint.createLanguageService(sourceFile.fileName, sourceFile.getFullText());
        return this.applyWithWalker(new PreferForOfWalker(sourceFile, this.getOptions(), languageService));
    };
    /* tslint:disable:object-literal-sort-keys */
    Rule.metadata = {
        ruleName: "prefer-for-of",
        description: "Recommends a 'for-of' loop over a standard 'for' loop if the index is only used to access the array being iterated.",
        rationale: "A for(... of ...) loop is easier to implement and read when the index is not needed.",
        optionsDescription: "Not configurable.",
        options: null,
        optionExamples: ["true"],
        type: "typescript",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */
    Rule.FAILURE_STRING = "Expected a 'for-of' loop instead of a 'for' loop with this simple iteration";
    return Rule;
}(Lint.Rules.AbstractRule));
exports.Rule = Rule;
var PreferForOfWalker = (function (_super) {
    __extends(PreferForOfWalker, _super);
    function PreferForOfWalker(sourceFile, options, languageService) {
        _super.call(this, sourceFile, options);
        this.languageService = languageService;
    }
    PreferForOfWalker.prototype.visitForStatement = function (node) {
        var arrayAccessNode = this.locateArrayNodeInForLoop(node);
        if (arrayAccessNode !== undefined) {
            // Skip arrays thats just loop over a hard coded number
            // If we are accessing the length of the array, then we are likely looping over it's values
            if (arrayAccessNode.kind === ts.SyntaxKind.PropertyAccessExpression && arrayAccessNode.getLastToken().getText() === "length") {
                var incrementorVariable = node.incrementor.getFirstToken();
                if (/\+|-/g.test(incrementorVariable.getText())) {
                    // If it's formatted as `++i` instead, we need to get the OTHER token
                    incrementorVariable = node.incrementor.getLastToken();
                }
                var arrayToken = arrayAccessNode.getChildAt(0);
                var loopSyntaxText = node.statement.getText();
                // Find all usages of the incrementor variable
                var fileName = this.getSourceFile().fileName;
                var highlights = this.languageService.getDocumentHighlights(fileName, incrementorVariable.getStart(), [fileName]);
                if (highlights && highlights.length > 0) {
                    // There are *usually* three usages when setting up the for loop,
                    // so remove those from the count to get the count inside the loop block
                    var incrementorCount = highlights[0].highlightSpans.length - 3;
                    // Find `array[i]`-like usages by building up a regex 
                    var arrayTokenForRegex = arrayToken.getText().replace(".", "\\.");
                    var incrementorForRegex = incrementorVariable.getText().replace(".", "\\.");
                    var regex = new RegExp(arrayTokenForRegex + "\\[\\s*" + incrementorForRegex + "\\s*\\]", "g");
                    var accessMatches = loopSyntaxText.match(regex);
                    var matchCount = (accessMatches || []).length;
                    // If there are more usages of the array item being access than the incrementor variable
                    // being used, then this loop could be replaced with a for-of loop instead.
                    // This means that the incrementor variable is not used on its own anywhere and is ONLY
                    // used to access the array item.
                    if (matchCount >= incrementorCount) {
                        var failure = this.createFailure(node.getStart(), node.getWidth(), Rule.FAILURE_STRING);
                        this.addFailure(failure);
                    }
                }
            }
        }
        _super.prototype.visitForStatement.call(this, node);
    };
    PreferForOfWalker.prototype.locateArrayNodeInForLoop = function (forLoop) {
        // Some oddly formatted (yet still valid!) `for` loops might not have children in the condition
        // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for
        if (forLoop.condition !== undefined) {
            var arrayAccessNode = forLoop.condition.getChildAt(2);
            // If We haven't found it, maybe it's not a standard for loop, try looking in the initializer for the array
            // Something like `for(var t=0, len=arr.length; t < len; t++)`
            if (arrayAccessNode.kind !== ts.SyntaxKind.PropertyAccessExpression && forLoop.initializer !== undefined) {
                for (var _i = 0, _a = forLoop.initializer.getChildren(); _i < _a.length; _i++) {
                    var initNode = _a[_i];
                    // look in `var t=0, len=arr.length;`
                    if (initNode.kind === ts.SyntaxKind.SyntaxList) {
                        for (var _b = 0, _c = initNode.getChildren(); _b < _c.length; _b++) {
                            var initVar = _c[_b];
                            // look in `t=0, len=arr.length;`
                            if (initVar.kind === ts.SyntaxKind.VariableDeclaration) {
                                for (var _d = 0, _e = initVar.getChildren(); _d < _e.length; _d++) {
                                    var initVarPart = _e[_d];
                                    // look in `len=arr.length`
                                    if (initVarPart.kind === ts.SyntaxKind.PropertyAccessExpression) {
                                        arrayAccessNode = initVarPart;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return arrayAccessNode;
        }
        else {
            return undefined;
        }
    };
    return PreferForOfWalker;
}(Lint.RuleWalker));