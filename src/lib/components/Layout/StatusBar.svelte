<script lang="ts">
  import { GitBranch, RefreshCw, AlertCircle, XCircle, Check, Radio, BookOpen } from 'lucide-svelte';
  import { bookStore } from '../../stores/book.svelte';
</script>

<div class="h-6 bg-vscode-statusBar text-white text-[11px] flex items-center justify-between px-2 select-none font-sans cursor-default">
  <div class="flex items-center gap-3 h-full">
    <div class="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer">
      <GitBranch size={12} />
      <span>main*</span>
    </div>
    <div class="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer">
      <RefreshCw size={12} />
    </div>
    <div class="flex items-center gap-2 hover:bg-white/20 px-2 h-full cursor-pointer">
      <div class="flex items-center gap-0.5">
        <XCircle size={12} />
        <span>0</span>
      </div>
      <div class="flex items-center gap-0.5">
        <AlertCircle size={12} />
        <span>0</span>
      </div>
    </div>
  </div>

  <div class="flex items-center gap-4 h-full">
    <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer">
      Ln 12, Col 45
    </div>
    <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer">
      Spaces: 2
    </div>
    <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer">
      UTF-8
    </div>
    <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer">
      LF
    </div>
    <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer">
      <span class="mr-1">{`{ }`}</span> TypeScript
    </div>
    <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer">
      <Radio size={12} class="mr-1" />
      <span>Go Live</span>
    </div>
    <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer">
      <Check size={12} />
      <span class="ml-1">Prettier</span>
    </div>
    
    <!-- Chapter Progress -->
    {#if bookStore.bookLoaded && bookStore.currentChapter}
      <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer border-l border-white/20">
        <BookOpen size={12} class="mr-1" />
        <span>Ch: {bookStore.chapterScrollProgress}%</span>
      </div>
    {/if}
    
    <!-- Overall Book Progress -->
    {#if bookStore.bookLoaded}
      <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer">
        <span>Book: {bookStore.overallBookProgress}%</span>
      </div>
    {/if}
    
    <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer">
      <AlertCircle size={12} />
    </div>
  </div>
</div>

