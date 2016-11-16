import * as Lint from "../index";
import * as ts from "typescript";
export declare class Rule extends Lint.Rules.AbstractRule {
    static metadata: Lint.IRuleMetadata;
    static FAILURE_STRING_FACTORY: (maxCount: number) => string;
    apply(sourceFile: ts.SourceFile): Lint.RuleFailure[];
}
