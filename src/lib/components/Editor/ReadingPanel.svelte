<script lang="ts">
  import { Loader2 } from 'lucide-svelte';
  import CodeLine from './CodeLine.svelte';
  import type { ReadingSession } from '../../stores/book.svelte';

  interface Props {
    session: ReadingSession;
    onScroll?: (progress: number) => void;
  }

  let { session, onScroll }: Props = $props();

  let scrollContainer: HTMLDivElement;

  $effect(() => {
    // Auto scroll to top when chapter changes
    if (session.currentChapter && scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  });

  function handleScroll(e: Event) {
    const target = e.target as HTMLDivElement;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;

    if (scrollHeight > clientHeight) {
      const progress = scrollTop / (scrollHeight - clientHeight);
      onScroll?.(progress);
    }
  }
</script>

<div class="flex flex-col h-full bg-vscode-bg w-full">
  <div
    bind:this={scrollContainer}
    class="flex-1 overflow-y-auto overflow-x-hidden py-2 editor-scroll-container relative"
    onscroll={handleScroll}
  >
    {#if session.isLoading}
      <div class="absolute inset-0 flex items-center justify-center bg-vscode-bg/50 z-10">
        <Loader2 class="animate-spin text-vscode-text" size={32} />
      </div>
    {/if}

    {#if session.currentCode.length === 0 && !session.isLoading}
      <div class="flex items-center justify-center h-full text-vscode-text/30 select-none">
        <div class="text-center">
          <div class="text-6xl mb-4 opacity-20">📖</div>
          <div>Loading chapter...</div>
        </div>
      </div>
    {:else}
      {#each session.currentCode as line}
        <CodeLine
          lineNumber={line.ln}
          content={line.content}
          fontSize={session.fontSize}
          wordWrap={session.wordWrap}
        />
      {/each}
    {/if}
  </div>
</div>
