import { expect } from 'chai';
import { CharStreams, CommonTokenStream } from 'antlr4ts';
import { KindLexer } from '../src/parser/KindLexer';
import { KindParser } from '../src/parser/KindParser';
import { computeTokenPosition } from '../src/compute-token-position';

describe('Token position', function () {
  const code = `fun test() {
    try {
        doSomething()
    } 
}`;
  it('has the right index', function () {
    const input = CharStreams.fromString(code);
    const lexer = new KindLexer(input);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new KindParser(tokenStream);
    const parseTree = parser.kindFile();
    expect(parser.numberOfSyntaxErrors).to.equal(0);
    expect(input.index).to.equal(input.size);
    const tokenPosition = computeTokenPosition(parseTree, tokenStream, { line: 4, column: 7 });
    expect(tokenPosition).to.not.be.undefined;
    expect(tokenPosition.index).to.equal(34);
  });
  it("includes partial text match ('fun' keyword)", function () {
    const input = CharStreams.fromString(code);
    const lexer = new KindLexer(input);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new KindParser(tokenStream);
    const parseTree = parser.kindFile();
    expect(parser.numberOfSyntaxErrors).to.equal(0);
    expect(input.index).to.equal(input.size);
    const tokenPosition = computeTokenPosition(parseTree, tokenStream, { line: 1, column: 2 });
    expect(tokenPosition).to.not.be.undefined;
    expect(tokenPosition.index).to.equal(0);
    expect(tokenPosition.text).to.equal('fu');
  });
  it('includes partial text match (function name)', function () {
    const input = CharStreams.fromString(code);
    const lexer = new KindLexer(input);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new KindParser(tokenStream);
    const parseTree = parser.kindFile();
    expect(parser.numberOfSyntaxErrors).to.equal(0);
    expect(input.index).to.equal(input.size);
    const tokenPosition = computeTokenPosition(parseTree, tokenStream, { line: 1, column: 7 });
    expect(tokenPosition).to.not.be.undefined;
    expect(tokenPosition.index).to.equal(2);
    expect(tokenPosition.text).to.equal('tes');
  });
  it('is correctly computed even in stream with errors', function () {
    const input = CharStreams.fromString(`fun test() {
    for(i on foo) {
        doSomething()
    } 
}`);
    const lexer = new KindLexer(input);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new KindParser(tokenStream);
    const parseTree = parser.kindFile();
    expect(parser.numberOfSyntaxErrors).to.equal(3);
    expect(input.index).to.equal(input.size);
    const tokenPosition = computeTokenPosition(parseTree, tokenStream, { line: 4, column: 7 });
    expect(tokenPosition).to.not.be.undefined;
    expect(tokenPosition.index).to.equal(41);
  });
});
