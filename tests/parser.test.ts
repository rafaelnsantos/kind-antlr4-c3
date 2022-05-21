import { expect } from 'chai';

import { CharStreams, CommonTokenStream } from 'antlr4ts';
import { KindLexer } from '../src/parser/KindLexer';
import { KindParser } from '../src/parser/KindParser';

describe('variableRead rule refactoring', function () {
  it('parses variables', function () {
    const code = `x`;
    const input = CharStreams.fromString(code);
    const lexer = new KindLexer(input);
    const parser = new KindParser(new CommonTokenStream(lexer));

    parser.variableRead();
    expect(parser.numberOfSyntaxErrors).to.equal(0);
    expect(input.index).to.equal(input.size);
  });
  it('parses variables with infix operators as expressions', function () {
    const code = `x++`;
    const input = CharStreams.fromString(code);
    const lexer = new KindLexer(input);
    const parser = new KindParser(new CommonTokenStream(lexer));

    parser.expression();
    expect(parser.numberOfSyntaxErrors).to.equal(0);
    expect(input.index).to.equal(input.size);
  });
  it('parses variables with infix operators as variable reads', function () {
    const code = `x++`;
    const input = CharStreams.fromString(code);
    const lexer = new KindLexer(input);
    const parser = new KindParser(new CommonTokenStream(lexer));

    const tree = parser.postfixUnaryExpression();
    expect(parser.numberOfSyntaxErrors).to.equal(0);
    expect(input.index).to.equal(input.size);
    expect(tree.variableRead()).not.to.be.undefined;
    expect(tree.variableRead().text).to.equal('x');
  });
  it('parses parenthesized variables as expressions', function () {
    const code = `(x)`;
    const input = CharStreams.fromString(code);
    const lexer = new KindLexer(input);
    const parser = new KindParser(new CommonTokenStream(lexer));

    parser.expression();
    expect(parser.numberOfSyntaxErrors).to.equal(0);
    expect(input.index).to.equal(input.size);
  });
  it('parses parenthesized variables as variable reads', function () {
    const code = `(x)`;
    const input = CharStreams.fromString(code);
    const lexer = new KindLexer(input);
    const parser = new KindParser(new CommonTokenStream(lexer));

    const tree = parser.atomicExpression();
    expect(parser.numberOfSyntaxErrors).to.equal(0);
    expect(input.index).to.equal(input.size);
    expect(tree.parenthesizedExpression().expression()).not.to.be.undefined;
  });
  it('parses function calls as expressions', function () {
    const code = `f()`;
    const input = CharStreams.fromString(code);
    const lexer = new KindLexer(input);
    const parser = new KindParser(new CommonTokenStream(lexer));

    const tree = parser.expression();
    expect(parser.numberOfSyntaxErrors).to.equal(0);
    expect(input.index).to.equal(input.size);
  });
  it('parses identifiers in function calls as simpleIdentifiers', function () {
    const code = `f()`;
    const input = CharStreams.fromString(code);
    const lexer = new KindLexer(input);
    const parser = new KindParser(new CommonTokenStream(lexer));

    const tree = parser.postfixUnaryExpression();
    expect(parser.numberOfSyntaxErrors).to.equal(0);
    expect(input.index).to.equal(input.size);
    expect(tree.variableRead()).to.be.undefined;
    expect(tree.simpleIdentifier()).not.to.be.undefined;
    expect(tree.simpleIdentifier().text).to.equal('f');
  });
  it('parses import statements', function () {
    const code = `import foo
            
            fun bar() {}`;
    const input = CharStreams.fromString(code);
    const lexer = new KindLexer(input);
    const parser = new KindParser(new CommonTokenStream(lexer));

    const tree = parser.kindFile();
    expect(parser.numberOfSyntaxErrors).to.equal(0);
    expect(input.index).to.equal(input.size);
    expect(tree.preamble().importList().importHeader().length).to.equal(1);
  });
});
