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

  function handleDeleteBook(bookId: string, e: Event) {
    e.stopPropagation();
    if (confirm('Delete this book?')) {
      bookStore.deleteBook(bookId);
    }
  }
</script>

<div class="w-64 bg-vscode-sidebar flex flex-col h-full border-r border-black/20 text-sm select-none">
  <!-- Sidebar Header -->
  <div class="h-9 px-4 flex items-center justify-between text-[11px] tracking-wide text-vscode-text/60 uppercase group">
    <span>Explorer</span>
    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100">
      <button class="hover:bg-white/10 p-1 rounded" onclick={triggerFileSelect} title="Open EPUB">
        <FolderOpen size={14} />
      </button>
      <button class="hover:bg-white/10 p-1 rounded" onclick={() => showAllBooks = !showAllBooks} title="Show All Books">
        <BookOpen size={14} />
      </button>
      <button class="hover:bg-white/10 p-1 rounded">
        <MoreHorizontal size={14} />
      </button>
    </div>
  </div>
  
  <input type="file" accept=".epub" class="hidden" bind:this={fileInput} onchange={handleFileSelect} />

  <div class="flex-1 overflow-y-auto">
    {#if showAllBooks && bookStore.availableBooks.length > 0}
      <!-- All Books View -->
      <div class="p-2">
        <div class="text-xs text-vscode-text/60 mb-2 px-2">All Books ({bookStore.availableBooks.length})</div>
        {#each bookStore.availableBooks as book}
          <div 
            class="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-[#2a2d2e] rounded group {bookStore.currentBookId === book.id ? 'bg-[#37373d]' : ''}"
            onclick={() => { bookStore.loadBookFromStorage(book.id); showAllBooks = false; }}
            onkeydown={(e) => e.key === 'Enter' && bookStore.loadBookFromStorage(book.id)}
            role="button"
            tabindex="0"
          >
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <BookOpen size={14} color="#569cd6" />
              <div class="flex-1 min-w-0">
                <div class="text-xs truncate">{book.title}</div>
                <div class="text-[10px] text-vscode-text/50 truncate">{book.author}</div>
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
        <div class="text-xs text-vscode-text/70 mb-4">You have not yet opened a folder.</div>
        <button 
          class="bg-vscode-selection text-white px-4 py-1.5 rounded-sm text-xs hover:bg-blue-600 transition-colors w-full"
          onclick={triggerFileSelect}
        >
          Open Folder
        </button>
      </div>
    {:else}
      <!-- Project Section -->
      <div>
        <div 
          class="flex items-center px-1 py-1 cursor-pointer hover:bg-[#2a2d2e] text-vscode-text font-bold text-xs group"
          onclick={() => isOpen = !isOpen}
          onkeydown={(e) => e.key === 'Enter' && (isOpen = !isOpen)}
          role="button"
          tabindex="0"
        >
          {#if isOpen}
            <ChevronDown size={16} />
          {:else}
            <ChevronRight size={16} />
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
          <div class="flex flex-col">
            {#each bookStore.chapters as chapter}
              <div 
                class="flex items-center px-4 py-1 cursor-pointer gap-1.5 text-[13px] border-l-[3px] border-transparent
                {bookStore.currentChapter?.id === chapter.id ? 'bg-[#37373d] text-white border-vscode-selection' : 'text-vscode-text hover:bg-[#2a2d2e]'}"
                onclick={() => bookStore.selectChapter(chapter)}
                onkeydown={(e) => e.key === 'Enter' && bookStore.selectChapter(chapter)}
                role="button"
                tabindex="0"
              >
                <FileCode size={14} color="#569cd6" />
                <span class="truncate">{chapter.label}.ts</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>


