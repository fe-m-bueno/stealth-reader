<script lang="ts">
  import { Loader2, ChevronRight } from 'lucide-svelte';
  import CodeLine from './CodeLine.svelte';
  import type { ReadingSession } from '../../stores/book.svelte';
  import { bookStore } from '../../stores/book.svelte';

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

  $effect(() => {
    // Scroll to search result line if available
    if (session.targetSearchLine && session.targetSearchQuery && scrollContainer && session.currentCode.length > 0) {
      scrollToSearchResult();
    }
  });

  function scrollToSearchResult() {
    if (!session.targetSearchLine || !session.targetSearchQuery || !scrollContainer) return;

    // Find the line in the code that contains the search query
    const targetLineIndex = session.currentCode.findIndex(line =>
      line.content.toLowerCase().includes(session.targetSearchQuery!.toLowerCase())
    );

    if (targetLineIndex !== -1) {
      // Calculate approximate scroll position
      const lineHeight = 20; // Approximate line height in pixels
      const targetScrollTop = targetLineIndex * lineHeight;

      // Scroll to the target line with some offset
      scrollContainer.scrollTop = Math.max(0, targetScrollTop - 100);

      // Clear the target after scrolling
      session.targetSearchLine = undefined;
      session.targetSearchQuery = undefined;
    }
  }

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

  function handleNextChapter() {
    bookStore.nextChapter();
  }

  function hasNextChapter(): boolean {
    if (!session.currentChapter) return false;
    const chapters = session.chapters;
    const currentIndex = chapters.findIndex(c => c.id === session.currentChapter!.id);
    return currentIndex >= 0 && currentIndex < chapters.length - 1;
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

      {#if hasNextChapter()}
        <div class="flex justify-center py-8">
          <button
            onclick={handleNextChapter}
            class="flex items-center gap-2 px-6 py-3 bg-vscode-keyword hover:bg-vscode-keyword/80 text-white rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            title="Próximo capítulo"
          >
            <span class="text-sm font-medium">Próximo capítulo</span>
            <ChevronRight size={18} />
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>
