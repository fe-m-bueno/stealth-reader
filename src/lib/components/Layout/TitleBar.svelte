<script lang="ts">
  import { Square, Minus, X, Check, LayoutGrid, Columns, PanelLeft, Settings } from 'lucide-svelte';
  import { bookStore } from '../../stores/book.svelte';

  interface Props {
    handleUploadShortcut?: () => void;
  }

  let { handleUploadShortcut }: Props = $props();

  let activeMenu = $state<string | null>(null);

  function toggleMenu(menu: string) {
    if (activeMenu === menu) {
      activeMenu = null;
    } else {
      activeMenu = menu;
    }
  }

  function closeMenu() {
    activeMenu = null;
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="h-8 bg-cursor-panel flex items-center justify-between select-none text-xs text-[#cccccc] relative z-50" onclick={(e) => e.stopPropagation()}>
  <div class="flex items-center h-full px-2">
    <img src="/favicon.svg" alt="logo" class="w-4 h-4 mr-3 opacity-80" />
    <div class="flex items-center gap-1">
      <span class="hover:bg-white/10 px-2 py-1 rounded cursor-default">File</span>
      
      <div class="relative">
        <span 
          class="hover:bg-white/10 px-2 py-1 rounded cursor-pointer {activeMenu === 'edit' ? 'bg-white/10' : ''}"
          onclick={() => toggleMenu('edit')}
        >
          Edit
        </span>
        {#if activeMenu === 'edit'}
          <div class="absolute top-full left-0 mt-1 w-48 bg-cursor-panel border border-white/5 shadow-xl rounded-sm py-1 flex flex-col gap-0.5">
            <div class="px-3 py-1.5 hover:bg-white/10 hover:text-white cursor-pointer flex justify-between" onclick={() => bookStore.increaseFontSize()}>
              <span>Zoom In</span>
              <span class="opacity-50">Ctrl+=</span>
            </div>
            <div class="px-3 py-1.5 hover:bg-white/10 hover:text-white cursor-pointer flex justify-between" onclick={() => bookStore.decreaseFontSize()}>
              <span>Zoom Out</span>
              <span class="opacity-50">Ctrl+-</span>
            </div>
            <div class="h-[1px] bg-white/5 my-1"></div>
            <div class="px-3 py-1.5 hover:bg-white/10 hover:text-white cursor-pointer flex justify-between" onclick={() => bookStore.toggleWordWrap()}>
              <div class="flex items-center gap-2">
                {#if bookStore.wordWrap}
                  <Check size={14} />
                {:else}
                  <span class="w-3.5"></span>
                {/if}
                <span>Word Wrap</span>
              </div>
              <span class="opacity-50">Alt+Z</span>
            </div>
          </div>
        {/if}
      </div>

      <span class="hover:bg-white/10 px-2 py-1 rounded cursor-default">Selection</span>
      <span class="hover:bg-white/10 px-2 py-1 rounded cursor-default">View</span>
      <span class="hover:bg-white/10 px-2 py-1 rounded cursor-default">Go</span>
      <span class="hover:bg-white/10 px-2 py-1 rounded cursor-default">Run</span>
      <span class="hover:bg-white/10 px-2 py-1 rounded cursor-default">Terminal</span>
      <span class="hover:bg-white/10 px-2 py-1 rounded cursor-default">Help</span>
    </div>
  </div>
  
  <!-- Click outside to close -->
  {#if activeMenu}
    <div class="fixed inset-0 z-[-1]" onclick={closeMenu}></div>
  {/if}

  <div class="flex-1 text-center text-cursor-text-muted text-xs font-medium">
    stealth-reader - Cursor
  </div>

  <div class="flex items-center h-full">
    <!-- Layout controls -->
    <div class="flex items-center h-full border-r border-white/10 mr-1 pr-1">
      <div class="h-full w-8 flex items-center justify-center hover:bg-white/10 cursor-pointer" title="Layout 1">
        <LayoutGrid size={14} color="#CCCCCC99" />
      </div>
      <div class="h-full w-8 flex items-center justify-center hover:bg-white/10 cursor-pointer" title="Layout 2">
        <Columns size={14} color="#CCCCCC99" />
      </div>
      <div class="h-full w-8 flex items-center justify-center hover:bg-white/10 cursor-pointer" title="Layout 3">
        <PanelLeft size={14} color="#CCCCCC99" />
      </div>
      <div class="h-full w-8 flex items-center justify-center hover:bg-white/10 cursor-pointer" title="Settings">
        <Settings size={14} color="#CCCCCC99" />
      </div>
    </div>
    
    <!-- Window controls -->
    <div class="h-full w-10 flex items-center justify-center hover:bg-white/10 cursor-default">
      <Minus size={14} color="#CCCCCC99" />
    </div>
    <div class="h-full w-10 flex items-center justify-center hover:bg-white/10 cursor-default">
      <Square size={12} color="#CCCCCC99" />
    </div>
    <div class="h-full w-10 flex items-center justify-center hover:bg-red-500 hover:text-white cursor-default group">
      <X size={14} class="text-[#CCCCCC99] group-hover:text-white transition-colors" />
    </div>
  </div>
</div>

<svelte:window onkeydown={(e) => {
  if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    bookStore.toggleWordWrap();
  }
  if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    bookStore.increaseFontSize();
  }
  if (e.ctrlKey && (e.key === '-' || e.key === '_')) {
    e.preventDefault();
    bookStore.decreaseFontSize();
  }
}} />
