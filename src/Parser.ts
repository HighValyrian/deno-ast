import { Token, Tokenizer } from "./Tokenizer.ts";

export class Parser {
  private currentToken: Token = {
    type: "",
    value: "",
  };

  constructor(readonly tokenizer = new Tokenizer()) {
    this.tokenizer = new Tokenizer();
}

  parse(str: string) {
    this.tokenizer.import(str);
    const currentToken = this.tokenizer.getNextToken();
    if (currentToken === null) {
      throw new Error("");
    }
    this.currentToken = currentToken;

    return this.Program();
  }

  /**
   * Program
   *   : StatementList
   *   ;
   */
  Program() {
    return {
      type: "Program",
      body: this.StatementList(),
    };
  }

  /**
   * StatementList
   *   : Statement
   *   | StatementList Statement
   *   ;
   */
  StatementList(stopLookahead = "") {
    const statementList = [this.Statement()];
    while (
      this.currentToken !== null &&
      this.currentToken.type !== stopLookahead
    ) {
      statementList.push(this.Statement());
    }
    return statementList;
  }

  /**
   * Statement
   *   : ExpressionStatement
   *   | BlockStatement
   *   | EmptyStatement
   *   | VariableStatement
   *   | IfStatement
   *   | IterationStatement
   *   | FunctionDeclaration
   *   | ClassDeclaration
   *   | ReturnStatement
   *   ;
   */
  Statement(): Record<string, unknown> | undefined {
    switch (this.currentToken.type) {
      case ";":
        return this.EmptyStatement();
      case "if":
        return this.IfStatement();
      case "{":
        return this.BlockStatement();
      case "let":
        return this.VariableStatement();
      case "fun":
        return this.FunctionDeclaration();
      case "class":
        return this.ClassDeclaration();
      case "return":
        return this.ReturnStatement();
      case "while":
      case "do":
      case "for":
        return this.IterationStatement();
      default:
        return this.ExpressionStatement();
    }
  }

  /**
   * ClassDeclaration
   *   : 'class' Identifier OptClassExtends BlockStatement
   *   ;
   */
  ClassDeclaration() {
    this.eat("class");
    const id = this.Identifier();
    const superClass =
      this.currentToken.type === "extends" ? this.ClassExtends() : null;
    const body = this.BlockStatement();

    return {
      type: "ClassDeclaration",
      id,
      superClass,
      body,
    };
  }

  /**
   * ClassExtends
   *   : 'extends' Identifier
   *   ;
   */
  ClassExtends() {
    this.eat("extends");
    return this.Identifier();
  }

  /**
   * ReturnStatement
   *   : 'return' OptExpression ';'
   */
  ReturnStatement() {
    this.eat("return");
    const argument = this.currentToken.type !== ";" ? this.Expression() : null;
    this.eat(";");

    return {
      type: "ReturnStatement",
      argument,
    };
  }

  /**
   * FunctionDeclaration
   *   : 'fun' Identifier '(' OptFormalParameterList ')' BlockStatement
   *   ;
   */
  FunctionDeclaration(): Record<string, unknown> {
    this.eat("fun");
    const name = this.Identifier();
    this.eat("(");
    const params =
      this.currentToken.type !== ")" ? this.FormalParameterList() : [];
    this.eat(")");
    const body = this.BlockStatement();

    return {
      type: "FunctionDeclaration",
      name,
      params,
      body,
    };
  }

  /**
   * FormalParameterList
   *   : Identifier
   *   | FormalParameterList ',' Identifier
   *   ;
   */
  FormalParameterList() {
    const result = [];
    do {
      result.push(this.Identifier());
    } while (this.currentToken.type === "," && this.eat(","));
    return result;
  }

  /**
   * IterationStatement
   *   : WhileStatement
   *   | DoWhileStatement
   *   | ForStatement
   *   ;
   */
  IterationStatement(): TPrimary | undefined {
    switch (this.currentToken.type) {
      case "while":
        return this.WhileStatement();
      case "do":
        return this.DoWhileStatement();
      case "for":
        return this.ForStatement();
    }
  }

