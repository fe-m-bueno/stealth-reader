<script lang="ts">
  import { X } from 'lucide-svelte';
  import { bookStore } from '../../stores/book.svelte';
</script>

<div class="flex bg-[#2d2d2d] h-9 overflow-x-auto scrollbar-hide">
  {#if bookStore.currentChapter}
    <div 
      class="flex items-center px-3 min-w-[120px] max-w-[200px] border-r border-[#1e1e1e] cursor-pointer group bg-vscode-bg text-white border-t-2 border-t-vscode-keyword"
    >
      <div class="flex items-center gap-2 w-full">
        <span class="text-xs truncate flex-1">{bookStore.currentChapter.label}.ts</span>
        <div class="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-white/20">
          <X size={14} />
        </div>
      </div>
    </div>
  {/if}
</div>

