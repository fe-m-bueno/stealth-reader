<script lang="ts">
  import Tabs from './Tabs.svelte';
  import CodeLine from './CodeLine.svelte';
  import { bookStore } from '../../stores/book.svelte';
  import { Loader2 } from 'lucide-svelte';

  let scrollContainer: HTMLDivElement;

  $effect(() => {
    // Auto scroll to top when chapter changes
    if (bookStore.currentChapter) {
      if (scrollContainer) scrollContainer.scrollTop = 0;
    }
  });

  function handleScroll(e: Event) {
    const target = e.target as HTMLDivElement;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    
    if (scrollHeight > clientHeight) {
      const progress = scrollTop / (scrollHeight - clientHeight);
      bookStore.updateScrollProgress(progress);
    }
  }
</script>

<div class="flex flex-col h-full bg-vscode-bg w-full">
  <Tabs />
  
  <div 
    bind:this={scrollContainer}
    class="flex-1 overflow-y-auto overflow-x-hidden py-2 editor-scroll-container relative" 
    onscroll={handleScroll}
  >
    {#if bookStore.isLoading}
      <div class="absolute inset-0 flex items-center justify-center bg-vscode-bg/50 z-10">
        <Loader2 class="animate-spin text-vscode-text" size={32} />
      </div>
    {/if}

    {#if bookStore.currentCode.length === 0 && !bookStore.isLoading}
      <div class="flex items-center justify-center h-full text-vscode-text/30 select-none">
        <div class="text-center">
          <div class="text-6xl mb-4 opacity-20">CMD + SHIFT + P</div>
          <div>Open a file to start reading</div>
        </div>
      </div>
    {:else}
      {#each bookStore.currentCode as line}
        <CodeLine lineNumber={line.ln} content={line.content} />
      {/each}
    {/if}
  </div>
</div>

