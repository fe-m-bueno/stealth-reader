export interface CodeLineData {
  ln: number;
  content: string; // HTML string with spans
}

export class Codeifier {
  private lineNumber = 1;
  // Cache regex patterns for better performance
  private static readonly PARAGRAPH_SPLIT = /\n\s*\n/;
  private static readonly WORD_SPLIT = /\s+/;
  private static readonly SENTENCE_SPLIT = /[^.!?]+[.!?]+/g;
  private static readonly QUOTE_START = /^[""]/;
  private static readonly DASH_START = /^-/;
  private static readonly EM_DASH_START = /^—/;
  private static readonly PUNCTUATION_CLEAN = /[^a-zA-Z\s]/g;
  private static readonly ESCAPE_QUOTES = /"/g;
  private static readonly ESCAPE_NEWLINES = /\n/g;

  reset() {
    this.lineNumber = 1;
  }

  transform(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    const paragraphs = text
      .split(Codeifier.PARAGRAPH_SPLIT)
      .filter((p) => p.trim().length > 0);

    for (const p of paragraphs) {
      // For each paragraph, create multiple code structures if it's very long
      // This ensures all content gets used
      const chunks = this.splitParagraphIntoCodeBlocks(p);

      for (const chunk of chunks) {
        const transformed = this.processParagraph(chunk);
        lines.push(...transformed);
        // Add an empty line after each block for readability
        lines.push({ ln: this.lineNumber++, content: "" });
      }
    }

    return lines;
  }