  /**
   * WhileStatement
   *   : 'while' '(' Expression ')' Statement
   *   ;
   */
  WhileStatement() {
    this.eat("while");
    this.eat("(");
    const test = this.Expression();
    this.eat(")");
    const body = this.Statement();

    return {
      type: "WhileStatement",
      test,
      body,
    };
  }

  /**
   * DoWhileStatement
   *   : 'do' BlockStatement 'while' '(' Expression ')' ';'
   *   ;
   */
  DoWhileStatement() {
    this.eat("do");
    const body = this.BlockStatement();
    this.eat("while");
    this.eat("(");
    const test = this.Expression();
    this.eat(")");
    this.eat(";");

    return {
      type: "DoWhileStatement",
      body,
      test,
    };
  }

  /**
   * ForStatement
   *   : 'for' '(' OptForStatementInit ';' OptExpression ';' OptExpression ')' Statement
   *   ;
   */
  ForStatement() {
    this.eat("for");
    this.eat("(");

    const init =
      this.currentToken.type !== ";" ? this.ForStatementInit() : null;
    this.eat(";");

    const test = this.currentToken.type !== ";" ? this.Expression() : null;
    this.eat(";");

    const update = this.currentToken.type !== ")" ? this.Expression() : null;
    this.eat(")");

    const body = this.Statement();

    return {
      type: "ForStatement",
      init,
      test,
      update,
      body,
    };
  }

  /**
   * ForStatementInit
   *   : VariableStatementInit
   *   | Expression
   *   ;
   */
  ForStatementInit() {
    if (this.currentToken.type === "let") {
      return this.VariableStatementInit();
    }
    return this.Expression();
  }

  /**
   * IfStatement
   *   : 'if' '(' Expression ')' Statement
   *   | 'if' '(' Expression ')' Statement 'else' Statement
   *   ;
   */
  IfStatement() {
    this.eat("if");
    this.eat("(");
    const test = this.Expression();
    this.eat(")");

    const consequent = this.Statement();
    // If we only have 'if' statement, this.currentToken would be null
    const alternate =
      this.currentToken !== null && this.currentToken.type === "else"
        ? this.eat("else") && this.Statement()
        : null;

    return {
      type: "IfStatement",
      test,
      consequent,
      alternate,
    };
  }

  /**
   * VariableStatementInit
   *   : 'let' VariableDeclarationList
   *   ;
   */
  VariableStatementInit() {
    this.eat("let");
    const declarations = this.VariableDeclarationList();
    return {
      type: "VariableStatement",
      declarations,
    };
  }

  /**
   * VariableStatement
   *   : VariableStatementInit ';'
   *   ;
   */
  VariableStatement() {
    const variableStatement = this.VariableStatementInit();
    this.eat(";");
    return variableStatement;
  }

  /**
   *   VariableDeclarationList
   *   : VariableDeclaration
   *   | VariableDeclarationList ',' VariableDeclaration
   *   ;
   */
  VariableDeclarationList() {
    const declarations = [];

    do {
      declarations.push(this.VariableDeclaration());
    } while (this.currentToken.type === "," && this.eat(","));

    return declarations;
  }

  /**
   * VariableDeclaration
   *   : Identifier OptVariableInitializer
   *   ;
   */
  VariableDeclaration() {
    const id = this.Identifier();

    // The init would be null if there is a comma or colon after the Identifier
    const init =
      this.currentToken.type !== "," && this.currentToken.type !== ";"
        ? this.VariableInitializer()
        : null;

    return {
      type: "VariableDeclaration",
      id,
      init,
    };
  }

  /**
   * VariableInitializer
   *   : SIMPLE_ASSIGN AssignmentExpression
   *   ;
   */
  VariableInitializer() {
    this.eat("SIMPLE_ASSIGN");
    return this.AssignmentExpression();
  }

  /**
   * EmptyStatement
   *   : ';'
   *   ;
   */
  EmptyStatement() {
    this.eat(";");
    return {
      type: "EmptyStatement",
    };
  }

  /**
   * BlockStatement
   *   : '{' OptStatementList '}'
   *   ;
   */
  BlockStatement(): TPrimary {
    this.eat("{");

    const body = this.currentToken.type !== "}" ? this.StatementList("}") : [];

    this.eat("}");

    return {
      type: "BlockStatement",
      body,
    };
  }

