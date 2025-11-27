<script lang="ts">
  import { Search, X, ChevronRight } from 'lucide-svelte';
  import type { SearchResult } from '../../services/epub';

  interface Props {
    isOpen: boolean;
    query: string;
    results: SearchResult[];
    isSearching: boolean;
    onClose: () => void;
    onSearch: (query: string) => void;
    onResultClick: (result: SearchResult) => void;
  }

  let { isOpen, query, results, isSearching, onClose, onSearch, onResultClick }: Props = $props();

  let searchInput = $state<HTMLInputElement>();

  function handleSearch(e: Event) {
    const target = e.target as HTMLInputElement;
    onSearch(target.value);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  $effect(() => {
    if (isOpen && searchInput) {
      searchInput.focus();
    }
  });

  function highlightMatch(text: string, start: number, end: number): string {
    if (start < 0 || end > text.length || start >= end) {
      return text;
    }

    const before = text.substring(0, start);
    const match = text.substring(start, end);
    const after = text.substring(end);

    return `${before}<span class="highlight">${match}</span>${after}`;
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/50 z-50 flex" onclick={onClose} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}>
    <div class="ml-auto w-96 bg-vscode-bg border-l border-black/20 flex flex-col h-full" onclick={(e) => e.stopPropagation()}>
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-black/20">
        <h2 class="text-lg font-semibold text-vscode-text">Buscar no Livro</h2>
        <button
          onclick={onClose}
          class="p-1 hover:bg-vscode-bg/50 rounded transition-colors"
          title="Fechar"
        >
          <X size={20} />
        </button>
      </div>

      <!-- Search Input -->
      <div class="p-4 border-b border-black/20">
        <div class="relative">
          <Search size={16} class="absolute left-3 top-1/2 transform -translate-y-1/2 text-vscode-text/50" />
          <input
            bind:this={searchInput}
            type="text"
            placeholder="Digite para buscar..."
            value={query}
            oninput={handleSearch}
            onkeydown={handleKeydown}
            class="w-full pl-10 pr-4 py-2 bg-vscode-input border border-black/20 rounded focus:outline-none focus:ring-2 focus:ring-vscode-accent text-vscode-text"
          />
        </div>
      </div>

      <!-- Results -->
      <div class="flex-1 overflow-y-auto">
        {#if isSearching}
          <div class="flex items-center justify-center p-8">
            <div class="text-center">
              <Search class="animate-pulse mx-auto mb-2 text-vscode-text/50" size={24} />
              <div class="text-vscode-text/70">Buscando...</div>
            </div>
          </div>
        {:else if query.trim() && results.length === 0}
          <div class="flex items-center justify-center p-8">
            <div class="text-center">
              <Search class="mx-auto mb-2 text-vscode-text/30" size={24} />
              <div class="text-vscode-text/70">Nenhum resultado encontrado</div>
              <div class="text-sm text-vscode-text/50 mt-1">Tente usar termos diferentes</div>
            </div>
          </div>
        {:else if results.length > 0}
          <div class="p-2">
            <div class="text-sm text-vscode-text/70 mb-3">
              {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </div>
            {#each results as result}
              <button
                onclick={() => onResultClick(result)}
                class="w-full text-left p-3 hover:bg-vscode-bg/50 rounded mb-1 border border-transparent hover:border-black/10 transition-colors"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-vscode-text truncate">
                      {result.chapterTitle}
                    </div>
                    <div class="text-xs text-vscode-text/60 mb-1">
                      Linha {result.lineNumber}
                    </div>
                    <div class="text-sm text-vscode-text/80 leading-relaxed">
                      {@html highlightMatch(result.lineContent, result.matchStart, result.matchEnd)}
                    </div>
                  </div>
                  <ChevronRight size={16} class="text-vscode-text/50 ml-2 flex-shrink-0 mt-1" />
                </div>
              </button>
            {/each}
          </div>
        {:else}
          <div class="flex items-center justify-center p-8">
            <div class="text-center">
              <Search class="mx-auto mb-2 text-vscode-text/30" size={24} />
              <div class="text-vscode-text/70">Digite algo para buscar</div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

