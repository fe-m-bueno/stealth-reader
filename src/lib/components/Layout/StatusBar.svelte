<script lang="ts">
  import { GitBranch, RefreshCw, AlertCircle, XCircle, Check, Radio, BookOpen } from 'lucide-svelte';
  import { bookStore } from '../../stores/book.svelte';
</script>

<div class="h-6 bg-cursor-panel text-[#cccccc82] text-[11px] flex items-center justify-between px-2 select-none font-sans cursor-default border-t border-white/5">
  <div class="flex items-center gap-3 h-full">
    <div class="flex items-center gap-1 hover:bg-white/10 px-2 h-full cursor-pointer">
      <GitBranch size={12} />
      <span>main*</span>
    </div>
    <div class="flex items-center gap-1 hover:bg-white/10 px-2 h-full cursor-pointer">
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

  <div class="flex items-center gap-2 h-full overflow-x-auto scrollbar-hide">
    <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer flex-shrink-0">
      Ln 12, Col 45
    </div>
    <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer flex-shrink-0">
      Spaces: 2
    </div>
    <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer flex-shrink-0">
      UTF-8
    </div>
    <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer flex-shrink-0">
      LF
    </div>
    <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer flex-shrink-0">
      <span class="mr-1">{`{ }`}</span> TypeScript
    </div>
    <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer flex-shrink-0">
      <Radio size={12} class="mr-1" />
      <span>Go Live</span>
    </div>
    <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer flex-shrink-0">
      <Check size={12} />
      <span class="ml-1">Prettier</span>
    </div>
    
    <!-- Progress for each session -->
    {#if bookStore.sessionsCount > 0}
      {#each bookStore.readingSessions as session (session.id)}
        <div class="hover:bg-white/10 px-2 h-full flex items-center cursor-pointer border-l border-white/5 flex-shrink-0" title={session.bookTitle}>
          <BookOpen size={12} class="mr-1 flex-shrink-0" />
          <span class="text-xs truncate max-w-[80px]">
            {session.currentChapter ? session.currentChapter.label : session.bookTitle}
          </span>
          <span class="ml-1 text-xs">Ch:{bookStore.getSessionChapterProgress(session.id)}%</span>
          <span class="ml-1 text-xs">Bk:{bookStore.getSessionBookProgress(session.id)}%</span>
        </div>
      {/each}
    {/if}
    
    <div class="hover:bg-white/20 px-2 h-full flex items-center cursor-pointer flex-shrink-0">
      <AlertCircle size={12} />
    </div>
  </div>
</div>

