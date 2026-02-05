export interface CodeLineData {
  ln: number;
  content: string; // HTML string with spans
}

type StructureType =
  | 'import'
  | 'type-definition'
  | 'interface'
  | 'class'
  | 'const'
  | 'function'
  | 'async-function'
  | 'arrow-function'
  | 'generic-function'
  | 'method'
  | 'jsdoc'
  | 'comment'
  | 'inline-comment'
  | 'console-log'
  | 'type-guard'
  | 'mapped-type'
  | 'template-literal-type'
  | 'namespace'
  | 'destructuring'
  | 'array-chain'
  | 'optional-chaining'
  | 'nullish-coalescing'
  | 'export';

export class Codeifier {
  private lineNumber = 1;
  private recentStructures: StructureType[] = [];
  private structureCount = 0;
  private hasImports = false;
  private hasExports = false;
  private fileSection: 'imports' | 'types' | 'constants' | 'functions' | 'exports' = 'imports';
  
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
  private static readonly MAX_LINE_LENGTH = 100;
  private static readonly SOFT_LINE_LENGTH = 80;

  reset() {
    this.lineNumber = 1;
    this.recentStructures = [];
    this.structureCount = 0;
    this.hasImports = false;
    this.hasExports = false;
    this.fileSection = 'imports';
  }