  /**
   * ExpressionStatement
   *   : Expression ';'
   *   ;
   */
  ExpressionStatement() {
    const expression = this.Expression();
    // Every expression must end with ';'
    this.eat(";");
    return {
      type: "ExpressionStatement",
      expression,
    };
  }

  /**
   * Expression
   *   : AssignmentExpression
   *   ;
   */
  Expression() {
    return this.AssignmentExpression();
  }

  /**
   * AssignmentExpression
   *   : LogicalORExpression
   *   | LeftHandSideExpression AssignmentOperator LogicalORExpression
   *   ;
   */
  AssignmentExpression(): TPrimary {
    const left = this.LogicalORExpression();

    if (!this.isAssignmentOperator(this.currentToken.type as string)) {
      return left;
    }

    return {
      type: "AssignmentExpression",
      operator: this.AssignmentOperator().value,
      left: this.checkValidAssignmentTarget(left),
      right: this.AssignmentExpression(),
    };
  }

  /**
   * Identifier
   *   : IDENTIFIER
   *   ;
   */
  Identifier() {
    const name = this.eat("IDENTIFIER").value;
    return {
      type: "Identifier",
      name,
    };
  }

  /**
   * Extra check whether it's valid assignment target.
   */
  private checkValidAssignmentTarget(node: Token) {
    if (node.type === "Identifier" || node.type === "MemberExpression") {
      return node;
    }
    throw new SyntaxError("Invalid left-hand side in assignment expression");
  }

  /**
   * Whether the token is an assignment operator.
   */
  private isAssignmentOperator(tokenType: string) {
    return tokenType === "SIMPLE_ASSIGN" || tokenType === "COMPLEX_ASSIGN";
  }

  /**
   * AssignmentOperator
   *   : SIMPLE_ASSIGN
   *   | COMPLEX_ASSIGN
   *   ;
   */
  AssignmentOperator() {
    if (this.currentToken.type === "SIMPLE_ASSIGN") {
      return this.eat("SIMPLE_ASSIGN");
    }
    return this.eat("COMPLEX_ASSIGN");
  }

  /**
   * Logical OR expression.
   *
   *   x || y
   *
   * LogicalORExpression
   *   : LogicalANDExpression
   *   | LogicalORExpression LOGICAL_OR LogicalANDExpression
   *   ;
   */
  LogicalORExpression() {
    return this.LogicalExpression("LogicalANDExpression", "LOGICAL_OR");
  }

  /**
   * Logical AND expression.
   *
   *   x && y
   *
   * LogicalANDExpression
   *   : EqualityExpression
   *   | LogicalANDExpression LOGICAL_AND EqualityExpression
   *   ;
   */
  LogicalANDExpression() {
    return this.LogicalExpression("EqualityExpression", "LOGICAL_AND");
  }

