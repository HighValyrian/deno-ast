/**
 *  Numbers > Identifiers
 *  Equality(==) > Assignment(=)
 *  Equality(!=) > Logical(!)
 *  Assignment(+= -= *= /=) > Math(+ - * /)
 */

// 一些对语意的正则转换
const Spec = [
  // -----------------------------------
  // Spaces:
  [/^\s/, null],

  // -----------------------------------
  // Comments:

  // Single-line comments
  [/^\/\/.*/, null],

  // Multi-line comments
  // TODO: why lazy match
  [/^\/\*[\s\S]*?\*\//, null],

  // -----------------------------------
  // Symbols, delimiters:
  [/^;/, ";"],
  [/^{/, "{"],
  [/^}/, "}"],
  [/^\(/, "("],
  [/^\)/, ")"],
  [/^,/, ","],
  [/^\./, "."],
  [/^\[/, "["],
  [/^\]/, "]"],

  // -----------------------------------
  // Keywords:
  [/^\blet\b/, "let"],
  [/^\bif\b/, "if"],
  [/^\belse\b/, "else"],
  [/^\btrue\b/, "true"],
  [/^\bfalse\b/, "false"],
  [/^\bnull\b/, "null"],
  [/^\bwhile\b/, "while"],
  [/^\bdo\b/, "do"],
  [/^\bfor\b/, "for"],
  [/^\bdef\b/, "def"],
  [/^\breturn\b/, "return"],
  [/^\bclass\b/, "class"],
  [/^\bextends\b/, "extends"],
  [/^\bsuper\b/, "super"],
  [/^\bthis\b/, "this"],
  [/^\bnew\b/, "new"],

  // -----------------------------------
  // Numbers:
  [/^\d+/, "NUMBER"],

  // -----------------------------------
  // Identifiers:
  [/^\w+/, "IDENTIFIER"],

  // -----------------------------------
  // Equality operators: ==, !=
  [/^[=!]=/, "EQUALITY_OPERATOR"],

  // -----------------------------------
  // Logical operators: && ||
  [/^&&/, "LOGICAL_AND"],
  [/^\|\|/, "LOGICAL_OR"],
  [/^!/, "LOGICAL_NOT"],

  // -----------------------------------
  // Assignment operators: =, *=, /=, +=, -=
  [/^=/, "SIMPLE_ASSIGN"],
  [/^[*/+-]=/, "COMPLEX_ASSIGN"],

  // -----------------------------------
  // Relational operators: >, >=, <, <=
  [/^[><]=?/, "RELATIONAL_OPERATOR"],

  // -----------------------------------
  // Math operators: +, -, *, /:
  [/^[+-]/, "ADDITIVE_OPERATOR"],
  [/^[*\/]/, "MULTIPLICATIVE_OPERATOR"],

  // -----------------------------------
  // Strings:

  // Double-quoted strings
  [/^"[^"]*"/, "STRING"],

  // Single-quoted strings
  [/^'[^']*'/, "STRING"],
];

export class Tokenizer {
  private cursor = 0;
  constructor(readonly string: string) {}

  isEOF() {
    return this.cursor === this.string.length;
  }

  hasMoreTokens() {
    // 光标指向当前未处理的字符。所以最大值是this.string length - 1
    return this.cursor < this.string.length;
  }

  // deno-lint-ignore ban-types
  getNextToken():null|object {
    if (!this.hasMoreTokens()) {
      return null;
    }

    const string = this.string.slice(this.cursor);

    for (const [regexp, tokenType] of Spec) {
      const tokenValue = this.match(regexp as RegExp, string);

      // Can't match this rule, continue
      if (tokenValue === null) {
        continue;
      }

      // Should skip token, e.g. whitespace
      if (tokenType === null) {
        return this.getNextToken();
      }

      return {
        type: tokenType,
        value: tokenValue,
      };
    }

    throw new SyntaxError(`Unexpected token: ${string[0]}`);
  }

  private match(regexp: RegExp, string: string) {
    const matched = regexp.exec(string);
    if (matched === null) {
      return null;
    }
    this.cursor += matched[0].length;
    return matched[0];
  }
}
