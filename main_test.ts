import { Parser } from "./src/Parser.ts";
import { Tokenizer } from "./src/Tokenizer.ts";

const program = `
    class add {
      fun constructor(x, y) {
        this.x = x;
        this.y = y;
      }      

      fun calc() {
        return this.x + this.y;
      }
    }
`;

Deno.test(function tokenizerTest() {
  const tokenizer = new Tokenizer();
  tokenizer.import(program)
  while(tokenizer.hasMoreTokens()) {
    console.log(tokenizer.getNextToken())
  }
});

Deno.test(function parserTest() {
  const parser = new Parser()
  const ast = parser.parse(program);

  console.log(JSON.stringify(ast, null, 4));
});