  private LogicalExpression(builderName: string, operatorToken: string) {
    let left = eval(`this.${builderName}()`);

    while (this.currentToken.type === operatorToken) {
      const operator = this.eat(operatorToken).value;
      const right = eval(`this.${builderName}()`);
      left = {
        type: "LogicalExpression",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  /**
   * EQUALITY_OPERATOR: ==, !=
   *
   *   x == y
   *   x != y
   *
   * EqualityExpression
   *   : RelationalExpression
   *   | EqualityExpression EQUALITY_OPERATOR RelationalExpression
   *   ;
   */
  EqualityExpression() {
    return this.BinaryExpression("RelationalExpression", "EQUALITY_OPERATOR");
  }

  /**
   * RELATIONAL_OPERATOR: >, >=, <, <=
   *
   *   x > y
   *   x >= y
   *   x < y
   *   x <= y
   *
   * RelationalExpression
   *   : AdditiveExpression
   *   | RelationalExpression RELATIONAL_OPERATOR AdditiveExpression
   *   ;
   */
  RelationalExpression() {
    return this.BinaryExpression("AdditiveExpression", "RELATIONAL_OPERATOR");
  }

  /**
   * AdditiveExpression
   *   : MultiplicativeExpression
   *   | AdditiveExpression ADDITIVE_OPERATOR MultiplicativeExpression
   *   ;
   */
  AdditiveExpression() {
    return this.BinaryExpression(
      "MultiplicativeExpression",
      "ADDITIVE_OPERATOR"
    );
  }

  /**
   * MultiplicativeExpression
   *   : UnaryExpression
   *   | MultiplicativeExpression MULTIPLICATIVE_OPERATOR UnaryExpression
   *   ;
   */
  MultiplicativeExpression() {
    return this.BinaryExpression("UnaryExpression", "MULTIPLICATIVE_OPERATOR");
  }

  /**
   * Generic binary expression.
   */
  private BinaryExpression(builderName: string, operatorToken: string) {
    let left = eval(`this.${builderName}()`);

    while (this.currentToken.type === operatorToken) {
      const operator = this.eat(operatorToken).value;
      const right = eval(`this.${builderName}()`);
      left = {
        type: "BinaryExpression",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  /**
   * UnaryExpression
   *   : LeftHandSideExpression
   *   | ADDITIVE_OPERATOR UnaryExpression
   *   | LOGICAL_NOT UnaryExpression
   *   ;
   */
  UnaryExpression(): TPrimary {
    let operator;
    switch (this.currentToken.type) {
      case "ADDITIVE_OPERATOR":
        operator = this.eat("ADDITIVE_OPERATOR").value;
        break;
      case "LOGICAL_NOT":
        operator = this.eat("LOGICAL_NOT").value;
        break;
    }

    if (operator) {
      return {
        type: "UnaryExpression",
        operator,
        argument: this.UnaryExpression(),
      };
    }
    return this.LeftHandSideExpression();
  }

  /**
   * LeftHandSideExpression
   *   : CallMemberExpression
   *   ;
   */
  LeftHandSideExpression() {
    return this.CallMemberExpression();
  }

  /**
   * CallMemberExpression
   *   : MemberExpression
   *   | CallExpression
   *   ;
   */
  CallMemberExpression() {
    if (this.currentToken.type === "super") {
      return this._CallExpression(this.Super());
    }

    const member = this.MemberExpression();

    if (this.currentToken.type === "(") {
      return this._CallExpression(member);
    }

    return member;
  }

  /**
   * CallExpression
   *   : Callee Arguments
   *   ;
   *
   * Callee
   *   : MemberExpression
   *   | CallExpressio
   *   ;
   */
  _CallExpression(callee: TPrimary) {
    let callExpression = {
      type: "CallExpression",
      callee,
      arguments: this.Arguments(),
    };

    if (this.currentToken.type === "(") {
      callExpression = this._CallExpression(callExpression);
    }

    return callExpression;
  }

  /**
   * Arguments
   *   : '(' OptArgumentList ')'
   *   ;
   */
  Arguments() {
    this.eat("(");
    const argumentList =
      this.currentToken.type !== ")" ? this.ArgumentList() : [];
    this.eat(")");
    return argumentList;
  }

  /**
   * ArgumentList
   *   : AssignmentExpression
   *   | ArgumentList ',' AssignmentExpression
   *   ;
   */
  ArgumentList() {
    const argumentList = [];
    do {
      argumentList.push(this.AssignmentExpression());
    } while (this.currentToken.type === "," && this.eat(","));
    return argumentList;
  }

  /**
   * MemberExpression
   *   : PrimaryExpression
   *   | MemberExpression '.' Identifier
   *   | MemberExpression '[' Expression ']'
   *   ;
   */
  MemberExpression(): TPrimary {
    let object = this.PrimaryExpression();

    while (this.currentToken.type === "." || this.currentToken.type === "[") {
      // MemberExpression '.' Identifier
      if (this.currentToken.type === ".") {
        this.eat(".");
        const property = this.Identifier();
        object = {
          type: "MemberExpression",
          computed: false,
          object,
          property,
        };
      }

      // MemberExpression '[' Expression ']'
      if (this.currentToken.type === "[") {
        this.eat("[");
        const property = this.Expression();
        this.eat("]");
        object = {
          type: "MemberExpression",
          computed: true,
          object,
          property,
        };
      }
    }

    return object;
  }

  /**
   * PrimaryExpression
   *   : Literal
   *   | ParenthesizedExpression
   *   | Identifier
   *   | ThisExpression
   *   ;
   */
  PrimaryExpression(): TPrimary {
    if (this.isLiteral(this.currentToken.type)) {
      return this.Literal();
    }
    switch (this.currentToken.type) {
      case "(":
        return this.ParenthesizedExpression();
      case "IDENTIFIER":
        return this.Identifier();
      case "this":
        return this.ThisExpression();
      case "new":
        return this.NewExpression();
      default:
        throw new SyntaxError("Unexpected primary expression.");
    }
  }

  /**
   * NewExpression
   *   : 'new' MemberExpression Arguments
   *   ;
   */
  NewExpression(): TPrimary {
    this.eat("new");
    return {
      type: "NewExpression",
      callee: this.MemberExpression(),
      arguments: this.Arguments(),
    };
  }

  /**
   * ThisExpression
   *   : 'this'
   *   ;
   */
  ThisExpression() {
    this.eat("this");
    return {
      type: "ThisExpression",
    };
  }

  /**
   * Super
   *   : 'super'
   *   ;
   */
  Super() {
    this.eat("super");
    return {
      type: "Super",
    };
  }

  /**
   * Whether the token is a literal.
   */
  private isLiteral(tokenType: string | RegExp) {
    return (
      tokenType === "NUMBER" ||
      tokenType === "STRING" ||
      tokenType === "true" ||
      tokenType === "false" ||
      tokenType === "null"
    );
  }

  /**
   * ParenthesizedExpression
   *   : '(' Expression ')'
   *   ;
   */
  ParenthesizedExpression() {
    this.eat("(");
    const expression = this.Expression();
    this.eat(")");
    return expression;
  }

  /**
   * Literal
   *   : NumericLiteral
   *   | StringLiteral
   *   | BooleanLiteral
   *   | NullLiteral
   *   ;
   */
  Literal() {
    switch (this.currentToken.type) {
      case "NUMBER":
        return this.NumericLiteral();
      case "STRING":
        return this.StringLiteral();
      case "true":
        return this.BooleanLiteral(true);
      case "false":
        return this.BooleanLiteral(false);
      case "null":
        return this.NullLiteral();
      default:
        throw new SyntaxError("Literal: unexpected literal production");
    }
  }

  /**
   * NumericLiteral
   *   : NUMBER
   *   ;
   */
  NumericLiteral() {
    const token = this.eat("NUMBER");
    return {
      type: "NumericLiteral",
      value: token.value,
    };
  }

  /**
   * StringLiteral
   *   : STRING
   *   ;
   */
  StringLiteral() {
    const token = this.eat("STRING");
    return {
      type: "StringLiteral",
      value: token.value.slice(1, -1),
    };
  }

  /**
   * BooleanLiteral
   *   : 'true'
   *   | 'false'
   *   ;
   */
  BooleanLiteral(value: boolean) {
    this.eat(value ? "true" : "false");
    return {
      type: "BooleanLiteral",
      value,
    };
  }

  /**
   * NullLiteral
   *   : 'null'
   *   ;
   */
  NullLiteral() {
    this.eat("null");
    return {
      type: "NullLiteral",
      value: null,
    };
  }

  private eat(tokenType: string) {
    const token = this.currentToken;

    if (token === null) {
      throw new SyntaxError(
        `Unexpected end of input, expected: "${tokenType}"`
      );
    }

    if (token.type !== tokenType) {
      throw new SyntaxError(
        `Unexpected token: "${token.value}", expected: "${tokenType}"`
      );
    }

    this.currentToken = this.tokenizer.getNextToken()!;

    return token;
  }
}

type TPrimary = {
  type: string;
  value?: string | null | boolean;
  operator?: string;
  computed?: boolean;
  left?: Token;
  right?: TPrimary;
  callee?: TPrimary;
  // deno-lint-ignore ban-types
  arguments?: object[];
  argument?: TPrimary;
  object?: TPrimary;
  // deno-lint-ignore no-explicit-any
  body?: any;
  property?: TPrimary;
};
