export interface CodeLineData {
  ln: number;
  content: string; // HTML string with spans
}

export class Codeifier {
  private lineNumber = 1;

  reset() {
    this.lineNumber = 1;
  }

  transform(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);

    for (const p of paragraphs) {
      const transformed = this.processParagraph(p);
      lines.push(...transformed);
      // Add an empty line after each block for readability
      lines.push({ ln: this.lineNumber++, content: '' });
    }

    return lines;
  }

  private processParagraph(text: string): CodeLineData[] {
    const trimmed = text.trim();
    
    // Strategy 1: Dialogue -> const variable
    if (trimmed.startsWith('"') || trimmed.startsWith('"') || trimmed.startsWith('-') || trimmed.startsWith('—')) {
      return this.toVariable(trimmed, 'const');
    }

    // Strategy 2: Short text -> variable
    if (trimmed.length < 60) {
      return this.toVariable(trimmed, 'let');
    }

    // Strategy 3: Medium text -> random between function, HTML, or comment
    if (trimmed.length < 150) {
      const rand = Math.random();
      if (rand < 0.5) return this.toHTMLTemplate(trimmed);  // 50% HTML
      if (rand < 0.75) return this.toFunction(trimmed);     // 25% function
      return this.toInlineComment(trimmed);                 // 25% comment
    }

    // Strategy 4: Long text -> random between class method, try-catch, loop, or block comment
    const rand = Math.random();
    if (rand < 0.3) return this.toClassMethod(trimmed);
    if (rand < 0.5) return this.toTryCatch(trimmed);
    if (rand < 0.7) return this.toForLoop(trimmed);
    return this.toBlockComment(trimmed);
  }

  private toVariable(text: string, type: 'const' | 'let'): CodeLineData[] {
    const varName = '_';
    const escaped = this.escapeString(text);
    const content = `<span class="text-vscode-keyword">${type}</span> <span class="text-vscode-variable">${varName}</span> = <span class="text-vscode-string">"${escaped}"</span>;`;
    return [{ ln: this.lineNumber++, content }];
  }

  private toFunction(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    const escaped = this.escapeString(text);
    
    lines.push({ 
      ln: this.lineNumber++, 
      content: `<span class="text-vscode-keyword">function</span> <span class="text-vscode-function">process</span><span class="text-vscode-bracket-1">()</span> <span class="text-vscode-bracket-3">{</span>` 
    });
    lines.push({ 
      ln: this.lineNumber++, 
      content: `  <span class="text-vscode-control">return</span> <span class="text-vscode-string">"${escaped}"</span>;` 
    });
    lines.push({ 
      ln: this.lineNumber++, 
      content: `<span class="text-vscode-bracket-3">}</span>` 
    });
    
    return lines;
  }

  private toHTMLTemplate(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    const escaped = this.escapeString(text);
    
    lines.push({ 
      ln: this.lineNumber++, 
      content: `<span class="text-vscode-keyword">const</span> <span class="text-vscode-variable">template</span> = <span class="text-vscode-string">\`</span>` 
    });
    lines.push({ 
      ln: this.lineNumber++, 
      content: `  <span class="text-vscode-string">&lt;<span class="text-vscode-class">div</span> <span class="text-vscode-property">className</span>=<span class="text-vscode-string">"content"</span>&gt;</span>` 
    });
    lines.push({ 
      ln: this.lineNumber++, 
      content: `    <span class="text-vscode-string">${escaped}</span>` 
    });
    lines.push({ 
      ln: this.lineNumber++, 
      content: `  <span class="text-vscode-string">&lt;/<span class="text-vscode-class">div</span>&gt;</span>` 
    });
    lines.push({ 
      ln: this.lineNumber++, 
      content: `<span class="text-vscode-string">\`</span>;` 
    });
    
    return lines;
  }

  private toInlineComment(text: string): CodeLineData[] {
    const escaped = this.escapeString(text);
    return [{ 
      ln: this.lineNumber++, 
      content: `<span class="text-vscode-comment">// ${escaped}</span>` 
    }];
  }

  private splitBySentences(text: string, maxSentences: number = 2): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const result: string[] = [];
    
    if (sentences.length <= maxSentences) {
      return sentences;
    }
    
    // Group sentences to fit maxSentences
    const sentencesPerGroup = Math.ceil(sentences.length / maxSentences);
    for (let i = 0; i < maxSentences; i++) {
      const start = i * sentencesPerGroup;
      const end = Math.min(start + sentencesPerGroup, sentences.length);
      result.push(sentences.slice(start, end).join(' '));
    }
    
    return result;
  }

  private toClassMethod(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    const parts = this.splitBySentences(text, 2);
    
    lines.push({ 
      ln: this.lineNumber++, 
      content: `<span class="text-vscode-control">async</span> <span class="text-vscode-function">execute</span><span class="text-vscode-bracket-1">()</span> <span class="text-vscode-bracket-3">{</span>` 
    });
    
    for (const part of parts) {
      const escaped = this.escapeString(part.trim());
      lines.push({ 
        ln: this.lineNumber++, 
        content: `  <span class="text-vscode-control">await</span> <span class="text-vscode-function">process</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-string">"${escaped}"</span><span class="text-vscode-bracket-1">)</span>;` 
      });
    }
    
    lines.push({ 
      ln: this.lineNumber++, 
      content: `<span class="text-vscode-bracket-3">}</span>` 
    });
    
    return lines;
  }

  private toTryCatch(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    const parts = this.splitBySentences(text, 2);
    
    lines.push({ 
      ln: this.lineNumber++, 
      content: `<span class="text-vscode-keyword">try</span> <span class="text-vscode-bracket-3">{</span>` 
    });
    
    for (const part of parts) {
      const escaped = this.escapeString(part.trim());
      lines.push({ 
        ln: this.lineNumber++, 
        content: `  <span class="text-vscode-control">await</span> <span class="text-vscode-function">process</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-string">"${escaped}"</span><span class="text-vscode-bracket-1">)</span>;` 
      });
    }
    
    lines.push({ 
      ln: this.lineNumber++, 
      content: `<span class="text-vscode-bracket-3">}</span> <span class="text-vscode-keyword">catch</span> <span class="text-vscode-bracket-1">(</span><span class="text-vscode-variable">error</span><span class="text-vscode-bracket-1">)</span> <span class="text-vscode-bracket-3">{</span>` 
    });
    lines.push({ 
      ln: this.lineNumber++, 
      content: `  <span class="text-vscode-variable">console</span>.<span class="text-vscode-function">error</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-variable">error</span><span class="text-vscode-bracket-1">)</span>;` 
    });
    lines.push({ 
      ln: this.lineNumber++, 
      content: `<span class="text-vscode-bracket-3">}</span>` 
    });
    
    return lines;
  }

  private toForLoop(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    const parts = this.splitBySentences(text, 2);
    
    lines.push({ 
      ln: this.lineNumber++, 
      content: `<span class="text-vscode-keyword">for</span> <span class="text-vscode-bracket-1">(</span><span class="text-vscode-keyword">const</span> <span class="text-vscode-variable">item</span> <span class="text-vscode-keyword">of</span> <span class="text-vscode-variable">items</span><span class="text-vscode-bracket-1">)</span> <span class="text-vscode-bracket-3">{</span>` 
    });
    
    for (const part of parts) {
      const escaped = this.escapeString(part.trim());
      lines.push({ 
        ln: this.lineNumber++, 
        content: `  <span class="text-vscode-control">await</span> <span class="text-vscode-function">process</span><span class="text-vscode-bracket-1">(</span><span class="text-vscode-string">"${escaped}"</span><span class="text-vscode-bracket-1">)</span>;` 
      });
    }
    
    lines.push({ 
      ln: this.lineNumber++, 
      content: `<span class="text-vscode-bracket-3">}</span>` 
    });
    
    return lines;
  }

  private toBlockComment(text: string): CodeLineData[] {
    const lines: CodeLineData[] = [];
    lines.push({ ln: this.lineNumber++, content: '<span class="text-vscode-comment">/**</span>' });
    
    // Wrap text to ~80 chars
    const words = text.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + word).length > 75) {
        lines.push({ ln: this.lineNumber++, content: `<span class="text-vscode-comment"> * ${currentLine}</span>` });
        currentLine = '';
      }
      currentLine += word + ' ';
    }
    if (currentLine) {
      lines.push({ ln: this.lineNumber++, content: `<span class="text-vscode-comment"> * ${currentLine}</span>` });
    }

    lines.push({ ln: this.lineNumber++, content: '<span class="text-vscode-comment"> */</span>' });
    return lines;
  }

  private generateVarName(text: string): string {
    // Take first few words, remove punctuation, camelCase
    const words = text.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).slice(0, 3);
    if (words.length === 0) return 'data';
    
    return words.map((w, i) => 
      i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join('');
  }

  private escapeString(text: string): string {
    return text.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }
}

export const codeifier = new Codeifier();
