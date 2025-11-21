<script lang="ts">
  import { Files, Search, GitGraph, Play, SquareDashed, Settings, User } from 'lucide-svelte';
</script>

<div class="w-12 bg-vscode-activityBar flex flex-col items-center py-2 justify-between h-full border-r border-black/20 z-10">
  <div class="flex flex-col gap-0 w-full">
    <div class="h-12 w-full flex items-center justify-center border-l-2 border-white cursor-pointer bg-vscode-bg/10">
      <Files size={24} color="white" strokeWidth={1.5} />
    </div>
    <div class="h-12 w-full flex items-center justify-center border-l-2 border-transparent opacity-60 hover:opacity-100 cursor-pointer">
      <Search size={24} color="#cccccc" strokeWidth={1.5} />
    </div>
    <div class="h-12 w-full flex items-center justify-center border-l-2 border-transparent opacity-60 hover:opacity-100 cursor-pointer">
      <GitGraph size={24} color="#cccccc" strokeWidth={1.5} />
    </div>
    <div class="h-12 w-full flex items-center justify-center border-l-2 border-transparent opacity-60 hover:opacity-100 cursor-pointer">
      <Play size={24} color="#cccccc" strokeWidth={1.5} />
    </div>
    <div class="h-12 w-full flex items-center justify-center border-l-2 border-transparent opacity-60 hover:opacity-100 cursor-pointer">
      <SquareDashed size={24} color="#cccccc" strokeWidth={1.5} />
    </div>
  </div>

  <div class="flex flex-col gap-0 w-full mb-1">
    <div class="h-12 w-full flex items-center justify-center opacity-60 hover:opacity-100 cursor-pointer">
      <User size={24} color="#cccccc" strokeWidth={1.5} />
    </div>
    <div class="h-12 w-full flex items-center justify-center opacity-60 hover:opacity-100 cursor-pointer">
      <Settings size={24} color="#cccccc" strokeWidth={1.5} />
    </div>
  </div>
</div>

