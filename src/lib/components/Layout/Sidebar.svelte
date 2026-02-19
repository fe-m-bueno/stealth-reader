<script lang="ts">
  import { ChevronRight, ChevronDown, FileCode, FileJson, FolderOpen, MoreHorizontal, Trash2, BookOpen } from 'lucide-svelte';
  import { bookStore } from '../../stores/book.svelte';
  
  let isOpen = $state(true);
  let fileInput: HTMLInputElement;
  let showAllBooks = $state(false);

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      bookStore.loadEpub(target.files[0]);
    }
  }

  function triggerFileSelect() {
    fileInput.click();
  }

  // Expose function for external access
  export { triggerFileSelect };

  function handleDeleteBook(bookId: string, e: Event) {
    e.stopPropagation();
    if (confirm('Delete this book?')) {
      bookStore.deleteBook(bookId);
    }
  }
</script>

<div class="w-64 bg-cursor-panel flex flex-col h-full border-r border-white/5 text-sm select-none">
  <!-- Sidebar Header -->
  <div class="h-9 px-4 flex items-center justify-between text-[11px] tracking-wide text-cursor-text-muted uppercase group">
    <span>Explorer</span>
    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100">
      <button class="hover:bg-white/10 p-1 rounded" onclick={triggerFileSelect} title="Open EPUB">
        <FolderOpen size={14} color="#CCCCCC99" />
      </button>
      <button class="hover:bg-white/10 p-1 rounded" onclick={() => showAllBooks = !showAllBooks} title="Show All Books">
        <BookOpen size={14} color="#CCCCCC99" />
      </button>
      <button class="hover:bg-white/10 p-1 rounded">
        <MoreHorizontal size={14} color="#CCCCCC99" />
      </button>
    </div>
  </div>
  
  <input type="file" accept=".epub" class="hidden" bind:this={fileInput} onchange={handleFileSelect} />

  <div class="flex-1 overflow-y-auto min-h-0">
    {#if showAllBooks && bookStore.availableBooks.length > 0}
      <!-- All Books View -->
      <div class="p-2">
        <div class="text-xs text-cursor-text-muted mb-2 px-2">All Books ({bookStore.availableBooks.length})</div>
        {#each bookStore.availableBooks as book}
          <div
            class="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-[#2A2A2A99] rounded group {bookStore.currentBookId === book.id ? 'bg-white/[0.07]' : ''}"
            onclick={() => { bookStore.createSessionFromBook(book.id); showAllBooks = false; }}
            onkeydown={(e) => e.key === 'Enter' && bookStore.createSessionFromBook(book.id)}
            role="button"
            tabindex="0"
          >
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <BookOpen size={14} color="#87c3ff" />
              <div class="flex-1 min-w-0">
                <div class="text-xs truncate">{book.title}</div>
                <div class="text-[10px] text-cursor-text-muted truncate">{book.author}</div>
              </div>
            </div>
            <button 
              class="opacity-0 group-hover:opacity-100 hover:bg-red-500/20 p-1 rounded"
              onclick={(e) => handleDeleteBook(book.id, e)}
              title="Delete book"
            >
              <Trash2 size={12} color="#f48771" />
            </button>
          </div>
        {/each}
      </div>
    {:else if !bookStore.bookLoaded}
      <div class="p-4 text-center mt-10">
        <div class="text-xs text-cursor-text-muted mb-4">You have not yet opened a folder.</div>
        <button
          class="bg-cursor-accent text-white px-4 py-1.5 rounded-sm text-xs hover:bg-cursor-accent-hover transition-colors w-full flex items-center justify-center gap-2"
          onclick={triggerFileSelect}
          title="Open EPUB file (Ctrl+Shift+O)"
        >
          <span>Open Folder</span>
          <span class="opacity-50 text-[10px]">Ctrl+Shift+O</span>
        </button>
      </div>
    {:else}
      <!-- Project Section -->
      <div class="flex flex-col h-full">
        <div 
          class="flex items-center px-1 py-1 cursor-pointer hover:bg-[#2A2A2A99] text-cursor-text font-bold text-xs group flex-shrink-0"
          onclick={() => isOpen = !isOpen}
          onkeydown={(e) => e.key === 'Enter' && (isOpen = !isOpen)}
          role="button"
          tabindex="0"
        >
          {#if isOpen}
            <ChevronDown size={16} color="#CCCCCC99" />
          {:else}
            <ChevronRight size={16} color="#CCCCCC99" />
          {/if}
          <span class="ml-1 truncate uppercase flex-1">{bookStore.metadata?.title || 'PROJECT'}</span>
          <button 
            class="opacity-0 group-hover:opacity-100 hover:bg-red-500/20 p-1 rounded mr-1"
            onclick={(e) => { e.stopPropagation(); if (bookStore.currentBookId) handleDeleteBook(bookStore.currentBookId, e); }}
            title="Delete book"
          >
            <Trash2 size={12} color="#f48771" />
          </button>
        </div>

        {#if isOpen}
          <div class="flex flex-col flex-1 min-h-0 overflow-y-auto editor-scroll-container">
            {#each bookStore.chapters as chapter}
              <div 
                class="flex items-center px-4 py-1 cursor-pointer gap-1.5 text-[13px] border-l-[3px] border-transparent flex-shrink-0
                {bookStore.currentChapter?.id === chapter.id ? 'bg-white/[0.07] text-white border-cursor-accent/50' : 'text-cursor-text hover:bg-[#2A2A2A99]'}"
                onclick={() => bookStore.selectChapter(chapter)}
                onkeydown={(e) => e.key === 'Enter' && bookStore.selectChapter(chapter)}
                role="button"
                tabindex="0"
              >
                <FileCode size={14} color="#87c3ff" />
                <span class="truncate">{chapter.label}.ts</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>