  transform(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    
    // Add imports at the beginning (first 1-3 structures)
    if (Math.random() < 0.7 && this.structureCount === 0) {
      const importLines = this.toImportStatement(text.split('\n')[0] || text);
      lines.push(...importLines);
      this.hasImports = true;
    }

    // First, handle any images in the text
    const imageRegex = /\[IMAGEM:([^\]]+)\]/g;
    const parts = text.split(imageRegex);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (i % 2 === 1) {
        // This is an image placeholder (odd indices after split)
        const imageDesc = part.trim();
        const imageLines = this.createImageElement(imageDesc);
        lines.push(...imageLines);
        lines.push({ ln: this.lineNumber++, content: "" });
      } else if (part.trim()) {
        // This is regular text
        // First, split by single newlines to handle line breaks
        const textLines = part.split(/\n/);
        let previousLineWasEmpty = false;

        for (let lineIdx = 0; lineIdx < textLines.length; lineIdx++) {
          const line = textLines[lineIdx];
          const trimmedLine = line.trim();
          const isLineEmpty = trimmedLine.length === 0;
          const nextLine = textLines[lineIdx + 1];
          const isNextLineEmpty = !nextLine || nextLine.trim().length === 0;

          // If this is an empty line, add it as an empty code line
          if (isLineEmpty) {
            // Only add empty line if previous wasn't empty (avoid duplicates)
            if (!previousLineWasEmpty) {
              lines.push({ ln: this.lineNumber++, content: "" });
            }
            previousLineWasEmpty = true;
            continue;
          }

          // Process the line content
          const chunks = this.splitParagraphIntoCodeBlocks(trimmedLine);

          for (const chunk of chunks) {
            const transformed = this.processParagraph(chunk);
            lines.push(...transformed);
          }

          // Check if this line is followed by an empty line (paragraph break)
          // This creates spacing between paragraphs
          const isParagraphBreak = isNextLineEmpty && lineIdx < textLines.length - 1;

          // Add spacing after paragraph breaks (double newlines)
          if (isParagraphBreak) {
            lines.push({ ln: this.lineNumber++, content: "" });
          }

          previousLineWasEmpty = false;
        }
      }
    }

    // Add exports at the end (last 1-2 structures)
    if (lines.length > 10 && Math.random() < 0.4 && !this.hasExports) {
      lines.push({ ln: this.lineNumber++, content: "" });
      const lastChunk = text.split('\n').filter(l => l.trim()).slice(-1)[0] || text;
      const exportLines = this.toExportStatement(lastChunk);
      lines.push(...exportLines);
      this.hasExports = true;
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

    // Verify we didn't lose any content
    const trimmed = text.trim();
    const totalChunkLength = chunks.reduce(
      (sum, chunk) => sum + chunk.length,
      0
    );
    if (totalChunkLength < trimmed.length * 0.9) {
      // If we lost more than 10% of content, return the original text
      console.warn("Potential content loss detected, using original text");
      return [trimmed];
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  private createImageElement(imageDesc: string): CodeLineData[] {
    const lines: CodeLineData[] = [];

    // Parse the image description: [IMAGEM:|src|alt]
    const parts = imageDesc.split("|");
    const src = parts[1] || "";
    const alt = parts[2] || "Imagem";

    // Create a comment showing the image
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-comment">// 🖼️ ${alt}</span>`,
    });

    if (src) {
      // Try to render the actual image inline in the code at original size
      lines.push({
        ln: this.lineNumber++,
        content: `<div class="epub-image-container" style="text-align: center; margin: 10px 0; padding: 10px; border: 1px solid #555; border-radius: 4px; background: #2d2d30;"><img src="${src}" alt="${this.escapeString(
          alt
        )}" style="max-width: 100%; height: auto; border-radius: 4px; display: block; object-fit: contain;" onerror="this.style.display='none';" onload="this.parentElement.style.borderColor='#4ec9b0';" /></div>`,
      });
    } else {
      // Fallback: just show the alt text
      lines.push({
        ln: this.lineNumber++,
        content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">imagePlaceholder</span> = <span class="text-cursor-string">"${this.escapeString(
          alt
        )}"</span>;`,
      });
    }

    return lines;
  }

  private processParagraph(text: string): CodeLineData[] {
    const trimmed = text.trim();

    // Determine text type
    let textType: 'dialogue' | 'list' | 'question' | 'narrative' = 'narrative';
    if (this.isDialogue(trimmed)) {
      textType = 'dialogue';
      return this.toStringLiteral(trimmed);
    }
    if (this.isListItem(trimmed)) {
      textType = 'list';
      return this.toArrayLiteral(trimmed);
    }
    if (this.isQuestion(trimmed)) {
      textType = 'question';
      return this.toConditional(trimmed);
    }

    // Select structure using anti-repetition system
    const structure = this.selectStructure(trimmed.length, textType);

    // Route to appropriate transformer
    switch (structure) {
      case 'import':
        return this.toImportStatement(trimmed);
      case 'type-definition':
        return this.toTypeDefinition(trimmed);
      case 'interface':
        return this.toInterfaceDefinition(trimmed);
      case 'class':
        return this.toClassDefinition(trimmed);
      case 'const':
        return this.toConstStatement(trimmed);
      case 'function':
        return this.toFunction(trimmed);
      case 'async-function':
        return this.toAsyncFunction(trimmed);
      case 'arrow-function':
        return this.toArrowFunction(trimmed);
      case 'generic-function':
        return this.toGenericFunction(trimmed);
      case 'method':
        return this.toMethodDefinition(trimmed);
      case 'jsdoc':
        return this.toJSDoc(trimmed);
      case 'comment':
        return this.toBlockComment(trimmed);
      case 'inline-comment':
        return this.toInlineComment(trimmed);
      case 'console-log':
        return this.toConsoleLog(trimmed);
      case 'type-guard':
        return this.toTypeGuard(trimmed);
      case 'mapped-type':
        return this.toMappedType(trimmed);
      case 'template-literal-type':
        return this.toTemplateLiteralType(trimmed);
      case 'namespace':
        return this.toNamespace(trimmed);
      case 'destructuring':
        return this.toDestructuring(trimmed);
      case 'array-chain':
        return this.toArrayChain(trimmed);
      case 'optional-chaining':
        return this.toOptionalChaining(trimmed);
      case 'nullish-coalescing':
        return this.toNullishCoalescing(trimmed);
      case 'export':
        return this.toExportStatement(trimmed);
      default:
        return this.toInlineComment(trimmed);
    }
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
      return this.toTypeDefinition(text);
    }
    if (/\bimport\b/i.test(text)) {
      return this.toImportStatement(text);
    }
    if (/\bexport\b/i.test(text)) {
      return this.toExportStatement(text);
    }

    // Default to arrow function for code-like text
    return this.toArrowFunction(text);
  }

  private toStringLiteral(text: string): CodeLineData[] {
    const varName = this.generateContextualVarName(text, 'Dialogue');
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 20);
    
    if (brokenLines.length === 1) {
      return [{
        ln: this.lineNumber++,
        content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-string">\`${escaped}\`</span>;`,
      }];
    }

    const lines: CodeLineData[] = [];
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-string">\`${brokenLines.join('\\n')}\`</span>;`,
    });
    return lines;
  }

  private toArrayLiteral(text: string): CodeLineData[] {
    // Primeiro, tenta dividir por padrões explícitos de lista (conjunções)
    let items: string[] = [];

    // Verifica se há padrões de lista explícitos (conjunções)
    if (/[,;]\s+(e|ou)\s+/i.test(text)) {
      // Divide por vírgulas/ponto-vírgulas seguidos de "e" ou "ou"
      items = text
        .split(/[,;]\s+(?:e|ou)\s+/i)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
    // Se começa com número, bullet ou dash, trata como lista numerada/marcada
    else if (/^\d+\.|^[-*+]|^•/.test(text)) {
      // Remove o marcador inicial e divide por vírgulas/pontos apenas se houver múltiplos itens claros
      const cleaned = text.replace(/^\d+\.\s*|^[-*+•]\s*/, "");
      // Só divide se houver múltiplas vírgulas/pontos que parecem separadores de lista
      const commaCount = (cleaned.match(/,\s+/g) || []).length;
      if (commaCount >= 2) {
        items = cleaned
          .split(/,\s+/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      } else {
        // Se não parece uma lista real, preserva o texto completo
        items = [cleaned.trim()];
      }
    }
    // Se não há padrões claros de lista, preserva o texto completo
    else {
      items = [text.trim()];
    }

    // Limita a 3 itens para manter o código legível
    const finalItems = items.slice(0, 3);
    const varName = this.generateContextualVarName(text, 'Items');

    const escapedItems = finalItems.map(
      (item) =>
        `<span class="text-cursor-string">"${this.escapeString(
          item.trim()
        )}"</span>`
    );

    return [
      {
        ln: this.lineNumber++,
        content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-bracket-2">[</span>${escapedItems.join(
          ", "
        )}<span class="text-cursor-bracket-2">]</span>;`,
      },
    ];
  }

  private toConditional(text: string): CodeLineData[] {
    const condition = this.generateContextualVarName(text, 'Condition');
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 10);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">if</span> (<span class="text-cursor-variable">${condition}</span>) <span class="text-cursor-bracket-3">{</span>`,
    });

    if (brokenLines.length === 1) {
      lines.push({
        ln: this.lineNumber++,
        content: `  <span class="text-cursor-control">return</span> <span class="text-cursor-string">"${escaped}"</span>;`,
      });
    } else {
      const varName = this.generateContextualVarName(text);
      lines.push({
        ln: this.lineNumber++,
        content: `  <span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-string">\`${brokenLines.join('\\n')}\`</span>;`,
      });
      lines.push({
        ln: this.lineNumber++,
        content: `  <span class="text-cursor-control">return</span> <span class="text-cursor-variable">${varName}</span>;`,
      });
    }

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span>`,
    });

    return lines;
  }

  private toSimpleStatement(text: string): CodeLineData[] {
    const rand = Math.random();
    if (rand < 0.3) {
      return this.toVariable(text, "const");
    } else if (rand < 0.5) {
      return this.toVariable(text, "let");
    } else if (rand < 0.7) {
      return this.toInlineComment(text);
    } else {
      return this.toTypeAlias(text);
    }
  }

  private toVariable(text: string, type: "const" | "let"): CodeLineData[] {
    const varName = this.generateContextualVarName(text);
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 20);
    
    if (brokenLines.length === 1) {
      const content = `<span class="text-cursor-keyword">${type}</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-string">"${escaped}"</span>;`;
      return [{ ln: this.lineNumber++, content }];
    }

    const lines: CodeLineData[] = [];
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">${type}</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-string">\`${brokenLines.join('\\n')}\`</span>;`,
    });
    return lines;
  }

  private toTypeAlias(text: string): CodeLineData[] {
    const typeName = this.generateContextualTypeName(text);
    const escaped = this.escapeString(text);
    const commentLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 3);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">type</span> <span class="text-cursor-type">${typeName}</span> = <span class="text-cursor-keyword">string</span>;`,
    });

    // Add comment with full text to preserve content
    commentLines.forEach(line => {
      lines.push({
        ln: this.lineNumber++,
        content: `<span class="text-cursor-comment">// ${line}</span>`,
      });
    });

    return lines;
  }

  private toFunctionCall(text: string): CodeLineData[] {
    const funcName = this.generateContextualFuncName(text);
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 15);
    
    if (brokenLines.length === 1) {
      return [{
        ln: this.lineNumber++,
        content: `<span class="text-cursor-variable">${funcName}</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-string">"${escaped}"</span><span class="text-cursor-bracket-1">)</span>;`,
      }];
    }

    const varName = this.generateContextualVarName(text);
    const lines: CodeLineData[] = [];
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-string">\`${brokenLines.join('\\n')}\`</span>;`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-variable">${funcName}</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">${varName}</span><span class="text-cursor-bracket-1">)</span>;`,
    });
    return lines;
  }

  private toMethodDefinition(text: string): CodeLineData[] {
    const methodName = this.generateContextualFuncName(text, '');
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 10);

    const lines: CodeLineData[] = [];
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-function">${methodName}</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">data</span>: <span class="text-cursor-type">string</span><span class="text-cursor-bracket-1">)</span>: <span class="text-cursor-type">string</span> <span class="text-cursor-bracket-3">{</span>`,
    });
    
    if (brokenLines.length === 1) {
      lines.push({
        ln: this.lineNumber++,
        content: `  <span class="text-cursor-control">return</span> <span class="text-cursor-string">\`${escaped}\`</span>;`,
      });
    } else {
      const varName = this.generateContextualVarName(text);
      lines.push({
        ln: this.lineNumber++,
        content: `  <span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-string">\`${brokenLines.join('\\n')}\`</span>;`,
      });
      lines.push({
        ln: this.lineNumber++,
        content: `  <span class="text-cursor-control">return</span> <span class="text-cursor-variable">${varName}</span>;`,
      });
    }
    
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span>`,
    });
    
    return lines;
  }

  private toInterfaceDefinition(text: string): CodeLineData[] {
    const interfaceName = this.generateContextualTypeName(text);
    const keywords = this.extractKeywords(text);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">interface</span> <span class="text-cursor-type">${interfaceName}</span> <span class="text-cursor-bracket-3">{</span>`,
    });

    // Use contextual keywords for properties
    const props = keywords.nouns.slice(0, 3).concat(keywords.allWords.slice(0, 2));
    props.forEach((word, index) => {
      const propName = word.toLowerCase().replace(/[^a-z]/g, "");
      if (propName && propName.length > 2) {
        const types = ["string", "number", "boolean"];
        const propType = types[index % types.length];
        lines.push({
          ln: this.lineNumber++,
          content: `  <span class="text-cursor-property">${propName}</span>: <span class="text-cursor-type">${propType}</span>;`,
        });
      }
    });

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span>`,
    });

    // Add comment with FULL text to preserve all content
    const escaped = this.escapeString(text);
    const commentLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 3);
    commentLines.forEach(line => {
      lines.push({
        ln: this.lineNumber++,
        content: `<span class="text-cursor-comment">// ${line}</span>`,
      });
    });

    return lines;
  }

  private toClassDefinition(text: string): CodeLineData[] {
    const className = this.generateContextualTypeName(text);
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 25);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">class</span> <span class="text-cursor-type">${className}</span> <span class="text-cursor-bracket-3">{</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-cursor-keyword">constructor</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-bracket-1">)</span> <span class="text-cursor-bracket-3">{</span>`,
    });

    // Use smart line breaking for console.log
    brokenLines.forEach(line => {
      lines.push({
        ln: this.lineNumber++,
        content: `    <span class="text-cursor-variable">console</span>.<span class="text-cursor-function">log</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-string">"${line}"</span><span class="text-cursor-bracket-1">)</span>;`,
      });
    });

    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-cursor-bracket-3">}</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span>`,
    });

    return lines;
  }

  private toAsyncFunction(text: string): CodeLineData[] {
    const funcName = this.generateContextualFuncName(text);
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 10);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">async</span> <span class="text-cursor-keyword">function</span> <span class="text-cursor-function">${funcName}</span><span class="text-cursor-bracket-1">()</span>: <span class="text-cursor-type">Promise</span>&lt;<span class="text-cursor-type">string</span>&gt; <span class="text-cursor-bracket-3">{</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-cursor-keyword">try</span> <span class="text-cursor-bracket-3">{</span>`,
    });

    if (brokenLines.length === 1) {
      lines.push({
        ln: this.lineNumber++,
        content: `    <span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">result</span> = <span class="text-cursor-string">\`${escaped}\`</span>;`,
      });
      lines.push({
        ln: this.lineNumber++,
        content: `    <span class="text-cursor-control">return</span> <span class="text-cursor-variable">result</span>;`,
      });
    } else {
      const varName = this.generateContextualVarName(text);
      lines.push({
        ln: this.lineNumber++,
        content: `    <span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-string">\`${brokenLines.join('\\n')}\`</span>;`,
      });
      lines.push({
        ln: this.lineNumber++,
        content: `    <span class="text-cursor-control">return</span> <span class="text-cursor-variable">${varName}</span>;`,
      });
    }

    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-cursor-bracket-3">}</span> <span class="text-cursor-keyword">catch</span> <span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">error</span><span class="text-cursor-bracket-1">)</span> <span class="text-cursor-bracket-3">{</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `    <span class="text-cursor-variable">console</span>.<span class="text-cursor-function">error</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">error</span><span class="text-cursor-bracket-1">)</span>;`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-cursor-bracket-3">}</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span>`,
    });

    return lines;
  }

  private toGenericFunction(text: string): CodeLineData[] {
    const funcName = this.generateContextualFuncName(text);
    const typeName = this.generateContextualTypeName(text);
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 10);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">function</span> <span class="text-cursor-function">${funcName}</span>&lt;<span class="text-cursor-type">T</span> <span class="text-cursor-keyword">extends</span> <span class="text-cursor-type">${typeName}</span>&gt;<span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">data</span>: <span class="text-cursor-type">T</span><span class="text-cursor-bracket-1">)</span>: <span class="text-cursor-type">T</span> <span class="text-cursor-bracket-3">{</span>`,
    });

    if (brokenLines.length === 1) {
      lines.push({
        ln: this.lineNumber++,
        content: `  <span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">content</span> = <span class="text-cursor-string">\`${escaped}\`</span>;`,
      });
    } else {
      lines.push({
        ln: this.lineNumber++,
        content: `  <span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">content</span> = <span class="text-cursor-string">\`${brokenLines.join('\\n')}\`</span>;`,
      });
    }

    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-cursor-control">return</span> <span class="text-cursor-variable">data</span>;`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span>`,
    });

    return lines;
  }

  private toArrowFunction(text: string): CodeLineData[] {
    const funcName = this.generateContextualVarName(text);
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 30);

    if (brokenLines.length === 1) {
      return [{
        ln: this.lineNumber++,
        content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${funcName}</span> = <span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">input</span>: <span class="text-cursor-type">string</span><span class="text-cursor-bracket-1">)</span> <span class="text-cursor-operator">=></span> <span class="text-cursor-string">\`${escaped}\`</span>;`,
      }];
    }

    const lines: CodeLineData[] = [];
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${funcName}</span> = <span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">input</span>: <span class="text-cursor-type">string</span><span class="text-cursor-bracket-1">)</span> <span class="text-cursor-operator">=></span> <span class="text-cursor-string">\`${brokenLines.join('\\n')}\`</span>;`,
    });
    return lines;
  }

  private toMapOperation(text: string): CodeLineData[] {
    const varName = this.generateContextualVarName(text);
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 30);

    if (brokenLines.length === 1) {
      return [{
        ln: this.lineNumber++,
        content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-variable">data</span>.<span class="text-cursor-function">map</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">item</span> <span class="text-cursor-operator">=></span> <span class="text-cursor-string">\`${escaped}\`</span><span class="text-cursor-bracket-1">)</span>;`,
      }];
    }

    const lines: CodeLineData[] = [];
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-variable">data</span>.<span class="text-cursor-function">map</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">item</span> <span class="text-cursor-operator">=></span> <span class="text-cursor-string">\`${brokenLines.join('\\n')}\`</span><span class="text-cursor-bracket-1">)</span>;`,
    });
    return lines;
  }

  private toPromiseChain(text: string): CodeLineData[] {
    const funcName = this.generateContextualFuncName(text, 'process');
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 20);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-function">${funcName}</span><span class="text-cursor-bracket-1">()</span>`,
    });

    if (brokenLines.length === 1) {
      lines.push({
        ln: this.lineNumber++,
        content: `  .<span class="text-cursor-function">then</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">result</span> <span class="text-cursor-operator">=></span> <span class="text-cursor-string">\`${escaped}\`</span><span class="text-cursor-bracket-1">)</span>`,
      });
    } else {
      const varName = this.generateContextualVarName(text);
      lines.push({
        ln: this.lineNumber++,
        content: `  .<span class="text-cursor-function">then</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">result</span> <span class="text-cursor-operator">=></span> <span class="text-cursor-string">\`${brokenLines.join('\\n')}\`</span><span class="text-cursor-bracket-1">)</span>`,
      });
    }

    lines.push({
      ln: this.lineNumber++,
      content: `  .<span class="text-cursor-function">catch</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">error</span> <span class="text-cursor-operator">=></span> <span class="text-cursor-variable">console</span>.<span class="text-cursor-function">error</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">error</span><span class="text-cursor-bracket-1">)</span><span class="text-cursor-bracket-1">)</span>;`,
    });

    return lines;
  }

  private toEnumDefinition(text: string): CodeLineData[] {
    const enumName = this.generateContextualTypeName(text);
    const escaped = this.escapeString(text);
    const keywords = this.extractKeywords(text);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">enum</span> <span class="text-cursor-type">${enumName}</span> <span class="text-cursor-bracket-3">{</span>`,
    });

    // Create enum values from contextual keywords
    const enumWords = keywords.nouns.slice(0, 3).concat(keywords.allWords.slice(0, 2));
    enumWords.forEach((word, index) => {
      const enumValue = word.toUpperCase().replace(/[^A-Z]/g, "");
      if (enumValue && enumValue.length > 1) {
        lines.push({
          ln: this.lineNumber++,
          content: `  <span class="text-cursor-variable">${enumValue}</span> = ${index},`,
        });
      }
    });

    // Add a comment with the full text to preserve content
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: ``,
    });

    const commentLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 3);
    commentLines.forEach(line => {
      lines.push({
        ln: this.lineNumber++,
        content: `<span class="text-cursor-comment">// ${line}</span>`,
      });
    });

    return lines;
  }

  private toImportExport(text: string): CodeLineData[] {
    const rand = Math.random();
    if (rand < 0.5) {
      // Import statement
      return this.toImportStatement(text);
    } else {
      // Export statement
      return this.toExportStatement(text);
    }
  }

  private toDecoratorUsage(text: string): CodeLineData[] {
    const className = this.generateContextualTypeName(text);
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 25);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-function">@injectable</span><span class="text-cursor-bracket-1">()</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">export</span> <span class="text-cursor-keyword">class</span> <span class="text-cursor-type">${className}</span> <span class="text-cursor-bracket-3">{</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-cursor-keyword">constructor</span><span class="text-cursor-bracket-1">()</span> <span class="text-cursor-bracket-3">{</span>`,
    });

    brokenLines.forEach(line => {
      lines.push({
        ln: this.lineNumber++,
        content: `    <span class="text-cursor-variable">console</span>.<span class="text-cursor-function">log</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-string">'${line}'</span><span class="text-cursor-bracket-1">)</span>;`,
      });
    });

    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-cursor-bracket-3">}</span>`,
    });

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span>`,
    });

    return lines;
  }

  private toFunction(text: string): CodeLineData[] {
    const funcName = this.generateContextualFuncName(text);
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 10);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">function</span> <span class="text-cursor-function">${funcName}</span><span class="text-cursor-bracket-1">()</span> <span class="text-cursor-bracket-3">{</span>`,
    });
    
    if (brokenLines.length === 1) {
      lines.push({
        ln: this.lineNumber++,
        content: `  <span class="text-cursor-control">return</span> <span class="text-cursor-string">"${escaped}"</span>;`,
      });
    } else {
      const varName = this.generateContextualVarName(text);
      lines.push({
        ln: this.lineNumber++,
        content: `  <span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-string">\`${brokenLines.join('\\n')}\`</span>;`,
      });
      lines.push({
        ln: this.lineNumber++,
        content: `  <span class="text-cursor-control">return</span> <span class="text-cursor-variable">${varName}</span>;`,
      });
    }
    
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span>`,
    });

    return lines;
  }

  private toHTMLTemplate(text: string): CodeLineData[] {
    const varName = this.generateContextualVarName(text, 'Template');
    const lines: CodeLineData[] = [];
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 10);

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-string">\`</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-cursor-string">&lt;<span class="text-cursor-class">div</span> <span class="text-cursor-property">className</span>=<span class="text-cursor-string">"content"</span>&gt;</span>`,
    });
    
    brokenLines.forEach(line => {
      lines.push({
        ln: this.lineNumber++,
        content: `    <span class="text-cursor-string">${line}</span>`,
      });
    });
    
    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-cursor-string">&lt;/<span class="text-cursor-class">div</span>&gt;</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-string">\`</span>;`,
    });

    return lines;
  }

  private toInlineComment(text: string): CodeLineData[] {
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 3);
    
    return brokenLines.map(line => ({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-comment">// ${line}</span>`,
    }));
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
    const methodName = this.generateContextualFuncName(text, '');
    const funcName = this.generateContextualFuncName(text, 'process');
    const lines: CodeLineData[] = [];
    const parts = this.splitBySentences(text, 2);

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">async</span> <span class="text-cursor-function">${methodName}</span><span class="text-cursor-bracket-1">()</span> <span class="text-cursor-bracket-3">{</span>`,
    });

    for (const part of parts) {
      const escaped = this.escapeString(part.trim());
      const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 25);
      if (brokenLines.length === 1) {
        lines.push({
          ln: this.lineNumber++,
          content: `  <span class="text-cursor-control">await</span> <span class="text-cursor-function">${funcName}</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-string">"${escaped}"</span><span class="text-cursor-bracket-1">)</span>;`,
        });
      } else {
        const varName = this.generateContextualVarName(part);
        lines.push({
          ln: this.lineNumber++,
          content: `  <span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-string">"${brokenLines.join(' ')}"</span>;`,
        });
        lines.push({
          ln: this.lineNumber++,
          content: `  <span class="text-cursor-control">await</span> <span class="text-cursor-function">${funcName}</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">${varName}</span><span class="text-cursor-bracket-1">)</span>;`,
        });
      }
    }

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span>`,
    });

    return lines;
  }

  private toTryCatch(text: string): CodeLineData[] {
    const funcName = this.generateContextualFuncName(text, 'process');
    const lines: CodeLineData[] = [];
    const parts = this.splitBySentences(text, 2);

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">try</span> <span class="text-cursor-bracket-3">{</span>`,
    });

    for (const part of parts) {
      const escaped = this.escapeString(part.trim());
      const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 25);
      if (brokenLines.length === 1) {
        lines.push({
          ln: this.lineNumber++,
          content: `  <span class="text-cursor-control">await</span> <span class="text-cursor-function">${funcName}</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-string">"${escaped}"</span><span class="text-cursor-bracket-1">)</span>;`,
        });
      } else {
        const varName = this.generateContextualVarName(part);
        lines.push({
          ln: this.lineNumber++,
          content: `  <span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-string">"${brokenLines.join(' ')}"</span>;`,
        });
        lines.push({
          ln: this.lineNumber++,
          content: `  <span class="text-cursor-control">await</span> <span class="text-cursor-function">${funcName}</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">${varName}</span><span class="text-cursor-bracket-1">)</span>;`,
        });
      }
    }

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span> <span class="text-cursor-keyword">catch</span> <span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">error</span><span class="text-cursor-bracket-1">)</span> <span class="text-cursor-bracket-3">{</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-cursor-variable">console</span>.<span class="text-cursor-function">error</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">error</span><span class="text-cursor-bracket-1">)</span>;`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span>`,
    });

    return lines;
  }

  private toForLoop(text: string): CodeLineData[] {
    const funcName = this.generateContextualFuncName(text, 'process');
    const varName = this.generateContextualVarName(text, 'Items');
    const lines: CodeLineData[] = [];
    const parts = this.splitBySentences(text, 2);

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">for</span> <span class="text-cursor-bracket-1">(</span><span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">item</span> <span class="text-cursor-keyword">of</span> <span class="text-cursor-variable">${varName}</span><span class="text-cursor-bracket-1">)</span> <span class="text-cursor-bracket-3">{</span>`,
    });

    for (const part of parts) {
      const escaped = this.escapeString(part.trim());
      const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 25);
      if (brokenLines.length === 1) {
        lines.push({
          ln: this.lineNumber++,
          content: `  <span class="text-cursor-control">await</span> <span class="text-cursor-function">${funcName}</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-string">"${escaped}"</span><span class="text-cursor-bracket-1">)</span>;`,
        });
      } else {
        const partVarName = this.generateContextualVarName(part);
        lines.push({
          ln: this.lineNumber++,
          content: `  <span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${partVarName}</span> = <span class="text-cursor-string">"${brokenLines.join(' ')}"</span>;`,
        });
        lines.push({
          ln: this.lineNumber++,
          content: `  <span class="text-cursor-control">await</span> <span class="text-cursor-function">${funcName}</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">${partVarName}</span><span class="text-cursor-bracket-1">)</span>;`,
        });
      }
    }

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span>`,
    });

    return lines;
  }

  private toBlockComment(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    lines.push({
      ln: this.lineNumber++,
      content: '<span class="text-cursor-comment">/*</span>',
    });

    // Use smart line breaking
    const brokenLines = this.breakLines(text, Codeifier.SOFT_LINE_LENGTH);
    brokenLines.forEach(line => {
      lines.push({
        ln: this.lineNumber++,
        content: `<span class="text-cursor-comment"> * ${line}</span>`,
      });
    });

    lines.push({
      ln: this.lineNumber++,
      content: '<span class="text-cursor-comment"> */</span>',
    });
    return lines;
  }

  private toJSDoc(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    lines.push({
      ln: this.lineNumber++,
      content: '<span class="text-cursor-comment">/**</span>',
    });

    // Add @description tag
    const brokenLines = this.breakLines(text, Codeifier.SOFT_LINE_LENGTH);
    brokenLines.forEach((line, index) => {
      const prefix = index === 0 ? ' * @description ' : ' * ';
      lines.push({
        ln: this.lineNumber++,
        content: `<span class="text-cursor-comment">${prefix}${line}</span>`,
      });
    });

    lines.push({
      ln: this.lineNumber++,
      content: '<span class="text-cursor-comment"> */</span>',
    });
    return lines;
  }

  private toConsoleLog(text: string): CodeLineData[] {
    const varName = this.generateContextualVarName(text);
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 20);
    
    if (brokenLines.length === 1) {
      return [{
        ln: this.lineNumber++,
        content: `<span class="text-cursor-variable">console</span>.<span class="text-cursor-function">log</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-string">"${escaped}"</span><span class="text-cursor-bracket-1">)</span>;`,
      }];
    }

    const lines: CodeLineData[] = [];
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-string">\`${brokenLines.join('\\n')}\`</span>;`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-variable">console</span>.<span class="text-cursor-function">log</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">${varName}</span><span class="text-cursor-bracket-1">)</span>;`,
    });
    return lines;
  }

  private toConstStatement(text: string): CodeLineData[] {
    const varName = this.generateContextualVarName(text);
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 20);
    
    if (brokenLines.length === 1) {
      return [{
        ln: this.lineNumber++,
        content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-string">"${escaped}"</span>;`,
      }];
    }

    const lines: CodeLineData[] = [];
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-string">\`${brokenLines.join('\\n')}\`</span>;`,
    });
    return lines;
  }

  private toImportStatement(text: string): CodeLineData[] {
    const moduleName = this.generateContextualFuncName(text).toLowerCase();
    const importName = this.generateContextualFuncName(text, '');
    
    return [{
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">import</span> <span class="text-cursor-bracket-3">{</span> <span class="text-cursor-variable">${importName}</span> <span class="text-cursor-bracket-3">}</span> <span class="text-cursor-keyword">from</span> <span class="text-cursor-string">'./${moduleName}'</span>;`,
    }];
  }

  private toExportStatement(text: string): CodeLineData[] {
    const exportName = this.generateContextualFuncName(text, '');
    const escaped = this.escapeString(text);
    
    return [{
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">export</span> <span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${exportName}</span> = <span class="text-cursor-string">"${escaped}"</span>;`,
    }];
  }

  private toTypeDefinition(text: string): CodeLineData[] {
    const typeName = this.generateContextualTypeName(text);
    const escaped = this.escapeString(text);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">type</span> <span class="text-cursor-type">${typeName}</span> = <span class="text-cursor-keyword">string</span>;`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-comment">// ${escaped}</span>`,
    });

    return lines;
  }

  private toTypeGuard(text: string): CodeLineData[] {
    const typeName = this.generateContextualTypeName(text);
    const varName = typeName.charAt(0).toLowerCase() + typeName.slice(1);
    const escaped = this.escapeString(text);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">function</span> <span class="text-cursor-function">is${typeName}</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">obj</span>: <span class="text-cursor-keyword">unknown</span><span class="text-cursor-bracket-1">)</span>: <span class="text-cursor-variable">obj</span> <span class="text-cursor-keyword">is</span> <span class="text-cursor-type">${typeName}</span> <span class="text-cursor-bracket-3">{</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-cursor-comment">// ${escaped}</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-cursor-control">return</span> <span class="text-cursor-keyword">typeof</span> <span class="text-cursor-variable">obj</span> === <span class="text-cursor-string">"string"</span>;`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span>`,
    });

    return lines;
  }

  private toMappedType(text: string): CodeLineData[] {
    const typeName = this.generateContextualTypeName(text, 'Keys');
    const baseName = this.generateContextualTypeName(text);
    const escaped = this.escapeString(text);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${baseName.toUpperCase()}_CONFIG</span> = <span class="text-cursor-bracket-3">{</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-cursor-property">content</span>: <span class="text-cursor-string">"${escaped}"</span>,`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span> <span class="text-cursor-keyword">as</span> <span class="text-cursor-keyword">const</span>;`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">type</span> <span class="text-cursor-type">${typeName}</span> = <span class="text-cursor-keyword">keyof</span> <span class="text-cursor-keyword">typeof</span> <span class="text-cursor-variable">${baseName.toUpperCase()}_CONFIG</span>;`,
    });

    return lines;
  }

  private toTemplateLiteralType(text: string): CodeLineData[] {
    const typeName = this.generateContextualTypeName(text, 'Id');
    const escaped = this.escapeString(text);
    
    return [{
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">type</span> <span class="text-cursor-type">${typeName}</span> = <span class="text-cursor-string">\`scene_${escaped.slice(0, 20).replace(/\s+/g, '_')}\`</span>;`,
    }];
  }

  private toNamespace(text: string): CodeLineData[] {
    const namespaceName = this.generateContextualTypeName(text);
    const escaped = this.escapeString(text);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">namespace</span> <span class="text-cursor-type">${namespaceName}</span> <span class="text-cursor-bracket-3">{</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-cursor-keyword">export</span> <span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">content</span> = <span class="text-cursor-string">"${escaped}"</span>;`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span>`,
    });

    return lines;
  }

  private toDestructuring(text: string): CodeLineData[] {
    const varName = this.generateContextualVarName(text);
    const escaped = this.escapeString(text);
    const lines: CodeLineData[] = [];

    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}Data</span> = <span class="text-cursor-bracket-3">{</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `  <span class="text-cursor-property">content</span>: <span class="text-cursor-string">"${escaped}"</span>,`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-bracket-3">}</span>;`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-bracket-3">{</span> <span class="text-cursor-variable">content</span> <span class="text-cursor-bracket-3">}</span> = <span class="text-cursor-variable">${varName}Data</span>;`,
    });

    return lines;
  }

  private toArrayChain(text: string): CodeLineData[] {
    const escaped = this.escapeString(text);
    const brokenLines = this.breakLines(escaped, Codeifier.SOFT_LINE_LENGTH - 30);
    
    const lines: CodeLineData[] = [];
    lines.push({
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">items</span> = <span class="text-cursor-bracket-2">[</span><span class="text-cursor-string">"${brokenLines[0]}"</span><span class="text-cursor-bracket-2">]</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `  .<span class="text-cursor-function">filter</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">item</span> <span class="text-cursor-operator">=></span> <span class="text-cursor-variable">item</span>.<span class="text-cursor-function">length</span> > <span class="text-cursor-number">0</span><span class="text-cursor-bracket-1">)</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `  .<span class="text-cursor-function">map</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-variable">item</span> <span class="text-cursor-operator">=></span> <span class="text-cursor-string">\`${escaped}\`</span><span class="text-cursor-bracket-1">)</span>`,
    });
    lines.push({
      ln: this.lineNumber++,
      content: `  .<span class="text-cursor-function">join</span><span class="text-cursor-bracket-1">(</span><span class="text-cursor-string">' '</span><span class="text-cursor-bracket-1">)</span>;`,
    });

    return lines;
  }

  private toOptionalChaining(text: string): CodeLineData[] {
    const varName = this.generateContextualVarName(text);
    const escaped = this.escapeString(text);
    
    return [{
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-variable">scene</span>?.<span class="text-cursor-property">content</span>?.<span class="text-cursor-property">text</span> ?? <span class="text-cursor-string">"${escaped}"</span>;`,
    }];
  }

  private toNullishCoalescing(text: string): CodeLineData[] {
    const varName = this.generateContextualVarName(text);
    const escaped = this.escapeString(text);
    
    return [{
      ln: this.lineNumber++,
      content: `<span class="text-cursor-keyword">const</span> <span class="text-cursor-variable">${varName}</span> = <span class="text-cursor-variable">chapter</span>.<span class="text-cursor-property">title</span> ?? <span class="text-cursor-string">"${escaped}"</span>;`,
    }];
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

  // ========== NEW METHODS FOR STEALTH IMPROVEMENTS ==========

  /**
   * Extract contextual keywords from text for naming
   */
  private extractKeywords(text: string): {
    nouns: string[];
    verbs: string[];
    properNouns: string[];
    allWords: string[];
  } {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const nouns: string[] = [];
    const verbs: string[] = [];
    const properNouns: string[] = [];
    
    // Common Portuguese verbs (infinitive form)
    const verbPatterns = /\b(ser|estar|ter|fazer|dizer|ir|ver|saber|querer|poder|dar|vir|passar|ficar|deixar|começar|acabar|voltar|encontrar|pensar|olhar|ouvir|falar|trabalhar|viver|morrer|nascer|chegar|sair|entrar|subir|descer|abrir|fechar|pegar|largar|correr|andar|caminhar|sentar|levantar|dormir|acordar|comer|beber|escrever|ler|aprender|ensinar|ajudar|precisar|gostar|amar|odiar|esquecer|lembrar|conhecer|encontrar|perder|ganhar|comprar|vender|pagar|receber|esperar|chegar|partir|voltar|continuar|parar|começar|terminar|acabar|ficar|deixar|permitir|proibir|obrigar|forçar|conseguir|tentar|provar|testar|mostrar|esconder|procurar|achar|encontrar|perder|ganhar|vencer|perder|jogar|brincar|rir|chorar|sorrir|chorar|gritar|falar|calar|ouvir|escutar|ver|olhar|observar|notar|perceber|sentir|tocar|pegar|largar|segurar|soltar|empurrar|puxar|levantar|abaixar|subir|descer|entrar|sair|chegar|partir|voltar|ir|vir|ficar|permanecer|continuar|parar|começar|terminar|acabar)\b/i;
    
    // Common Portuguese nouns
    const nounPatterns = /\b(sol|lua|estrela|mar|rio|montanha|vila|cidade|rua|casa|porta|janela|mesa|cadeira|livro|papel|caneta|lápis|gente|pessoa|homem|mulher|criança|velho|jovem|amigo|inimigo|família|mãe|pai|filho|filha|irmão|irmã|avô|avó|tio|tia|primo|prima|vizinho|vizinha|professor|professora|aluno|aluna|médico|médica|enfermeiro|enfermeira|advogado|advogada|engenheiro|engenheira|arquiteto|arquiteta|artista|músico|música|pintor|pintora|escritor|escritora|poeta|poetisa|ator|atriz|diretor|diretora|chef|cozinheiro|cozinheira|garçom|garçonete|vendedor|vendedora|comprador|compradora|cliente|fornecedor|fornecedora|empregado|empregada|patrão|patroa|chefe|funcionário|funcionária|trabalhador|trabalhadora|operário|operária|mecânico|mecânica|eletricista|carpinteiro|carpinteira|pedreiro|pedreira|pintor|pintora|jardineiro|jardineira|faxineiro|faxineira|segurança|porteiro|porteira|recepcionista|secretário|secretária|assistente|gerente|supervisor|supervisora|diretor|diretora|presidente|vice-presidente|ministro|ministra|governador|governadora|prefeito|prefeita|vereador|vereadora|deputado|deputada|senador|senadora|juiz|juíza|promotor|promotora|delegado|delegada|policial|bombeiro|bombeira|soldado|sargento|capitão|major|coronel|general|almirante|comandante|tenente|subtenente|cabo|soldado|recruta|veterano|veterana|guerreiro|guerreira|herói|heroína|vilão|vilã|príncipe|princesa|rei|rainha|imperador|imperatriz|nobre|nobreza|plebeu|plebeia|escravo|escrava|servo|serva|criado|criada|mordomo|mordoma|aia|dama|donzela|cavaleiro|dama|senhor|senhora|senhorita|moço|moça|rapaz|garota|menino|menina|bebê|recém-nascido|recém-nascida|criança|adolescente|jovem|adulto|adulta|idoso|idosa|velho|velha|ancião|anciã|morto|morta|vivo|viva|nascido|nascida|casado|casada|solteiro|solteira|divorciado|divorciada|viúvo|viúva|noivo|noiva|esposo|esposa|marido|mulher|namorado|namorada|amante|amigo|amiga|inimigo|inimiga|rival|concorrente|competidor|competidora|aliado|aliada|parceiro|parceira|sócio|sócia|colaborador|colaboradora|colegas|companheiro|companheira|camarada|colega|vizinho|vizinha|morador|moradora|habitante|residente|hóspede|visitante|turista|viajante|passageiro|passageira|motorista|condutor|condutora|piloto|copiloto|navegador|navegadora|guia|turista|explorador|exploradora|aventureiro|aventureira|desbravador|desbravadora|pioneiro|pioneira|colonizador|colonizadora|conquistador|conquistadora|invasor|invasora|defensor|defensora|protetor|protetora|guardião|guardiã|vigia|sentinela|vigilante|observador|observadora|espectador|espectadora|ouvinte|testemunha|vítima|sobrevivente|refugiado|refugiada|imigrante|emigrante|nativo|nativa|estrangeiro|estrangeira|turista|viajante|explorador|exploradora|aventureiro|aventureira|desbravador|desbravadora|pioneiro|pioneira|colonizador|colonizadora|conquistador|conquistadora|invasor|invasora|defensor|defensora|protetor|protetora|guardião|guardiã|vigia|sentinela|vigilante|observador|observadora|espectador|espectadora|ouvinte|testemunha|vítima|sobrevivente|refugiado|refugiada|imigrante|emigrante|nativo|nativa|estrangeiro|estrangeira)\b/i;

    words.forEach((word, index) => {
      // Check if word starts with capital (likely proper noun)
      const originalWord = text.split(/\s+/).find(w => w.toLowerCase() === word);
      if (originalWord && /^[A-ZÁÉÍÓÚÂÊÔÇ]/.test(originalWord)) {
        properNouns.push(word);
      } else if (verbPatterns.test(word)) {
        verbs.push(word);
      } else if (nounPatterns.test(word) || word.length > 4) {
        nouns.push(word);
      }
    });

    return {
      nouns: [...new Set(nouns)].slice(0, 5),
      verbs: [...new Set(verbs)].slice(0, 5),
      properNouns: [...new Set(properNouns)].slice(0, 3),
      allWords: words.slice(0, 10)
    };
  }

  /**
   * Generate contextual variable name from text
   */
  private generateContextualVarName(text: string, suffix: string = ''): string {
    const keywords = this.extractKeywords(text);
    
    // Prefer proper nouns, then nouns, then verbs
    const preferredWord = keywords.properNouns[0] || keywords.nouns[0] || keywords.verbs[0] || keywords.allWords[0];
    
    if (!preferredWord) {
      return `content${suffix}`;
    }

    // Convert to camelCase
    const camelCase = preferredWord
      .split(/\s+/)
      .map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))
      .join('');

    return camelCase + suffix;
  }

  /**
   * Generate contextual function name from text
   */
  private generateContextualFuncName(text: string, prefix: string = ''): string {
    const keywords = this.extractKeywords(text);
    const prefixes = prefix ? [prefix] : ['handle', 'process', 'render', 'format', 'create', 'get', 'set'];
    const prefixChoice = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    const preferredWord = keywords.verbs[0] || keywords.nouns[0] || keywords.allWords[0];
    
    if (!preferredWord) {
      return `${prefixChoice}Content`;
    }

    const camelCase = preferredWord
      .split(/\s+/)
      .map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))
      .join('');

    return `${prefixChoice}${camelCase.charAt(0).toUpperCase()}${camelCase.slice(1)}`;
  }

  /**
   * Generate contextual type name from text
   */
  private generateContextualTypeName(text: string, suffix: string = ''): string {
    const keywords = this.extractKeywords(text);
    const preferredWord = keywords.nouns[0] || keywords.properNouns[0] || keywords.allWords[0];
    
    if (!preferredWord) {
      return `Content${suffix}`;
    }

    const pascalCase = preferredWord
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');

    return pascalCase + suffix;
  }

  /**
   * Select structure avoiding recent repetition
   */
  private selectStructure(textLength: number, textType: 'dialogue' | 'list' | 'question' | 'narrative'): StructureType {
    const availableStructures: StructureType[] = [];

    // Determine available structures based on context
    if (textLength < 50) {
      availableStructures.push('inline-comment', 'const', 'console-log', 'arrow-function');
    } else if (textLength < 100) {
      availableStructures.push('function', 'arrow-function', 'const', 'comment', 'jsdoc', 'console-log', 'destructuring');
    } else if (textLength < 200) {
      availableStructures.push(
        'function', 'async-function', 'arrow-function', 'method', 'jsdoc', 'comment',
        'type-definition', 'interface', 'array-chain', 'optional-chaining'
      );
    } else {
      availableStructures.push(
        'async-function', 'function', 'jsdoc', 'comment', 'class', 'interface',
        'type-definition', 'namespace', 'generic-function', 'type-guard'
      );
    }

    // Add variety structures
    if (this.structureCount > 5 && !this.hasImports) {
      availableStructures.push('import');
    }
    if (this.structureCount > 10 && Math.random() < 0.3) {
      availableStructures.push('type-definition', 'mapped-type', 'template-literal-type');
    }
    if (this.structureCount > 15 && Math.random() < 0.2) {
      availableStructures.push('export');
    }

    // Filter out recently used structures (last 3-5)
    const recent = this.recentStructures.slice(-5);
    const filtered = availableStructures.filter(s => !recent.includes(s));
    const candidates = filtered.length > 0 ? filtered : availableStructures;

    // Select randomly from candidates
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    
    // Track usage
    this.recentStructures.push(selected);
    if (this.recentStructures.length > 10) {
      this.recentStructures.shift();
    }
    this.structureCount++;

    // Update file section tracking
    if (selected === 'import') this.hasImports = true;
    if (selected === 'export') this.hasExports = true;

    return selected;
  }

  /**
   * Smart line breaking respecting sentence boundaries
   */
  private breakLines(text: string, maxLength: number = Codeifier.MAX_LINE_LENGTH): string[] {
    if (text.length <= maxLength) return [text];

    const lines: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        lines.push(remaining);
        break;
      }

      // Find best break point
      let breakPoint = maxLength;
      
      // Prefer sentence endings
      const sentenceEnd = remaining.substring(0, maxLength).lastIndexOf(/[.!?]\s/.source);
      if (sentenceEnd > maxLength * 0.6) {
        breakPoint = sentenceEnd + 2; // Include punctuation and space
      } else {
        // Prefer commas
        const comma = remaining.substring(0, maxLength).lastIndexOf(', ');
        if (comma > maxLength * 0.7) {
          breakPoint = comma + 1;
        } else {
          // Break at word boundary
          const space = remaining.substring(0, maxLength).lastIndexOf(' ');
          if (space > maxLength * 0.8) {
            breakPoint = space;
          }
        }
      }

      lines.push(remaining.substring(0, breakPoint).trim());
      remaining = remaining.substring(breakPoint).trim();
    }

    return lines;
  }
}

export const codeifier = new Codeifier();
