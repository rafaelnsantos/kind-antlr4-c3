/* eslint-disable @typescript-eslint/ban-types */
import { KindLexer } from './parser/KindLexer';
import { CharStreams, CommonTokenStream } from 'antlr4ts';
import { KindParser, VariableReadContext } from './parser/KindParser';
import { CodeCompletionCore, ScopedSymbol, SymbolTable, VariableSymbol } from 'antlr4-c3';
import { ParseTree, TerminalNode } from 'antlr4ts/tree';
import { SymbolTableVisitor } from './symbol-table-visitor';
import type { Symbol } from 'antlr4-c3/out/src/SymbolTable';
import type { CaretPosition, ComputeTokenPositionFunction, TokenPosition } from './types';
import * as fuzzysort from 'fuzzysort';

export function getScope(context: ParseTree, symbolTable: SymbolTable) {
  if (!context) {
    return undefined;
  }
  const scope = symbolTable.symbolWithContext(context);
  if (scope) {
    return scope;
  } else {
    return getScope(context.parent, symbolTable);
  }
}

export function getAllSymbolsOfType<T extends Symbol>(
  scope: ScopedSymbol,
  type: new (...args: unknown[]) => T
): T[] {
  const symbols = scope.getSymbolsOfType(type);
  let parent = scope.parent;
  while (parent && !(parent instanceof ScopedSymbol)) {
    parent = parent.parent;
  }
  if (parent) {
    symbols.push(...getAllSymbolsOfType(parent as ScopedSymbol, type));
  }
  return symbols;
}

function suggestVariables(symbolTable: SymbolTable, position: TokenPosition) {
  const context = position.context;
  const scope = getScope(context, symbolTable);
  let symbols: Symbol[];
  if (scope instanceof ScopedSymbol) {
    // Local scope
    symbols = getAllSymbolsOfType(scope, VariableSymbol);
  } else {
    // Global scope
    symbols = symbolTable.getSymbolsOfType(VariableSymbol);
  }
  let variable = position.context;
  while (!(variable instanceof VariableReadContext) && variable.parent) {
    variable = variable.parent;
  }
  return filterTokens(
    variable ? position.text : '',
    symbols.map((s) => s.name)
  );
}

export function filterTokens_startsWith(text: string, candidates: string[]) {
  if (text.trim().length === 0) {
    return candidates;
  } else {
    return candidates.filter((c) => c.toLowerCase().startsWith(text.toLowerCase()));
  }
}

export function filterTokens_fuzzySearch(text: string, candidates: string[]) {
  if (text.trim().length === 0) {
    return candidates;
  } else {
    return fuzzysort.go(text, candidates).map((r) => r.target);
  }
}

export let filterTokens = filterTokens_startsWith;
export function setTokenMatcher(fn) {
  filterTokens = fn;
}

export function getSuggestionsForParseTree(
  parser: KindParser,
  parseTree: ParseTree,
  symbolTableFn: () => SymbolTable,
  position: TokenPosition
) {
  const core = new CodeCompletionCore(parser);
  // Luckily, the Kind lexer defines all keywords and identifiers after operators,
  // so we can simply exclude the first non-keyword tokens
  const ignored = Array.from(Array(KindParser.FILE).keys());
  ignored.push(
    KindParser.BinLiteral,
    KindParser.BooleanLiteral,
    KindParser.CharacterLiteral,
    KindParser.DoubleLiteral,
    KindParser.HexLiteral,
    KindParser.IntegerLiteral,
    KindParser.LongLiteral,
    KindParser.NullLiteral,
    KindParser.RealLiteral,
    KindParser.DelimitedComment,
    KindParser.LineComment
  );
  ignored.push(KindParser.QUOTE_OPEN, KindParser.QUOTE_CLOSE, KindParser.TRIPLE_QUOTE_OPEN);
  ignored.push(KindParser.LabelDefinition, KindParser.LabelReference); // We don't handle labels for simplicity
  core.ignoredTokens = new Set(ignored);
  core.preferredRules = new Set([
    KindParser.RULE_variableRead,
    KindParser.RULE_suggestArgument,
  ]);
  const candidates = core.collectCandidates(position.index);

  const completions = [];
  if (
    candidates.rules.has(KindParser.RULE_variableRead) ||
    candidates.rules.has(KindParser.RULE_suggestArgument)
  ) {
    completions.push(...suggestVariables(symbolTableFn(), position));
  }
  const tokens = [];
  candidates.tokens.forEach((_, k) => {
    if (k === KindParser.Identifier) {
      // Skip, we’ve already handled it above
    } else if (k === KindParser.NOT_IN) {
      tokens.push('!in');
    } else if (k === KindParser.NOT_IS) {
      tokens.push('!is');
    } else {
      const symbolicName = parser.vocabulary.getSymbolicName(k);
      if (symbolicName) {
        tokens.push(symbolicName.toLowerCase());
      }
    }
  });
  const isIgnoredToken =
    position.context instanceof TerminalNode && ignored.indexOf(position.context.symbol.type) >= 0;
  const textToMatch = isIgnoredToken ? '' : position.text;
  completions.push(...filterTokens(textToMatch, tokens));
  return completions;
}

export function getSuggestions(
  code: string,
  caretPosition: CaretPosition,
  computeTokenPosition: ComputeTokenPositionFunction
) {
  const input = CharStreams.fromString(code);
  const lexer = new KindLexer(input);
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new KindParser(tokenStream);

  const parseTree = parser.kindFile();

  const position = computeTokenPosition(parseTree, tokenStream, caretPosition);
  if (!position) {
    return [];
  }
  return getSuggestionsForParseTree(
    parser,
    parseTree,
    () => new SymbolTableVisitor().visit(parseTree),
    position
  );
}