  private splitParagraphIntoCodeBlocks(text: string): string[] {
    // Strategy: Create multiple smaller code blocks from long paragraphs
    // This ensures all content gets transformed into code

    const chunks: string[] = [];
    const sentences = text.match(Codeifier.SENTENCE_SPLIT) || [text];

    // For shorter paragraphs, use as-is or split moderately
    if (text.length <= 300) {
      return [text];
    }

    // For longer paragraphs, aim for 150-250 char chunks to create multiple code blocks
    let currentChunk = "";
    const targetChunkSize = 200;

    for (const sentence of sentences) {
      const potentialChunk = currentChunk + sentence;

      if (potentialChunk.length > targetChunkSize && currentChunk.length > 50) {
        // Current chunk is getting too long, save it and start new one
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk = potentialChunk;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // Ensure we have at least some chunks, even for very short content
    if (chunks.length === 0 && text.trim()) {
      chunks.push(text.trim());
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  private processParagraph(text: string): CodeLineData[] {
    const trimmed = text.trim();

    // Enhanced strategy selection based on text characteristics
    if (this.isDialogue(trimmed)) {
      return this.toStringLiteral(trimmed);
    }

    if (this.isListItem(trimmed)) {
      return this.toArrayLiteral(trimmed);
    }

    if (this.isQuestion(trimmed)) {
      return this.toConditional(trimmed);
    }

    if (this.containsCodeTerms(trimmed)) {
      return this.toCodeSnippet(trimmed);
    }

    if (trimmed.length < 50) {
      return this.toSimpleStatement(trimmed);
    }

    if (trimmed.length < 100) {
      return this.toFunctionCall(trimmed);
    }

    if (trimmed.length < 150) {
      return this.toMethodDefinition(trimmed);
    }

    // Long text - prioritize content preservation with smarter distribution
    const rand = Math.random();

    // For very long text (>300 chars), prioritize content preservation
    if (trimmed.length > 300) {
      if (rand < 0.7) return this.toBlockComment(trimmed); // 70% - preserves 100% of content
      if (rand < 0.85) return this.toAsyncFunction(trimmed); // 15% - can split content
      return this.toTryCatch(trimmed); // 15% - can split content
    }

    // For moderately long text (150-300 chars), still favor content preservation
    if (trimmed.length > 150) {
      if (rand < 0.5) return this.toBlockComment(trimmed); // 50% - preserves all content
      if (rand < 0.7) return this.toAsyncFunction(trimmed); // 20%
      if (rand < 0.8) return this.toArrowFunction(trimmed); // 10%
      return this.toTryCatch(trimmed); // 20%
    }

    // For shorter long text, more variety but still preserve content
    if (rand < 0.3) return this.toBlockComment(trimmed); // 30% - best content preservation
    if (rand < 0.45) return this.toAsyncFunction(trimmed); // 15%
    if (rand < 0.55) return this.toArrowFunction(trimmed); // 10%
    if (rand < 0.65) return this.toTryCatch(trimmed); // 10%
    if (rand < 0.73) return this.toMapOperation(trimmed); // 8%
    if (rand < 0.79) return this.toPromiseChain(trimmed); // 6%
    if (rand < 0.83) return this.toGenericFunction(trimmed); // 4%
    if (rand < 0.87) return this.toClassDefinition(trimmed); // 4%
    if (rand < 0.91) return this.toInterfaceDefinition(trimmed); // 4%
    if (rand < 0.94) return this.toEnumDefinition(trimmed); // 3%
    if (rand < 0.97) return this.toImportExport(trimmed); // 3%
    return this.toDecoratorUsage(trimmed); // 3%
  }

  private isDialogue(text: string): boolean {
    return (
      Codeifier.QUOTE_START.test(text) ||
      Codeifier.DASH_START.test(text) ||
      Codeifier.EM_DASH_START.test(text) ||
      /^\u201C|\u201D|['"']/.test(text)
    );
  }

  private isListItem(text: string): boolean {
    return /^\d+\.|^[-*+]|^•/.test(text) || /[,;] e |[,;] ou /.test(text);
  }

  private isQuestion(text: string): boolean {
    return (
      /[?!]$/.test(text) ||
      /^Como|^Por que|^Quando|^Onde|^Quem|^Qual/i.test(text)
    );
  }

  private containsCodeTerms(text: string): boolean {
    const codeTerms =
      /\b(function|class|interface|const|let|var|async|await|try|catch|import|export|type|enum)\b/i;
    return codeTerms.test(text);
  }

  private splitTextForReturn(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text];

    const parts: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        parts.push(remaining);
        break;
      }

      // Find a good break point (prefer sentence endings)
      let breakPoint = maxLength;
      const lastSentenceEnd = remaining
        .substring(0, maxLength)
        .lastIndexOf(". ");
      const lastSpace = remaining.substring(0, maxLength).lastIndexOf(" ");

      if (lastSentenceEnd > maxLength * 0.7) {
        breakPoint = lastSentenceEnd + 1; // Include the period
      } else if (lastSpace > maxLength * 0.8) {
        breakPoint = lastSpace;
      }

      parts.push(remaining.substring(0, breakPoint).trim());
      remaining = remaining.substring(breakPoint).trim();
    }

    return parts;
  }

  private toCodeSnippet(text: string): CodeLineData[] {
    // If text contains code-like terms, create a more realistic code structure
    if (/\basync\b/i.test(text)) {
      return this.toAsyncFunction(text);
    }
    if (/\bclass\b/i.test(text)) {
      return this.toClassDefinition(text);
    }
    if (/\binterface\b/i.test(text)) {
      return this.toInterfaceDefinition(text);
    }
    if (/\btype\b/i.test(text)) {
      return this.toTypeAlias(text);
    }

    // Default to arrow function for code-like text
    return this.toArrowFunction(text);
  }

  private toStringLiteral(text: string): CodeLineData[] {
    const escaped = this.escapeString(text);
    return [
      {
        ln: this.lineNumber++,
        content: `<span class="text-vscode-keyword">const</span> <span class="text-vscode-variable">message</span> = <span class="text-vscode-string">\`${escaped}\`</span>;`,
      },
    ];
  }

  private toArrayLiteral(text: string): CodeLineData[] {
    const items = text.split(/[,;] e |[,;] ou |[,.]\s+/).slice(0, 3);
    const escapedItems = items.map(
      (item) =>
        `<span class="text-vscode-string">"${this.escapeString(
          item.trim()
        )}"</span>`
    );
    return [
      {
        ln: this.lineNumber++,
        content: `<span class="text-vscode-keyword">const</span> <span class="text-vscode-variable">items</span> = [${escapedItems.join(
          ", "
        )}];`,
      },
    ];
  }

  private toConditional(text: string): CodeLineData[] {
    const condition = "condition";
    return [
      {
        ln: this.lineNumber++,
        content: `<span class="text-vscode-keyword">if</span> (<span class="text-vscode-variable">${condition}</span>) <span class="text-vscode-bracket-3">{</span>`,
      },
      {
        ln: this.lineNumber++,
        content: `  <span class="text-vscode-control">return</span> <span class="text-vscode-string">"${this.escapeString(
          text
        )}"</span>;`,
      },
      {
        ln: this.lineNumber++,
        content: `<span class="text-vscode-bracket-3">}</span>`,
      },
    ];
  }

  private toSimpleStatement(text: string): CodeLineData[] {
    const rand = Math.random();
    if (rand < 0.4) {
      return this.toVariable(text, "const");
    } else if (rand < 0.7) {
      return this.toVariable(text, "let");
    } else {
      return this.toTypeAlias(text);
    }
  }

  private toVariable(text: string, type: "const" | "let"): CodeLineData[] {
    const varName = this.generateVarName(text);
    const escaped = this.escapeString(text);
    const content = `<span class="text-vscode-keyword">${type}</span> <span class="text-vscode-variable">${varName}</span> = <span class="text-vscode-string">"${escaped}"</span>;`;
    return [{ ln: this.lineNumber++, content }];
  }

  private toTypeAlias(text: string): CodeLineData[] {
    const typeName = this.generateTypeName(text);
    return [
      {
        ln: this.lineNumber++,
        content: `<span class="text-vscode-keyword">type</span> <span class="text-vscode-type">${typeName}</span> = <span class="text-vscode-keyword">string</span>;`,
      },
    ];
  }

  private toFunctionCall(text: string): CodeLineData[] {
    const funcName = this.generateFuncName(text);
    const escaped = this.escapeString(text);
    return [
      {
        ln: this.lineNumber++,
        content: `<span class="text-vscode-variable">${funcName}</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-string">"${escaped}"</span><span class="text-vscode-bracket-1">)</span>;`,
      },
    ];
  }

  private toMethodDefinition(text: string): CodeLineData[] {
    const methodName = this.generateMethodName(text);
    const escaped = this.escapeString(text);

    return [
      {
        ln: this.lineNumber++,
        content: `<span class="text-vscode-function">${methodName}</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-variable">data</span>: <span class="text-vscode-type">string</span><span class="text-vscode-bracket-1">)</span>: <span class="text-vscode-type">string</span> <span class="text-vscode-bracket-3">{</span>`,
      },
      {
        ln: this.lineNumber++,
        content: `  <span class="text-vscode-control">return</span> <span class="text-vscode-string">\`${escaped}\`</span>;`,
      },
      {
        ln: this.lineNumber++,
        content: `<span class="text-vscode-bracket-3">}</span>`,
      },
    ];
  }

  private toInterfaceDefinition(text: string): CodeLineData[] {
    const interfaceName = this.generateTypeName(text);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-keyword">interface</span> <span class="text-vscode-type">${interfaceName}</span> <span class="text-vscode-bracket-3">{</span>`,
    });

