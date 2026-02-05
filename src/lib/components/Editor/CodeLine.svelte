<script lang="ts">
  import { bookStore } from '../../stores/book.svelte';
  let { lineNumber, content, fontSize = bookStore.fontSize, wordWrap = bookStore.wordWrap } = $props();
</script>

<div class="flex hover:bg-[#292929] group" style="font-size: {fontSize}px; line-height: 1.5;">
  <div class="w-12 text-right pr-4 text-[#505050] text-xs select-none font-mono leading-loose opacity-70" style="font-size: {Math.max(12, fontSize - 2)}px;">
    {lineNumber}
  </div>
  <div class="flex-1 pl-2 font-mono text-cursor-text {wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-hidden'}">
    {@html content}
  </div>
</div>
