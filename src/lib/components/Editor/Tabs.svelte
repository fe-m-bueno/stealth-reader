<script lang="ts">
  import { X, Split } from 'lucide-svelte';
  import { bookStore } from '../../stores/book.svelte';

  function closeSession(sessionId: string, event: Event) {
    event.stopPropagation();
    bookStore.closeSession(sessionId);
  }

  function switchToSession(sessionId: string) {
    bookStore.switchToSession(sessionId);
  }

  function toggleSplitView() {
    bookStore.toggleSplitView();
  }
</script>

<div class="flex bg-[#2d2d2d] h-9 overflow-x-auto scrollbar-hide flex-shrink-0 z-10 relative">
  {#if bookStore.sessionsCount === 0}
    <!-- Show placeholder tab when no sessions -->
    <div class="flex items-center px-3 min-w-[120px] max-w-[200px] border-r border-[#1e1e1e] bg-[#3c3c3c] text-gray-400">
      <span class="text-xs truncate flex-1">
        {bookStore.availableBooks.length > 0 ? 'Select a book to read' : 'No books available'}
      </span>
    </div>
  {:else}
    {#each bookStore.readingSessions as session (session.id)}
    <div
      class="flex items-center px-3 min-w-[120px] max-w-[200px] border-r border-[#1e1e1e] cursor-pointer group {bookStore.activeSessionId === session.id ? 'bg-vscode-bg text-white border-t-2 border-t-vscode-keyword' : 'bg-[#3c3c3c] text-gray-400 hover:bg-[#454545]'}"
      onclick={() => switchToSession(session.id)}
      onkeydown={(e) => e.key === 'Enter' && switchToSession(session.id)}
      role="tab"
      tabindex="0"
      aria-selected={bookStore.activeSessionId === session.id}
    >
      <div class="flex items-center gap-2 w-full">
        <span class="text-xs truncate flex-1">
          {session.currentChapter ? `${session.currentChapter.label}.ts` : `${session.bookTitle}.ts`}
        </span>
        {#if bookStore.sessionsCount > 1}
          <button
            class="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-white/20"
            onclick={(e) => closeSession(session.id, e)}
            onkeydown={(e) => e.key === 'Enter' && closeSession(session.id, e)}
            aria-label="Close tab"
          >
            <X size={14} />
          </button>
        {/if}
      </div>
    </div>
    {/each}

    <!-- Split view toggle button -->
    {#if bookStore.sessionsCount >= 2}
      <div class="flex items-center px-2 border-r border-[#1e1e1e] cursor-pointer hover:bg-[#454545]">
        <button
          class="p-1 rounded hover:bg-white/20 {bookStore.isSplitView ? 'text-vscode-keyword' : 'text-gray-400'}"
          onclick={toggleSplitView}
          title={bookStore.isSplitView ? 'Disable split view' : 'Enable split view'}
        >
          <Split size={16} />
        </button>
      </div>
    {/if}
  {/if}
</div>

