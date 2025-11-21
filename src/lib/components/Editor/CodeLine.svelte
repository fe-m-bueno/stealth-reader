<script lang="ts">
  import { bookStore } from '../../stores/book.svelte';
  let { lineNumber, content } = $props();
</script>

<div class="flex hover:bg-vscode-lineHighlight/30 group" style="font-size: {bookStore.fontSize}px; line-height: 1.5;">
  <div class="w-12 text-right pr-4 text-vscode-folder/50 text-xs select-none font-mono leading-loose opacity-70" style="font-size: {Math.max(12, bookStore.fontSize - 2)}px;">
    {lineNumber}
  </div>
  <div class="flex-1 pl-2 font-mono text-vscode-text {bookStore.wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-hidden'}">
    {@html content}
  </div>
</div>
