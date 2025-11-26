<script lang="ts">
  import Tabs from './Tabs.svelte';
  import ReadingPanel from './ReadingPanel.svelte';
  import { bookStore } from '../../stores/book.svelte';

  function handleScroll(sessionId: string, progress: number) {
    bookStore.updateScrollProgressForSession(sessionId, progress);
  }

  function getSessionById(sessionId: string | null) {
    return sessionId ? bookStore.readingSessions.find(s => s.id === sessionId) || null : null;
  }
</script>

<div class="flex flex-col h-full bg-vscode-bg w-full overflow-hidden">
  <Tabs />

  {#if bookStore.isSplitView && bookStore.leftSessionId && bookStore.rightSessionId}
    <!-- Split view -->
    <div class="flex flex-1 overflow-hidden min-h-0">
      <div class="flex-1 border-r border-[#3c3c3c] overflow-hidden">
        <ReadingPanel
          session={getSessionById(bookStore.leftSessionId)!}
          onScroll={(progress) => handleScroll(bookStore.leftSessionId!, progress)}
        />
      </div>
      <div class="flex-1 overflow-hidden">
        <ReadingPanel
          session={getSessionById(bookStore.rightSessionId)!}
          onScroll={(progress) => handleScroll(bookStore.rightSessionId!, progress)}
        />
      </div>
    </div>
  {:else}
    <!-- Single view -->
    {#if bookStore.sessionsCount === 0}
      <div class="flex items-center justify-center flex-1 text-vscode-text/30 select-none">
        <div class="text-center">
          <div class="text-6xl mb-4 opacity-20">📖</div>
          <div>Open a book to start reading</div>
        </div>
      </div>
    {:else}
      <div class="flex-1 overflow-hidden min-h-0">
        <ReadingPanel
          session={bookStore.readingSessions.find(s => s.id === bookStore.activeSessionId)!}
          onScroll={(progress) => handleScroll(bookStore.activeSessionId!, progress)}
        />
      </div>
    {/if}
  {/if}
</div>

