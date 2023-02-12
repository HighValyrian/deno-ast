import { Tokenizer } from "./src/Tokenizer.ts";

const program = `
    class Point {
      def constructor(x, y) {
        this.x = x;
        this.y = y;
      }

      def calc() {
        return this.x + this.y;
      }
    }
`;

Deno.test(function tokenizerTest() {
  const tokenizer = new Tokenizer(program);
  while(tokenizer.hasMoreTokens()) {
    console.log(tokenizer.getNextToken())
  }
});