    // Use more words from the text for properties
    const words = text.split(/\s+/).slice(0, 4);
    words.forEach((word, index) => {
      const propName = word.toLowerCase().replace(/[^a-z]/g, "");
      if (propName && propName.length > 2) {
        const types = ["string", "number", "boolean"];
        const propType = types[index % types.length];
        lines.push({
          ln: this.lineNumber++,
          content: `  <span class="text-vscode-property">${propName}</span>: <span class="text-vscode-type">${propType}</span>;`,
        });
      }
    });

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-bracket-3">}</span>`,
    });

    // Add comment with remaining text to preserve content
    const remainingText = text.split(/\s+/).slice(4).join(" ");
    if (remainingText.trim()) {
      lines.push({
        ln: this.lineNumber++,
        content: `<span class="text-vscode-comment">// ${this.escapeString(
          remainingText
        )}</span>`,
      });
    }

    return lines;
  }

  private toClassDefinition(text: string): CodeLineData[] {
    const className = this.generateTypeName(text);
    const escaped = this.escapeString(text);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-keyword">class</span> <span class="text-vscode-type">${className}</span> <span class="text-vscode-bracket-3">{</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-vscode-keyword">constructor</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-bracket-1">)</span> <span class="text-vscode-bracket-3">{</span>`,
    });

    // Split long text across multiple console.log statements
    const maxLineLength = 80;
    const words = escaped.split(" ");
    let currentLine = "    console.log(";

    for (const word of words) {
      const potentialLine = currentLine + " " + word;
      if (potentialLine.length > maxLineLength && currentLine.length > 20) {
        lines.push({
          ln: this.lineNumber++,
          content: currentLine.trim() + ");",
        });
        currentLine = "    console.log(" + word;
      } else {
        currentLine += (currentLine.endsWith("(") ? "" : " ") + word;
      }
    }

    if (currentLine.length > 15) {
      lines.push({
        ln: this.lineNumber++,
        content: currentLine + ");",
      });
    }

    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-vscode-bracket-3">}</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-bracket-3">}</span>`,
    });

    return lines;
  }

  private toAsyncFunction(text: string): CodeLineData[] {
    const funcName = this.generateFuncName(text);
    const escaped = this.escapeString(text);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-keyword">async</span> <span class="text-vscode-keyword">function</span> <span class="text-vscode-function">${funcName}</span><span class="text-vscode-bracket-1">()</span>: <span class="text-vscode-type">Promise</span>&lt;<span class="text-vscode-type">string</span>&gt; <span class="text-vscode-bracket-3">{</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-vscode-keyword">try</span> <span class="text-vscode-bracket-3">{</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `    <span class="text-vscode-keyword">const</span> <span class="text-vscode-variable">result</span> = <span class="text-vscode-string">\`${escaped}\`</span>;`,
    });

    // Split long text across multiple return statements if needed
    const maxReturnLength = 200;
    if (escaped.length > maxReturnLength) {
      const returnParts = this.splitTextForReturn(escaped, maxReturnLength);
      for (const part of returnParts) {
        lines.push({
          ln: this.lineNumber++,
          content: `    <span class="text-vscode-control">return</span> <span class="text-vscode-string">\`${part}\`</span>;`,
        });
      }
    } else {
      lines.push({
        ln: this.lineNumber++,
        content: `    <span class="text-vscode-control">return</span> <span class="text-vscode-string">\`${escaped}\`</span>;`,
      });
    }

    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-vscode-bracket-3">}</span> <span class="text-vscode-keyword">catch</span> <span class="text-vscode-bracket-1">(</span><span class="text-vscode-variable">error</span><span class="text-vscode-bracket-1">)</span> <span class="text-vscode-bracket-3">{</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `    <span class="text-vscode-variable">console</span>.<span class="text-vscode-function">error</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-variable">error</span><span class="text-vscode-bracket-1">)</span>;`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-vscode-bracket-3">}</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-bracket-3">}</span>`,
    });

    return lines;
  }

  private toGenericFunction(text: string): CodeLineData[] {
    const funcName = this.generateFuncName(text);
    const escaped = this.escapeString(text);

    return [
      {
        ln: this.lineNumber++,
        content: `<span class="text-vscode-keyword">function</span> <span class="text-vscode-function">${funcName}</span>&lt;<span class="text-vscode-type">T</span>&gt;<span class="text-vscode-bracket-1">(</span><span class="text-vscode-variable">data</span>: <span class="text-vscode-type">T</span><span class="text-vscode-bracket-1">)</span>: <span class="text-vscode-type">T</span> <span class="text-vscode-bracket-3">{</span>`,
      },
      {
        ln: this.lineNumber++,
        content: `  <span class="text-vscode-control">return</span> <span class="text-vscode-variable">data</span>;`,
      },
      {
        ln: this.lineNumber++,
        content: `<span class="text-vscode-bracket-3">}</span>`,
      },
    ];
  }

  private toArrowFunction(text: string): CodeLineData[] {
    const funcName = this.generateFuncName(text);
    const escaped = this.escapeString(text);

    return [
      {
        ln: this.lineNumber++,
        content: `<span class="text-vscode-keyword">const</span> <span class="text-vscode-variable">${funcName}</span> = <span class="text-vscode-bracket-1">(</span><span class="text-vscode-variable">input</span>: <span class="text-vscode-type">string</span><span class="text-vscode-bracket-1">)</span> <span class="text-vscode-operator">=></span> <span class="text-vscode-string">\`${escaped}\`</span>;`,
      },
    ];
  }

  private toMapOperation(text: string): CodeLineData[] {
    const escaped = this.escapeString(text);

    return [
      {
        ln: this.lineNumber++,
        content: `<span class="text-vscode-keyword">const</span> <span class="text-vscode-variable">result</span> = <span class="text-vscode-variable">data</span>.<span class="text-vscode-function">map</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-variable">item</span> <span class="text-vscode-operator">=></span> <span class="text-vscode-string">\`${escaped}\`</span><span class="text-vscode-bracket-1">)</span>;`,
      },
    ];
  }

  private toPromiseChain(text: string): CodeLineData[] {
    const escaped = this.escapeString(text);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-function">processData</span><span class="text-vscode-bracket-1">()</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `  .<span class="text-vscode-function">then</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-variable">result</span> <span class="text-vscode-operator">=></span> <span class="text-vscode-string">\`${escaped}\`</span><span class="text-vscode-bracket-1">)</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `  .<span class="text-vscode-function">catch</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-variable">error</span> <span class="text-vscode-operator">=></span> <span class="text-vscode-variable">console</span>.<span class="text-vscode-function">error</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-variable">error</span><span class="text-vscode-bracket-1">)</span><span class="text-vscode-bracket-1">)</span>;`,
    });

    return lines;
  }

  private toEnumDefinition(text: string): CodeLineData[] {
    const enumName = this.generateTypeName(text);
    const escaped = this.escapeString(text);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-keyword">enum</span> <span class="text-vscode-type">${enumName}</span> <span class="text-vscode-bracket-3">{</span>`,
    });

    // Create enum values from words, but add a comment with the full text
    const words = text.split(/\s+/).slice(0, 4);
    words.forEach((word, index) => {
      const enumValue = word.toUpperCase().replace(/[^A-Z]/g, "");
      if (enumValue && enumValue.length > 1) {
        lines.push({
          ln: this.lineNumber++,
          content: `  <span class="text-vscode-variable">${enumValue}</span> = ${index},`,
        });
      }
    });

    // Add a comment with the full text to preserve content
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-bracket-3">}</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: ``,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-comment">// ${escaped}</span>`,
    });

    return lines;
  }

  private toImportExport(text: string): CodeLineData[] {
    const rand = Math.random();
    if (rand < 0.5) {
      // Import statement
      const moduleName = this.generateFuncName(text);
      return [
        {
          ln: this.lineNumber++,
          content: `<span class="text-vscode-keyword">import</span> <span class="text-vscode-bracket-3">{</span> <span class="text-vscode-variable">${moduleName}</span> <span class="text-vscode-bracket-3">}</span> <span class="text-vscode-keyword">from</span> <span class="text-vscode-string">'./${moduleName}'</span>;`,
        },
      ];
    } else {
      // Export statement
      const exportName = this.generateFuncName(text);
      return [
        {
          ln: this.lineNumber++,
          content: `<span class="text-vscode-keyword">export</span> <span class="text-vscode-keyword">const</span> <span class="text-vscode-variable">${exportName}</span> = <span class="text-vscode-string">"${this.escapeString(
            text
          )}"</span>;`,
        },
      ];
    }
  }

  private toDecoratorUsage(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-function">@injectable</span><span class="text-vscode-bracket-1">()</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-keyword">export</span> <span class="text-vscode-keyword">class</span> <span class="text-vscode-type">${this.generateTypeName(
        text
      )}</span> <span class="text-vscode-bracket-3">{</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-vscode-keyword">constructor</span><span class="text-vscode-bracket-1">()</span> <span class="text-vscode-bracket-3">{</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `    <span class="text-vscode-variable">console</span>.<span class="text-vscode-function">log</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-string">'${this.escapeString(
        text
      )}'</span><span class="text-vscode-bracket-1">)</span>;`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-vscode-bracket-3">}</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-bracket-3">}</span>`,
    });

    return lines;
  }

  private toFunction(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    const escaped = this.escapeString(text);

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-keyword">function</span> <span class="text-vscode-function">process</span><span class="text-vscode-bracket-1">()</span> <span class="text-vscode-bracket-3">{</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-vscode-control">return</span> <span class="text-vscode-string">"${escaped}"</span>;`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-bracket-3">}</span>`,
    });

    return lines;
  }

  private toHTMLTemplate(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    const escaped = this.escapeString(text);

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-keyword">const</span> <span class="text-vscode-variable">template</span> = <span class="text-vscode-string">\`</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-vscode-string">&lt;<span class="text-vscode-class">div</span> <span class="text-vscode-property">className</span>=<span class="text-vscode-string">"content"</span>&gt;</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `    <span class="text-vscode-string">${escaped}</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-vscode-string">&lt;/<span class="text-vscode-class">div</span>&gt;</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-string">\`</span>;`,
    });

    return lines;
  }

  private toInlineComment(text: string): CodeLineData[] {
    const escaped = this.escapeString(text);
    return [
      {
        ln: this.lineNumber++,
        content: `<span class="text-vscode-comment">// ${escaped}</span>`,
      },
    ];
  }

  private splitBySentences(text: string, maxSentences: number = 2): string[] {
    const sentences = text.match(Codeifier.SENTENCE_SPLIT) || [text];
    const result: string[] = [];

    if (sentences.length <= maxSentences) {
      return sentences;
    }

    // Group sentences to fit maxSentences
    const sentencesPerGroup = Math.ceil(sentences.length / maxSentences);
    for (let i = 0; i < maxSentences; i++) {
      const start = i * sentencesPerGroup;
      const end = Math.min(start + sentencesPerGroup, sentences.length);
      result.push(sentences.slice(start, end).join(" "));
    }

    return result;
  }

  private toClassMethod(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    const parts = this.splitBySentences(text, 2);

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-control">async</span> <span class="text-vscode-function">execute</span><span class="text-vscode-bracket-1">()</span> <span class="text-vscode-bracket-3">{</span>`,
    });

    for (const part of parts) {
      const escaped = this.escapeString(part.trim());
      lines.push({
        ln: this.lineNumber++,
        content: `  <span class="text-vscode-control">await</span> <span class="text-vscode-function">process</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-string">"${escaped}"</span><span class="text-vscode-bracket-1">)</span>;`,
      });
    }

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-bracket-3">}</span>`,
    });

    return lines;
  }

  private toTryCatch(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    const parts = this.splitBySentences(text, 2);

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-keyword">try</span> <span class="text-vscode-bracket-3">{</span>`,
    });

    for (const part of parts) {
      const escaped = this.escapeString(part.trim());
      lines.push({
        ln: this.lineNumber++,
        content: `  <span class="text-vscode-control">await</span> <span class="text-vscode-function">process</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-string">"${escaped}"</span><span class="text-vscode-bracket-1">)</span>;`,
      });
    }

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-bracket-3">}</span> <span class="text-vscode-keyword">catch</span> <span class="text-vscode-bracket-1">(</span><span class="text-vscode-variable">error</span><span class="text-vscode-bracket-1">)</span> <span class="text-vscode-bracket-3">{</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-vscode-variable">console</span>.<span class="text-vscode-function">error</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-variable">error</span><span class="text-vscode-bracket-1">)</span>;`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-bracket-3">}</span>`,
    });

    return lines;
  }

  private toForLoop(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    const parts = this.splitBySentences(text, 2);

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-keyword">for</span> <span class="text-vscode-bracket-1">(</span><span class="text-vscode-keyword">const</span> <span class="text-vscode-variable">item</span> <span class="text-vscode-keyword">of</span> <span class="text-vscode-variable">items</span><span class="text-vscode-bracket-1">)</span> <span class="text-vscode-bracket-3">{</span>`,
    });

    for (const part of parts) {
      const escaped = this.escapeString(part.trim());
      lines.push({
        ln: this.lineNumber++,
        content: `  <span class="text-vscode-control">await</span> <span class="text-vscode-function">process</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-string">"${escaped}"</span><span class="text-vscode-bracket-1">)</span>;`,
      });
    }

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-vscode-bracket-3">}</span>`,
    });

    return lines;
  }

  private toBlockComment(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    lines.push({
      ln: this.lineNumber++,
      content: '<span class="text-vscode-comment">/**</span>',
    });

    // For long text, use longer lines to preserve content
    const words = text.split(" ");
    let currentLine = "";
    const maxLineLength = 100; // Increased from 75 to preserve more content

    for (const word of words) {
      if (
        (currentLine + " " + word).length > maxLineLength &&
        currentLine.length > 0
      ) {
        lines.push({
          ln: this.lineNumber++,
          content: `<span class="text-vscode-comment"> * ${currentLine.trim()}</span>`,
        });
        currentLine = word;
      } else {
        currentLine += (currentLine ? " " : "") + word;
      }
    }
    if (currentLine.trim()) {
      lines.push({
        ln: this.lineNumber++,
        content: `<span class="text-vscode-comment"> * ${currentLine.trim()}</span>`,
      });
    }

    lines.push({
      ln: this.lineNumber++,
      content: '<span class="text-vscode-comment"> */</span>',
    });
    return lines;
  }

  private generateVarName(text: string): string {
    const commonVars = [
      "data",
      "result",
      "value",
      "item",
      "input",
      "output",
      "response",
      "config",
    ];
    const rand = Math.random();
    if (rand < 0.3)
      return commonVars[Math.floor(Math.random() * commonVars.length)];

    // Take first few words, remove punctuation, camelCase
    const words = text
      .replace(Codeifier.PUNCTUATION_CLEAN, "")
      .split(Codeifier.WORD_SPLIT)
      .slice(0, 2);
    if (words.length === 0) return "data";

    return words
      .map((w, i) =>
        i === 0
          ? w.toLowerCase()
          : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      )
      .join("");
  }

  private generateFuncName(text: string): string {
    const commonFuncs = [
      "process",
      "handle",
      "parse",
      "validate",
      "transform",
      "convert",
      "format",
      "calculate",
    ];
    const rand = Math.random();
    if (rand < 0.4)
      return commonFuncs[Math.floor(Math.random() * commonFuncs.length)];

    const words = text
      .replace(Codeifier.PUNCTUATION_CLEAN, "")
      .split(Codeifier.WORD_SPLIT)
      .slice(0, 2);

    if (words.length === 0) return "process";

    return words.map((w, i) => w.toLowerCase()).join("");
  }

  private generateMethodName(text: string): string {
    const commonMethods = [
      "getData",
      "setValue",
      "processItem",
      "validateInput",
      "transformData",
      "calculateResult",
    ];
    const rand = Math.random();
    if (rand < 0.3)
      return commonMethods[Math.floor(Math.random() * commonMethods.length)];

    const words = text
      .replace(Codeifier.PUNCTUATION_CLEAN, "")
      .split(Codeifier.WORD_SPLIT)
      .slice(0, 2);

    if (words.length === 0) return "processData";

    const methodName = words
      .map((w, i) =>
        i === 0
          ? w.toLowerCase()
          : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      )
      .join("");

    return methodName;
  }

  private generateTypeName(text: string): string {
    const commonTypes = [
      "Data",
      "Result",
      "Config",
      "Options",
      "Settings",
      "Props",
      "State",
    ];
    const rand = Math.random();
    if (rand < 0.3)
      return commonTypes[Math.floor(Math.random() * commonTypes.length)];

    const words = text
      .replace(Codeifier.PUNCTUATION_CLEAN, "")
      .split(Codeifier.WORD_SPLIT)
      .slice(0, 2);

    if (words.length === 0) return "Data";

    return words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join("");
  }

  private escapeString(text: string): string {
    return text
      .replace(Codeifier.ESCAPE_QUOTES, '\\"')
      .replace(Codeifier.ESCAPE_NEWLINES, "\\n");
  }
}

export const codeifier = new Codeifier();
